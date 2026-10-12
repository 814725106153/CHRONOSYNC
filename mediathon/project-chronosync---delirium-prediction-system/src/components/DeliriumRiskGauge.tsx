import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, CheckCircle, ShieldAlert, Sparkles, HelpCircle } from 'lucide-react';
import type { PatientDashboardState } from '../types/chronosync';

interface DeliriumRiskGaugeProps {
  dashboard: PatientDashboardState;
}

export const DeliriumRiskGauge: React.FC<DeliriumRiskGaugeProps> = ({ dashboard }) => {
  const score = dashboard.delirium_risk_index;

  // Determine severity tier & color palette
  let color = '#10B981'; // Green < 30%
  let label = 'Low Delirium Risk';
  let badgeBg = 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30';
  let glowColor = 'rgba(16, 185, 129, 0.25)';
  let icon = <CheckCircle className="w-5 h-5 text-emerald-400" />;

  if (score > 70) {
    color = '#EF4444'; // Red > 70%
    label = 'CRITICAL DELIRIUM RISK';
    badgeBg = 'bg-rose-950/70 text-rose-200 border-rose-500/40 animate-pulse';
    glowColor = 'rgba(239, 68, 68, 0.4)';
    icon = <ShieldAlert className="w-5 h-5 text-rose-400" />;
  } else if (score >= 30) {
    color = '#F59E0B'; // Amber 30-70%
    label = 'Moderate Risk (Sub-Syndromal)';
    badgeBg = 'bg-amber-950/60 text-amber-200 border-amber-500/40';
    glowColor = 'rgba(245, 158, 11, 0.3)';
    icon = <AlertTriangle className="w-5 h-5 text-amber-400" />;
  }

  // Semi-circle gauge representation (180 degrees)
  // Pie chart with startAngle 180 to endAngle 0
  const gaugeData = [
    { name: 'Score', value: score },
    { name: 'Remaining', value: 100 - score },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
      {/* Background ambient radial glow based on score */}
      <div
        className="absolute top-0 right-1/2 translate-x-1/2 w-48 h-48 rounded-full pointer-events-none blur-3xl opacity-30"
        style={{ backgroundColor: color }}
      />

      {/* Card Header */}
      <div className="flex items-start justify-between relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
              Primary Bedside Indicator
            </span>
            <div className="group relative cursor-pointer">
              <HelpCircle className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
              <div className="hidden group-hover:block absolute left-0 top-5 w-64 p-2 bg-slate-800 text-[11px] text-slate-300 rounded shadow-xl border border-slate-700 z-50">
                Temporal Fusion Index: 45% Autonomic-Circadian Mismatch + 30% Nurse NLP Disorientation + 25% Pupillary Delay.
              </div>
            </div>
          </div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mt-0.5">
            Delirium Risk Index
          </h2>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badgeBg}`}>
          {icon}
          <span>{label}</span>
        </div>
      </div>

      {/* Radial Gauge Visualizer */}
      <div className="relative h-44 flex items-center justify-center my-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={gaugeData}
              cx="50%"
              cy="75%"
              startAngle={180}
              endAngle={0}
              innerRadius={72}
              outerRadius={95}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              <Cell key="score" fill={color} />
              <Cell key="remaining" fill="#1e293b" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Big Number */}
        <div className="absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <div className="text-5xl font-black font-mono tracking-tight text-slate-100 drop-shadow-md">
            {score.toFixed(0)}
            <span className="text-2xl text-slate-400 font-sans ml-0.5">%</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">
            INDEX SCORE
          </div>
        </div>
      </div>

      {/* Scale Threshold Legend */}
      <div className="relative z-10 pt-2 border-t border-slate-800/80">
        <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono mb-1.5">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            &lt;30% Stable
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            30–70% Moderate
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            &gt;70% Critical
          </span>
        </div>

        {/* Quick Component Weight Breakdown Bar */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-slate-800/60 text-center">
          <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400">Mismatch (45%)</div>
            <div className="text-xs font-mono font-bold text-cyan-400">
              {(0.45 * dashboard.circadian_mismatch_percentage).toFixed(1)} pts
            </div>
          </div>
          <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400">NLP Notes (30%)</div>
            <div className="text-xs font-mono font-bold text-violet-400">
              {(0.30 * dashboard.nlp_confusion_score * 100).toFixed(1)} pts
            </div>
          </div>
          <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400">PLR Delay (25%)</div>
            <div className="text-xs font-mono font-bold text-amber-400">
              {(0.25 * dashboard.plr_score * 100).toFixed(1)} pts
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
