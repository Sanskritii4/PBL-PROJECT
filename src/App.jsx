/**
 * App.jsx — Root component that wires together all panels.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import NetworkGraph from './components/NetworkGraph';
import ControlPanel from './components/ControlPanel';
import ComparisonView from './components/ComparisonView';
import LearningCurve from './components/LearningCurve';
import BatchComparison from './components/BatchComparison';
import { getNetwork, getMetrics } from './services/api';

export default function App() {
    const [topology, setTopology] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [routeResult, setRouteResult] = useState(null);
    const [isTrained, setIsTrained] = useState(false);
    const [loading, setLoading] = useState(null);
    const [liveTrainingData, setLiveTrainingData] = useState([]);
    const [isTrainingLive, setIsTrainingLive] = useState(false);
    const [isChaosMode, setIsChaosMode] = useState(false);
    const [simulationPackets, setSimulationPackets] = useState([]);

    useEffect(() => {
        getNetwork()
            .then(data => setTopology(data))
            .catch(err => console.error('Failed to fetch network:', err));
        getMetrics()
            .then(data => { setMetrics(data); setIsTrained(data.is_trained); })
            .catch(() => { });
    }, []);

    const handleTopologyChange = (data) => {
        setTopology(data);
        setRouteResult(null);
        setIsTrained(false);
        setMetrics(null);
        setLiveTrainingData([]);
        setSimulationPackets([]);
    };

    const handleTrainProgress = (progressData) => {
        setLiveTrainingData(prev => [...prev, progressData]);
    };

    const handleTrainStart = () => {
        setLiveTrainingData([]);
        setIsTrainingLive(true);
    };

    const handleTrainComplete = async (result) => {
        setIsTrained(true);
        setIsTrainingLive(false);
        try {
            const m = await getMetrics();
            setMetrics(m);
        } catch (err) {
            console.error(err);
        }
    };

    const handleRouteResult = (result) => {
        setRouteResult(result);
    };

    return (
        <div className="min-h-screen bg-bg-primary text-text-primary p-4 md:p-6 font-sans antialiased max-w-[1600px] mx-auto">
            {/* Header */}
            <motion.header 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center justify-between p-4 px-6 mb-6 bg-bg-glass border border-border-glass rounded-2xl backdrop-blur-xl shadow-lg"
            >
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    🧬 AI Adaptive Packet Routing
                </h1>
                <div className="flex gap-3 items-center">
                    <motion.span 
                        layout
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${isTrained ? 'bg-green-500/15 text-accent-green border border-green-500/30 shadow-glow-green' : 'bg-orange-500/15 text-accent-orange border border-orange-500/30'}`}
                    >
                        {isTrained ? '✓ Model Trained' : '○ Untrained'}
                    </motion.span>
                    {isChaosMode && (
                        <motion.span 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/50 shadow-glow-red animate-pulse"
                        >
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            CHAOS MODE ACTIVE
                        </motion.span>
                    )}
                    {topology && (
                        <motion.span 
                            layout
                            className="hidden md:inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-accent-blue border border-blue-500/30"
                        >
                            {topology.metadata.node_count} nodes · {topology.metadata.edge_count} edges
                        </motion.span>
                    )}
                </div>
            </motion.header>

            {/* Main grid: sidebar + content */}
            <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">
                {/* Sidebar */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    <ControlPanel
                        topology={topology}
                        onTopologyChange={handleTopologyChange}
                        onTrainComplete={handleTrainComplete}
                        onTrainProgress={handleTrainProgress}
                        onTrainStart={handleTrainStart}
                        onRouteResult={handleRouteResult}
                        routeResult={routeResult}
                        isTrained={isTrained}
                        setLoading={setLoading}
                        loading={loading}
                        isChaosMode={isChaosMode}
                        setIsChaosMode={setIsChaosMode}
                    />
                </motion.div>

                {/* Content area */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex flex-col gap-6"
                >
                    {/* Network graph */}
                    <div className="bg-bg-card border border-border-glass rounded-2xl p-5 backdrop-blur-lg shadow-lg hover:border-blue-500/30 transition-colors duration-300">
                        <div className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-4 flex items-center gap-2">
                            <span>🌐</span> Network Topology
                        </div>
                        <NetworkGraph
                            topology={topology}
                            qlPath={routeResult?.ql?.path}
                            djPath={routeResult?.dj?.path}
                            source={routeResult?.source}
                            dest={routeResult?.dest}
                            SimulationPackets={simulationPackets}
                            onTopologyChange={handleTopologyChange}
                        />
                    </div>

                    {/* Charts grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Route comparison */}
                        <div className="h-full">
                            <ComparisonView routeResult={routeResult} />
                        </div>

                        {/* Learning curve */}
                        <div className="h-full">
                            <LearningCurve
                                metrics={metrics}
                                liveData={liveTrainingData}
                                isLive={isTrainingLive}
                            />
                        </div>

                        {/* Batch comparison */}
                        <div className="lg:col-span-2">
                            <BatchComparison 
                                isTrained={isTrained} 
                                setSimulationPackets={setSimulationPackets}
                            />
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
