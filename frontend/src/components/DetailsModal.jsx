import React from 'react';
import { X, Server, Box, Cpu, HardDrive, Activity } from 'lucide-react';

/**
 * DetailsModal - Display detailed information about nodes or pods
 */
function DetailsModal({ open, data, type, onClose }) {
  if (!open || !data) return null;

  const isNode = type === 'node';
  const isPod = type === 'pod';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-cyber-card border-2 border-cyber-border rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 p-6 border-b border-cyber-border flex items-center justify-between">
            <div className="flex items-center gap-4">
              {isNode && <Server className="w-8 h-8 text-cyan-400" />}
              {isPod && <Box className="w-8 h-8 text-purple-400" />}
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight">
                  {isNode ? 'Node Details' : 'Pod Details'}
                </h2>
                <p className="text-sm text-slate-400">{data.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] custom-scrollbar">
            {isNode && <NodeDetails node={data} />}
            {isPod && <PodDetails pod={data} />}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * NodeDetails - Render node information
 */
function NodeDetails({ node }) {
  const avgUtil = ((node.efficiency?.cpu || 0) + (node.efficiency?.memory || 0)) / 2;

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Section title="Basic Information">
        <InfoRow label="Name" value={node.name} />
        <InfoRow label="Status" value={node.ready ? 'Ready' : 'NotReady'} />
        <InfoRow label="Schedulable" value={node.schedulable ? 'Yes' : 'No'} />
        <InfoRow label="Roles" value={node.roles?.join(', ') || 'Worker'} />
        <InfoRow label="Pods" value={`${node.pods?.length || 0} running`} />
      </Section>

      {/* Capacity */}
      <Section title="Capacity" icon={<HardDrive className="w-5 h-5" />}>
        <InfoRow
          label="CPU"
          value={`${(node.capacity?.cpu || 0).toFixed(1)} cores`}
        />
        <InfoRow
          label="Memory"
          value={`${((node.capacity?.memory || 0) / 1024).toFixed(1)} GB`}
        />
        <InfoRow
          label="Pods"
          value={`${node.capacity?.pods || 0} max`}
        />
      </Section>

      {/* Utilization */}
      <Section title="Utilization" icon={<Activity className="w-5 h-5" />}>
        <div className="space-y-4">
          <UtilizationBar
            label="CPU"
            value={node.efficiency?.cpu || 0}
          />
          <UtilizationBar
            label="Memory"
            value={node.efficiency?.memory || 0}
          />
          <UtilizationBar
            label="Overall"
            value={avgUtil}
          />
        </div>
      </Section>

      {/* Pods List */}
      {node.pods && node.pods.length > 0 && (
        <Section title={`Pods (${node.pods.length})`} icon={<Box className="w-5 h-5" />}>
          <div className="space-y-2">
            {node.pods.slice(0, 10).map((pod, i) => (
              <div
                key={i}
                className="p-3 bg-white/5 rounded-lg border border-white/10"
              >
                <div className="font-semibold text-sm">{pod.name}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {pod.namespace} • {pod.phase || 'Unknown'}
                </div>
              </div>
            ))}
            {node.pods.length > 10 && (
              <div className="text-center text-sm text-slate-500 pt-2">
                + {node.pods.length - 10} more pods
              </div>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

/**
 * PodDetails - Render pod information
 */
function PodDetails({ pod }) {
  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Section title="Basic Information">
        <InfoRow label="Name" value={pod.name} />
        <InfoRow label="Namespace" value={pod.namespace || 'N/A'} />
        <InfoRow label="Phase" value={pod.phase || 'Unknown'} />
        <InfoRow label="Node" value={pod.nodeName || 'N/A'} />
        {pod.deployment && <InfoRow label="Deployment" value={pod.deployment} />}
      </Section>

      {/* Containers */}
      {pod.containers && pod.containers.length > 0 && (
        <Section title={`Containers (${pod.containers.length})`} icon={<Box className="w-5 h-5" />}>
          <div className="space-y-4">
            {pod.containers.map((container, i) => (
              <div
                key={i}
                className="p-4 bg-white/5 rounded-lg border border-white/10"
              >
                <div className="font-semibold mb-2">{container.name}</div>
                <div className="text-xs text-slate-400 mb-2">{container.image}</div>
                <div className="text-xs">
                  <span className={`px-2 py-1 rounded ${
                    container.state === 'running'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {container.state || 'unknown'}
                  </span>
                </div>
                {container.usage && (
                  <div className="mt-3 space-y-2">
                    <UtilizationBar
                      label="CPU"
                      value={container.usage.cpu || 0}
                      small
                    />
                    <UtilizationBar
                      label="Memory"
                      value={(container.usage.memory || 0) / (container.resources?.requests?.memory || 1) * 100}
                      small
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Labels */}
      {pod.labels && Object.keys(pod.labels).length > 0 && (
        <Section title="Labels">
          <div className="flex flex-wrap gap-2">
            {Object.entries(pod.labels).map(([key, value]) => (
              <span
                key={key}
                className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded-full border border-cyan-500/30"
              >
                {key}: {value}
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

/**
 * Section wrapper
 */
function Section({ title, icon, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wide text-sm">
        {icon}
        <h3>{title}</h3>
      </div>
      <div className="pl-0">
        {children}
      </div>
    </div>
  );
}

/**
 * Info row
 */
function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-white/5">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className="font-semibold text-sm">{value}</span>
    </div>
  );
}

/**
 * Utilization bar
 */
function UtilizationBar({ label, value, small = false }) {
  const getColor = (val) => {
    if (val > 85) return 'bg-red-500';
    if (val > 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className={`text-slate-400 ${small ? 'text-xs' : 'text-sm'}`}>{label}</span>
        <span className={`font-bold ${small ? 'text-xs' : 'text-sm'}`}>{value.toFixed(0)}%</span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${getColor(value)} transition-all duration-300`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default DetailsModal;
