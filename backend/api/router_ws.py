"""
router_ws.py — WebSocket endpoint for real-time training streaming.
=====================================================================
Client connects → sends JSON config → receives progress updates every 50 episodes.
"""

import json
import logging
import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.services.routing_service import get_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/train")
async def ws_train(websocket: WebSocket):
    """
    WebSocket training endpoint.

    Protocol:
    1. Client connects
    2. Client sends JSON config: {"episodes": 5000, "alpha": 0.1, ...}
    3. Server streams progress: {"type": "progress", "episode": 50, ...}
    4. Server sends final:      {"type": "complete", ...}
    """
    await websocket.accept()
    logger.info("WebSocket client connected for training")

    try:
        # 1. Receive training config from client
        raw = await websocket.receive_text()
        config = json.loads(raw)
        logger.info("WS training config: %s", config)

        episodes = config.get("episodes", 5000)
        alpha = config.get("alpha", 0.1)
        gamma = config.get("gamma", 0.95)
        epsilon = config.get("epsilon", 1.0)
        epsilon_min = config.get("epsilon_min", 0.01)
        epsilon_decay = config.get("epsilon_decay", 0.995)
        fluctuate_every = config.get("fluctuate_every", 50)

        # Determine report frequency — aim for ~100 updates total
        report_every = max(1, episodes // 100)

        # 2. Progress messages queue (callback runs in sync, WS is async)
        progress_queue: asyncio.Queue = asyncio.Queue()

        def on_progress(data):
            """Sync callback — push progress into the async queue."""
            progress_queue.put_nowait(data)

        # 3. Run training in a thread (it's CPU-bound)
        svc = get_service()
        loop = asyncio.get_event_loop()

        async def train_and_stream():
            # Start training in a background thread
            train_task = loop.run_in_executor(
                None,
                lambda: svc.train_agent_streaming(
                    episodes=episodes,
                    alpha=alpha,
                    gamma=gamma,
                    epsilon=epsilon,
                    epsilon_min=epsilon_min,
                    epsilon_decay=epsilon_decay,
                    fluctuate_every=fluctuate_every,
                    report_every=report_every,
                    on_progress=on_progress,
                ),
            )

            # Stream progress messages as they arrive
            while not train_task.done():
                try:
                    data = await asyncio.wait_for(progress_queue.get(), timeout=0.2)
                    await websocket.send_json({"type": "progress", **data})
                except asyncio.TimeoutError:
                    continue

            # Drain any remaining progress messages
            while not progress_queue.empty():
                data = progress_queue.get_nowait()
                await websocket.send_json({"type": "progress", **data})

            # Get final result
            result = await train_task
            return result

        result = await train_and_stream()

        # 4. Send completion message
        await websocket.send_json({"type": "complete", **result})
        logger.info("WS training complete: %s", result["status"])

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected during training")
    except json.JSONDecodeError:
        await websocket.send_json({"type": "error", "message": "Invalid JSON config"})
        await websocket.close()
    except Exception as e:
        logger.exception("WebSocket training error: %s", e)
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
            await websocket.close()
        except Exception:
            pass
