/**
 * ChronoSync AI Engine & Algorithmic Core
 * Stages A, B, C, D mathematical processing for zero-touch ICU delirium prediction.
 */

import type {
  TelemetryPayload,
  BaselineStatistics,
  BaselineWindowData,
  PatientDashboardState,
  ShapAttributionFactor,
  NonPharmIntervention,
  NlpAnalysisResult,
  PatientSummary
} from '../src/types/chronosync';
import { analyzeNursingNotes } from './geminiNlp';

interface PatientRecord {
  patient_id: string;
  patient_name: string;
  age: number;
  icu_bed: string;
  admission_diagnosis: string;
  surgery_type: string;
  post_op_hour: number;
  calibration_status: 'calibrated' | 'pending';
  baseline: BaselineStatistics | null;
  baseline_samples: BaselineWindowData['samples'];
  current_telemetry: TelemetryPayload;
  history: PatientDashboardState['history'];
  last_nlp_result: NlpAnalysisResult | null;
  last_updated: string;
}

// In-Memory Clinical Patient Database
const patients: Map<string, PatientRecord> = new Map();

/**
 * Standard deviation calculation helper
 */
function calculateMeanAndStd(values: number[]): { mean: number; stdev: number } {
  if (values.length === 0) return { mean: 0, stdev: 1 };
  const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
  if (values.length === 1) return { mean, stdev: 1 };
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (values.length - 1);
  const stdev = Math.sqrt(variance);
  return { mean, stdev: stdev < 0.001 ? 0.001 : stdev };
}

/**
 * Stage A: Compute Baseline Normalization Statistics from first 2-4 hours
 */
export function computeBaselineStatistics(
  patientId: string,
  samples: BaselineWindowData['samples'],
  windowHours: number = 4
): BaselineStatistics {
  const hrvRmssd = calculateMeanAndStd(samples.map((s) => s.hrv_rmssd));
  const hrvSdnn = calculateMeanAndStd(samples.map((s) => s.hrv_sdnn));
  const resp = calculateMeanAndStd(samples.map((s) => s.respiration_rate));
  const hr = calculateMeanAndStd(samples.map((s) => s.heart_rate));
  const plrLat = calculateMeanAndStd(samples.map((s) => s.pupillary_light_reflex_latency));
  const plrVel = calculateMeanAndStd(samples.map((s) => s.pupil_constriction_velocity));
  const motor = calculateMeanAndStd(samples.map((s) => s.motor_restlessness_index));

  return {
    patient_id: patientId,
    calibrated_at: new Date().toISOString(),
    sample_count: samples.length,
    post_op_calibration_window_hours: windowHours,
    means: {
      hrv_rmssd: Number(hrvRmssd.mean.toFixed(2)),
      hrv_sdnn: Number(hrvSdnn.mean.toFixed(2)),
      respiration_rate: Number(resp.mean.toFixed(2)),
      heart_rate: Number(hr.mean.toFixed(2)),
      plr_latency: Number(plrLat.mean.toFixed(2)),
      plr_constriction_velocity: Number(plrVel.mean.toFixed(2)),
      motor_restlessness: Number(motor.mean.toFixed(3)),
    },
    stdevs: {
      hrv_rmssd: Number(hrvRmssd.stdev.toFixed(2)),
      hrv_sdnn: Number(hrvSdnn.stdev.toFixed(2)),
      respiration_rate: Number(resp.stdev.toFixed(2)),
      heart_rate: Number(hr.stdev.toFixed(2)),
      plr_latency: Number(plrLat.stdev.toFixed(2)),
      plr_constriction_velocity: Number(plrVel.stdev.toFixed(2)),
      motor_restlessness: Number(motor.stdev.toFixed(3)),
    },
  };
}

/**
 * Default physiological baseline values if patient baseline calibration is not yet performed
 */
