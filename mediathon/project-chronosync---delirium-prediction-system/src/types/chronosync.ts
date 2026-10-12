/**
 * Project ChronoSync: Types for Ambient Autonomic-Circadian Decoupling
 * Zero-Touch Delirium Prediction
 */

export interface TelemetryPayload {
  patient_id: string;
  timestamp?: string; // ISO string
  post_op_hour?: number;

  // Bedside Telemetry
  hrv_rmssd: number; // ms (vagal tone marker, e.g. normal 25-60ms)
  hrv_sdnn: number; // ms (overall autonomic variability, e.g. 30-100ms)
  respiration_rate: number; // bpm (e.g. 12-20 bpm)
  heart_rate: number; // bpm (e.g. 60-100 bpm)

  // Computer Vision / Ambient Actigraphy Metrics
  pupillary_light_reflex_latency: number; // ms (cholinergic proxy, normal 200-280ms, >350ms sluggish)
  pupil_constriction_velocity: number; // mm/s (normal 2.0-5.0 mm/s)
  motor_restlessness_index: number; // 0.0 to 1.0 (actigraphy restlessness)

  // Nurse NLP Clinical Notes
  nursing_notes_text?: string;
}

export interface BaselineWindowData {
  patient_id: string;
  samples: Array<{
    hrv_rmssd: number;
    hrv_sdnn: number;
    respiration_rate: number;
    heart_rate: number;
    pupillary_light_reflex_latency: number;
    pupil_constriction_velocity: number;
    motor_restlessness_index: number;
    timestamp?: string;
  }>;
}

export interface BaselineStatistics {
  patient_id: string;
  calibrated_at: string;
  sample_count: number;
  post_op_calibration_window_hours: number;
  means: {
    hrv_rmssd: number;
    hrv_sdnn: number;
    respiration_rate: number;
    heart_rate: number;
    plr_latency: number;
    plr_constriction_velocity: number;
    motor_restlessness: number;
  };
  stdevs: {
    hrv_rmssd: number;
    hrv_sdnn: number;
    respiration_rate: number;
    heart_rate: number;
    plr_latency: number;
    plr_constriction_velocity: number;
    motor_restlessness: number;
  };
}

export interface ShapAttributionFactor {
  id: string;
  feature_name: string;
  display_name: string;
  category: 'autonomic' | 'circadian' | 'neurological' | 'clinical_nlp';
  impact_score: number; // SHAP value (0 to 100 relative impact points)
  percentage_contribution: number; // % of total risk index
  z_score?: number;
  raw_value: number | string;
  baseline_value: number | string;
  unit: string;
  status: 'critical' | 'warning' | 'normal';
  clinical_flag: string;
  evidence: string;
}

export interface NonPharmIntervention {
  id: string;
  title: string;
  category: 'sleep_hygiene' | 'reorientation' | 'autonomic_stabilization' | 'sensory_medication';
  urgency: 'immediate' | 'high' | 'routine';
  protocol_rationale: string;
  checklist_items: string[];
  evidence_level: string; // e.g., "CAM-ICU Level 1A"
}

export interface NlpAnalysisResult {
  score: number; // 0.0 to 1.0
  sentiment: 'negative' | 'neutral' | 'positive' | 'acute_confusion';
  delirium_subtypes_detected: ('hyperactive' | 'hypoactive' | 'mixed' | 'none')[];
  cam_icu_features: {
    feature1_acute_onset_fluctuation: boolean;
    feature2_inattention: boolean;
    feature3_altered_consciousness: boolean;
    feature4_disorganized_thinking: boolean;
  };
  key_phrases: string[];
  clinical_summary: string;
  model_source: 'gemini-2.5-flash' | 'clinical-cam-heuristic';
}

export interface PatientDashboardState {
  patient_id: string;
  patient_name: string;
  age: number;
  icu_bed: string;
  admission_diagnosis: string;
  surgery_type: string;
  post_op_hour: number;
  calibration_status: 'calibrated' | 'pending' | 'calibrating';
  baseline: BaselineStatistics | null;

  // Real-time computed scores
  delirium_risk_index: number; // 0 - 100%
  delirium_risk_severity: 'low' | 'moderate' | 'high'; // <30, 30-70, >70
  circadian_mismatch_percentage: number; // 0 - 100%
  nlp_confusion_score: number; // 0.0 - 1.0
  plr_score: number; // 0.0 - 1.0

  // Derived mathematical components
  z_scores: {
    z_hrv: number;
    z_motion: number;
    z_respiration: number;
    z_plr: number;
  };

  // Latest multi-modal telemetry snapshot
  current_telemetry: TelemetryPayload;

  // XAI & Interventions
  shap_attributions: ShapAttributionFactor[];
  recommended_interventions: NonPharmIntervention[];
  active_clinical_alerts: Array<{
    id: string;
    level: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: string;
    source: string;
  }>;

  // Latest NLP interpretation
  nlp_analysis: NlpAnalysisResult | null;

  // Historical trajectories for charting
  history: Array<{
    timestamp: string;
    post_op_hour: number;
    delirium_risk_index: number;
    circadian_mismatch_percentage: number;
    hrv_rmssd: number;
    motor_restlessness_index: number;
    respiration_rate: number;
    plr_latency: number;
    nlp_confusion_score: number;
  }>;

  last_updated: string;
}

export interface PatientSummary {
  patient_id: string;
  patient_name: string;
  age: number;
  icu_bed: string;
  surgery_type: string;
  post_op_hour: number;
  delirium_risk_index: number;
  delirium_risk_severity: 'low' | 'moderate' | 'high';
  circadian_mismatch_percentage: number;
  calibration_status: 'calibrated' | 'pending';
}
