import React from 'react';
import { X, BrainCircuit, MessageSquare } from 'lucide-react';

const AIModal = ({ open, type, data, response, loading, onClose }) => {
  if (!open) return null;

  const getTitle = () => {
    switch(type) {
      case 'diagnose':
        return `Diagnóstico de ${data?.name}`;
      case 'optimize':
        return 'Estrategia de Optimización';
      case 'report':
        return 'Oráculo del Clúster';
      default:
        return 'Análisis IA';
    }
  };

  const renderResponse = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-48 gap-6">
          <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
          <p className="text-cyan-400 font-bold animate-pulse uppercase tracking-[0.2em] text-xs">
            Sincronizando con el Núcleo Inteligente...
          </p>
        </div>
      );
    }

    if (!response) {
      return (
        <div className="text-center text-slate-500 py-12">
          No hay datos de análisis disponibles
        </div>
      );
    }

    // Format response based on type
    if (type === 'diagnose' && response.diagnosis) {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-cyan-400 font-bold uppercase text-sm tracking-wider mb-3">
              Diagnóstico
            </h3>
            <p className="text-lg leading-relaxed">{response.diagnosis}</p>
          </div>

          {response.rootCause && (
            <div>
              <h3 className="text-purple-400 font-bold uppercase text-sm tracking-wider mb-3">
                Causa Raíz
              </h3>
              <p className="text-lg leading-relaxed">{response.rootCause}</p>
            </div>
          )}

          {response.remediation && response.remediation.length > 0 && (
            <div>
              <h3 className="text-amber-400 font-bold uppercase text-sm tracking-wider mb-3">
                Pasos de Remediación
              </h3>
              <ol className="space-y-3">
                {response.remediation.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="text-cyan-400 font-bold">{i + 1}.</span>
                    <span className="flex-1 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      );
    }

    if (type === 'optimize' && response.recommendations) {
      return (
        <div className="space-y-6">
          {response.summary && (
            <p className="text-lg leading-relaxed text-cyan-100 border-l-4 border-cyan-500 pl-4">
              {response.summary}
            </p>
          )}

          <div className="space-y-4">
            {response.recommendations.map((rec, i) => (
              <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/10">
                <h4 className="text-cyan-400 font-bold mb-2 text-base">{rec.title}</h4>
                <p className="text-sm text-slate-300 mb-3">{rec.description}</p>
                <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
                  <span className="text-slate-500">Impacto: <span className="text-amber-400">{rec.impact}</span></span>
                  <span className="text-slate-500">Esfuerzo: <span className="text-purple-400">{rec.effort}</span></span>
                </div>
              </div>
            ))}
          </div>

          {response.potentialSavings && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
              <p className="text-emerald-400 font-bold">
                💰 Ahorro Potencial: {response.potentialSavings}
              </p>
            </div>
          )}
        </div>
      );
    }

    if (type === 'report' && response.sections) {
      return (
        <div className="space-y-6">
          {response.summary && (
            <p className="text-xl leading-relaxed first-letter:text-4xl first-letter:font-bold first-letter:text-cyan-400">
              {response.summary}
            </p>
          )}

          {response.sections.map((section, i) => (
            <div key={i}>
              <h3 className="text-cyan-400 font-bold uppercase text-sm tracking-wider mb-3">
                {section.title}
              </h3>
              <p className="text-base leading-relaxed text-slate-300">{section.content}</p>
            </div>
          ))}

          {response.metrics && (
            <div className="grid grid-cols-3 gap-4 p-6 rounded-2xl bg-white/5 border border-white/10">
              {Object.entries(response.metrics).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {key}
                  </div>
                  <div className="text-xl font-black text-cyan-400">{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Fallback: render as text
    return (
      <div className="prose prose-invert max-w-none">
        <div className="whitespace-pre-wrap font-medium text-lg leading-relaxed">
          {typeof response === 'string' ? response : JSON.stringify(response, null, 2)}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#0a0f18] border border-white/10 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(34,211,238,0.15)] flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-cyan-900/20 to-purple-900/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-500/20 rounded-2xl">
              <BrainCircuit className="text-cyan-400 w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                {getTitle()} ✨
              </h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                Análisis impulsado por Red Hat MaaS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-10 overflow-y-auto text-slate-300 leading-relaxed custom-scrollbar">
          {renderResponse()}

          {!loading && response && (
            <div className="mt-10 p-6 rounded-3xl bg-white/5 border border-white/5 flex items-start gap-4">
              <MessageSquare className="text-cyan-400 shrink-0" size={20} />
              <p className="text-xs text-slate-400 italic">
                Este análisis es generado dinámicamente analizando los flujos de energía y métricas de irradiación de tu infraestructura actual.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 bg-cyber-bg-light border-t border-white/5 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-2xl border border-white/5 transition-all"
          >
            Cerrar
          </button>
          <button className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-2xl transition-all shadow-xl shadow-cyan-900/20 active:scale-95">
            Ejecutar Remediación ✨
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIModal;
