/**
 * NetworkGraph.jsx — SVG-based interactive network topology visualization.
 * Renders nodes as circles and edges as lines with force-directed positioning.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

// Simple force-directed layout computed on mount
function computeLayout(nodes, edges, width, height) {
    const pos = {};
    const n = nodes.length;
    // Arrange in a circle initially
    nodes.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2;
        const r = Math.min(width, height) * 0.35;
        pos[node.id] = {
            x: width / 2 + r * Math.cos(angle),
            y: height / 2 + r * Math.sin(angle),
        };
    });

    // Simple force simulation (60 iterations)
    const edgeSet = new Set(edges.map(e => `${e.source}-${e.target}`));
    for (let iter = 0; iter < 60; iter++) {
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const a = nodes[i].id, b = nodes[j].id;
                const dx = pos[b].x - pos[a].x;
                const dy = pos[b].y - pos[a].y;
                const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);

                // Repulsion
                const repulse = 8000 / (dist * dist);
                const fx = (dx / dist) * repulse;
                const fy = (dy / dist) * repulse;
                pos[a].x -= fx; pos[a].y -= fy;
                pos[b].x += fx; pos[b].y += fy;

                // Attraction for connected nodes
                const key1 = `${a}-${b}`, key2 = `${b}-${a}`;
                if (edgeSet.has(key1) || edgeSet.has(key2)) {
                    const attract = (dist - 120) * 0.01;
                    const afx = (dx / dist) * attract;
                    const afy = (dy / dist) * attract;
                    pos[a].x += afx; pos[a].y += afy;
                    pos[b].x -= afx; pos[b].y -= afy;
                }
            }
        }
        // Keep in bounds
        for (const id in pos) {
            pos[id].x = Math.max(40, Math.min(width - 40, pos[id].x));
            pos[id].y = Math.max(40, Math.min(height - 40, pos[id].y));
        }
    }
    return pos;
}

export default function NetworkGraph({ topology, qlPath, djPath, source, dest, onNodeClick, SimulationPackets }) {
    const WIDTH = 700, HEIGHT = 400;
    const [positions, setPositions] = useState({});
    const [isHeatmapActive, setIsHeatmapActive] = useState(false);

    useEffect(() => {
        if (topology?.nodes?.length) {
            setPositions(computeLayout(topology.nodes, topology.edges, WIDTH, HEIGHT));
        }
    }, [topology]);

    if (!topology?.nodes?.length) {
        return (
            <div className="relative bg-bg-secondary/50 border border-border-glass rounded-xl overflow-hidden min-h-[400px] flex items-center justify-center">
                <span className="text-text-muted flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-accent-blue"></span>
                    Loading network...
                </span>
            </div>
        );
    }

    const qlSet = new Set();
    const djSet = new Set();
    if (qlPath) for (let i = 0; i < qlPath.length - 1; i++) qlSet.add(`${qlPath[i]}-${qlPath[i + 1]}`);
    if (djPath) for (let i = 0; i < djPath.length - 1; i++) djSet.add(`${djPath[i]}-${djPath[i + 1]}`);

    // De-duplicate edges
    const drawnEdgesForRender = new Set();
    const uniqueEdges = (topology.edges || []).filter(e => {
        const key = `${Math.min(e.source, e.target)}-${Math.max(e.source, e.target)}`;
        if (drawnEdgesForRender.has(key)) return false;
        drawnEdgesForRender.add(key);
        return true;
    });

    // Heatmap load calculation
    const edgeLoad = {};
    if (SimulationPackets && SimulationPackets.length > 0) {
        SimulationPackets.forEach(pkt => {
            if (!pkt.path || pkt.path.length < 2) return;
            for (let i = 0; i < pkt.path.length - 1; i++) {
                const k1 = `${pkt.path[i]}-${pkt.path[i+1]}`;
                const k2 = `${pkt.path[i+1]}-${pkt.path[i]}`;
                edgeLoad[k1] = (edgeLoad[k1] || 0) + 1;
                edgeLoad[k2] = (edgeLoad[k2] || 0) + 1;
            }
        });
    }
    const maxLoad = Math.max(...Object.values(edgeLoad), 1);

    return (
        <div className="relative bg-[#0d1326] border border-border-glass rounded-xl overflow-hidden min-h-[400px] w-full flex items-center justify-center">
            
            {/* Heatmap Toggle & Debug Info */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
                <button
                    onClick={() => setIsHeatmapActive(!isHeatmapActive)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-lg ${
                        isHeatmapActive 
                            ? 'bg-red-500/20 text-red-500 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                            : 'bg-bg-secondary/80 text-text-muted border-border-glass hover:text-white backdrop-blur-md'
                    }`}
                >
                    <Flame size={14} className={isHeatmapActive ? 'animate-pulse text-red-500' : ''} />
                    HEATMAP {isHeatmapActive ? 'ON' : 'OFF'}
                </button>
                
                {isHeatmapActive && (
                    <div className="bg-bg-secondary/80 border border-border-glass backdrop-blur-md rounded-lg p-2 text-[10px] text-text-muted flex flex-col gap-1">
                        <div className="flex justify-between gap-4"><span>Packets:</span> <span className="text-white">{(SimulationPackets || []).length}</span></div>
                        <div className="flex justify-between gap-4"><span>Max Link Load:</span> <span className="text-white">{maxLoad - 1}</span></div>
                    </div>
                )}
            </div>

            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto max-h-[500px]">
                {/* Edges */}
                {uniqueEdges.map((e, i) => {
                    const from = positions[e.source];
                    const to = positions[e.target];
                    if (!from || !to) return null;

                    const fwdKey = `${e.source}-${e.target}`;
                    const revKey = `${e.target}-${e.source}`;
                    const isQL = qlSet.has(fwdKey) || qlSet.has(revKey);
                    const isDJ = djSet.has(fwdKey) || djSet.has(revKey);

                    let stroke = 'rgba(255,255,255,0.08)';
                    let strokeWidth = 1.5;
                    let dropShadow = 'none';

                    if (isHeatmapActive) {
                        const loads = Object.values(edgeLoad);
                        const sortedLoads = [...loads].sort((a, b) => a - b);
                        const currentLoad = edgeLoad[fwdKey] || 0;
                        
                        // Percentile calculation
                        const getPercentile = (val) => {
                            if (loads.length === 0 || val === 0) return 0;
                            const idx = sortedLoads.lastIndexOf(val);
                            return (idx + 1) / sortedLoads.length;
                        };

                        const percentile = getPercentile(currentLoad);
                        const congestion = e.congestion || 0;
                        
                        // Combined heat: prioritizing traffic then base congestion
                        const totalHeat = Math.max(percentile, congestion);

                        if (totalHeat > 0.8 || (percentile > 0.8 && currentLoad > 0)) {
                            stroke = '#ff4444'; // Red
                            strokeWidth = 4;
                            dropShadow = 'drop-shadow(0 0 8px rgba(255, 68, 68, 0.6))';
                        } else if (totalHeat > 0.4 || (percentile > 0.5 && currentLoad > 0)) {
                            stroke = '#ffaa00'; // Orange
                            strokeWidth = 3;
                            dropShadow = 'drop-shadow(0 0 6px rgba(255, 170, 0, 0.4))';
                        } else if (totalHeat > 0.1 || (percentile > 0.1 && currentLoad > 0)) {
                            stroke = '#00ffcc'; // Cyan
                            strokeWidth = 2.2;
                        } else {
                            stroke = '#3b82f6'; // Blue
                            strokeWidth = 1.8;
                        }
                    } else {
                        if (isQL && isDJ) { stroke = '#f59e0b'; strokeWidth = 3; }
                        else if (isQL) { stroke = '#3b82f6'; strokeWidth = 2.5; }
                        else if (isDJ) { stroke = '#10b981'; strokeWidth = 2.5; }
                    }

                    return (
                        <motion.line key={i}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1, stroke, strokeWidth }}
                            transition={{ duration: 0.5, delay: i * 0.01 }}
                            x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                            stroke={stroke} strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            className={((isQL || isDJ) && !isHeatmapActive) ? "animate-pulse" : ""}
                            style={{ filter: dropShadow, transition: 'stroke 0.3s, stroke-width 0.3s' }}
                        />
                    );
                })}

                {/* Packet Swarm */}
                {SimulationPackets && SimulationPackets.length > 0 && SimulationPackets.map((pkt, i) => {
                    if (pkt.path.length < 2 || !pkt.path.every(id => positions[id])) return null;
                    return (
                        <motion.circle
                            key={pkt.id}
                            r={4}
                            fill={pkt.type === 'ql' ? '#60a5fa' : '#10b981'}
                            animate={{
                                cx: pkt.path.map(id => positions[id].x),
                                cy: pkt.path.map(id => positions[id].y),
                                opacity: pkt.path.map((_, idx) => (idx === 0 || idx === pkt.path.length - 1 ? 0 : 1)),
                            }}
                            transition={{ duration: pkt.path.length * 0.20, delay: (i % 100) * 0.05, ease: "linear" }}
                            style={{ filter: `drop-shadow(0 0 5px ${pkt.type === 'ql' ? '#60a5fa' : '#10b981'})` }}
                        />
                    );
                })}

                {/* Main Path Packet Animations */}
                {qlPath && qlPath.length > 1 && qlPath.every(id => positions[id]) && (
                    <motion.circle r={6} fill="#60a5fa"
                        animate={{ cx: qlPath.map(id => positions[id].x), cy: qlPath.map(id => positions[id].y) }}
                        transition={{ duration: qlPath.length * 0.5, repeat: Infinity, ease: "linear" }}
                        style={{ filter: 'drop-shadow(0 0 8px #60a5fa)' }}
                    />
                )}
                {djPath && djPath.length > 1 && djPath.every(id => positions[id]) && (
                    <motion.circle r={6} fill="#10b981"
                        animate={{ cx: djPath.map(id => positions[id].x), cy: djPath.map(id => positions[id].y) }}
                        transition={{ duration: djPath.length * 0.5, repeat: Infinity, ease: "linear" }}
                        style={{ filter: 'drop-shadow(0 0 8px #10b981)' }}
                    />
                )}

                {/* Nodes */}
                {topology.nodes.map((node, i) => {
                    const p = positions[node.id];
                    if (!p) return null;

                    const isSource = node.id === source;
                    const isDest = node.id === dest;
                    const inQL = qlPath?.includes(node.id);
                    const inDJ = djPath?.includes(node.id);

                    let fill = '#1e293b';
                    let strokeColor = 'rgba(255,255,255,0.15)';
                    let r = 18;
                    
                    if (isSource) { fill = '#3b82f6'; strokeColor = '#60a5fa'; r = 22; }
                    else if (isDest) { fill = '#ef4444'; strokeColor = '#f87171'; r = 22; }
                    else if (inQL && inDJ) { fill = '#f59e0b'; strokeColor = '#fbbf24'; }
                    else if (inQL) { fill = 'rgba(59,130,246,0.5)'; strokeColor = '#3b82f6'; }
                    else if (inDJ) { fill = 'rgba(16,185,129,0.5)'; strokeColor = '#10b981'; }

                    return (
                        <motion.g key={node.id} 
                            onClick={() => onNodeClick?.(node.id)} 
                            className="cursor-pointer"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20, delay: i * 0.02 }}
                            whileHover={{ scale: 1.15 }}
                        >
                            <circle cx={p.x} cy={p.y} r={r} fill={fill} stroke={strokeColor} strokeWidth={2} 
                                style={{ filter: (isSource || isDest || inQL || inDJ) ? `drop-shadow(0 0 8px ${strokeColor})` : 'none' }}
                            />
                            <text x={p.x} y={p.y + 1} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={11} fontWeight={600} style={{ pointerEvents: 'none' }}>
                                {node.id}
                            </text>
                        </motion.g>
                    );
                })}
            </svg>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-4 text-[11px] font-medium p-2 px-4 rounded-xl bg-bg-secondary/70 border border-border-glass backdrop-blur-md">
                {isHeatmapActive ? (
                    <div className="flex items-center gap-4 w-full">
                        <span className="text-text-muted">Traffic Density:</span>
                        <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 via-orange-400 to-red-500"></div>
                        <div className="flex justify-between w-full absolute left-0 px-4 -bottom-1">
                            {/* Logic purely for visual spacing in the flex container above */}
                        </div>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor: '#3b82f6'}}></span> Low</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor: '#ffaa00'}}></span> Mid</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor: '#ff4444'}}></span> High</span>
                    </div>
                ) : (
                    <>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-accent-blue shadow-glow-blue"></span> Q-Learning Path</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-accent-green shadow-glow-green"></span> Dijkstra Path</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-accent-orange shadow-glow-green"></span> Overlapping Path</span>
                        <span className="flex items-center gap-1.5 ml-auto"><span className="w-3 h-3 rounded-full bg-accent-blue border-2 border-blue-400"></span> Source</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 bg-accent-red border-red-400"></span> Destination</span>
                    </>
                )}
            </div>
        </div>
    );
}