function getFallbackBaseline(patientId: string): BaselineStatistics {
  return {
    patient_id: patientId,
    calibrated_at: new Date().toISOString(),
    sample_count: 30,
    post_op_calibration_window_hours: 4,
    means: {
      hrv_rmssd: 38.0,
      hrv_sdnn: 52.0,
      respiration_rate: 15.0,
      heart_rate: 74.0,
      plr_latency: 240.0,
      plr_constriction_velocity: 3.4,
      motor_restlessness: 0.12,
    },
    stdevs: {
      hrv_rmssd: 6.5,
      hrv_sdnn: 8.0,
      respiration_rate: 2.2,
      heart_rate: 6.0,
      plr_latency: 25.0,
      plr_constriction_velocity: 0.45,
      motor_restlessness: 0.05,
    },
  };
}

/**
 * Stage B & C & D Core Computation
 */
export async function processTelemetryPayload(
  payload: TelemetryPayload
): Promise<PatientDashboardState> {
  let record = patients.get(payload.patient_id);
  if (!record) {
    // Initialize new patient record
    record = initPatientRecord(payload.patient_id, payload);
  }

  const baseline = record.baseline || getFallbackBaseline(payload.patient_id);

  // 1. Compute Z-Scores (Stage A)
  // For HRV, delirium stress manifests as vagal suppression (lower RMSSD) or dramatic fluctuation
  // Z_hrv = (baseline.mean - current) / baseline.stdev -> positive indicates suppression/stress
  const zHrv = (baseline.means.hrv_rmssd - payload.hrv_rmssd) / baseline.stdevs.hrv_rmssd;
  const zMotion = (payload.motor_restlessness_index - baseline.means.motor_restlessness) / baseline.stdevs.motor_restlessness;
  const zResp = (payload.respiration_rate - baseline.means.respiration_rate) / baseline.stdevs.respiration_rate;
  const zPlr = (payload.pupillary_light_reflex_latency - baseline.means.plr_latency) / baseline.stdevs.plr_latency;

  // 2. Stage B: Autonomic-Circadian Decoupling Engine
  // Mismatch = min(100, max(0, (alpha * |Z_HRV| + beta * |Z_Motion| + gamma * PLR_Divergence) * 20))
  const alpha = 0.40;
  const beta = 0.35;
  const gamma = 0.25;
  const plrDivergence = Math.max(0, zPlr);

  const rawMismatch = (alpha * Math.abs(zHrv) + beta * Math.abs(zMotion) + gamma * plrDivergence) * 20.0;
  const circadianMismatch = Math.min(100, Math.max(0, Number(rawMismatch.toFixed(1))));

  // 3. Stage C: NLP Analysis on Nursing Notes
  let nlpResult: NlpAnalysisResult;
  if (payload.nursing_notes_text && payload.nursing_notes_text.trim().length > 0) {
    nlpResult = await analyzeNursingNotes(payload.nursing_notes_text);
    record.last_nlp_result = nlpResult;
  } else if (record.last_nlp_result) {
    nlpResult = record.last_nlp_result;
  } else {
    nlpResult = await analyzeNursingNotes(undefined);
    record.last_nlp_result = nlpResult;
  }

  // PLR Score (0.0 to 1.0)
  // Sluggish latency > 350ms, constricted velocity < 1.8 mm/s
  const latencyPart = (payload.pupillary_light_reflex_latency - 220) / (450 - 220);
  const velocityPart = (3.5 - payload.pupil_constriction_velocity) / (3.5 - 1.2);
  const rawPlrScore = 0.65 * latencyPart + 0.35 * velocityPart;
  const plrScore = Math.min(1.0, Math.max(0.0, Number(rawPlrScore.toFixed(3))));

  // Continuous Delirium Risk Index (0 - 100%)
  // Delirium Risk = (0.45 * Mismatch) + (0.30 * NLP_Confusion_Score * 100) + (0.25 * PLR_Score * 100)
  const rawRisk =
    0.45 * circadianMismatch +
    0.30 * (nlpResult.score * 100.0) +
    0.25 * (plrScore * 100.0);
  const deliriumRiskIndex = Math.min(100, Math.max(0, Number(rawRisk.toFixed(1))));

  const severity: 'low' | 'moderate' | 'high' =
    deliriumRiskIndex > 70 ? 'high' : deliriumRiskIndex >= 30 ? 'moderate' : 'low';

  // 4. Stage D: SHAP-based Explainable AI (XAI) Attribution Engine
  const shapAttributions: ShapAttributionFactor[] = [];
  const activeAlerts: PatientDashboardState['active_clinical_alerts'] = [];
  const nowIso = new Date().toISOString();

  // Constituent impact scores summing towards total risk
  const impactMismatch = 0.45 * circadianMismatch;
  const impactNlp = 0.30 * (nlpResult.score * 100.0);
  const impactPlr = 0.25 * (plrScore * 100.0);
  const totalImpact = impactMismatch + impactNlp + impactPlr || 1;

  // Breakdown sub-attributions
  // HRV Autonomic Stress
  const hrvImpact = Number(((alpha * Math.abs(zHrv) * 20.0 * 0.45 / totalImpact) * deliriumRiskIndex).toFixed(1));
  const isHrvCritical = zHrv > 1.5 || payload.hrv_rmssd < 22;
  shapAttributions.push({
    id: 'factor-hrv',
    feature_name: 'hrv_rmssd',
    display_name: 'Autonomic Vagal Tone (HRV RMSSD)',
    category: 'autonomic',
    impact_score: hrvImpact,
    percentage_contribution: Number(((hrvImpact / (deliriumRiskIndex || 1)) * 100).toFixed(1)),
    z_score: Number(zHrv.toFixed(2)),
    raw_value: payload.hrv_rmssd,
    baseline_value: baseline.means.hrv_rmssd,
    unit: 'ms',
    status: isHrvCritical ? 'critical' : zHrv > 0.8 ? 'warning' : 'normal',
    clinical_flag: isHrvCritical ? 'Elevated HRV stress (Vagal withdrawal)' : 'Autonomic tone within baseline envelope',
    evidence: `Current RMSSD ${payload.hrv_rmssd} ms vs baseline ${baseline.means.hrv_rmssd} ms (Z-score: ${zHrv.toFixed(2)})`,
  });

  if (zHrv > 1.5) {
    activeAlerts.push({
      id: `alert-hrv-${Date.now()}`,
      level: 'warning',
      message: 'Elevated HRV stress: parasympathetic vagal withdrawal detected.',
      timestamp: nowIso,
      source: 'Bedside Telemetry Engine',
    });
  }

  // Nocturnal Restlessness / Actigraphy
  const motionImpact = Number(((beta * Math.abs(zMotion) * 20.0 * 0.45 / totalImpact) * deliriumRiskIndex).toFixed(1));
  const isMotionCritical = zMotion > 1.5 || payload.motor_restlessness_index > 0.55;
  shapAttributions.push({
    id: 'factor-motion',
    feature_name: 'motor_restlessness_index',
    display_name: 'Actigraphy Motor Restlessness',
    category: 'circadian',
    impact_score: motionImpact,
    percentage_contribution: Number(((motionImpact / (deliriumRiskIndex || 1)) * 100).toFixed(1)),
    z_score: Number(zMotion.toFixed(2)),
    raw_value: payload.motor_restlessness_index,
    baseline_value: baseline.means.motor_restlessness,
    unit: 'score',
    status: isMotionCritical ? 'critical' : zMotion > 0.8 ? 'warning' : 'normal',
    clinical_flag: isMotionCritical ? 'High nocturnal restlessness (actigraphy)' : 'Normal quiet sleep/rest actigraphy',
    evidence: `Actigraphy index ${payload.motor_restlessness_index} vs baseline ${baseline.means.motor_restlessness} (Z-score: ${zMotion.toFixed(2)})`,
  });

  if (zMotion > 1.5) {
    activeAlerts.push({
      id: `alert-motion-${Date.now()}`,
      level: 'critical',
      message: 'High nocturnal restlessness (actigraphy): circadian phase decoupling active.',
      timestamp: nowIso,
      source: 'Computer Vision / Actigraphy',
    });
  }

  // Pupillary Light Reflex
  const plrImpact = Number(impactPlr.toFixed(1));
  const isPlrCritical = payload.pupillary_light_reflex_latency > 350;
  shapAttributions.push({
    id: 'factor-plr',
    feature_name: 'pupillary_light_reflex_latency',
    display_name: 'Pupillary Light Reflex (PLR Latency)',
    category: 'neurological',
    impact_score: plrImpact,
    percentage_contribution: Number(((plrImpact / (deliriumRiskIndex || 1)) * 100).toFixed(1)),
    z_score: Number(zPlr.toFixed(2)),
    raw_value: payload.pupillary_light_reflex_latency,
    baseline_value: baseline.means.plr_latency,
    unit: 'ms',
    status: isPlrCritical ? 'critical' : payload.pupillary_light_reflex_latency > 300 ? 'warning' : 'normal',
    clinical_flag: isPlrCritical ? 'Sluggish Pupillary Light Reflex (PLR)' : 'Brisk pupil constriction dynamics',
    evidence: `PLR latency ${payload.pupillary_light_reflex_latency} ms (threshold >350ms), Constriction velocity: ${payload.pupil_constriction_velocity} mm/s`,
  });

  if (payload.pupillary_light_reflex_latency > 350) {
    activeAlerts.push({
      id: `alert-plr-${Date.now()}`,
      level: 'critical',
      message: `Sluggish Pupillary Light Reflex (PLR: ${payload.pupillary_light_reflex_latency} ms): Central cholinergic deficit flagged.`,
      timestamp: nowIso,
      source: 'Infrared Pupillometry Stream',
    });
  }

  // Nurse Clinical NLP Note
  const nlpImpact = Number(impactNlp.toFixed(1));
  const isNlpCritical = nlpResult.score > 0.5;
  shapAttributions.push({
    id: 'factor-nlp',
    feature_name: 'nursing_notes_text',
    display_name: 'Clinical NLP Sentiment & CAM-ICU Markers',
    category: 'clinical_nlp',
    impact_score: nlpImpact,
    percentage_contribution: Number(((nlpImpact / (deliriumRiskIndex || 1)) * 100).toFixed(1)),
    raw_value: `${(nlpResult.score * 100).toFixed(0)}%`,
    baseline_value: '0%',
    unit: 'risk',
    status: isNlpCritical ? 'critical' : nlpResult.score > 0.25 ? 'warning' : 'normal',
    clinical_flag: isNlpCritical ? 'Clinical text flags acute cognitive fluctuation' : 'Nursing observations report stable sensorium',
    evidence: nlpResult.key_phrases.length > 0
      ? `CAM-ICU triggers detected: ${nlpResult.key_phrases.join(', ')}`
      : nlpResult.clinical_summary,
  });

  if (nlpResult.score > 0.5) {
    activeAlerts.push({
      id: `alert-nlp-${Date.now()}`,
      level: 'critical',
      message: 'Clinical text flags acute cognitive fluctuation / inattention.',
      timestamp: nowIso,
      source: 'Gemini NLP Engine',
    });
  }

  // Respiration Rate Check
  if (zResp > 1.5 || payload.respiration_rate > 24) {
    activeAlerts.push({
      id: `alert-resp-${Date.now()}`,
      level: 'warning',
      message: `Tachypneic autonomic surge: ${payload.respiration_rate} bpm (Z-score: ${zResp.toFixed(2)})`,
      timestamp: nowIso,
      source: 'Bedside Telemetry Engine',
    });
  }

  // Sort SHAP attributions descending by impact score
  shapAttributions.sort((a, b) => b.impact_score - a.impact_score);

  // Non-Pharmacologic Evidence-Based Interventions
  const interventions = generateNonPharmInterventions(
    shapAttributions,
    deliriumRiskIndex,
    circadianMismatch,
    nlpResult
  );

  // Update record state
  record.current_telemetry = payload;
  record.last_updated = nowIso;
  if (payload.post_op_hour !== undefined) {
    record.post_op_hour = payload.post_op_hour;
  } else {
    record.post_op_hour += 0.2; // advance incrementally
  }

  // Append to history trajectory
  record.history.push({
    timestamp: nowIso,
    post_op_hour: Number(record.post_op_hour.toFixed(1)),
    delirium_risk_index: deliriumRiskIndex,
    circadian_mismatch_percentage: circadianMismatch,
    hrv_rmssd: payload.hrv_rmssd,
    motor_restlessness_index: payload.motor_restlessness_index,
    respiration_rate: payload.respiration_rate,
    plr_latency: payload.pupillary_light_reflex_latency,
    nlp_confusion_score: Number(nlpResult.score.toFixed(2)),
  });

  // Keep last 40 trajectory points
  if (record.history.length > 40) {
    record.history.shift();
  }

  return {
    patient_id: record.patient_id,
    patient_name: record.patient_name,
    age: record.age,
    icu_bed: record.icu_bed,
    admission_diagnosis: record.admission_diagnosis,
    surgery_type: record.surgery_type,
    post_op_hour: Number(record.post_op_hour.toFixed(1)),
    calibration_status: record.calibration_status,
    baseline,
    delirium_risk_index: deliriumRiskIndex,
    delirium_risk_severity: severity,
    circadian_mismatch_percentage: circadianMismatch,
    nlp_confusion_score: Number(nlpResult.score.toFixed(2)),
    plr_score: Number(plrScore.toFixed(2)),
    z_scores: {
      z_hrv: Number(zHrv.toFixed(2)),
      z_motion: Number(zMotion.toFixed(2)),
      z_respiration: Number(zResp.toFixed(2)),
      z_plr: Number(zPlr.toFixed(2)),
    },
    current_telemetry: payload,
    shap_attributions: shapAttributions,
    recommended_interventions: interventions,
    active_clinical_alerts: activeAlerts,
    nlp_analysis: nlpResult,
    history: record.history,
    last_updated: nowIso,
  };
}

