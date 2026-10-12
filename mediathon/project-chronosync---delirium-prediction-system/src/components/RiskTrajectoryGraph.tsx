import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, Layers, AlertCircle } from 'lucide-react';
import type { PatientDashboardState } from '../types/chronosync';

interface RiskTrajectoryGraphProps {
  history: PatientDashboardState['history'];
  currentRisk: number;
}

export const RiskTrajectoryGraph: React.FC<RiskTrajectoryGraphProps> = ({
  history,
  currentRisk,
}) => {
  const chartData = history.map((point) => ({
    hour: `T+${point.post_op_hour}h`,
    rawHour: point.post_op_hour,
    risk: point.delirium_risk_index,
    mismatch: point.circadian_mismatch_percentage,
    nlpScore: (point.nlp_confusion_score * 100),
    hrv: point.hrv_rmssd,
    motion: (point.motor_restlessness_index * 100),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs font-sans">
          <div className="font-mono font-bold text-cyan-300 border-b border-slate-800 pb-1.5 mb-2">
            Timeline Point: {label}
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Delirium Risk Index:</span>
              <span className={`font-mono font-bold ${
                data.risk > 70 ? 'text-rose-400' : data.risk >= 30 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {data.risk}%
              </span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Circadian Mismatch:</span>
              <span className="font-mono font-semibold text-cyan-400">
                {data.mismatch}%
              </span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">HRV RMSSD:</span>
              <span className="font-mono text-slate-200">{data.hrv} ms</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Restlessness (Actigraphy):</span>
              <span className="font-mono text-violet-300">{(data.motion).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
            Continuous Risk Trajectory
          </span>
          <h2 className="text-lg font-bold text-slate-100 mt-0.5">
            Temporal Delirium Trajectory Over Post-Op Hours
          </h2>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-rose-400">
            <span className="w-3 h-0.5 bg-rose-500 rounded" />
            Delirium Risk Index
          </span>
          <span className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-3 h-0.5 bg-cyan-400 border-dashed rounded" />
            Circadian Mismatch
          </span>
        </div>
      </div>

      {/* Trajectory Area Chart */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.45} />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="mismatchGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="hour"
              stroke="#64748b"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              stroke="#64748b"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              ticks={[0, 30, 70, 100]}
              unit="%"
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Delirium Clinical Cutoff References */}
            <ReferenceLine
              y={70}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'CRITICAL (70%)',
                position: 'insideTopRight',
                fill: '#ef4444',
                fontSize: 10,
                fontFamily: 'monospace',
              }}
            />
            <ReferenceLine
              y={30}
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'STABLE (<30%)',
                position: 'insideBottomRight',
                fill: '#10b981',
                fontSize: 10,
                fontFamily: 'monospace',
              }}
            />

            {/* Mismatch Trace */}
            <Area
              type="monotone"
              dataKey="mismatch"
              stroke="#06b6d4"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              fillOpacity={1}
              fill="url(#mismatchGradient)"
            />

            {/* Delirium Risk Trace */}
            <Area
              type="monotone"
              dataKey="risk"
              stroke="#f43f5e"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#riskGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Trajectory Insight Strip */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>
            Current dynamic trajectory: {currentRisk > 70 ? 'Acute peak exceeding 70% threshold' : currentRisk >= 30 ? 'Trending upward in sub-syndromal envelope' : 'Resting stably within baseline post-op envelope'}
          </span>
        </div>
        <div className="font-mono text-[11px] text-slate-500">
          Resolution: Continuous multi-epoch telemetry ingestion
        </div>
      </div>
    </div>
  );
};
