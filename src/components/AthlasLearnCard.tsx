import React, { useState } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { LearnProgress, PedagogyStrategy } from '../types.js';
import { checkLearnExercise } from '../lib/api.js';

interface AthlasLearnCardProps {
  initialProgress: LearnProgress;
  onProgressUpdated?: (updated: LearnProgress) => void;
}

const STRATEGY_LABELS: Record<
  PedagogyStrategy,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; desc: string }
> = {
  deductive: {
    label: 'Spiegazione Deduttiva',
    icon: Lightbulb,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    desc: 'Principio primo formulato in termini chiari e logici.',
  },
  analogy: {
    label: 'Approccio Analogico',
    icon: Sparkles,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    desc: 'Metafora concreta tratta da situazioni della vita quotidiana.',
  },
  visual_schema: {
    label: 'Schema Logico Visuale',
    icon: HelpCircle,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    desc: 'Scomposizione a blocchi causa-effetto del sistema.',
  },
  interactive_challenge: {
    label: 'Mini-Sfida Pratica Interattiva',
    icon: Trophy,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    desc: 'Verifica attiva con feedback pedagogico immediato.',
  },
  step_by_step: {
    label: 'Guida Passo-Passo',
    icon: Award,
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    desc: 'Micro-istruzioni elementari guidate.',
  },
};

export const AthlasLearnCard: React.FC<AthlasLearnCardProps> = ({
  initialProgress,
  onProgressUpdated,
}) => {
  const [progress, setProgress] = useState<LearnProgress>(initialProgress);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);

  const strategyCfg = STRATEGY_LABELS[progress.currentStrategy] || STRATEGY_LABELS.deductive;
  const StrategyIcon = strategyCfg.icon;
  const exercise = progress.activeExercise;

  const handleSelectOption = async (idx: number) => {
    if (submitted || isChecking || !exercise) return;
    setSelectedIdx(idx);
    setIsChecking(true);

    try {
      const res = await checkLearnExercise({
        topic: progress.topic,
        selectedOptionIndex: idx,
        correctOptionIndex: exercise.correctOptionIndex ?? 0,
      });

      setSubmitted(true);
      setWasCorrect(res.isCorrect);
      setProgress(res.progress);
      onProgressUpdated?.(res.progress);
    } catch (err) {
      console.warn('Exercise check error:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleNextChallenge = () => {
    setSelectedIdx(null);
    setSubmitted(false);
    setWasCorrect(null);
  };

  return (
    <div className="my-3 p-4 bg-[#111111] border border-[#262626] rounded-2xl space-y-4 shadow-lg text-left">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>ATHLAS LEARN</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${strategyCfg.color} font-medium flex items-center gap-1`}>
                <StrategyIcon className="w-3 h-3" />
                <span>{strategyCfg.label}</span>
              </span>
            </div>
            <div className="text-xs text-neutral-300 font-medium">
              Argomento: {progress.topic}
            </div>
          </div>
        </div>

        {/* Mastery score */}
        <div className="flex items-center gap-2 text-right">
          <div>
            <div className="text-[10px] text-neutral-500 uppercase font-mono">Padronanza</div>
            <div className="text-xs font-bold text-emerald-400 font-mono">
              {progress.masteryScore}%
            </div>
          </div>
        </div>
      </div>

      {/* Adaptive Feedback Banner if strategy changed */}
      {progress.lastFeedback && (
        <div className="p-2.5 bg-[#161616] border border-[#2a2a2a] rounded-xl text-xs text-neutral-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{progress.lastFeedback}</span>
        </div>
      )}

      {/* Interactive Exercise / Question */}
      {exercise && (
        <div className="space-y-3">
          <p className="text-xs text-neutral-200 font-medium leading-relaxed">
            {exercise.question}
          </p>

          {/* Options */}
          {exercise.options && (
            <div className="space-y-1.5">
              {exercise.options.map((opt, idx) => {
                const isSelected = selectedIdx === idx;
                const isCorrect = idx === exercise.correctOptionIndex;

                let optStyle = 'bg-[#161616] border-[#252525] text-neutral-300 hover:bg-[#1c1c1c]';
                if (submitted) {
                  if (isCorrect) {
                    optStyle = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-semibold';
                  } else if (isSelected && !isCorrect) {
                    optStyle = 'bg-rose-500/10 border-rose-500/40 text-rose-300';
                  }
                } else if (isSelected) {
                  optStyle = 'bg-neutral-800 border-neutral-600 text-white';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={submitted || isChecking}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full p-2.5 rounded-xl border text-xs text-left transition-all flex items-center justify-between ${optStyle}`}
                  >
                    <span>{opt}</span>
                    {submitted && isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                    )}
                    {submitted && isSelected && !isCorrect && (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Explanation if submitted */}
          {submitted && (
            <div className="p-3 bg-[#161616] border border-[#2a2a2a] rounded-xl text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-white">
                {wasCorrect ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Risposta Esatta!
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Riprova con un'altra strategia
                  </span>
                )}
              </div>
              <p className="text-neutral-300 leading-relaxed text-[11px]">
                {exercise.explanation}
              </p>
              {!wasCorrect && (
                <p className="text-[11px] text-amber-300 font-medium">
                  💡 Athlas ha automaticamente adattato l'approccio alla prossima spiegazione per aiutarti a capire.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