/**
 * Generate evidence-based non-pharmacologic delirium interventions
 */
function generateNonPharmInterventions(
  shapFactors: ShapAttributionFactor[],
  riskIndex: number,
  mismatch: number,
  nlp: NlpAnalysisResult
): NonPharmIntervention[] {
  const list: NonPharmIntervention[] = [];

  const topCategories = new Set(shapFactors.filter((f) => f.status !== 'normal').map((f) => f.category));

  if (mismatch > 50 || topCategories.has('circadian')) {
    list.push({
      id: 'int-sleep-hygiene',
      title: 'Implement ICU Circadian Sleep Hygiene Protocol',
      category: 'sleep_hygiene',
      urgency: mismatch > 70 ? 'immediate' : 'high',
      protocol_rationale:
        'Targeted suppression of nocturnal circadian disruption. Restores melatonin phase alignment without sedatives.',
      checklist_items: [
        'Dim ambient ICU room lights to < 30 lux from 22:00 to 06:00',
        'Consolidate bedside nurse checks to minimize nighttime sleep fragmentation',
        'Provide noise-cancellation earplugs and ambient white-noise masking',
        'Defer non-urgent phlebotomy and chest radiography until after 07:00',
      ],
      evidence_level: 'SCCM PADIS Guideline Grade 1A',
    });
  }

  if (nlp.score > 0.4 || topCategories.has('clinical_nlp')) {
    list.push({
      id: 'int-reorientation',
      title: 'Cognitive Reorientation & Sensory Preservation Protocol',
      category: 'reorientation',
      urgency: nlp.score > 0.6 ? 'immediate' : 'high',
      protocol_rationale:
        'Frequent systematic reorientation decreases acute hallucinations and CAM-ICU inattention cycles.',
      checklist_items: [
        'Place high-visibility bedside clock, whiteboard with day, nurse name, and hospital room',
        'Ensure patient has prescribed eyeglasses and hearing aids active and clean',
        'Engage family bedside presence or familiar voice recordings for grounding',
        'Frequent verbal reassurance during any clinical nursing touchpoint',
      ],
      evidence_level: 'CAM-ICU Clinical Best Practice',
    });
  }

  if (topCategories.has('autonomic') || riskIndex > 40) {
    list.push({
      id: 'int-autonomic',
      title: 'Autonomic Strain & Pain/Discomfort De-Escalation',
      category: 'autonomic_stabilization',
      urgency: 'high',
      protocol_rationale:
        'Vagal tone suppression often signifies occult pain, urinary retention, or fecal impaction causing autonomic hyperarousal.',
      checklist_items: [
        'Perform ultrasound bladder scan to rule out acute occult urinary retention',
        'Assess CPOT (Critical-Care Pain Observation Tool) score before sedatives',
        'Check Foley catheter patency, endotracheal cuff pressure, and invasive line positioning',
        'Optimize multimodal non-opioid analgesia (IV acetaminophen, topical lidocaine)',
      ],
      evidence_level: 'ASA Postoperative Delirium Bundle',
    });
  }

  if (topCategories.has('neurological') || riskIndex > 65) {
    list.push({
      id: 'int-sensory-med',
      title: 'Anticholinergic Burden & Medication Reconciliation Audit',
      category: 'sensory_medication',
      urgency: riskIndex > 70 ? 'immediate' : 'routine',
      protocol_rationale:
        'Sluggish PLR (>350ms) reflects central cholinergic hypofunction. High Anticholinergic Cognitive Burden (ACB) exacerbates delirium risk.',
      checklist_items: [
        'Audit medication list for high Anticholinergic Burden (ACB score ≥ 2)',
        'Deprescribe or swap diphenhydramine, scopolamine, or high-dose benzodiazepines',
        'Evaluate serum electrolytes: ionized calcium, magnesium, and sodium balance',
        'Verify renal/hepatic clearance for active central nervous system medications',
      ],
      evidence_level: 'Beers Criteria & AGS Guideline',
    });
  }

  return list;
}

