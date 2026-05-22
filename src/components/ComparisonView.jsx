/**
 * ComparisonView.jsx — Side-by-side routing comparison + path display.
 */
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart2, CheckCircle2, XCircle, Map, Target } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ComparisonView({ routeResult }) {
    if (!routeResult) {
        return (
            <div className="bg-bg-card border border-border-glass rounded-2xl p-5 backdrop-blur-lg shadow-lg h-full">
                <div className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-4 flex items-center gap-2">
                    <BarChart2 size={16} className="text-accent-blue" />
                    Route Comparison
                </div>
                <div className="h-40 flex items-center justify-center border border-dashed border-border-glass rounded-xl bg-bg-secondary/30">
                    <p className="text-text-muted text-sm text-center">
                        Select source/destination and click "Compare Routes" to see results.
                    </p>
                </div>
            </div>
        );
    }

    const { ql, dj } = routeResult;

    // Bar chart data
    const chartData = [
        {
            metric: 'Path Cost',
            'Q-Learning': ql.delivered ? ql.total_cost : 0,
            'Dijkstra': dj.delivered ? dj.total_cost : 0,
        },
        {
            metric: 'Hop Count',
            'Q-Learning': ql.hop_count,
            'Dijkstra': dj.hop_count,
        },
    ];

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-bg-card border border-border-glass rounded-2xl p-5 backdrop-blur-lg shadow-lg h-full"
        >
            <div className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-5 flex items-center gap-2">
                <BarChart2 size={16} className="text-accent-blue" />
                Route Comparison: Node {routeResult.source} → Node {routeResult.dest}
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <div className="bg-bg-glass border border-border-glass rounded-xl p-3 text-center flex flex-col items-center gap-1">
                    <div className={`text-2xl font-bold ${ql.delivered ? 'text-accent-green drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'text-accent-red drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}>
                        {ql.delivered ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
                    </div>
                    <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">QL Delivered</div>
                </div>
                <div className="bg-bg-glass border border-border-glass rounded-xl p-3 text-center flex flex-col items-center gap-1">
                    <div className={`text-2xl font-bold ${dj.delivered ? 'text-accent-green drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'text-accent-red drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}>
                        {dj.delivered ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
                    </div>
                    <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">DJ Delivered</div>
                </div>
                <div className="bg-bg-glass border border-border-glass rounded-xl p-3 text-center flex flex-col items-center justify-center">
                    <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-primary">
                        {ql.hop_count}
                    </div>
                    <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mt-1">QL Hops</div>
                </div>
                <div className="bg-bg-glass border border-border-glass rounded-xl p-3 text-center flex flex-col items-center justify-center">
                    <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-primary">
                        {dj.hop_count}
                    </div>
                    <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mt-1">DJ Hops</div>
                </div>
            </div>

            {/* Paths */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div>
                    <div className="text-xs font-semibold text-accent-blue mb-2 flex items-center gap-1.5"><Map size={14}/> Q-Learning Path</div>
                    <div className="flex flex-wrap items-center gap-1.5 p-3 leading-loose bg-bg-glass border border-border-glass rounded-xl">
                        {ql.path.length > 0 ? ql.path.map((node, i) => (
                            <span key={i} className="flex items-center">
                                <span className="px-2.5 py-1 rounded bg-blue-500/20 text-accent-blue font-bold text-xs shadow-glow-blue border border-blue-500/30">{node}</span>
                                {i < ql.path.length - 1 && <span className="text-text-muted text-xs mx-1">→</span>}
                            </span>
                        )) : <span className="text-text-muted text-sm px-2">No path route found</span>}
                    </div>
                </div>
                <div>
                    <div className="text-xs font-semibold text-accent-green mb-2 flex items-center gap-1.5"><Map size={14}/> Dijkstra Path</div>
                    <div className="flex flex-wrap items-center gap-1.5 p-3 leading-loose bg-bg-glass border border-border-glass rounded-xl">
                        {dj.path.length > 0 ? dj.path.map((node, i) => (
                            <span key={i} className="flex items-center">
                                <span className="px-2.5 py-1 rounded bg-green-500/20 text-accent-green font-bold text-xs shadow-glow-green border border-green-500/30">{node}</span>
                                {i < dj.path.length - 1 && <span className="text-text-muted text-xs mx-1">→</span>}
                            </span>
                        )) : <span className="text-text-muted text-sm px-2">No path found</span>}
                    </div>
                </div>
            </div>

            {/* Bar chart */}
            <div className="bg-bg-glass border border-border-glass rounded-xl p-3">
                <ResponsiveContainer width="100%" height={220}>
                    <RechartsBarChart data={chartData} barGap={8} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip
                            contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                            labelStyle={{ color: '#f1f5f9', fontWeight: 600, marginBottom: 4 }}
                            itemStyle={{ fontSize: '13px' }}
                            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} iconType="circle" />
                        <Bar dataKey="Q-Learning" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Dijkstra" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>

            {/* Hop detail table */}
            {ql.per_hop_details?.length > 0 && (
                <div className="mt-6">
                    <div className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3 flex items-center gap-2">
                        <Target size={16} className="text-accent-cyan" />
                        Q-Learning Hop Details
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-border-glass bg-bg-glass">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-bg-secondary/50 text-xs uppercase text-text-muted tracking-wider border-b border-border-glass">
                                <tr>
                                    <th className="px-4 py-3 font-medium">From</th>
                                    <th className="px-4 py-3 font-medium">To</th>
                                    <th className="px-4 py-3 font-medium">Edge Cost</th>
                                    <th className="px-4 py-3 font-medium">Q-Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-glass text-text-primary">
                                {ql.per_hop_details.map((h, i) => (
                                    <tr key={i} className="hover:bg-bg-glass/50 transition-colors">
                                        <td className="px-4 py-3">Node {h.from_node}</td>
                                        <td className="px-4 py-3">Node {h.to_node}</td>
                                        <td className="px-4 py-3 text-text-secondary">{h.edge_cost?.toFixed(3)}</td>
                                        <td className="px-4 py-3 text-accent-cyan font-medium drop-shadow-sm">{h.q_value?.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
