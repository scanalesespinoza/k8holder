import React, { useState } from 'react';
import { Cpu, Box, Maximize2, Plus, RefreshCw, Trash2, Sparkles } from 'lucide-react';

const NodeCard = ({ node, onAIAction }) => {
  const [hovered, setHovered] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'Ready':
        return 'text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]';
      case 'warning':
        return 'text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)]';
      case 'error':
      case 'NotReady':
        return 'text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]';
      default:
        return 'text-slate-400';
    }
  };

  const getIrradiationStyle = (load) => {
    const intensity = load * 25;
    const color = load > 0.8 ? '244, 63, 94' : load > 0.5 ? '251, 191, 36' : '34, 211, 238';
    return {
      boxShadow: `0 0 ${intensity}px rgba(${color}, 0.2), inset 0 0 ${intensity/2}px rgba(${color}, 0.1)`,
      borderColor: `rgba(${color}, ${0.1 + load * 0.4})`
    };
  };

  const cpuPercent = node.efficiency?.cpu || node.cpu || 0;
  const memPercent = node.efficiency?.memory || node.mem || 0;
  const load = node.load || (cpuPercent / 100);
  const status = node.status || (cpuPercent > 80 ? 'warning' : 'healthy');
  const pods = node.pods || [];
  const podCount = Array.isArray(pods) ? pods.length : pods;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={getIrradiationStyle(load)}
      className={`
        relative group bg-gradient-to-br from-cyber-bg-card/80 to-cyber-bg-light/80 backdrop-blur-md border rounded-[2.5rem] p-8 transition-all duration-700 cursor-pointer
        ${hovered ? 'scale-[1.03] -translate-y-2' : ''}
      `}
    >
      {/* Header del Nodo */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-white font-black tracking-tight text-xl mb-1 flex items-center gap-3 uppercase">
            {node.name}
            <Maximize2 size={14} className="text-slate-600 group-hover:text-cyan-400 transition-all" />
          </h2>
          <div className="flex gap-3">
            <span className="text-[10px] font-mono text-cyan-500/60 bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/10">
              ID: {node.uid?.substring(0, 8) || 'unknown'}
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {node.zone || 'ZONE: US-EAST-1'}
            </span>
          </div>
        </div>
        <div className={`p-3 rounded-2xl bg-white/[0.03] border border-white/10 ${getStatusColor(status)} transition-all duration-500`}>
          <Cpu size={24} />
        </div>
      </div>

      {/* PODS VIVOS (Representación Visual del Ecosistema) */}
      <div className="flex flex-wrap gap-2.5 mb-10 min-h-[100px] content-start">
        {Array.from({ length: Math.min(podCount, 20) }).map((_, i) => (
          <div
            key={i}
            className={`
              w-12 h-12 rounded-xl flex items-center justify-center relative overflow-hidden transition-all duration-500
              ${status === 'error' && i % 3 === 0
                ? 'bg-rose-500/10 border-rose-500/30'
                : 'bg-cyan-500/5 border-cyan-500/10'
              }
              border hover:scale-110 hover:z-10 group-hover:border-cyan-400/30
            `}
          >
            <Box
              size={18}
              className={
                status === 'error' && i % 3 === 0
                  ? 'text-rose-500 animate-pulse'
                  : 'text-cyan-400/40 group-hover:text-cyan-400'
              }
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400/5 to-transparent"></div>
          </div>
        ))}
        {podCount < 20 && (
          <div className="w-12 h-12 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-slate-700 hover:border-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all cursor-crosshair">
            <Plus size={20} />
          </div>
        )}
      </div>

      {/* MÉTRICAS DE IRRADIACIÓN */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
            <span>Energía CPU</span>
            <span className={cpuPercent > 80 ? 'text-rose-400' : 'text-cyan-400'}>
              {cpuPercent.toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ease-out rounded-full ${
                cpuPercent > 80
                  ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                  : 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.5)]'
              }`}
              style={{ width: `${cpuPercent}%` }}
            ></div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
            <span>Masa Memoria</span>
            <span className="text-purple-400">{memPercent.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.5)] transition-all duration-1000 ease-out rounded-full"
              style={{ width: `${memPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* ACCIONES DE IA Y CONTROL */}
      <div className="pt-6 border-t border-white/5 flex gap-3 justify-between items-center">
        <div className="flex gap-2">
          {(status === 'error' || status === 'warning' || cpuPercent > 70) && (
            <button
              onClick={() => onAIAction('diagnose', node)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-400 text-[10px] font-black rounded-xl hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20"
            >
              <Sparkles size={12} /> DIAGNOSTICAR ✨
            </button>
          )}
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button className="p-3 rounded-xl bg-white/5 text-slate-500 hover:bg-rose-500/20 hover:text-rose-500 transition-colors">
            <Trash2 size={16} />
          </button>
          <button className="p-3 rounded-xl bg-white/5 text-slate-500 hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeCard;
