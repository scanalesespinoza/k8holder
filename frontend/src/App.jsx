import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import NodeCard from './components/NodeCard';
import AIModal from './components/AIModal';
import DetailsModal from './components/DetailsModal';
import PhaserClusterMap from './components/PhaserClusterMap';
import k8sApi from './services/k8sApi';
import aiService from './services/aiService';
import MAAS_CONFIG from './config/maas.config';

// Initialize AI service with Red Hat MaaS credentials
aiService.configure(MAAS_CONFIG);

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'grid'
  const [nodes, setNodes] = useState([]);
  const [clusterStats, setClusterStats] = useState({
    nodes: 0,
    avgCpu: 0,
    avgMem: 0,
    totalMemory: '0GB'
  });
  const [connected, setConnected] = useState(false);
  const [aiModal, setAiModal] = useState({
    open: false,
    type: null,
    data: null,
    response: null,
    loading: false
  });
  const [detailsModal, setDetailsModal] = useState({
    open: false,
    type: null, // 'node' or 'pod'
    data: null
  });

  // Map API nodes to UI format
  const mapNodesToUI = (apiNodes) => {
    return apiNodes.map(node => ({
      ...node,
      uid: node.name, // Use name as uid if not provided
      status: node.ready ? 'Ready' : 'NotReady',
      zone: node.labels?.['topology.kubernetes.io/zone'] ||
            node.labels?.['failure-domain.beta.kubernetes.io/zone'] ||
            'unknown',
      cpu: node.efficiency?.cpu || 0,
      mem: node.efficiency?.memory || 0,
      load: (node.efficiency?.cpu || 0) / 100,
      pods: node.pods || []
    }));
  };

  // Fetch topology data
  const fetchTopology = async () => {
    try {
      const data = await k8sApi.getTopology();
      if (data && data.nodes) {
        const mappedNodes = mapNodesToUI(data.nodes);
        setNodes(mappedNodes);
        calculateClusterStats(mappedNodes);
        setConnected(true);
      }
    } catch (error) {
      console.error('Error fetching topology:', error);
      setConnected(false);
    }
  };

  // Calculate cluster statistics
  const calculateClusterStats = (nodesList) => {
    if (!nodesList || nodesList.length === 0) {
      setClusterStats({ nodes: 0, avgCpu: 0, avgMem: 0, totalMemory: '0GB' });
      return;
    }

    const totalCpu = nodesList.reduce((sum, node) => {
      const cpu = node.efficiency?.cpu || node.cpu || 0;
      return sum + cpu;
    }, 0);

    const totalMem = nodesList.reduce((sum, node) => {
      const mem = node.efficiency?.memory || node.mem || 0;
      return sum + mem;
    }, 0);

    const avgCpu = totalCpu / nodesList.length;
    const avgMem = totalMem / nodesList.length;

    // Estimate total memory (rough calculation)
    const memoryGB = Math.round(nodesList.length * 32); // Assume ~32GB per node average

    setClusterStats({
      nodes: nodesList.length,
      avgCpu: Math.round(avgCpu),
      avgMem: Math.round(avgMem),
      totalMemory: `${memoryGB}GB`
    });
  };

  // WebSocket connection
  useEffect(() => {
    fetchTopology();

    // Connect WebSocket for real-time updates
    k8sApi.connectWebSocket((message) => {
      if (message.type === 'resources-update' && message.data?.nodes) {
        const mappedNodes = mapNodesToUI(message.data.nodes);
        setNodes(mappedNodes);
        calculateClusterStats(mappedNodes);
        setConnected(true);
      } else if (message.type === 'connected') {
        console.log('✅ Connected to K8s backend');
        // Subscribe to resource updates
        if (k8sApi.ws && k8sApi.ws.readyState === WebSocket.OPEN) {
          k8sApi.ws.send(JSON.stringify({ type: 'subscribe-resources' }));
        }
      } else if (message.type === 'subscribed') {
        console.log('✅ Subscribed to resource updates');
      }
    });

    // Polling fallback if WebSocket fails
    const pollInterval = setInterval(fetchTopology, 30000); // Poll every 30s

    return () => {
      k8sApi.disconnectWebSocket();
      clearInterval(pollInterval);
    };
  }, []);

  // Handle AI actions
  const handleAIAction = async (type, data = null) => {
    setAiModal({
      open: true,
      type,
      data,
      response: null,
      loading: true
    });

    try {
      let response;

      switch (type) {
        case 'diagnose':
          response = await aiService.diagnoseNode(data);
          break;
        case 'optimize':
          response = await aiService.optimizeCluster(nodes);
          break;
        case 'report':
          response = await aiService.generateReport({
            nodes,
            stats: clusterStats
          });
          break;
        default:
          throw new Error(`Unknown AI action type: ${type}`);
      }

      setAiModal(prev => ({
        ...prev,
        response,
        loading: false
      }));
    } catch (error) {
      console.error('AI Action Error:', error);
      setAiModal(prev => ({
        ...prev,
        response: {
          error: 'No se pudo completar el análisis. Intenta nuevamente.'
        },
        loading: false
      }));
    }
  };

  const closeAIModal = () => {
    setAiModal({
      open: false,
      type: null,
      data: null,
      response: null,
      loading: false
    });
  };

  // Handle node/pod click from Phaser map
  const handleNodeClick = (node) => {
    setDetailsModal({
      open: true,
      type: 'node',
      data: node
    });
  };

  const handlePodClick = (pod) => {
    setDetailsModal({
      open: true,
      type: 'pod',
      data: pod
    });
  };

  const closeDetailsModal = () => {
    setDetailsModal({
      open: false,
      type: null,
      data: null
    });
  };

  return (
    <div className="flex h-screen bg-cyber-bg text-white overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        clusterStats={clusterStats}
        onAIAction={handleAIAction}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <TopBar connected={connected} />

        {/* Main View */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header with View Toggle */}
          <div className="p-6 pb-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-black tracking-tighter uppercase">
                  Topología Viva
                </h1>
                <p className="text-slate-500 text-sm">
                  Visualización en tiempo real del ecosistema de contenedores
                </p>
              </div>

              {/* View Mode Toggle */}
              <div className="flex gap-2 bg-white/5 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-4 py-2 rounded font-semibold text-sm transition-all ${
                    viewMode === 'map'
                      ? 'bg-cyan-500 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🗺️ Mapa Isométrico
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded font-semibold text-sm transition-all ${
                    viewMode === 'grid'
                      ? 'bg-cyan-500 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📊 Vista Grid
                </button>
              </div>
            </div>

            {/* Connection Status */}
            {!connected && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                <p className="text-rose-400 text-sm font-bold">
                  Conectando al cluster de Kubernetes...
                </p>
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {viewMode === 'map' ? (
              // Phaser Isometric Map
              <PhaserClusterMap
                nodes={nodes}
                onNodeClick={handleNodeClick}
                onPodClick={handlePodClick}
              />
            ) : (
              // Grid View (original)
              <div className="h-full overflow-y-auto p-6 custom-scrollbar">
                {nodes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {nodes.map((node) => (
                      <NodeCard
                        key={node.uid || node.name}
                        node={node}
                        onAIAction={handleAIAction}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-6">
                    <div className="w-20 h-20 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                    <p className="text-slate-500 text-lg">
                      {connected ? 'Escaneando nodos del cluster...' : 'Esperando conexión...'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* AI Modal */}
      <AIModal
        open={aiModal.open}
        type={aiModal.type}
        data={aiModal.data}
        response={aiModal.response}
        loading={aiModal.loading}
        onClose={closeAIModal}
      />

      {/* Details Modal (for nodes/pods clicked on map) */}
      <DetailsModal
        open={detailsModal.open}
        type={detailsModal.type}
        data={detailsModal.data}
        onClose={closeDetailsModal}
      />
    </div>
  );
}

export default App;
