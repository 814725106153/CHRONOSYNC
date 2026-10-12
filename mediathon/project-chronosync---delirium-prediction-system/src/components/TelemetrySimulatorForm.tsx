import React, { useState } from 'react';
import {
  Send,
  Zap,
  Sliders,
  Sparkles,
  Heart,
  Eye,
  Waves,
  FileText,
  RotateCcw,
  Play,
  Pause,
} from 'lucide-react';
import type { TelemetryPayload } from '../types/chronosync';

interface TelemetrySimulatorFormProps {
  patientId: string;
  currentTelemetry: TelemetryPayload;
  onSendTelemetry: (payload: TelemetryPayload) => Promise<void>;
  isSubmitting: boolean;
  isAutoStreaming: boolean;
  onToggleAutoStream: () => void;
}

export const TelemetrySimulatorForm: React.FC<TelemetrySimulatorFormProps> = ({
  patientId,
  currentTelemetry,
  onSendTelemetry,
  isSubmitting,
  isAutoStreaming,
  onToggleAutoStream,
}) => {
  const [hrvRmssd, setHrvRmssd] = useState<number>(currentTelemetry.hrv_rmssd || 35);
  const [hrvSdnn, setHrvSdnn] = useState<number>(currentTelemetry.hrv_sdnn || 50);
  const [respirationRate, setRespirationRate] = useState<number>(currentTelemetry.respiration_rate || 16);
  const [heartRate, setHeartRate] = useState<number>(currentTelemetry.heart_rate || 75);
  const [plrLatency, setPlrLatency] = useState<number>(
    currentTelemetry.pupillary_light_reflex_latency || 240
  );
  const [plrVelocity, setPlrVelocity] = useState<number>(
    currentTelemetry.pupil_constriction_velocity || 3.2
  );
  const [motorRestlessness, setMotorRestlessness] = useState<number>(
    currentTelemetry.motor_restlessness_index || 0.15
  );
  const [nursingNotes, setNursingNotes] = useState<string>(
    currentTelemetry.nursing_notes_text ||
      'Patient resting, calm, oriented to place and day.'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSendTelemetry({
      patient_id: patientId,
      hrv_rmssd: Number(hrvRmssd),
      hrv_sdnn: Number(hrvSdnn),
      respiration_rate: Number(respirationRate),
      heart_rate: Number(heartRate),
      pupillary_light_reflex_latency: Number(plrLatency),
      pupil_constriction_velocity: Number(plrVelocity),
      motor_restlessness_index: Number(motorRestlessness),
      nursing_notes_text: nursingNotes,
    });
  };

  // Clinical Scenario Presets
  const applyPreset = (preset: 'hyperactive' | 'hypoactive' | 'cholinergic' | 'stable') => {
    if (preset === 'hyperactive') {
      setHrvRmssd(16);
      setHrvSdnn(26);
      setRespirationRate(26);
      setHeartRate(104);
      setPlrLatency(365);
      setPlrVelocity(2.1);
      setMotorRestlessness(0.82);
      setNursingNotes(
        'Patient acutely disoriented to time and hospital, attempting to climb out of bed, pulling at peripheral IV cannula and telemetry leads. High agitation at 02:30.'
      );
    } else if (preset === 'hypoactive') {
      setHrvRmssd(24);
      setHrvSdnn(32);
      setRespirationRate(14);
      setHeartRate(64);
      setPlrLatency(390);
      setPlrVelocity(1.6);
      setMotorRestlessness(0.04);
      setNursingNotes(
        'Patient markedly lethargic, drifting to sleep during verbal interview, inattentive, unable to count backward from 10. Blank stare, flat affect.'
      );
    } else if (preset === 'cholinergic') {
      setHrvRmssd(28);
      setHrvSdnn(38);
      setRespirationRate(19);
      setHeartRate(82);
      setPlrLatency(420);
      setPlrVelocity(1.4);
      setMotorRestlessness(0.45);
      setNursingNotes(
        'Pupillary constriction notably sluggish. Patient reporting mild visual distortions and shadows in room corner. Mild restlessness.'
      );
    } else if (preset === 'stable') {
      setHrvRmssd(46);
      setHrvSdnn(62);
      setRespirationRate(15);
      setHeartRate(70);
      setPlrLatency(235);
      setPlrVelocity(3.6);
      setMotorRestlessness(0.11);
      setNursingNotes(
        'Patient resting comfortably in bed, oriented x4 (person, place, time, situation). Normal sleep-wake rhythm, conversational and calm.'
      );
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-4">
        <div>
          <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            Zero-Touch Ingestion Engine
          </span>
          <h2 className="text-lg font-bold text-slate-100 mt-0.5">
            Live Telemetry Input &amp; Clinical Scenario Simulator
          </h2>
        </div>

        {/* Streaming control */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleAutoStream}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
              isAutoStreaming
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            {isAutoStreaming ? (
              <>
                <Pause className="w-3.5 h-3.5 text-rose-400" />
                <span>Streaming Active (3s)</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-cyan-400" />
                <span>Start Live Stream</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preset Action Strip */}
      <div className="mb-4">
        <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2">
          Clinical Simulation Presets:
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyPreset('hyperactive')}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-700/50 transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <Zap className="w-3.5 h-3.5 text-rose-400" />
            Nocturnal Agitation (Hyperactive)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('hypoactive')}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-700/50 transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Somnolent / Hypoactive Delirium
          </button>
          <button
            type="button"
            onClick={() => applyPreset('cholinergic')}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-purple-950/50 hover:bg-purple-900/60 text-purple-300 border border-purple-700/50 transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <Eye className="w-3.5 h-3.5 text-purple-400" />
            Cholinergic Deficit (Sluggish PLR)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('stable')}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            Calm Sleep Envelope (Stable)
          </button>
        </div>
      </div>

      {/* Simulator Form Inputs */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Bedside Telemetry: HRV RMSSD */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-cyan-400" />
                HRV RMSSD
              </span>
              <span className="font-mono font-bold text-cyan-400">{hrvRmssd} ms</span>
            </div>
            <input
              type="range"
              min="10"
              max="75"
              step="1"
              value={hrvRmssd}
              onChange={(e) => setHrvRmssd(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>10ms (Vagal Drop)</span>
              <span>75ms (High Tone)</span>
            </div>
          </div>

          {/* Respiration Rate */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Respiration Rate</span>
              <span className="font-mono font-bold text-emerald-400">{respirationRate} bpm</span>
            </div>
            <input
              type="range"
              min="10"
              max="34"
              step="1"
              value={respirationRate}
              onChange={(e) => setRespirationRate(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>10 bpm</span>
              <span>34 bpm (Tachypnea)</span>
            </div>
          </div>

          {/* Actigraphy Motility Index */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <Waves className="w-3.5 h-3.5 text-violet-400" />
                Motor Restlessness
              </span>
              <span className="font-mono font-bold text-violet-400">{motorRestlessness.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.02"
              value={motorRestlessness}
              onChange={(e) => setMotorRestlessness(Number(e.target.value))}
              className="w-full accent-violet-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>0.0 (Quiet Sleep)</span>
              <span>1.0 (Agitation)</span>
            </div>
          </div>

          {/* PLR Latency */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                PLR Latency
              </span>
              <span className={`font-mono font-bold ${plrLatency > 350 ? 'text-rose-400' : 'text-amber-400'}`}>
                {plrLatency} ms
              </span>
            </div>
            <input
              type="range"
              min="190"
              max="450"
              step="5"
              value={plrLatency}
              onChange={(e) => setPlrLatency(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>190ms (Brisk)</span>
              <span>450ms (Sluggish)</span>
            </div>
          </div>
        </div>

        {/* Free-Text Nurse Clinical Observation Input */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              Nurse NLP Clinical Observation Text (Incoming Stream)
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Evaluated dynamically via Gemini 2.5 Flash
            </span>
          </div>
          <textarea
            rows={2}
            value={nursingNotes}
            onChange={(e) => setNursingNotes(e.target.value)}
            placeholder="Enter clinical bedside observation notes (e.g., patient restless, disoriented to time, attempting to get out of bed)..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Ingesting Stream...' : 'Send Live Telemetry Payload'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
