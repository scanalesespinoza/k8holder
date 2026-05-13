import React from 'react';
import {
  Activity, Zap, Box, Database, ShieldCheck, Terminal,
  BrainCircuit, Layers, Settings
} from 'lucide-react';

const Sidebar = ({ activeTab, onTabChange, clusterStats, onAIAction }) => {
  return (
    <aside className="w-68 border-r border-white/5 bg-cyber-bg-light flex flex-col z-30 shadow-2xl">
      {/* Logo */}
      <div className="p-8 flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-tr from-cyan-600 via-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-900/30 rotate-3">
          <Layers className="text-white w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-white leading-none">
            K8<span className="text-cyan-400">HOLDER</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-bold tracking-widest mt-1">
            LIVING ECOSYSTEM
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-5 space-y-1.5 mt-2">
        <NavItem
          icon={<Activity size={18}/>}
          label="Topología Viva"
          active={activeTab === 'overview'}
          onClick={() => onTabChange('overview')}
        />
        <NavItem icon={<Zap size={18}/>} label="Flujos de Energía" />
        <NavItem icon={<Box size={18}/>} label="Cargas Activas" />
        <NavItem
          icon={<BrainCircuit size={18} className="text-purple-400"/>}
          label="Optimización ✨"
          badge="AI"
          onClick={() => onAIAction('optimize')}
        />

        <div className="pt-8 pb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
          Sistemas Nucleares
        </div>

        <NavItem icon={<Database size={18}/>} label="Persistencia" />
        <NavItem icon={<ShieldCheck size={18}/>} label="Blindaje de Red" />
        <NavItem icon={<Terminal size={18}/>} label="Consola Neural" />
      </nav>

      {/* Cluster Summary Panel */}
      <div className="m-5 p-5 rounded-3xl bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 backdrop-blur-xl">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">
            Bio-Estado
          </h3>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
        </div>
        <div className="space-y-4">
          <StatRow label="Nodos" value={clusterStats?.nodes || '0'} />
          <StatRow
            label="Carga CPU"
            value={`${clusterStats?.avgCpu || 0}%`}
            progress={clusterStats?.avgCpu || 0}
            color="bg-cyan-500"
          />
          <StatRow
            label="Memoria"
            value={clusterStats?.totalMemory || '0GB'}
            progress={clusterStats?.avgMem || 0}
            color="bg-purple-500"
          />
          <button
            onClick={() => onAIAction('report')}
            className="w-full mt-2 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold flex items-center justify-center gap-2 border border-white/5 transition-all text-cyan-400"
          >
            <BrainCircuit size={12} /> GENERAR REPORTE ✨
          </button>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-5 border-t border-white/5 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-cyan-500/20 p-0.5">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-cyan-900 to-slate-900"></div>
          </div>
          <div className="text-xs">
            <p className="text-white font-bold">Admin Root</p>
            <p className="text-slate-500 text-[9px] uppercase tracking-tighter">
              Conexión Segura
            </p>
          </div>
        </div>
        <Settings size={18} className="text-slate-500 hover:text-cyan-400 cursor-pointer transition-colors" />
      </div>
    </aside>
  );
};

const NavItem = ({ icon, label, active = false, badge = null, onClick }) => (
  <button
    onClick={onClick}
    className={`
      w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-500 relative group
      ${active
        ? 'bg-cyan-600/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_40px_rgba(34,211,238,0.1)]'
        : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
      }
    `}
  >
    <span className={`${active ? 'text-cyan-400' : 'text-slate-500 group-hover:text-cyan-400 transition-colors'} transition-all duration-300`}>
      {icon}
    </span>
    <span className="text-sm font-bold tracking-tight flex-1 text-left uppercase text-[11px]">
      {label}
    </span>
    {badge && (
      <span className="text-[9px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-lg font-black border border-purple-500/20">
        {badge}
      </span>
    )}
    {active && (
      <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]"></div>
    )}
  </button>
);

const StatRow = ({ label, value, progress = null, color = "bg-cyan-500" }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-300">{value}</span>
    </div>
    {progress !== null && (
      <div className="h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full opacity-60 shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all duration-1000`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    )}
  </div>
);

export default Sidebar;