/**
 * Initialize patient record with realistic post-op ICU trajectory
 */
function initPatientRecord(
  patientId: string,
  initialPayload?: TelemetryPayload
): PatientRecord {
  const now = new Date();

  // Preset profiles for demo ICU beds
  const presets: Record<string, Partial<PatientRecord>> = {
    'BED-04': {
      patient_name: 'Robert Chen',
      age: 71,
      icu_bed: 'ICU Bed 04 (Cardiothoracic)',
      admission_diagnosis: 'Triple Coronary Artery Bypass Graft (CABG x3)',
      surgery_type: 'Open Heart / Median Sternotomy',
      post_op_hour: 18.0,
      calibration_status: 'calibrated',
    },
    'BED-07': {
      patient_name: 'Eleanor Vance',
      age: 79,
      icu_bed: 'ICU Bed 07 (Surgical ICU)',
      admission_diagnosis: 'Perforated Diverticulitis with Sepsis',
      surgery_type: 'Emergency Hartmann Laparotomy',
      post_op_hour: 26.5,
      calibration_status: 'calibrated',
    },
    'BED-12': {
      patient_name: 'Arthur Pendelton',
      age: 68,
      icu_bed: 'ICU Bed 12 (Orthopedic ICU)',
      admission_diagnosis: 'Severe Bilateral Knee Osteoarthritis',
      surgery_type: 'Bilateral Total Knee Arthroplasty',
      post_op_hour: 8.0,
      calibration_status: 'calibrated',
    },
  };

  const preset = presets[patientId] || {
    patient_name: `Patient ${patientId}`,
    age: 65,
    icu_bed: `ICU Bed ${patientId}`,
    admission_diagnosis: 'Post-Operative Critical Care Monitoring',
    surgery_type: 'Major Surgical Intervention',
    post_op_hour: 12.0,
    calibration_status: 'calibrated',
  };

  // Generate synthetic baseline window samples (hours 0 to 4 post-op)
  const baselineSamples: BaselineWindowData['samples'] = [];
  const baseHrv = patientId === 'BED-07' ? 32 : patientId === 'BED-04' ? 42 : 48;
  const baseResp = patientId === 'BED-07' ? 17 : 14;
  const basePlr = 235;

  for (let i = 0; i < 24; i++) {
    baselineSamples.push({
      hrv_rmssd: baseHrv + (Math.sin(i) * 3),
      hrv_sdnn: baseHrv * 1.3 + (Math.cos(i) * 4),
      respiration_rate: baseResp + (Math.sin(i * 0.5) * 1.5),
      heart_rate: 72 + (Math.sin(i) * 3),
      pupillary_light_reflex_latency: basePlr + (Math.cos(i) * 8),
      pupil_constriction_velocity: 3.5 + (Math.sin(i) * 0.2),
      motor_restlessness_index: 0.10 + (Math.sin(i) * 0.03),
      timestamp: new Date(now.getTime() - (24 - i) * 600000).toISOString(),
    });
  }

  const baselineStats = computeBaselineStatistics(patientId, baselineSamples, 4);

  // Generate prior trajectory history
  const history: PatientDashboardState['history'] = [];
  const startHour = Math.max(4, (preset.post_op_hour || 12) - 10);
  const endHour = preset.post_op_hour || 12;

  for (let h = startHour; h <= endHour; h += 1) {
    const progress = (h - startHour) / (endHour - startHour || 1);
    let mockRisk = 18;
    let mockMismatch = 22;
    let mockHrv = baseHrv;
    let mockMotion = 0.12;
    let mockPlr = 238;

    if (patientId === 'BED-04') {
      // Developing moderate-to-high delirium risk profile
      mockRisk = Math.min(88, Math.round(20 + progress * 62));
      mockMismatch = Math.min(94, Math.round(25 + progress * 67));
      mockHrv = Math.max(16, Math.round(baseHrv - progress * 24));
      mockMotion = Number((0.12 + progress * 0.62).toFixed(2));
      mockPlr = Math.round(basePlr + progress * 140);
    } else if (patientId === 'BED-07') {
      // Severe persistent delirium
      mockRisk = Math.min(92, Math.round(65 + Math.sin(h) * 18));
      mockMismatch = Math.min(96, Math.round(75 + Math.cos(h) * 12));
      mockHrv = Math.round(18 + Math.sin(h) * 4);
      mockMotion = Number((0.65 + Math.sin(h) * 0.2).toFixed(2));
      mockPlr = Math.round(380 + Math.sin(h) * 30);
    } else {
      // Stable low risk
      mockRisk = Math.round(14 + Math.sin(h) * 6);
      mockMismatch = Math.round(18 + Math.cos(h) * 7);
      mockHrv = Math.round(baseHrv + Math.sin(h) * 3);
      mockMotion = Number((0.11 + Math.sin(h) * 0.03).toFixed(2));
      mockPlr = Math.round(230 + Math.cos(h) * 10);
    }

    history.push({
      timestamp: new Date(now.getTime() - (endHour - h) * 3600000).toISOString(),
      post_op_hour: Number(h.toFixed(1)),
      delirium_risk_index: mockRisk,
      circadian_mismatch_percentage: mockMismatch,
      hrv_rmssd: mockHrv,
      motor_restlessness_index: mockMotion,
      respiration_rate: Math.round(baseResp + (patientId === 'BED-04' ? progress * 6 : 1)),
      plr_latency: mockPlr,
      nlp_confusion_score: patientId === 'BED-04' ? Number((progress * 0.75).toFixed(2)) : 0.05,
    });
  }

  const defaultTelemetry: TelemetryPayload = initialPayload || {
    patient_id: patientId,
    timestamp: now.toISOString(),
    post_op_hour: preset.post_op_hour || 12,
    hrv_rmssd: history[history.length - 1]?.hrv_rmssd || baseHrv,
    hrv_sdnn: (history[history.length - 1]?.hrv_rmssd || baseHrv) * 1.3,
    respiration_rate: history[history.length - 1]?.respiration_rate || 16,
    heart_rate: 76,
    pupillary_light_reflex_latency: history[history.length - 1]?.plr_latency || 240,
    pupil_constriction_velocity: 3.2,
    motor_restlessness_index: history[history.length - 1]?.motor_restlessness_index || 0.15,
    nursing_notes_text: patientId === 'BED-04'
      ? 'Patient disoriented to time, restless at 02:00, pulling at peripheral IV cannula, misinterpreting monitor alarms as voices.'
      : 'Patient sleeping comfortably, rouses easily to call, oriented to person and location.',
  };

  const newRecord: PatientRecord = {
    patient_id: patientId,
    patient_name: preset.patient_name!,
    age: preset.age!,
    icu_bed: preset.icu_bed!,
    admission_diagnosis: preset.admission_diagnosis!,
    surgery_type: preset.surgery_type!,
    post_op_hour: preset.post_op_hour || 12,
    calibration_status: 'calibrated',
    baseline: baselineStats,
    baseline_samples: baselineSamples,
    current_telemetry: defaultTelemetry,
    history,
    last_nlp_result: null,
    last_updated: now.toISOString(),
  };

  patients.set(patientId, newRecord);
  return newRecord;
}

