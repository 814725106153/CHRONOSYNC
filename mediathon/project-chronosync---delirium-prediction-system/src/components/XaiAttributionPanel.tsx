import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  ShieldCheck,
  Zap,
  Info,
} from 'lucide-react';
import type {
  ShapAttributionFactor,
  NonPharmIntervention,
  PatientDashboardState,
} from '../types/chronosync';

interface XaiAttributionPanelProps {
  factors: ShapAttributionFactor[];
  interventions: NonPharmIntervention[];
  alerts: PatientDashboardState['active_clinical_alerts'];
  deliriumRiskIndex: number;
}

export const XaiAttributionPanel: React.FC<XaiAttributionPanelProps> = ({
  factors,
  interventions,
  alerts,
  deliriumRiskIndex,
}) => {
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  const toggleChecklist = (key: string) => {
    setCompletedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Stage D: Explainable AI (XAI) Attribution
          </span>
          <h2 className="text-lg font-bold text-slate-100 mt-0.5">
            SHAP Risk Factor Decomposition &amp; Clinical Interventions
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            Total Model Impact: <strong className="text-slate-100">{deliriumRiskIndex.toFixed(0)} pts</strong>
          </span>
        </div>
      </div>

      {/* Active Clinical Alert Badges */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Active Real-Time Anomaly Flags
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                  alert.level === 'critical'
                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                }`}
              >
                <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                  alert.level === 'critical' ? 'text-rose-400' : 'text-amber-400'
                }`} />
                <div className="flex-1">
                  <div className="font-semibold">{alert.message}</div>
                  <div className="text-[10px] opacity-75 font-mono mt-0.5 flex justify-between">
                    <span>Source: {alert.source}</span>
                    <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SHAP Factor Attribution Waterfall / Bar List */}
      <div>
        <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-400 tracking-wider mb-3">
          <span>Ranked SHAP Risk Attributions</span>
          <span>Contribution to Delirium Index</span>
        </div>

        <div className="space-y-3">
          {factors.map((factor) => {
            const isCritical = factor.status === 'critical';
            const isWarning = factor.status === 'warning';

            return (
              <div
                key={factor.id}
                className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                    <div>
                      <div className="text-sm font-semibold text-slate-200">
                        {factor.display_name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {factor.clinical_flag}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:text-right">
                    <div>
                      <div className="text-sm font-bold font-mono text-cyan-400">
                        +{factor.impact_score.toFixed(1)} pts
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {factor.percentage_contribution}% of total risk
                      </div>
                    </div>
                  </div>
                </div>

                {/* Relative Impact Progress Bar */}
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800 mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCritical
                        ? 'bg-gradient-to-r from-rose-600 to-red-400'
                        : isWarning
                        ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-400'
                    }`}
                    style={{ width: `${Math.min(100, factor.percentage_contribution)}%` }}
                  />
                </div>

                {/* Evidence & Baseline Comparison */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1 font-mono gap-2">
                  <span className="text-slate-300">
                    Evidence: {factor.evidence}
                  </span>
                  {factor.z_score !== undefined && (
                    <span className="bg-slate-900 px-2 py-0.5 rounded text-cyan-300 border border-slate-800">
                      Z: {factor.z_score > 0 ? `+${factor.z_score}` : factor.z_score}σ
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Non-Pharmacologic Evidence-Based Interventions Section */}
      <div className="pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-200">
              Recommended Non-Pharmacologic Clinical Interventions
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
            Zero-Touch ICU Protocol
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {interventions.map((intv) => (
            <div
              key={intv.id}
              className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    {intv.title}
                  </h4>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded shrink-0 ${
                      intv.urgency === 'immediate'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {intv.urgency.toUpperCase()}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                  {intv.protocol_rationale}
                </p>

                {/* Actionable Checklist */}
                <div className="space-y-1.5 mb-2">
                  {intv.checklist_items.map((item, idx) => {
                    const checkKey = `${intv.id}-${idx}`;
                    const isChecked = Boolean(completedItems[checkKey]);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleChecklist(checkKey)}
                        className={`w-full text-left p-1.5 rounded text-[11px] transition-colors flex items-start gap-2 cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-950/40 text-emerald-300 line-through'
                            : 'bg-slate-900/60 hover:bg-slate-800/60 text-slate-300'
                        }`}
                      >
                        <CheckCircle2
                          className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                            isChecked ? 'text-emerald-400' : 'text-slate-600'
                          }`}
                        />
                        <span className="flex-1">{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800/60 flex justify-between">
                <span>Guideline: {intv.evidence_level}</span>
                <span className="text-cyan-400">Target Non-Pharm Action</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
