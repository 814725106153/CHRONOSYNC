/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  fetchPatients,
  fetchPatientDashboard,
  ingestTelemetryPayload,
  calibrateBaseline,
  connectTelemetryWebSocket,
} from './services/api';
import type {
  PatientDashboardState,
  PatientSummary,
  TelemetryPayload,
} from './types/chronosync';

import { HeaderBar } from './components/HeaderBar';
import { DeliriumRiskGauge } from './components/DeliriumRiskGauge';
import { CircadianMismatchCard } from './components/CircadianMismatchCard';
import { RiskTrajectoryGraph } from './components/RiskTrajectoryGraph';
import { TelemetryTrendsGraph } from './components/TelemetryTrendsGraph';
import { XaiAttributionPanel } from './components/XaiAttributionPanel';
import { NlpClinicalNotesPanel } from './components/NlpClinicalNotesPanel';
import { TelemetrySimulatorForm } from './components/TelemetrySimulatorForm';
import { BaselineCalibrationModal } from './components/BaselineCalibrationModal';
import {
  Activity,
  AlertTriangle,
  RefreshCw,
  Bell,
  Stethoscope,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

export default function App() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('BED-04');
  const [dashboard, setDashboard] = useState<PatientDashboardState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [isCalibrationModalOpen, setIsCalibrationModalOpen] = useState<boolean>(false);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [isAutoStreaming, setIsAutoStreaming] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const autoStreamIntervalRef = useRef<any>(null);

  // Show temporary toast message
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Load initial patients list
  const loadPatients = useCallback(async () => {
    try {
      const data = await fetchPatients();
      setPatients(data);
    } catch (e) {
      console.error('Failed to load patients list:', e);
    }
  }, []);

  // Load dashboard for selected patient
  const loadDashboard = useCallback(async (patientId: string) => {
    try {
      setIsLoading(true);
      const data = await fetchPatientDashboard(patientId);
      setDashboard(data);
    } catch (e) {
      console.error(`Failed to load dashboard for ${patientId}:`, e);
      triggerToast('Failed to load patient data from server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize
  useEffect(() => {
    loadPatients();
    loadDashboard(selectedPatientId);
  }, [selectedPatientId, loadPatients, loadDashboard]);

  // Connect WebSocket stream
  useEffect(() => {
    const disconnectWs = connectTelemetryWebSocket(
      (msg) => {
        if (msg.type === 'DASHBOARD_UPDATE' && msg.data) {
          if (msg.data.patient_id === selectedPatientId) {
            setDashboard(msg.data);
          }
          // Refresh patients list silently to update risks in switcher
          loadPatients();
        } else if (msg.type === 'BASELINE_CALIBRATED' && msg.data) {
          if (msg.data.patient_id === selectedPatientId) {
            setDashboard(msg.data);
            triggerToast('Baseline recalibrated from post-op 2-4h window.');
          }
        }
      },
      (connected) => {
        setIsWsConnected(connected);
      }
    );

    return () => {
      disconnectWs();
    };
  }, [selectedPatientId, loadPatients]);

  // Handle telemetry ingestion
  const handleSendTelemetry = async (payload: TelemetryPayload) => {
    try {
      setIsSubmitting(true);
      const res = await ingestTelemetryPayload(payload);
      if (res.dashboard) {
        setDashboard(res.dashboard);
        triggerToast(
          `Payload processed. Delirium Risk: ${res.dashboard.delirium_risk_index}%, Mismatch: ${res.dashboard.circadian_mismatch_percentage}%`
        );
      }
    } catch (e: any) {
      console.error('Error submitting telemetry:', e);
      triggerToast(`Ingest error: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle baseline recalibration
  const handleRecalibrate = async () => {
    try {
      setIsCalibrating(true);
      const res = await calibrateBaseline(selectedPatientId, undefined, 4);
      if (res.dashboard) {
        setDashboard(res.dashboard);
        setIsCalibrationModalOpen(false);
        triggerToast('First 2–4 hours post-op baseline calibrated.');
      }
    } catch (e: any) {
      console.error('Calibration error:', e);
      triggerToast(`Calibration error: ${e.message}`);
    } finally {
      setIsCalibrating(false);
    }
  };

  // Auto-stream simulation loop
  useEffect(() => {
    if (isAutoStreaming) {
      autoStreamIntervalRef.current = setInterval(() => {
        if (!dashboard) return;
        const current = dashboard.current_telemetry;

        // Subtle biological continuous Brownian drift
        const deltaHrv = (Math.random() - 0.48) * 2;
        const deltaResp = (Math.random() - 0.5) * 1.2;
        const deltaMotion = (Math.random() - 0.45) * 0.04;
        const deltaPlr = (Math.random() - 0.48) * 4;

        const newPayload: TelemetryPayload = {
          patient_id: selectedPatientId,
          hrv_rmssd: Math.max(12, Math.min(65, Number((current.hrv_rmssd + deltaHrv).toFixed(1)))),
          hrv_sdnn: Math.max(20, Math.min(85, Number((current.hrv_sdnn + deltaHrv * 1.2).toFixed(1)))),
          respiration_rate: Math.max(10, Math.min(32, Math.round(current.respiration_rate + deltaResp))),
          heart_rate: Math.max(55, Math.min(125, Math.round(current.heart_rate + (Math.random() - 0.5) * 2))),
          pupillary_light_reflex_latency: Math.max(
            200,
            Math.min(440, Math.round(current.pupillary_light_reflex_latency + deltaPlr))
          ),
          pupil_constriction_velocity: Math.max(
            1.2,
            Math.min(4.8, Number((current.pupil_constriction_velocity + (Math.random() - 0.5) * 0.1).toFixed(2)))
          ),
          motor_restlessness_index: Math.max(
            0.02,
            Math.min(0.95, Number((current.motor_restlessness_index + deltaMotion).toFixed(3)))
          ),
          nursing_notes_text: current.nursing_notes_text,
        };

        handleSendTelemetry(newPayload);
      }, 3000);
    } else {
      if (autoStreamIntervalRef.current) {
        clearInterval(autoStreamIntervalRef.current);
        autoStreamIntervalRef.current = null;
      }
    }

    return () => {
      if (autoStreamIntervalRef.current) {
        clearInterval(autoStreamIntervalRef.current);
      }
    };
  }, [isAutoStreaming, dashboard, selectedPatientId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-cyan-500/40 text-cyan-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-mono animate-in fade-in slide-in-from-bottom-2">
          <Bell className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Clinical Header */}
      <HeaderBar
        dashboard={dashboard}
        patients={patients}
        selectedPatientId={selectedPatientId}
        onSelectPatient={(id) => setSelectedPatientId(id)}
        isWsConnected={isWsConnected}
        onOpenCalibration={() => setIsCalibrationModalOpen(true)}
        isAutoStreaming={isAutoStreaming}
        onToggleAutoStream={() => setIsAutoStreaming(!isAutoStreaming)}
      />

      {/* Main Bedside Clinical Canvas */}
      <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto space-y-6">
        {isLoading && !dashboard ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
            <div className="font-mono text-sm">Calibrating Bedside Telemetry Stream...</div>
          </div>
        ) : dashboard ? (
          <>
            {/* Primary Gauges & Metrics (Slide 03 Layout) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DeliriumRiskGauge dashboard={dashboard} />
              <CircadianMismatchCard dashboard={dashboard} />
            </div>

            {/* Time-Series Trajectory Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RiskTrajectoryGraph
                history={dashboard.history}
                currentRisk={dashboard.delirium_risk_index}
              />
              <TelemetryTrendsGraph
                history={dashboard.history}
                current={dashboard.current_telemetry}
              />
            </div>

            {/* Explainable AI (XAI) & Interventions Panel */}
            <XaiAttributionPanel
              factors={dashboard.shap_attributions}
              interventions={dashboard.recommended_interventions}
              alerts={dashboard.active_clinical_alerts}
              deliriumRiskIndex={dashboard.delirium_risk_index}
            />

            {/* Inline NLP Clinical Notes Evaluator */}
            <NlpClinicalNotesPanel
              nlpResult={dashboard.nlp_analysis}
              currentNoteText={dashboard.current_telemetry.nursing_notes_text}
            />

            {/* Interactive Live Data Input & Telemetry Simulator */}
            <TelemetrySimulatorForm
              patientId={selectedPatientId}
              currentTelemetry={dashboard.current_telemetry}
              onSendTelemetry={handleSendTelemetry}
              isSubmitting={isSubmitting}
              isAutoStreaming={isAutoStreaming}
              onToggleAutoStream={() => setIsAutoStreaming(!isAutoStreaming)}
            />
          </>
        ) : null}
      </main>

      {/* Baseline Calibration Modal */}
      {dashboard && (
        <BaselineCalibrationModal
          isOpen={isCalibrationModalOpen}
          onClose={() => setIsCalibrationModalOpen(false)}
          baseline={dashboard.baseline}
          patientId={selectedPatientId}
          onRecalibrate={handleRecalibrate}
          isCalibrating={isCalibrating}
        />
      )}

      {/* Bedside ICU Footer Status */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-4 py-3 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-3.5 h-3.5 text-cyan-400" />
          <span>PROJECT CHRONOSYNC &bull; Challenge PS4 Zero-Touch Bedside Delirium Prediction Engine</span>
        </div>
        <div className="font-mono text-[11px] flex items-center gap-3">
          <span>Engine: Express + TypeScript + Recharts</span>
          <span>NLP: Gemini 2.5 Flash / CAM-ICU</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Normative Baseline Active
          </span>
        </div>
      </footer>
    </div>
  );
}
