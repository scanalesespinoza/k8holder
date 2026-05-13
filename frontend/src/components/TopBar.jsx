import React from 'react';
import { Search, Bell, Plus } from 'lucide-react';

const TopBar = ({ connected = false }) => {
  return (
    <header className="h-20 border-b border-white/5 bg-cyber-bg-light/60 backdrop-blur-2xl flex items-center justify-between px-10 z-20">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1 max-w-2xl">
        <div className="relative w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Escudriñar el ecosistema (pods, servicios, trazas)..."
            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:bg-white/[0.05] transition-all placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-8">
        {/* Connection Status */}
        <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border shadow-[0_0_20px_rgba(34,211,238,0.05)] ${
          connected
            ? 'bg-cyan-500/5 border-cyan-500/20'
            : 'bg-rose-500/5 border-rose-500/20'
        }`}>
          <div className={`w-2.5 h-2.5 rounded-full ${
            connected
              ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-pulse'
              : 'bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.8)]'
          }`}></div>
          <span className={`text-[11px] font-bold uppercase tracking-[0.1em] ${
            connected ? 'text-cyan-400' : 'text-rose-400'
          }`}>
            {connected ? 'Sincronía Total' : 'Desconectado'}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all hover:bg-white/10 relative">
            <Bell size={22} />
            <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-4 border-cyber-bg-light"></span>
          </button>
          <button className="flex items-center gap-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black py-3 px-6 rounded-2xl transition-all shadow-2xl shadow-cyan-900/40 active:scale-95 tracking-widest uppercase">
            <Plus size={18} strokeWidth={3} />
            Instanciar
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
