import React from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Radio,
  Sliders,
  AlertTriangle,
  User,
  HeartPulse,
} from 'lucide-react';
import type { PatientDashboardState, PatientSummary } from '../types/chronosync';

interface HeaderBarProps {
  dashboard: PatientDashboardState | null;
  patients: PatientSummary[];
  selectedPatientId: string;
  onSelectPatient: (id: string) => void;
  isWsConnected: boolean;
  onOpenCalibration: () => void;
  isAutoStreaming: boolean;
  onToggleAutoStream: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  dashboard,
  patients,
  selectedPatientId,
  onSelectPatient,
  isWsConnected,
  onOpenCalibration,
  isAutoStreaming,
  onToggleAutoStream,
}) => {
  return (
    <header className="bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:px-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Left: Branding & Patient Info */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <Activity className="w-5 h-5 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold tracking-wider text-cyan-400 uppercase">
                  PROJECT CHRONOSYNC
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.5 rounded border border-slate-700">
                  PS4 CLINICAL SUITE
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight">
                Ambient Autonomic-Circadian Delirium Predictor
              </h1>
            </div>
          </div>

          <div className="hidden md:block h-8 w-[1px] bg-slate-800" />

          {/* ICU Bed Switcher */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
            <User className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select
              value={selectedPatientId}
              onChange={(e) => onSelectPatient(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-200 py-1 pr-3 focus:outline-none cursor-pointer"
            >
              {patients.map((p) => (
                <option key={p.patient_id} value={p.patient_id} className="bg-slate-900 text-slate-100">
                  {p.icu_bed} - {p.patient_name} ({p.delirium_risk_index}% Risk)
                </option>
              ))}
            </select>
          </div>

          {/* Patient Quick Details */}
          {dashboard && (
            <div className="hidden xl:flex items-center gap-3 text-xs text-slate-400">
              <span className="bg-slate-800/60 px-2 py-1 rounded text-slate-300">
                <strong className="text-slate-100">{dashboard.patient_name}</strong>, {dashboard.age}y
              </span>
              <span className="text-slate-400 truncate max-w-[200px]" title={dashboard.surgery_type}>
                {dashboard.surgery_type}
              </span>
            </div>
          )}
        </div>

        {/* Right: Telemetry Status, Post-Op Hour, Baseline Calibration Badge & Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          {/* Post-Op Hour Counter */}
          <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] text-slate-400 font-mono">POST-OP HOUR:</span>
            <span className="text-xs font-bold font-mono text-amber-300">
              {dashboard ? `T+${dashboard.post_op_hour}h` : 'T+--h'}
            </span>
          </div>

          {/* Baseline Calibration Badge */}
          <button
            onClick={onOpenCalibration}
            title="Click to view or recalibrate baseline window"
            className="flex items-center gap-1.5 bg-emerald-950/40 hover:bg-emerald-900/40 transition-colors border border-emerald-500/30 text-emerald-400 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate max-w-[190px] sm:max-w-none">
              Calibrated (First 2–4 Hours Baseline Applied)
            </span>
            <Sliders className="w-3 h-3 ml-1 text-emerald-300/70" />
          </button>

          {/* Auto-Stream Simulation Toggle */}
          <button
            onClick={onToggleAutoStream}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              isAutoStreaming
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700'
            }`}
            title="Toggle automated continuous ICU sensor data streaming every 3 seconds"
          >
            <HeartPulse className={`w-3.5 h-3.5 ${isAutoStreaming ? 'text-rose-400' : 'text-slate-400'}`} />
            <span>{isAutoStreaming ? 'Streaming Live' : 'Auto-Stream'}</span>
          </button>

          {/* Live WebSocket Connection Pill */}
          <div
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-[11px] font-mono ${
              isWsConnected
                ? 'bg-cyan-950/30 border-cyan-800/50 text-cyan-400'
                : 'bg-rose-950/30 border-rose-800/50 text-rose-400'
            }`}
            title={isWsConnected ? 'WebSocket live stream connected' : 'WebSocket disconnected'}
          >
            <Radio className={`w-3 h-3 ${isWsConnected ? 'animate-pulse text-cyan-400' : 'text-rose-400'}`} />
            <span>{isWsConnected ? 'LIVE FEED' : 'OFFLINE'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
