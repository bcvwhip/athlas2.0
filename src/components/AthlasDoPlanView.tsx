import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  Camera,
  CheckCircle2,
  Clock,
  Compass,
  FileCheck,
  GraduationCap,
  Loader2,
  Play,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { AthlasAbility, DoPlan, DoStep } from '../types.js';
import { executeDoPlanStep } from '../lib/api.js';

interface AthlasDoPlanViewProps {
  plan: DoPlan;
  onPlanUpdated?: (updatedPlan: DoPlan) => void;
}

const ABILITY_ICONS: Record<AthlasAbility, React.ComponentType<{ className?: string }>> = {
  mind: Brain,
  do: Zap,
  mirror: Camera,
  learn: GraduationCap,
  world: Compass,
};

export const AthlasDoPlanView: React.FC<AthlasDoPlanViewProps> = ({ plan: initialPlan, onPlanUpdated }) => {
  const [plan, setPlan] = useState<DoPlan>(initialPlan);
  const [executingStepId, setExecutingStepId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleExecute = async (step: DoStep, confirmed = false) => {
    setExecutingStepId(step.id);
    setErrorMsg(null);
    try {
      const res = await executeDoPlanStep(plan.id, step.id, confirmed);
      setPlan(res.plan);
      onPlanUpdated?.(res.plan);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore esecuzione passaggio';
      setErrorMsg(msg);
    } finally {
      setExecutingStepId(null);
    }
  };

  const phases = [
    { key: 'understanding', label: 'Comprensione' },
    { key: 'planning', label: 'Piano' },
    { key: 'research', label: 'Ricerca' },
    { key: 'actions', label: 'Azioni' },
    { key: 'verification', label: 'Verifica' },
    { key: 'result', label: 'Risultato' },
  ];

  return (
    <div className="my-3 p-4 bg-[#111111] border border-[#262626] rounded-2xl space-y-4 shadow-lg text-left">
      {/* Header with Goal & Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#222222]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>ATHLAS DO</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">
                {plan.progressPercent}% completato
              </span>
            </div>
            <div className="text-xs text-neutral-300 font-medium truncate max-w-md">
              {plan.goal}
            </div>
          </div>
        </div>

        {/* Phase chain badges */}
        <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-mono text-neutral-400">
          {phases.map((ph, idx) => {
            const isCurrent = plan.currentPhase === ph.key;
            return (
              <React.Fragment key={ph.key}>
                <span
                  className={`px-1.5 py-0.5 rounded ${
                    isCurrent
                      ? 'bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30'
                      : 'text-neutral-500'
                  }`}
                >
                  {ph.label}
                </span>
                {idx < phases.length - 1 && <span className="text-neutral-600">→</span>}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#1a1a1a] h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-amber-400 h-full transition-all duration-500 rounded-full"
          style={{ width: `${plan.progressPercent}%` }}
        />
      </div>

      {errorMsg && (
        <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Step List */}
      <div className="space-y-2">
        {plan.steps.map((step) => {
          const AbilityIcon = ABILITY_ICONS[step.ability] || Zap;
          const isExecuting = executingStepId === step.id;
          const isDone = step.status === 'completed';
          const needsConfirm = step.status === 'needs_confirmation';
          const isSensitive = step.riskLevel === 'sensitive' || step.riskLevel === 'critical';

          return (
            <div
              key={step.id}
              className={`p-3 rounded-xl border transition-all ${
                isDone
                  ? 'bg-[#141414]/50 border-[#202020] opacity-80'
                  : needsConfirm
                  ? 'bg-amber-500/5 border-amber-500/30 shadow-sm'
                  : 'bg-[#151515] border-[#252525]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  {/* Step status indicator */}
                  <div className="mt-0.5">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : isExecuting ? (
                      <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                    ) : needsConfirm ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-neutral-600 text-[10px] font-mono flex items-center justify-center text-neutral-400">
                        {step.order}
                      </div>
                    )}
                  </div>

                  {/* Step Details */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${isDone ? 'line-through text-neutral-400' : 'text-neutral-200'}`}>
                        {step.title}
                      </span>
                      <span className="text-[10px] font-mono uppercase text-neutral-500 flex items-center gap-1">
                        <AbilityIcon className="w-3 h-3" />
                        {step.ability}
                      </span>
                      {isSensitive && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/10 text-rose-300 font-mono">
                          {step.riskLevel === 'critical' ? 'Critico' : 'Sensibile'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-snug">
                      {step.description}
                    </p>

                    {/* Step Execution Result */}
                    {step.result && (
                      <div className="mt-1.5 p-2 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] text-[11px] text-neutral-300 flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{step.result.summary}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action button: Confirm or Run */}
                <div>
                  {needsConfirm ? (
                    <button
                      type="button"
                      disabled={isExecuting}
                      onClick={() => handleExecute(step, true)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-semibold rounded-lg transition-all flex items-center gap-1 shadow-sm active:scale-95 whitespace-nowrap"
                    >
                      {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                      <span>Conferma ed Esegui</span>
                    </button>
                  ) : step.status === 'in_progress' ? (
                    <button
                      type="button"
                      disabled={isExecuting}
                      onClick={() => handleExecute(step, false)}
                      className="px-2.5 py-1 bg-[#222222] hover:bg-[#2a2a2a] text-neutral-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                    >
                      {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3 h-3 text-amber-400" />}
                      <span>Esegui</span>
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