// Seed standard ICU beds immediately
initPatientRecord('BED-04');
initPatientRecord('BED-07');
initPatientRecord('BED-12');

/**
 * Get dashboard state for patient
 */
export async function getPatientDashboard(patientId: string): Promise<PatientDashboardState> {
  let record = patients.get(patientId);
  if (!record) {
    record = initPatientRecord(patientId);
  }
  return processTelemetryPayload(record.current_telemetry);
}

/**
 * Calibrate baseline with incoming sample batch
 */
export async function calibratePatientBaseline(
  data: BaselineWindowData,
  windowHours: number = 4
): Promise<BaselineStatistics> {
  let record = patients.get(data.patient_id);
  if (!record) {
    record = initPatientRecord(data.patient_id);
  }

  const baselineStats = computeBaselineStatistics(data.patient_id, data.samples, windowHours);
  record.baseline = baselineStats;
  record.baseline_samples = data.samples;
  record.calibration_status = 'calibrated';

  return baselineStats;
}

/**
 * Get all patients summary
 */
export function getAllPatientsSummary(): PatientSummary[] {
  const summaries: PatientSummary[] = [];
  for (const [id, rec] of patients.entries()) {
    const latestHist = rec.history[rec.history.length - 1];
    const risk = latestHist?.delirium_risk_index || 20;
    summaries.push({
      patient_id: id,
      patient_name: rec.patient_name,
      age: rec.age,
      icu_bed: rec.icu_bed,
      surgery_type: rec.surgery_type,
      post_op_hour: Number(rec.post_op_hour.toFixed(1)),
      delirium_risk_index: risk,
      delirium_risk_severity: risk > 70 ? 'high' : risk >= 30 ? 'moderate' : 'low',
      circadian_mismatch_percentage: latestHist?.circadian_mismatch_percentage || 25,
      calibration_status: rec.calibration_status,
    });
  }
  return summaries;
}
