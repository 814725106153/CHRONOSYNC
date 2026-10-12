import React from 'react';
import { Waves, Zap, SunMoon, Eye, ArrowUpRight, TrendingUp } from 'lucide-react';
import type { PatientDashboardState } from '../types/chronosync';

interface CircadianMismatchCardProps {
  dashboard: PatientDashboardState;
}

export const CircadianMismatchCard: React.FC<CircadianMismatchCardProps> = ({ dashboard }) => {
  const mismatch = dashboard.circadian_mismatch_percentage;
  const z = dashboard.z_scores;

  const isSevere = mismatch >= 75;
  const isModerate = mismatch >= 40 && mismatch < 75;

  const accentColor = isSevere ? 'text-rose-400' : isModerate ? 'text-amber-400' : 'text-cyan-400';
  const borderColor = isSevere
    ? 'border-rose-500/30'
    : isModerate
    ? 'border-amber-500/30'
    : 'border-cyan-500/30';
  const badgeBg = isSevere
    ? 'bg-rose-950/60 text-rose-300'
    : isModerate
    ? 'bg-amber-950/60 text-amber-300'
    : 'bg-cyan-950/60 text-cyan-300';

  return (
    <div className={`bg-slate-900/90 border ${borderColor} rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between`}>
      {/* Glow effect */}
      <div
        className="absolute top-0 right-0 w-36 h-36 rounded-full pointer-events-none blur-3xl opacity-20 bg-cyan-400"
      />

      <div>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <SunMoon className="w-3.5 h-3.5 text-cyan-400" />
              Stage B Algorithmic Coupling
            </span>
            <h2 className="text-lg font-bold text-slate-100 mt-0.5">
              Autonomic-Circadian Mismatch
            </h2>
          </div>
          <span className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-full border border-slate-700 ${badgeBg}`}>
            {isSevere ? 'PHASE DECOUPLED' : isModerate ? 'PHASE DIVERGENCE' : 'SYNCHRONIZED'}
          </span>
        </div>

        {/* Big Display Metric */}
        <div className="flex items-baseline gap-3 my-4">
          <span className={`text-5xl font-black font-mono tracking-tight ${accentColor}`}>
            {mismatch.toFixed(0)}%
          </span>
          <div className="text-xs text-slate-400 leading-tight">
            <span className="font-semibold text-slate-200">Decoupling Index</span>
            <br />
            Ambient vs Autonomic phase shift
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Evaluates phase discordance between physiological autonomic strain (vagal tone collapse) and behavioral restlessness.
        </p>

        {/* Sub-Vector Component Gauges */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          {/* Autonomic Stress Z-Score */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>Autonomic Stress (|Z_HRV| &amp; Resp)</span>
              </span>
              <span className="font-mono font-semibold text-cyan-300">
                Z: {Math.abs(z.z_hrv).toFixed(2)}σ
              </span>
            </div>
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (Math.abs(z.z_hrv) / 3.0) * 100)}%` }}
              />
            </div>
          </div>

          {/* Actigraphy Motility Z-Score */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Waves className="w-3 h-3 text-violet-400" />
                <span>Behavioral Restlessness (|Z_Motion|)</span>
              </span>
              <span className="font-mono font-semibold text-violet-300">
                Z: {Math.abs(z.z_motion).toFixed(2)}σ
              </span>
            </div>
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (Math.abs(z.z_motion) / 3.0) * 100)}%` }}
              />
            </div>
          </div>

          {/* PLR Divergence */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3 h-3 text-amber-400" />
                <span>PLR Prolongation Divergence</span>
              </span>
              <span className="font-mono font-semibold text-amber-300">
                Z: {Math.max(0, z.z_plr).toFixed(2)}σ
              </span>
            </div>
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (Math.max(0, z.z_plr) / 3.0) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Formula Footnote */}
      <div className="mt-4 pt-2.5 border-t border-slate-800/80 text-[10px] font-mono text-slate-500 flex items-center justify-between">
        <span>Formula: min(100, (0.4·|Z_HRV| + 0.35·|Z_Mot| + 0.25·PLR_Div)·20)</span>
        <TrendingUp className="w-3 h-3 text-slate-500" />
      </div>
    </div>
  );
};
