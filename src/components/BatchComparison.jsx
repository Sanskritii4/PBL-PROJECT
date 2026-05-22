/**
 * BatchComparison.jsx — Run N packets through both algorithms and show aggregate stats.
 */
import { useState } from 'react';
import { compareRoutes } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Trophy, Bot, Ruler, RefreshCcw, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BatchComparison({ isTrained, setSimulationPackets }) {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [numPackets, setNumPackets] = useState(50);

    const handleCompare = async (visualize = false) => {
        setLoading(true);
        try {
            const data = await compareRoutes(numPackets);
            setResult(data);
            
            if (visualize && setSimulationPackets) {
                const packets = [];
                let packetId = 0;
                
                if (data.ql_paths) {
                    data.ql_paths.forEach(path => {
                        if (path && path.length > 1) {
                            packets.push({ id: `ql-${packetId++}`, path, type: 'ql' });
                        }
                    });
                }
                
                if (data.dj_paths) {
                    data.dj_paths.forEach(path => {
                        if (path && path.length > 1) {
                            packets.push({ id: `dj-${packetId++}`, path, type: 'dj' });
                        }
                    });
                }
                
                // Shuffle for interleaved rendering
                packets.sort(() => Math.random() - 0.5);
                setSimulationPackets(packets);
                
                setTimeout(() => {
                    setSimulationPackets([]);
                }, 12000);
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const chartData = result ? [
        { metric: 'Avg Cost', 'Q-Learning': result.q_learning.avg_cost, Dijkstra: result.dijkstra.avg_cost },
        { metric: 'Avg Hops', 'Q-Learning': result.q_learning.avg_hops, Dijkstra: result.dijkstra.avg_hops },
        { metric: 'Delivery %', 'Q-Learning': result.q_learning.delivery_rate, Dijkstra: result.dijkstra.delivery_rate },
    ] : [];

    return (
        <div className="bg-bg-card border border-border-glass rounded-2xl p-5 backdrop-blur-lg shadow-lg h-full">
            <div className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-5 flex items-center gap-2">
                <Trophy size={16} className="text-accent-orange" />
                Batch Comparison
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center mb-6 bg-bg-glass border border-border-glass rounded-xl p-4">
                <div className="flex-1 w-full">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-medium text-text-secondary">Packets to Route</label>
                        <span className="text-xs font-bold text-accent-blue bg-blue-500/10 px-2 rounded">{numPackets}</span>
                    </div>
                    <input type="range" className="w-full accent-accent-blue cursor-pointer" min={10} max={200} step={10}
                        value={numPackets} onChange={e => setNumPackets(parseInt(e.target.value))}
                    />
                </div>
                <div className="flex w-full sm:w-auto gap-3 flex-col sm:flex-row">
                    <button 
                        className="w-full sm:w-auto px-6 py-2.5 flex justify-center items-center gap-2 rounded-lg text-sm font-semibold bg-gradient-primary text-white shadow-lg hover:shadow-glow-blue transition-all transform hover:-translate-y-px disabled:opacity-50"
                        onClick={() => handleCompare(false)}
                        disabled={!isTrained || loading}
                    >
                        {loading ? <RefreshCcw size={16} className="animate-spin" /> : <Trophy size={16} />}
                        {loading ? 'Running...' : 'Run Comparison'}
                    </button>
                    <button 
                        className="w-full sm:w-auto px-6 py-2.5 flex justify-center items-center gap-2 rounded-lg text-sm font-bold border-2 border-accent-blue text-accent-blue hover:bg-blue-500/10 transition-all transform hover:-translate-y-px disabled:opacity-50 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                        onClick={() => handleCompare(true)}
                        disabled={!isTrained || loading}
                        title="Visualize 2x packets on the global network map"
                    >
                        <Globe size={16} className={loading ? "animate-pulse" : ""} />
                        Visualize Traffic
                    </button>
                </div>
            </div>

            {result && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                    {/* Summary table */}
                    <div className="overflow-hidden rounded-xl border border-border-glass bg-bg-glass flex flex-col">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-bg-secondary/50 text-xs uppercase text-text-muted tracking-wider border-b border-border-glass">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Metric</th>
                                    <th className="px-4 py-3 font-medium text-accent-blue flex items-center gap-1"><Bot size={12}/> QL</th>
                                    <th className="px-4 py-3 font-medium text-accent-green flex items-center gap-1"><Ruler size={12}/> DJ</th>
                                    <th className="px-4 py-3 font-medium">Winner</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-glass text-text-primary">
                                <tr className="hover:bg-bg-secondary/20 transition-colors">
                                    <td className="px-4 py-3">Avg Path Cost</td>
                                    <td className={`px-4 py-3 font-medium ${result.delta.winner_by_cost === 'q-learning' ? 'text-accent-green' : 'text-text-muted'}`}>
                                        {result.q_learning.avg_cost.toFixed(3)}
                                    </td>
                                    <td className={`px-4 py-3 font-medium ${result.delta.winner_by_cost === 'dijkstra' ? 'text-accent-green' : 'text-text-muted'}`}>
                                        {result.dijkstra.avg_cost.toFixed(3)}
                                    </td>
                                    <td className="px-4 py-3 text-xs bg-white/5 font-bold">
                                        {result.delta.winner_by_cost === 'q-learning' ? <span className="text-accent-blue flex items-center gap-1"><Bot size={12}/> QL</span> : <span className="text-accent-green flex items-center gap-1"><Ruler size={12}/> DJ</span>}
                                    </td>
                                </tr>
                                <tr className="hover:bg-bg-secondary/20 transition-colors">
                                    <td className="px-4 py-3">Avg Hops</td>
                                    <td className="px-4 py-3 font-medium">{result.q_learning.avg_hops}</td>
                                    <td className="px-4 py-3 font-medium">{result.dijkstra.avg_hops}</td>
                                    <td className="px-4 py-3 text-xs bg-white/5 font-bold">
                                        {result.q_learning.avg_hops <= result.dijkstra.avg_hops ? <span className="text-accent-blue flex items-center gap-1"><Bot size={12}/> QL</span> : <span className="text-accent-green flex items-center gap-1"><Ruler size={12}/> DJ</span>}
                                    </td>
                                </tr>
                                <tr className="hover:bg-bg-secondary/20 transition-colors">
                                    <td className="px-4 py-3">Delivery Rate</td>
                                    <td className={`px-4 py-3 font-medium ${result.delta.winner_by_delivery === 'q-learning' ? 'text-accent-green' : 'text-text-muted'}`}>
                                        {result.q_learning.delivery_rate}%
                                    </td>
                                    <td className={`px-4 py-3 font-medium ${result.delta.winner_by_delivery === 'dijkstra' ? 'text-accent-green' : 'text-text-muted'}`}>
                                        {result.dijkstra.delivery_rate}%
                                    </td>
                                    <td className="px-4 py-3 text-xs bg-white/5 font-bold">
                                        {result.delta.winner_by_delivery === 'q-learning' ? <span className="text-accent-blue flex items-center gap-1"><Bot size={12}/> QL</span> : <span className="text-accent-green flex items-center gap-1"><Ruler size={12}/> DJ</span>}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Chart */}
                    <div className="bg-bg-glass border border-border-glass rounded-xl p-3 flex flex-col justify-center min-h-[220px]">
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={chartData} barGap={6} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }} 
                                    labelStyle={{ color: '#f1f5f9', fontWeight: 600, marginBottom: 4 }}
                                    itemStyle={{ fontSize: '13px' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} iconType="circle" />
                                <Bar dataKey="Q-Learning" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Dijkstra" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
