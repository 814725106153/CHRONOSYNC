import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Heart, Activity, Waves, Eye } from 'lucide-react';
import type { PatientDashboardState } from '../types/chronosync';

interface TelemetryTrendsGraphProps {
  history: PatientDashboardState['history'];
  current: PatientDashboardState['current_telemetry'];
}

export const TelemetryTrendsGraph: React.FC<TelemetryTrendsGraphProps> = ({ history, current }) => {
  const [selectedMetric, setSelectedMetric] = useState<'all' | 'hrv' | 'motion' | 'resp' | 'plr'>('all');

  const data = history.map((h) => ({
    time: `T+${h.post_op_hour}h`,
    hrv: h.hrv_rmssd,
    motionPct: Number((h.motor_restlessness_index * 100).toFixed(1)),
    resp: h.respiration_rate,
    plr: h.plr_latency,
  }));

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Passive Multi-Modal Ingestion Streams
          </span>
          <h2 className="text-lg font-bold text-slate-100 mt-0.5">
            Physiological &amp; Ambient Actigraphy Telemetry Trends
          </h2>
        </div>

        {/* Stream Filter Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setSelectedMetric('all')}
            className={`px-2.5 py-1 rounded transition-colors ${
              selectedMetric === 'all' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Synchronized
          </button>
          <button
            onClick={() => setSelectedMetric('hrv')}
            className={`px-2 py-1 rounded transition-colors ${
              selectedMetric === 'hrv' ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/50' : 'text-slate-400'
            }`}
          >
            HRV RMSSD
          </button>
          <button
            onClick={() => setSelectedMetric('motion')}
            className={`px-2 py-1 rounded transition-colors ${
              selectedMetric === 'motion' ? 'bg-violet-950 text-violet-300 border border-violet-700/50' : 'text-slate-400'
            }`}
          >
            Actigraphy
          </button>
          <button
            onClick={() => setSelectedMetric('plr')}
            className={`px-2 py-1 rounded transition-colors ${
              selectedMetric === 'plr' ? 'bg-amber-950 text-amber-300 border border-amber-700/50' : 'text-slate-400'
            }`}
          >
            PLR Latency
          </button>
        </div>
      </div>

      {/* Vitals Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {/* HRV RMSSD */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">HRV RMSSD</div>
            <div className="text-xl font-mono font-bold text-cyan-400">{current.hrv_rmssd} ms</div>
            <div className="text-[10px] text-slate-500 font-mono">Normal: 25–60 ms</div>
          </div>
          <Heart className="w-5 h-5 text-cyan-500/50 shrink-0" />
        </div>

        {/* Actigraphy Motility */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Motor Restlessness</div>
            <div className="text-xl font-mono font-bold text-violet-400">
              {current.motor_restlessness_index.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">Nocturnal &lt; 0.25</div>
          </div>
          <Waves className="w-5 h-5 text-violet-500/50 shrink-0" />
        </div>

        {/* Respiration */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Respiration Rate</div>
            <div className="text-xl font-mono font-bold text-emerald-400">{current.respiration_rate} bpm</div>
            <div className="text-[10px] text-slate-500 font-mono">Eupneic: 12–20 bpm</div>
          </div>
          <Activity className="w-5 h-5 text-emerald-500/50 shrink-0" />
        </div>

        {/* Pupillary Latency */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">PLR Latency</div>
            <div className={`text-xl font-mono font-bold ${
              current.pupillary_light_reflex_latency > 350 ? 'text-rose-400' : 'text-amber-400'
            }`}>
              {current.pupillary_light_reflex_latency} ms
            </div>
            <div className="text-[10px] text-slate-500 font-mono">Sluggish &gt; 350 ms</div>
          </div>
          <Eye className="w-5 h-5 text-amber-500/50 shrink-0" />
        </div>
      </div>

      {/* Multi-line Synchronized Chart */}
      <div className="h-56 sm:h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={11} fontFamily="monospace" />
            <YAxis stroke="#64748b" fontSize={11} fontFamily="monospace" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.75rem',
                fontSize: '11px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />

            {(selectedMetric === 'all' || selectedMetric === 'hrv') && (
              <Line
                name="HRV RMSSD (ms)"
                type="monotone"
                dataKey="hrv"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
              />
            )}
            {(selectedMetric === 'all' || selectedMetric === 'motion') && (
              <Line
                name="Restlessness (%)"
                type="monotone"
                dataKey="motionPct"
                stroke="#a855f7"
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
              />
            )}
            {(selectedMetric === 'all' || selectedMetric === 'resp') && (
              <Line
                name="Respiration (bpm)"
                type="monotone"
                dataKey="resp"
                stroke="#10b981"
                strokeWidth={1.5}
                dot={{ r: 2 }}
              />
            )}
            {(selectedMetric === 'all' || selectedMetric === 'plr') && (
              <Line
                name="PLR Latency / 5"
                type="monotone"
                dataKey={(d) => Math.round(d.plr / 5)}
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={{ r: 2 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
