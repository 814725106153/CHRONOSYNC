/**
 * ChronoSync Clinical NLP Pipeline
 * Uses Gemini API (@google/genai) to evaluate free-text nursing notes
 * for acute cognitive fluctuation, CAM-ICU markers, and delirium indicators.
 */
import { GoogleGenAI } from '@google/genai';
import type { NlpAnalysisResult } from '../src/types/chronosync';

const CAM_KEYWORDS = [
  'disoriented', 'disorientation', 'confusion', 'confused', 'restless', 'agitated',
  'agitation', 'hallucination', 'hallucinating', 'pulling lines', 'pulling iv',
  'pulling catheter', 'combative', 'sleep inversion', 'insomnia', 'night-wandering',
  'inattentive', 'lethargic', 'unresponsive', 'rambling speech', 'picking at bedsheets',
  'delirious', 'fluctuating', 'uncooperative', 'drowsy', 'hyperactive', 'hypoactive'
];

export async function analyzeNursingNotes(
  notesText: string | undefined
): Promise<NlpAnalysisResult> {
  if (!notesText || notesText.trim().length === 0) {
    return {
      score: 0.05,
      sentiment: 'neutral',
      delirium_subtypes_detected: ['none'],
      cam_icu_features: {
        feature1_acute_onset_fluctuation: false,
        feature2_inattention: false,
        feature3_altered_consciousness: false,
        feature4_disorganized_thinking: false,
      },
      key_phrases: [],
      clinical_summary: 'No active clinical nursing notes logged for this epoch.',
      model_source: 'clinical-cam-heuristic',
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim().length > 0 && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI();
      const prompt = `You are a clinical neuro-ICU expert specializing in the Confusion Assessment Method for the ICU (CAM-ICU).
Analyze the following ICU nurse clinical observation note:
"""${notesText}"""

Evaluate for cognitive fluctuation, psychomotor agitation, inattention, nocturnal sleep-wake disturbances, altered level of consciousness, and acute confusion.

Respond with strict JSON adhering to this schema:
{
  "score": number between 0.00 and 1.00 (0.0 = completely oriented/calm, 1.0 = severe acute delirium/agitation),
  "sentiment": "negative" | "neutral" | "positive" | "acute_confusion",
  "delirium_subtypes_detected": ["hyperactive" | "hypoactive" | "mixed" | "none"],
  "cam_icu_features": {
    "feature1_acute_onset_fluctuation": boolean,
    "feature2_inattention": boolean,
    "feature3_altered_consciousness": boolean,
    "feature4_disorganized_thinking": boolean
  },
  "key_phrases": [list of exact symptom strings found],
  "clinical_summary": "1-2 sentence clinical impression"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        return {
          score: Math.min(1.0, Math.max(0.0, Number(parsed.score) || 0.0)),
          sentiment: parsed.sentiment || 'acute_confusion',
          delirium_subtypes_detected: Array.isArray(parsed.delirium_subtypes_detected)
            ? parsed.delirium_subtypes_detected
            : ['none'],
          cam_icu_features: {
            feature1_acute_onset_fluctuation: Boolean(parsed.cam_icu_features?.feature1_acute_onset_fluctuation),
            feature2_inattention: Boolean(parsed.cam_icu_features?.feature2_inattention),
            feature3_altered_consciousness: Boolean(parsed.cam_icu_features?.feature3_altered_consciousness),
            feature4_disorganized_thinking: Boolean(parsed.cam_icu_features?.feature4_disorganized_thinking),
          },
          key_phrases: Array.isArray(parsed.key_phrases) ? parsed.key_phrases : [],
          clinical_summary: parsed.clinical_summary || 'Gemini CAM-ICU evaluated.',
          model_source: 'gemini-2.5-flash',
        };
      }
    } catch (err) {
      console.warn('Gemini NLP call encountered error, falling back to heuristic CAM-ICU parser:', err);
    }
  }

  // Resilient CAM-ICU Heuristic Lexicon Parser
  return parseHeuristicCamIcu(notesText);
}

function parseHeuristicCamIcu(text: string): NlpAnalysisResult {
  const lower = text.toLowerCase();
  const matchedKeywords: string[] = [];

  for (const kw of CAM_KEYWORDS) {
    if (lower.includes(kw)) {
      matchedKeywords.push(kw);
    }
  }

  const f1 = lower.includes('fluctuat') || lower.includes('acute') || lower.includes('sudden');
  const f2 = lower.includes('inattentive') || lower.includes('wandering attention') || lower.includes('distracted');
  const f3 = lower.includes('agitated') || lower.includes('restless') || lower.includes('drowsy') || lower.includes('combative') || lower.includes('lethargic');
  const f4 = lower.includes('disoriented') || lower.includes('confused') || lower.includes('hallucinat') || lower.includes('rambling');

  let baseScore = 0.1;
  baseScore += matchedKeywords.length * 0.18;
  if (lower.includes('pulling')) baseScore += 0.25;
  if (lower.includes('agitated') || lower.includes('combative')) baseScore += 0.2;
  if (lower.includes('hallucination') || lower.includes('seeing things')) baseScore += 0.3;

  const score = Math.min(1.0, Math.max(0.05, baseScore));
  const subtypes: ('hyperactive' | 'hypoactive' | 'mixed' | 'none')[] = [];
  if (lower.includes('agitated') || lower.includes('restless') || lower.includes('combative') || lower.includes('pulling')) {
    subtypes.push('hyperactive');
  }
  if (lower.includes('drowsy') || lower.includes('lethargic') || lower.includes('unresponsive') || lower.includes('flat')) {
    subtypes.push('hypoactive');
  }
  if (subtypes.length === 2) {
    subtypes.unshift('mixed');
  } else if (subtypes.length === 0) {
    subtypes.push(score > 0.4 ? 'hyperactive' : 'none');
  }

  return {
    score,
    sentiment: score > 0.4 ? 'acute_confusion' : 'neutral',
    delirium_subtypes_detected: subtypes,
    cam_icu_features: {
      feature1_acute_onset_fluctuation: f1 || score > 0.5,
      feature2_inattention: f2 || matchedKeywords.length >= 2,
      feature3_altered_consciousness: f3,
      feature4_disorganized_thinking: f4,
    },
    key_phrases: matchedKeywords.slice(0, 5),
    clinical_summary: `Heuristic parsing identified ${matchedKeywords.length} CAM-ICU delirium markers in nurse observation.`,
    model_source: 'clinical-cam-heuristic',
  };
}
