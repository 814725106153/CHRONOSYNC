import React from 'react';
import { X, CheckCircle2, RotateCw, Activity, Sliders, ShieldCheck } from 'lucide-react';
import type { BaselineStatistics } from '../types/chronosync';

interface BaselineCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseline: BaselineStatistics | null;
  patientId: string;
  onRecalibrate: () => Promise<void>;
  isCalibrating: boolean;
}

export const BaselineCalibrationModal: React.FC<BaselineCalibrationModalProps> = ({
  isOpen,
  onClose,
  baseline,
  patientId,
  onRecalibrate,
  isCalibrating,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase text-emerald-400 font-semibold tracking-wider">
                Stage A Normalization
              </span>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/60 font-mono">
                Active Baseline
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 mt-0.5">
              Individual Post-Op Baseline Calibration
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Established during the first 2–4 hours post-surgery to normalize individual patient autonomic and circadian variance.
            </p>
          </div>
        </div>

        {/* Baseline Metadata Strip */}
        <div className="grid grid-cols-3 gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 mb-6 text-xs font-mono">
          <div>
            <div className="text-slate-400 text-[11px]">Patient ID:</div>
            <div className="font-bold text-slate-100">{patientId}</div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">Calibration Window:</div>
            <div className="font-bold text-cyan-300">
              First {baseline?.post_op_calibration_window_hours || 4} Hours Post-Op
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">Sample Points:</div>
            <div className="font-bold text-emerald-300">
              {baseline?.sample_count || 30} Epochs
            </div>
          </div>
        </div>

        {/* Statistical Distribution Table (Mean mu & StdDev sigma) */}
        <div className="mb-6">
          <div className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-2">
            Dynamic Physiological Baselines (&mu; Mean &amp; &sigma; Std Dev)
          </div>

          <div className="bg-slate-950/60 rounded-xl border border-slate-800 overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase bg-slate-900/60">
                  <th className="p-3">Physiological Modality</th>
                  <th className="p-3 text-right">Baseline Mean (&mu;)</th>
                  <th className="p-3 text-right">Standard Dev (&sigma;)</th>
                  <th className="p-3 text-right">Target Range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                <tr>
                  <td className="p-3 text-slate-200 font-sans font-medium">HRV RMSSD</td>
                  <td className="p-3 text-right text-cyan-300">{baseline?.means.hrv_rmssd} ms</td>
                  <td className="p-3 text-right text-slate-400">&plusmn;{baseline?.stdevs.hrv_rmssd}</td>
                  <td className="p-3 text-right text-slate-400">25–60 ms</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-200 font-sans font-medium">HRV SDNN</td>
                  <td className="p-3 text-right text-cyan-300">{baseline?.means.hrv_sdnn} ms</td>
                  <td className="p-3 text-right text-slate-400">&plusmn;{baseline?.stdevs.hrv_sdnn}</td>
                  <td className="p-3 text-right text-slate-400">30–100 ms</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-200 font-sans font-medium">Respiration Rate</td>
                  <td className="p-3 text-right text-emerald-300">{baseline?.means.respiration_rate} bpm</td>
                  <td className="p-3 text-right text-slate-400">&plusmn;{baseline?.stdevs.respiration_rate}</td>
                  <td className="p-3 text-right text-slate-400">12–20 bpm</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-200 font-sans font-medium">Pupillary Reflex (PLR) Latency</td>
                  <td className="p-3 text-right text-amber-300">{baseline?.means.plr_latency} ms</td>
                  <td className="p-3 text-right text-slate-400">&plusmn;{baseline?.stdevs.plr_latency}</td>
                  <td className="p-3 text-right text-slate-400">&lt; 280 ms</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-200 font-sans font-medium">Pupil Constriction Velocity</td>
                  <td className="p-3 text-right text-amber-300">{baseline?.means.plr_constriction_velocity} mm/s</td>
                  <td className="p-3 text-right text-slate-400">&plusmn;{baseline?.stdevs.plr_constriction_velocity}</td>
                  <td className="p-3 text-right text-slate-400">&gt; 2.5 mm/s</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-200 font-sans font-medium">Motor Restlessness Index</td>
                  <td className="p-3 text-right text-violet-300">{baseline?.means.motor_restlessness}</td>
                  <td className="p-3 text-right text-slate-400">&plusmn;{baseline?.stdevs.motor_restlessness}</td>
                  <td className="p-3 text-right text-slate-400">&lt; 0.20 score</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Normalization Math Formula Explainer */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-400 mb-6">
          <div className="text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Zero-Touch Z-Score Deviation Normalization
          </div>
          <div>Z_metric = (X_current - &mu;_baseline) / &sigma;_baseline</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Dynamic Z-scores protect against false positives caused by inter-patient physiological variance.
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200 px-4 py-2 transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={onRecalibrate}
            disabled={isCalibrating}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isCalibrating ? 'animate-spin' : ''}`} />
            <span>{isCalibrating ? 'Recalibrating Window...' : 'Recalibrate Baseline (First 2–4 Hours)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
