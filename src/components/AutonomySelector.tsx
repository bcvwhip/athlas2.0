import React from 'react';
import { Shield, Sparkles, CheckCircle2 } from 'lucide-react';
import { AutonomyLevel } from '../types.js';

interface AutonomySelectorProps {
  currentLevel: AutonomyLevel;
  onChange: (level: AutonomyLevel) => void;
  compact?: boolean;
}

export const AUTONOMY_LEVELS: Record<
  AutonomyLevel,
  { label: string; short: string; desc: string; iconColor: string }
> = {
  level_1: {
    label: 'Livello 1 — Consiglio',
    short: 'Consiglio',
    desc: 'Athlas spiega cosa fare e fornisce istruzioni senza eseguire azioni.',
    iconColor: 'text-blue-400',
  },
  level_2: {
    label: 'Livello 2 — Assistenza',
    short: 'Assistenza',
    desc: 'Athlas prepara tutto il piano e richiede sempre la tua conferma prima di agire.',
    iconColor: 'text-amber-400',
  },
  level_3: {
    label: 'Livello 3 — Autonomia',
    short: 'Autonomia',
    desc: 'Athlas esegue automaticamente le azioni sicure e chiede conferma solo per quelle critiche.',
    iconColor: 'text-emerald-400',
  },
};

export const AutonomySelector: React.FC<AutonomySelectorProps> = ({
  currentLevel,
  onChange,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="flex items-center gap-1 p-0.5 bg-[#141414] border border-[#262626] rounded-lg">
        {(['level_1', 'level_2', 'level_3'] as AutonomyLevel[]).map((level) => {
          const config = AUTONOMY_LEVELS[level];
          const active = currentLevel === level;
          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange(level)}
              title={config.desc}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
                active
                  ? 'bg-[#222222] text-white shadow-sm border border-[#333333]'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                level === 'level_1' ? 'bg-blue-400' : level === 'level_2' ? 'bg-amber-400' : 'bg-emerald-400'
              }`} />
              <span>{config.short}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
        <span className="flex items-center gap-1.5 font-medium text-neutral-300">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          Livello di Autonomia di Athlas DO
        </span>
        <span className="text-[11px] text-neutral-500">Predefinito: Livello 2</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {(['level_1', 'level_2', 'level_3'] as AutonomyLevel[]).map((level) => {
          const cfg = AUTONOMY_LEVELS[level];
          const active = currentLevel === level;
          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange(level)}
              className={`text-left p-2.5 rounded-lg border transition-all ${
                active
                  ? 'bg-[#181818] border-neutral-600 shadow-sm'
                  : 'bg-[#111111] border-[#222222] hover:border-[#333333] hover:bg-[#151515]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${active ? 'text-white' : 'text-neutral-300'}`}>
                  {cfg.short}
                </span>
                {active && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <p className="text-[11px] leading-relaxed text-neutral-400 line-clamp-2">
                {cfg.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
