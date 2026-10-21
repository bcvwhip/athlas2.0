import React from 'react';
import { User, Sparkles, GraduationCap, Briefcase, HeartHandshake, Smile } from 'lucide-react';
import { PersonaType } from '../types.js';

interface PersonaSelectorProps {
  currentPersona: PersonaType;
  onChange: (persona: PersonaType) => void;
  compact?: boolean;
}

export const PERSONA_CONFIGS: Record<
  PersonaType,
  {
    id: PersonaType;
    label: string;
    sublabel: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }
> = {
  child: {
    id: 'child',
    label: 'Bambino',
    sublabel: 'Curioso & Sicuro',
    description: 'Linguaggio semplice, giocoso, educativo e stimolante con filtri di protezione.',
    icon: Smile,
    color: 'text-amber-400',
  },
  teen: {
    id: 'teen',
    label: 'Ragazzo',
    sublabel: 'Studio & Creatività',
    description: 'Tono fresco, diretto, ottimizzato per compiti, ricerche, passioni e mappe.',
    icon: GraduationCap,
    color: 'text-violet-400',
  },
  adult: {
    id: 'adult',
    label: 'Adulto',
    sublabel: 'Vita & Produttività',
    description: 'Equilibrato, rapido, concreto per organizzazione quotidiana e progetti personali.',
    icon: User,
    color: 'text-cyan-400',
  },
  pro: {
    id: 'pro',
    label: 'Professionista',
    sublabel: 'Analisi & Documenti',
    description: 'Rigore analitico, terminologia di settore, fogli di calcolo, contratti e sintesi.',
    icon: Briefcase,
    color: 'text-emerald-400',
  },
  senior: {
    id: 'senior',
    label: 'Anziano',
    sublabel: 'Paziente & Chiaro',
    description: 'Istruzioni passo-passo senza gergo tecnico, caratteri grandi e supporto vocale.',
    icon: HeartHandshake,
    color: 'text-rose-400',
  },
};

export const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  currentPersona,
  onChange,
  compact = false,
}) => {
  if (compact) {
    const activeCfg = PERSONA_CONFIGS[currentPersona] || PERSONA_CONFIGS.adult;
    const Icon = activeCfg.icon;

    return (
      <div className="relative group">
        <button
          type="button"
          title={`Profilo attivo: ${activeCfg.label} (${activeCfg.sublabel})`}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-300 bg-[#161616] hover:bg-[#202020] border border-[#282828] rounded-lg transition-colors whitespace-nowrap"
        >
          <Icon className={`w-3.5 h-3.5 ${activeCfg.color}`} />
          <span>{activeCfg.label}</span>
        </button>

        {/* Dropdown list on hover or click */}
        <div className="absolute right-0 top-full mt-1.5 w-56 p-1.5 bg-[#121212] border border-[#2a2a2a] rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
          <div className="px-2 py-1 text-[11px] font-semibold text-neutral-400 border-b border-[#222222] mb-1">
            Adattamento Persona di 3 Athlas
          </div>
          {(Object.keys(PERSONA_CONFIGS) as PersonaType[]).map((key) => {
            const cfg = PERSONA_CONFIGS[key];
            const CfgIcon = cfg.icon;
            const isSelected = currentPersona === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChange(key)}
                className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                  isSelected
                    ? 'bg-[#222222] text-white font-medium'
                    : 'text-neutral-300 hover:bg-[#1a1a1a] hover:text-white'
                }`}
              >
                <CfgIcon className={`w-4 h-4 shrink-0 ${cfg.color}`} />
                <div className="truncate">
                  <div className="font-medium text-neutral-200">{cfg.label}</div>
                  <div className="text-[10px] text-neutral-400 truncate">{cfg.sublabel}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-neutral-300">
        Profilo e Adattamento Persona
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {(Object.keys(PERSONA_CONFIGS) as PersonaType[]).map((key) => {
          const cfg = PERSONA_CONFIGS[key];
          const Icon = cfg.icon;
          const isSelected = currentPersona === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-[#181818] border-neutral-600 shadow-sm'
                  : 'bg-[#111111] border-[#222222] hover:border-[#333333] hover:bg-[#151515]'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`w-4 h-4 ${cfg.color}`} />
                <span className="text-xs font-semibold text-white">{cfg.label}</span>
              </div>
              <p className="text-[10px] text-neutral-400 leading-tight">
                {cfg.sublabel}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
