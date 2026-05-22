/**
 * LearningCurve.jsx — Displays training reward curve + delivery rate.
 * Supports both live streaming data and post-training metrics.
 */
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Award, Box, Rocket, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LearningCurve({ metrics, liveData = [], isLive = false }) {
    const hasLiveData = liveData.length > 0;
    const hasMetrics = metrics?.is_trained && metrics.reward_history?.length;

    // Show live data during training, or metrics after training
    if (!hasLiveData && !hasMetrics) {
        return (
            <div className="bg-bg-card border border-border-glass rounded-2xl p-5 backdrop-blur-lg shadow-lg h-full">
                <div className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-4 flex items-center gap-2">
                    <TrendingUp size={16} className="text-accent-purple" />
                    Learning Curve
                </div>
                <div className="h-40 flex items-center justify-center border border-dashed border-border-glass rounded-xl bg-bg-secondary/30">
                    <p className="text-text-muted text-sm text-center">
                        Train the model to see the learning curve.
                    </p>
                </div>
            </div>
        );
    }

    // Build chart data from live stream or final metrics
    let chartData;
    let currentStats;

    if (hasLiveData) {
        chartData = liveData.map(p => ({
            episode: p.episode,
            reward: p.avg_reward,
            deliveryRate: p.delivery_rate,
            epsilon: p.epsilon,
        }));
        const latest = liveData[liveData.length - 1];
        currentStats = {
            totalEpisodes: latest.total_episodes,
            deliveryRate: latest.delivery_rate,
            avgReward: latest.avg_reward,
            qTableSize: latest.q_table_size,
            epsilon: latest.epsilon,
        };
    } else {
        chartData = metrics.reward_history.map(p => ({
            episode: p.episode,
            reward: p.reward,
            epsilon: p.epsilon,
            delivered: p.delivered ? 1 : 0,
        }));
        currentStats = {
            totalEpisodes: metrics.total_episodes,
            deliveryRate: metrics.delivery_rate_last_500,
            avgReward: metrics.avg_reward_last_500,
            qTableSize: metrics.q_table_size,
        };
    }

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-bg-card border rounded-2xl p-5 backdrop-blur-lg shadow-lg h-full flex flex-col ${
                isLive ? 'border-purple-500/40 shadow-[0_0_30px_rgba(139,92,246,0.1)]' : 'border-border-glass'
            }`}
        >
            <div className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-5 flex items-center gap-2">
                <TrendingUp size={16} className="text-accent-purple" />
                Learning Curve
                <AnimatePresence>
                    {isLive && (
                        <motion.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="ml-auto flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30"
                        >
                            <Radio size={12} className="text-red-400 animate-pulse" />
                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Live</span>
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <div className="bg-bg-glass border border-border-glass rounded-xl p-3 flex flex-col justify-center">
                    <motion.div 
                        key={currentStats.totalEpisodes}
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1 }}
                        className="text-2xl font-bold text-text-primary"
                    >
                        {hasLiveData ? liveData[liveData.length - 1]?.episode : currentStats.totalEpisodes}
                    </motion.div>
                    <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mt-1">
                        {isLive ? 'Current Ep' : 'Episodes'}
                    </div>
                </div>
                <div className="bg-bg-glass border border-border-glass rounded-xl p-3 flex flex-col justify-center">
                    <motion.div
                        key={currentStats.deliveryRate}
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1 }}
                        className="text-2xl font-bold text-accent-green drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    >
                        {currentStats.deliveryRate}%
                    </motion.div>
                    <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mt-1 flex items-center gap-1"><Award size={10}/> Delivery Rate</div>
                </div>
                <div className="bg-bg-glass border border-border-glass rounded-xl p-3 flex flex-col justify-center">
                    <motion.div
                        key={currentStats.avgReward}
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1 }}
                        className="text-2xl font-bold text-accent-blue"
                    >
                        {currentStats.avgReward}
                    </motion.div>
                    <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mt-1">Avg Reward</div>
                </div>
                <div className="bg-bg-glass border border-border-glass rounded-xl p-3 flex flex-col justify-center">
                    <motion.div
                        key={currentStats.qTableSize}
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1 }}
                        className="text-2xl font-bold text-text-primary"
                    >
                        {currentStats.qTableSize}
                    </motion.div>
                    <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mt-1 flex items-center gap-1"><Box size={10}/> Q-Table Size</div>
                </div>
            </div>

            {/* Reward chart */}
            <div className="flex-1 min-h-[220px] bg-bg-glass border border-border-glass rounded-xl p-3 flex flex-col">
                <span className="text-xs font-semibold text-text-secondary mb-3">
                    {isLive ? 'Avg Reward (Live)' : 'Reward per Episode'}
                </span>
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="rewardGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="liveGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="episode" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip 
                                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }} 
                                labelStyle={{ color: '#f1f5f9', fontWeight: 600, marginBottom: 4 }}
                                itemStyle={{ fontSize: '13px' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="reward"
                                stroke={isLive ? '#3b82f6' : '#8b5cf6'}
                                fill={isLive ? 'url(#liveGradient)' : 'url(#rewardGradient)'}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, fill: isLive ? '#3b82f6' : '#8b5cf6', stroke: '#fff' }}
                                isAnimationActive={!isLive}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Improvement banner (post-training only) */}
            {!isLive && metrics?.reward_improvement_percent != null && (
                <div className="mt-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs md:text-sm text-accent-purple font-medium">
                    <Rocket size={16} className="animate-bounce" />
                    <span>Reward improved by <strong>{metrics.reward_improvement_percent.toFixed(1)}%</strong></span>
                    <span className="text-text-muted ml-0 sm:ml-2">({metrics.avg_reward_first_500} → {metrics.avg_reward_last_500})</span>
                </div>
            )}
        </motion.div>
    );
}
