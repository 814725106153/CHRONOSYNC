import React from 'react';
import { FileText, Brain, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import type { NlpAnalysisResult } from '../types/chronosync';

interface NlpClinicalNotesPanelProps {
  nlpResult: NlpAnalysisResult | null;
  currentNoteText?: string;
}

export const NlpClinicalNotesPanel: React.FC<NlpClinicalNotesPanelProps> = ({
  nlpResult,
  currentNoteText,
}) => {
  const score = nlpResult?.score ?? 0.05;
  const isHighConfusion = score > 0.5;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-violet-400" />
            Stage C: Inline NLP Cognitive Fluctuations
          </span>
          <h2 className="text-lg font-bold text-slate-100 mt-0.5">
            Nurse Notes NLP Sentiment &amp; CAM-ICU Extractor
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono bg-violet-950/60 text-violet-300 border border-violet-700/50 px-2.5 py-1 rounded-lg flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-violet-400" />
            {nlpResult?.model_source === 'gemini-2.5-flash'
              ? 'Gemini 2.5 Flash API'
              : 'CAM-ICU Lexicon Engine'}
          </span>
        </div>
      </div>

      {/* Current Ingested Note Free Text Box */}
      <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs">
        <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] mb-1.5">
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Active Clinical Observation Payload:
          </span>
          <span className="text-violet-400">
            Confusion Score: {(score * 100).toFixed(0)}%
          </span>
        </div>
        <p className="text-slate-200 italic font-serif leading-relaxed">
          "{currentNoteText || 'No clinical text entered for this epoch.'}"
        </p>
      </div>

      {/* CAM-ICU Feature Matrix */}
      <div>
        <div className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-2">
          CAM-ICU Core Delirium Criteria Matrix
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {/* Feature 1 */}
          <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
            nlpResult?.cam_icu_features.feature1_acute_onset_fluctuation
              ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
              : 'bg-slate-950/40 border-slate-800 text-slate-400'
          }`}>
            <span>Feature 1: Acute Onset / Fluctuating Course</span>
            {nlpResult?.cam_icu_features.feature1_acute_onset_fluctuation ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-slate-600 shrink-0" />
            )}
          </div>

          {/* Feature 2 */}
          <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
            nlpResult?.cam_icu_features.feature2_inattention
              ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
              : 'bg-slate-950/40 border-slate-800 text-slate-400'
          }`}>
            <span>Feature 2: Inattention (Wandering focus)</span>
            {nlpResult?.cam_icu_features.feature2_inattention ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-slate-600 shrink-0" />
            )}
          </div>

          {/* Feature 3 */}
          <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
            nlpResult?.cam_icu_features.feature3_altered_consciousness
              ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
              : 'bg-slate-950/40 border-slate-800 text-slate-400'
          }`}>
            <span>Feature 3: Altered Consciousness (RASS &ne; 0)</span>
            {nlpResult?.cam_icu_features.feature3_altered_consciousness ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-slate-600 shrink-0" />
            )}
          </div>

          {/* Feature 4 */}
          <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
            nlpResult?.cam_icu_features.feature4_disorganized_thinking
              ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
              : 'bg-slate-950/40 border-slate-800 text-slate-400'
          }`}>
            <span>Feature 4: Disorganized Thinking</span>
            {nlpResult?.cam_icu_features.feature4_disorganized_thinking ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-slate-600 shrink-0" />
            )}
          </div>
        </div>
      </div>

      {/* Extracted Key Phrases and Clinical Impression */}
      <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 font-mono text-[11px]">Identified Triggers:</span>
          {nlpResult?.key_phrases && nlpResult.key_phrases.length > 0 ? (
            nlpResult.key_phrases.map((phrase, idx) => (
              <span
                key={idx}
                className="bg-violet-950/60 border border-violet-800/50 text-violet-300 font-mono text-[10px] px-2 py-0.5 rounded"
              >
                {phrase}
              </span>
            ))
          ) : (
            <span className="text-slate-500 italic text-[11px]">None detected</span>
          )}
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          Clinical Impression: <span className="text-slate-200">{nlpResult?.clinical_summary}</span>
        </div>
      </div>
    </div>
  );
};
