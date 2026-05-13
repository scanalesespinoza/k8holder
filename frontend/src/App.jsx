import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import NodeCard from './components/NodeCard';
import AIModal from './components/AIModal';
import k8sApi from './services/k8sApi';
import aiService from './services/aiService';
import MAAS_CONFIG from './config/maas.config';

// Initialize AI service with Red Hat MaaS credentials
aiService.configure(MAAS_CONFIG);

function App() {
  const [activeTab, setActiveTab] = useState('overview');
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
        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-4xl font-black tracking-tighter mb-2 uppercase">
              Topología Viva
            </h1>
            <p className="text-slate-500 text-sm">
              Visualización en tiempo real del ecosistema de contenedores
            </p>
          </div>

          {/* Connection Status Message */}
          {!connected && (
            <div className="mb-8 p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></div>
              <p className="text-rose-400 font-bold">
                Conectando al cluster de Kubernetes...
              </p>
            </div>
          )}

          {/* Nodes Grid */}
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
            <div className="flex flex-col items-center justify-center h-96 gap-6">
              <div className="w-20 h-20 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
              <p className="text-slate-500 text-lg">
                {connected ? 'Escaneando nodos del cluster...' : 'Esperando conexión...'}
              </p>
            </div>
          )}
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
    </div>
  );
}

export default App;
