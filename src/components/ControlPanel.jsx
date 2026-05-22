/**
 * ControlPanel.jsx — Sidebar with topology controls, routing inputs, training, and failure simulation.
 */
import { useState, useRef, useEffect } from 'react';
import { Network, BrainCircuit, Activity, Zap, ShieldAlert, RefreshCcw, Cpu } from 'lucide-react';
import { createNetwork, routeQL, routeDijkstra, injectFailure, getNetwork } from '../services/api';

export default function ControlPanel({
    topology, onTopologyChange, onTrainComplete,
    onTrainProgress, onTrainStart,
    onRouteResult, routeResult, isTrained, setLoading, loading,
    isChaosMode, setIsChaosMode
}) {
    const [topoType, setTopoType] = useState('random');
    const [numNodes, setNumNodes] = useState(10);
    const [source, setSource] = useState(0);
    const [dest, setDest] = useState(9);
    const [episodes, setEpisodes] = useState(5000);
    const [status, setStatus] = useState(null);
    const [failSrc, setFailSrc] = useState(0);
    const [failDst, setFailDst] = useState(1);
    const [trainProgress, setTrainProgress] = useState(null);
    const wsRef = useRef(null);

    const nodes = topology?.nodes || [];

    // Chaos Mode Auto-Loop
    useEffect(() => {
        let interval;
        if (isChaosMode) {
            interval = setInterval(async () => {
                if (nodes.length < 2) return;
                try {
                    const getRandNode = () => nodes[Math.floor(Math.random() * nodes.length)].id;
                    const fSrc = getRandNode();
                    const fDst = getRandNode();
                    const rSrc = getRandNode();
                    const rDst = getRandNode();
                    
                    if (fSrc !== fDst) {
                        try { await injectFailure(fSrc, fDst, 'fail'); } catch(e) {}
                    }
                    if (rSrc !== rDst) {
                        try { await injectFailure(rSrc, rDst, 'restore'); } catch(e) {}
                    }
                    
                    // Refresh map
                    const updated = await getNetwork();
                    onTopologyChange(updated);
                    
                    // Auto recalculate routes if we are currently displaying them
                    if (isTrained && source !== dest && routeResult) {
                        const [ql, dj] = await Promise.all([
                            routeQL(source, dest),
                            routeDijkstra(source, dest),
                        ]);
                        onRouteResult({ ql, dj, source: parseInt(source), dest: parseInt(dest) });
                    }
                } catch (err) {
                    console.error("Chaos mode error", err);
                }
            }, 2500);
        }
        return () => clearInterval(interval);
    }, [isChaosMode, nodes, source, dest, isTrained, routeResult, onTopologyChange, onRouteResult]);

    const handleCreateNetwork = async () => {
        setLoading('network');
        setStatus(null);
        try {
            const data = await createNetwork(topoType, numNodes, 42);
            onTopologyChange(data);
            setStatus({ type: 'success', msg: `Network created: ${data.metadata.node_count} nodes` });
        } catch (err) {
            setStatus({ type: 'error', msg: err.response?.data?.detail || 'Failed to create network' });
        }
        setLoading(null);
    };

    const handleTrain = () => {
        setLoading('train');
        setTrainProgress(null);
        setStatus({ type: 'info', msg: 'Connecting to training stream...' });
        onTrainStart?.();

        // Build WebSocket URL relative to current host
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/train`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            setStatus({ type: 'info', msg: '🔴 LIVE — Training in progress...' });
            ws.send(JSON.stringify({ episodes }));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'progress') {
                setTrainProgress(data);
                onTrainProgress?.(data);
                setStatus({
                    type: 'info',
                    msg: `🔴 LIVE — Episode ${data.episode}/${data.total_episodes} | Delivery: ${data.delivery_rate}%`,
                });
            } else if (data.type === 'complete') {
                setTrainProgress(null);
                setLoading(null);
                onTrainComplete?.(data);
                setStatus({
                    type: 'success',
                    msg: `✓ Training complete! Delivery: ${data.delivery_rate_last_500}% | ${data.training_time_seconds}s`,
                });
                ws.close();
            } else if (data.type === 'error') {
                setTrainProgress(null);
                setLoading(null);
                setStatus({ type: 'error', msg: data.message });
                ws.close();
            }
        };

        ws.onerror = () => {
            setTrainProgress(null);
            setLoading(null);
            setStatus({ type: 'error', msg: 'WebSocket connection failed' });
        };

        ws.onclose = () => {
            wsRef.current = null;
        };
    };

    const handleRoute = async () => {
        if (source === dest) {
            setStatus({ type: 'error', msg: 'Source and destination must differ' });
            return;
        }
        setLoading('route');
        setStatus(null);
        try {
            const [ql, dj] = await Promise.all([
                routeQL(source, dest),
                routeDijkstra(source, dest),
            ]);
            onRouteResult({ ql, dj, source: parseInt(source), dest: parseInt(dest) });
            setStatus({ type: 'success', msg: 'Routes computed!' });
        } catch (err) {
            setStatus({ type: 'error', msg: err.response?.data?.detail || 'Routing failed' });
        }
        setLoading(null);
    };

    const handleFailure = async (action) => {
        setLoading('failure');
        try {
            await injectFailure(parseInt(failSrc), parseInt(failDst), action);
            const updated = await getNetwork();
            onTopologyChange(updated);
            setStatus({
                type: action === 'fail' ? 'error' : 'success',
                msg: action === 'fail'
                    ? `💥 Link ${failSrc}→${failDst} destroyed!`
                    : `🔧 Link ${failSrc}→${failDst} restored`
            });
        } catch (err) {
            setStatus({ type: 'error', msg: err.response?.data?.detail || 'Failure injection failed' });
        }
        setLoading(null);
    };

    const progressPercent = trainProgress
        ? Math.round((trainProgress.episode / trainProgress.total_episodes) * 100)
        : 0;

    return (
        <div className="flex flex-col gap-5 w-full">
            {/* Topology */}
            <div className="bg-bg-card border border-border-glass rounded-2xl p-5 backdrop-blur-lg shadow-lg hover:border-blue-500/30 transition-colors duration-300">
                <div className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-4 flex items-center gap-2">
                    <Network size={16} className="text-accent-blue" />
                    Network Topology
                </div>
                
                <div className="mb-4">
                    <label className="block text-xs font-medium text-text-secondary mb-1">Topology Type</label>
                    <select 
                        className="w-full p-2.5 bg-bg-secondary border border-border-glass rounded-lg text-sm text-text-primary focus:border-accent-blue outline-none transition-all cursor-pointer" 
                        value={topoType} 
                        onChange={e => setTopoType(e.target.value)}
                    >
                        <option value="random">Random (Erdős–Rényi)</option>
                        <option value="mesh">Full Mesh</option>
                        <option value="grid">Grid (2D)</option>
                    </select>
                </div>

                <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-medium text-text-secondary">Nodes</label>
                        <span className="text-xs font-bold text-accent-blue bg-blue-500/10 px-2 rounded">{numNodes}</span>
                    </div>
                    <input type="range" className="w-full accent-accent-blue cursor-pointer" min={4} max={20}
                        value={numNodes} onChange={e => setNumNodes(parseInt(e.target.value))}
                    />
                </div>

                <button 
                    className="w-full py-2.5 flex justify-center items-center gap-2 rounded-lg text-sm font-semibold bg-bg-secondary border border-border-glass text-text-primary hover:border-accent-blue hover:text-accent-blue hover:bg-accent-blue/5 transition-all active:scale-95 shadow-sm disabled:opacity-50"
                    onClick={handleCreateNetwork}
                    disabled={loading === 'network'}
                >
                    {loading === 'network' ? <RefreshCcw size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                    {loading === 'network' ? 'Creating...' : 'Reset Network'}
                </button>
            </div>

            {/* Training */}
            <div className="bg-bg-card border border-border-glass rounded-2xl p-5 backdrop-blur-lg shadow-lg hover:border-purple-500/30 transition-colors duration-300">
                <div className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-4 flex items-center gap-2">
                    <BrainCircuit size={16} className="text-accent-purple" />
                    Train Q-Agent
                    {loading === 'train' && (
                        <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-red-400 uppercase tracking-widest">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            Live
                        </span>
                    )}
                </div>
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-medium text-text-secondary">Episodes</label>
                        <span className="text-xs font-bold text-accent-purple bg-purple-500/10 px-2 rounded">{episodes}</span>
                    </div>
                    <input type="range" className="w-full accent-accent-purple cursor-pointer" min={1000} max={10000} step={500}
                        value={episodes} onChange={e => setEpisodes(parseInt(e.target.value))}
                        disabled={loading === 'train'}
                    />
                </div>

                {/* Live progress bar */}
                {trainProgress && (
                    <div className="mb-4 space-y-2">
                        <div className="w-full h-2 bg-bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-accent-blue rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] text-text-muted font-mono">
                            <span>{progressPercent}%</span>
                            <span>ε={trainProgress.epsilon}</span>
                            <span>DR={trainProgress.delivery_rate}%</span>
                        </div>
                    </div>
                )}

                <button 
                    className="w-full py-2.5 flex justify-center items-center gap-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-purple-500 to-accent-blue text-white shadow-lg hover:shadow-glow-blue transition-all transform hover:-translate-y-px disabled:opacity-50"
                    onClick={handleTrain}
                    disabled={loading === 'train'}
                >
                    {loading === 'train' ? <Cpu size={16} className="animate-spin" /> : <Cpu size={16} />}
                    {loading === 'train' ? `Training... ${progressPercent}%` : 'Train Model'}
                </button>
            </div>

            {/* Routing */}
            <div className="bg-bg-card border border-border-glass rounded-2xl p-5 backdrop-blur-lg shadow-lg hover:border-green-500/30 transition-colors duration-300">
                <div className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-4 flex items-center gap-2">
                    <Zap size={16} className="text-accent-green" />
                    Route Packet
                </div>
                <div className="mb-3">
                    <label className="block text-xs font-medium text-text-secondary mb-1">Source Node</label>
                    <select className="w-full p-2.5 bg-bg-secondary border border-border-glass rounded-lg text-sm text-text-primary focus:border-accent-green outline-none" value={source} onChange={e => setSource(parseInt(e.target.value))}>
                        {nodes.map(n => <option key={n.id} value={n.id}>Node {n.id}</option>)}
                    </select>
                </div>
                <div className="mb-4">
                    <label className="block text-xs font-medium text-text-secondary mb-1">Destination Node</label>
                    <select className="w-full p-2.5 bg-bg-secondary border border-border-glass rounded-lg text-sm text-text-primary focus:border-accent-green outline-none" value={dest} onChange={e => setDest(parseInt(e.target.value))}>
                        {nodes.map(n => <option key={n.id} value={n.id}>Node {n.id}</option>)}
                    </select>
                </div>
                
                <button 
                    className="w-full py-2.5 flex justify-center items-center gap-2 rounded-lg text-sm font-semibold bg-gradient-success text-white shadow-lg hover:shadow-glow-green transition-all transform hover:-translate-y-px disabled:opacity-50"
                    onClick={handleRoute}
                    disabled={!isTrained || loading === 'route'}
                >
                    {loading === 'route' ? <Activity size={16} className="animate-pulse" /> : <Activity size={16} />}
                    {loading === 'route' ? 'Computing...' : 'Compare Routes'}
                </button>
                
                {!isTrained &&
                    <div className="mt-3 text-xs text-accent-orange bg-orange-500/10 p-2 rounded border border-orange-500/20 text-center">
                        Train the model before routing
                    </div>
                }
            </div>

            {/* Network Failure Simulation */}
            <div className="bg-bg-card border border-border-glass rounded-2xl p-5 backdrop-blur-lg shadow-lg hover:border-red-500/30 transition-colors duration-300">
                <div className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-4 flex items-center gap-2">
                    <ShieldAlert size={16} className="text-accent-red" />
                    Failure Simulation
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">From</label>
                        <select className="w-full p-2 bg-bg-secondary border border-border-glass rounded-lg text-sm text-text-primary outline-none focus:border-accent-red" value={failSrc} onChange={e => setFailSrc(parseInt(e.target.value))}>
                            {nodes.map(n => <option key={n.id} value={n.id}>{n.id}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">To</label>
                        <select className="w-full p-2 bg-bg-secondary border border-border-glass rounded-lg text-sm text-text-primary outline-none focus:border-accent-red" value={failDst} onChange={e => setFailDst(parseInt(e.target.value))}>
                            {nodes.map(n => <option key={n.id} value={n.id}>{n.id}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        className="flex-1 py-2 flex justify-center items-center gap-1.5 rounded-lg text-xs font-semibold bg-gradient-danger text-white hover:shadow-lg transition-transform hover:-translate-y-px disabled:opacity-50"
                        onClick={() => handleFailure('fail')} disabled={loading === 'failure'}
                    >
                        🔥 Kill
                    </button>
                    <button 
                        className="flex-1 py-2 flex justify-center items-center gap-1.5 rounded-lg text-xs font-semibold bg-transparent border border-border-glass text-text-secondary hover:text-white hover:border-white transition-colors disabled:opacity-50"
                        onClick={() => handleFailure('restore')} disabled={loading === 'failure'}
                    >
                        🔧 Restore
                    </button>
                </div>
                
                <button 
                    className={`mt-4 w-full py-2.5 flex justify-center items-center gap-2 rounded-lg text-xs font-extrabold uppercase tracking-widest transition-all ${
                        isChaosMode 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                            : 'bg-bg-secondary border border-border-glass text-text-secondary hover:text-white hover:border-red-500/50'
                    }`}
                    onClick={() => setIsChaosMode(!isChaosMode)}
                >
                    {isChaosMode ? (
                        <>
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            Stop Chaos
                        </>
                    ) : '🌪️ Enable Chaos Mode'}
                </button>
                
                <div className="text-[11px] text-text-muted mt-3 text-center">
                    Kill a link manually, or use Chaos Mode to automate network failures
                </div>
            </div>

            {/* Status updates */}
            {status && (
                <div className={`p-3 text-xs font-medium rounded-lg mt-1 border animate-fade-in ${
                    status.type === 'error' ? 'bg-red-500/10 text-accent-red border-red-500/30' : 
                    status.type === 'success' ? 'bg-green-500/10 text-accent-green border-green-500/30' :
                    'bg-blue-500/10 text-accent-blue border-blue-500/30'
                }`}>
                    {status.msg}
                </div>
            )}
        </div>
    );
}
