"""
sarsa_agent.py — SARSA Agent for Adaptive Packet Routing
=========================================================
On-policy TD(0) alternative to Q-Learning.

Key difference from Q-Learning:
- Q-Learning: Q(s,a) ← Q(s,a) + α[r + γ·max Q(s',a') - Q(s,a)]   (OFF-policy, uses max)
- SARSA:      Q(s,a) ← Q(s,a) + α[r + γ·Q(s',a')      - Q(s,a)]   (ON-policy, uses actual next action)

SARSA is more conservative — it accounts for the exploration policy in its updates,
leading to safer (but sometimes suboptimal) routes.
"""

import random
import logging
from dataclasses import dataclass
from typing import Optional

from .network import NetworkSimulator
from .agent import HyperParameters, State, RoutingResult, EpisodeStats

logger = logging.getLogger(__name__)


class SarsaAgent:
    """
    SARSA (State-Action-Reward-State-Action) agent for packet routing.

    Unlike Q-Learning which uses max(Q(s',a')), SARSA uses the Q-value of
    the action the agent ACTUALLY takes next. This makes it on-policy:
    it learns the value of the policy it's following, not the optimal policy.

    Practical effect: SARSA learns more cautious routes because it factors in
    the possibility of exploratory (poor) actions when evaluating states.
    """

    def __init__(self, network: NetworkSimulator, hyperparams: Optional[HyperParameters] = None):
        self.network = network
        self.hp = hyperparams or HyperParameters()
        self.q_table: dict[tuple[State, int], float] = {}
        self._epsilon = self.hp.epsilon
        self.training_history: list[EpisodeStats] = []

        logger.info("SARSA Agent initialised | α=%.3f  γ=%.3f  ε₀=%.2f  decay=%.4f",
                     self.hp.alpha, self.hp.gamma, self.hp.epsilon, self.hp.epsilon_decay)

    # ─── Q-table helpers ─────────────────────────────────

    def _get_q(self, state: State, action: int) -> float:
        return self.q_table.get((state, action), 0.0)

    def _set_q(self, state: State, action: int, value: float) -> None:
        self.q_table[(state, action)] = value

    # ─── Policy ──────────────────────────────────────────

    def select_action(self, state: State, valid_actions: list[int], exploit_only: bool = False) -> int:
        if not valid_actions:
            raise ValueError(f"No valid actions from state {state}")

        if not exploit_only and random.random() < self._epsilon:
            return random.choice(valid_actions)

        q_values = {a: self._get_q(state, a) for a in valid_actions}
        max_q = max(q_values.values())
        best_actions = [a for a, q in q_values.items() if q == max_q]
        return random.choice(best_actions)

    # ─── Reward (same as Q-Learning for fair comparison) ─

    def compute_reward(self, current: int, next_hop: int, destination: int, visited: set[int]) -> float:
        if next_hop == destination:
            return 100.0
        if next_hop in visited:
            return -50.0

        attrs = self.network.get_edge_attrs(current, next_hop)
        reward = 0.0
        reward -= attrs.delay
        reward -= 20.0 * attrs.congestion
        reward -= 50.0 * attrs.loss_rate
        reward += 0.1 * attrs.bandwidth
        reward -= 1.0
        return round(reward, 4)

    # ─── SARSA Update ────────────────────────────────────

    def update(self, state: State, action: int, reward: float,
               next_state: State, next_action: int) -> None:
        """
        SARSA update (on-policy TD(0)):

            Q(s, a) ← Q(s, a) + α [ r + γ · Q(s', a') − Q(s, a) ]

        Note: uses Q(s', a') where a' is the ACTUAL next action chosen,
        NOT max over all actions. This is the key difference from Q-Learning.
        """
        current_q = self._get_q(state, action)
        next_q = self._get_q(next_state, next_action)
        target = reward + self.hp.gamma * next_q
        new_q = current_q + self.hp.alpha * (target - current_q)
        self._set_q(state, action, round(new_q, 6))

    # ─── Training Loop ───────────────────────────────────

    def train(self, episodes: int = 5000, src_dst_pairs=None, fluctuate_every: int = 50) -> list[EpisodeStats]:
        nodes = list(self.network.graph.nodes())

        for ep in range(1, episodes + 1):
            if src_dst_pairs:
                src, dst = random.choice(src_dst_pairs)
            else:
                src, dst = random.sample(nodes, 2)

            stats = self._run_episode(src, dst, ep)
            self.training_history.append(stats)

            self._epsilon = max(self.hp.epsilon_min, self._epsilon * self.hp.epsilon_decay)

            if ep % fluctuate_every == 0:
                self.network.fluctuate_congestion(intensity=0.1)
                self.network.fluctuate_loss(intensity=0.01)

            if ep % 500 == 0:
                recent = self.training_history[-500:]
                avg_reward = sum(s.total_reward for s in recent) / len(recent)
                delivery_rate = sum(1 for s in recent if s.delivered) / len(recent)
                logger.info(
                    "SARSA Ep %5d/%d | avg_reward=%.2f | delivery=%.1f%% | ε=%.4f | Q-table=%d",
                    ep, episodes, avg_reward, delivery_rate * 100,
                    self._epsilon, len(self.q_table),
                )

        logger.info("SARSA training complete. Q-table has %d entries.", len(self.q_table))
        return self.training_history

    def train_with_callback(
        self,
        episodes: int = 5000,
        src_dst_pairs=None,
        fluctuate_every: int = 50,
        report_every: int = 50,
        callback=None,
    ) -> list[EpisodeStats]:
        """
        Training loop with progress callback for real-time streaming.
        """
        nodes = list(self.network.graph.nodes())

        for ep in range(1, episodes + 1):
            if src_dst_pairs:
                src, dst = random.choice(src_dst_pairs)
            else:
                src, dst = random.sample(nodes, 2)

            stats = self._run_episode(src, dst, ep)
            self.training_history.append(stats)
            self._epsilon = max(self.hp.epsilon_min, self._epsilon * self.hp.epsilon_decay)

            if ep % fluctuate_every == 0:
                self.network.fluctuate_congestion(intensity=0.1)
                self.network.fluctuate_loss(intensity=0.01)

            if callback and ep % report_every == 0:
                window = self.training_history[-report_every:]
                avg_reward = sum(s.total_reward for s in window) / len(window)
                delivery_rate = sum(1 for s in window if s.delivered) / len(window) * 100
                callback({
                    "episode": ep,
                    "total_episodes": episodes,
                    "avg_reward": round(avg_reward, 2),
                    "delivery_rate": round(delivery_rate, 1),
                    "epsilon": round(self._epsilon, 6),
                    "q_table_size": len(self.q_table),
                })

        logger.info("SARSA training complete (callback mode). Q-table has %d entries.", len(self.q_table))
        return self.training_history

    def _run_episode(self, src: int, dst: int, episode_num: int) -> EpisodeStats:
        current = src
        state: State = (current, dst)
        visited: set[int] = {current}
        path: list[int] = [current]
        total_reward = 0.0
        delivered = False

        neighbors = self.network.get_neighbors(current)
        if not neighbors:
            return EpisodeStats(episode_num, 0.0, 0, path, False, self._epsilon)

        # SARSA: choose first action BEFORE the loop
        action = self.select_action(state, neighbors)

        for step in range(self.hp.max_steps_per_episode):
            reward = self.compute_reward(current, action, dst, visited)
            total_reward += reward

            next_node = action
            next_state: State = (next_node, dst)
            path.append(next_node)
            visited.add(next_node)

            if next_node == dst:
                # Terminal update: no next action, next Q = 0
                self.update(state, action, reward, next_state, next_node)
                delivered = True
                break

            next_neighbors = self.network.get_neighbors(next_node)
            if not next_neighbors:
                self.update(state, action, reward, next_state, action)
                break

            # SARSA: choose next action NOW (before update)
            next_action = self.select_action(next_state, next_neighbors)

            # Update with actual next action (not max)
            self.update(state, action, reward, next_state, next_action)

            # Transition
            current = next_node
            state = next_state
            action = next_action

        return EpisodeStats(
            episode=episode_num,
            total_reward=round(total_reward, 4),
            steps=len(path) - 1,
            path=path,
            delivered=delivered,
            epsilon=round(self._epsilon, 6),
        )

    # ─── Inference ───────────────────────────────────────

    def route_packet(self, src: int, dst: int, max_steps: int = 50) -> RoutingResult:
        current = src
        state: State = (current, dst)
        visited: set[int] = {current}
        path: list[int] = [current]
        total_cost = 0.0

        for _ in range(max_steps):
            neighbors = self.network.get_neighbors(current)
            if not neighbors:
                return RoutingResult(src, dst, path, total_cost, len(path) - 1, False, "no_neighbors")

            action = self.select_action(state, neighbors, exploit_only=True)
            total_cost += self.network.get_edge_cost(current, action)
            path.append(action)

            if action == dst:
                return RoutingResult(src, dst, path, round(total_cost, 4), len(path) - 1, True, "delivered")
            if action in visited:
                return RoutingResult(src, dst, path, round(total_cost, 4), len(path) - 1, False, "loop")

            visited.add(action)
            current = action
            state = (current, dst)

        return RoutingResult(src, dst, path, round(total_cost, 4), len(path) - 1, False, "max_steps")

    # ─── Utilities ───────────────────────────────────────

    def get_q_table_size(self) -> int:
        return len(self.q_table)

    def get_q_table_snapshot(self) -> dict:
        entries = []
        for (state, action), q_val in sorted(self.q_table.items(), key=lambda x: -x[1])[:100]:
            entries.append({
                "current_node": state[0], "destination": state[1],
                "action": action, "q_value": round(q_val, 4),
            })
        return {"size": len(self.q_table), "top_entries": entries}
