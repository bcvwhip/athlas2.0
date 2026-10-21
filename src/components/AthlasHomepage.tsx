import React from 'react';
import {
  Brain,
  Camera,
  Compass,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Keyboard,
  Mic,
  Plane,
  Sparkles,
  Upload,
  Zap,
} from 'lucide-react';
import { AutonomyLevel, PersonaType } from '../types.js';

interface AthlasHomepageProps {
  onStartVoice: () => void;
  onFocusComposer: () => void;
  onOpenMirror: () => void;
  onOpenFileUpload: () => void;
  onSelectPrompt: (promptText: string) => void;
  currentPersona: PersonaType;
  currentAutonomy: AutonomyLevel;
}

export const AthlasHomepage: React.FC<AthlasHomepageProps> = ({
  onStartVoice,
  onFocusComposer,
  onOpenMirror,
  onOpenFileUpload,
  onSelectPrompt,
  currentPersona,
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-4xl mx-auto w-full text-center">
      {/* Subtle brand kicker */}
      <div className="inline-flex items-center gap-2 text-xs font-mono tracking-wider text-neutral-400 mb-6 uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        <span>3 ATHLAS COGNITIVE SYSTEM</span>
      </div>

      {/* Main Center Title from User Brief */}
      <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4 text-balance">
        Cosa vuoi fare?
      </h1>

      <p className="text-sm sm:text-base text-neutral-400 max-w-xl mx-auto mb-8 font-normal leading-relaxed">
        Non devi spiegare ogni singolo passaggio né decidere quali strumenti usare.
        Dì semplicemente a 3 Athlas cosa desideri ottenere.
      </p>

      {/* 4 PRIMARY ACTION BUTTONS FROM USER BRIEF: Parla, Scrivi, Mostra, Carica */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl mb-12">
        {/* 1. Parla */}
        <button
          type="button"
          onClick={onStartVoice}
          className="group flex flex-col items-center justify-center p-4 bg-[#141414] hover:bg-[#1a1a1a] border border-[#262626] hover:border-cyan-500/50 rounded-2xl transition-all shadow-sm hover:shadow-cyan-950/20 active:scale-95"
        >
          <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
            <Mic className="w-6 h-6" />
          </div>
          <span className="text-sm font-semibold text-white mb-0.5">Parla</span>
          <span className="text-[11px] text-neutral-500">"Hey 3 Athlas..."</span>
        </button>

        {/* 2. Scrivi */}
        <button
          type="button"
          onClick={onFocusComposer}
          className="group flex flex-col items-center justify-center p-4 bg-[#141414] hover:bg-[#1a1a1a] border border-[#262626] hover:border-amber-500/50 rounded-2xl transition-all shadow-sm hover:shadow-amber-950/20 active:scale-95"
        >
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
            <Keyboard className="w-6 h-6" />
          </div>
          <span className="text-sm font-semibold text-white mb-0.5">Scrivi</span>
          <span className="text-[11px] text-neutral-500">Descrivi l'intenzione</span>
        </button>

        {/* 3. Mostra (Athlas Mirror) */}
        <button
          type="button"
          onClick={onOpenMirror}
          className="group flex flex-col items-center justify-center p-4 bg-[#141414] hover:bg-[#1a1a1a] border border-[#262626] hover:border-purple-500/50 rounded-2xl transition-all shadow-sm hover:shadow-purple-950/20 active:scale-95"
        >
          <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
            <Camera className="w-6 h-6" />
          </div>
          <span className="text-sm font-semibold text-white mb-0.5">Mostra</span>
          <span className="text-[11px] text-neutral-500">Schermo, foto o webcam</span>
        </button>

        {/* 4. Carica */}
        <button
          type="button"
          onClick={onOpenFileUpload}
          className="group flex flex-col items-center justify-center p-4 bg-[#141414] hover:bg-[#1a1a1a] border border-[#262626] hover:border-emerald-500/50 rounded-2xl transition-all shadow-sm hover:shadow-emerald-950/20 active:scale-95"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
            <Upload className="w-6 h-6" />
          </div>
          <span className="text-sm font-semibold text-white mb-0.5">Carica</span>
          <span className="text-[11px] text-neutral-500">PDF, Excel, Word, codice</span>
        </button>
      </div>

      {/* 5 SUPER ABILITIES SHOWCASE PROMPTS */}
      <div className="w-full max-w-3xl text-left">
        <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3 px-1">
          Esempi delle 5 Super Abilità
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {/* MIND */}
          <button
            type="button"
            onClick={() => onSelectPrompt('Non so cosa fare. Analizza i miei obiettivi e dimmi cosa prioritizzare adesso.')}
            className="p-3 bg-[#111111] hover:bg-[#161616] border border-[#202020] hover:border-cyan-500/40 rounded-xl transition-all text-left group"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Brain className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-white">ATHLAS MIND</span>
            </div>
            <p className="text-xs text-neutral-300 font-medium mb-1">"Non so cosa fare"</p>
            <p className="text-[11px] text-neutral-500 leading-snug">
              Comprende il tuo contesto complessivo, obiettivi e priorità.
            </p>
          </button>

          {/* DO */}
          <button
            type="button"
            onClick={() => onSelectPrompt('Voglio organizzare il mio viaggio a Londra con la famiglia la prossima settimana e spendere poco.')}
            className="p-3 bg-[#111111] hover:bg-[#161616] border border-[#202020] hover:border-amber-500/40 rounded-xl transition-all text-left group"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-white">ATHLAS DO</span>
            </div>
            <p className="text-xs text-neutral-300 font-medium mb-1">"Organizza il mio viaggio"</p>
            <p className="text-[11px] text-neutral-500 leading-snug">
              Trasforma l'intenzione in piano operativo con verifiche e conferme.
            </p>
          </button>

          {/* MIRROR */}
          <button
            type="button"
            onClick={onOpenMirror}
            className="p-3 bg-[#111111] hover:bg-[#161616] border border-[#202020] hover:border-purple-500/40 rounded-xl transition-all text-left group"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Camera className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-white">ATHLAS MIRROR</span>
            </div>
            <p className="text-xs text-neutral-300 font-medium mb-1">"Non riesco a fare questa cosa"</p>
            <p className="text-[11px] text-neutral-500 leading-snug">
              Osserva lo schermo, individua il blocco e ti guida passo per passo.
            </p>
          </button>

          {/* LEARN */}
          <button
            type="button"
            onClick={() => onSelectPrompt('Spiegami come funziona la tecnologia blockchain, ma se non capisco cambia spiegazione finché non mi è chiara.')}
            className="p-3 bg-[#111111] hover:bg-[#161616] border border-[#202020] hover:border-emerald-500/40 rounded-xl transition-all text-left group"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-white">ATHLAS LEARN</span>
            </div>
            <p className="text-xs text-neutral-300 font-medium mb-1">"Insegnami un concetto"</p>
            <p className="text-[11px] text-neutral-500 leading-snug">
              Pedagogia adattiva: adatta analogie, schemi ed esercizi se sbagli.
            </p>
          </button>

          {/* WORLD */}
          <button
            type="button"
            onClick={() => onSelectPrompt('Crea un report Excel completo per il budget mensile con formule di risparmio ed esportalo scaricabile.')}
            className="p-3 bg-[#111111] hover:bg-[#161616] border border-[#202020] hover:border-blue-500/40 rounded-xl transition-all text-left group"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Compass className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-semibold text-white">ATHLAS WORLD</span>
            </div>
            <p className="text-xs text-neutral-300 font-medium mb-1">"Ponte digitale reale"</p>
            <p className="text-[11px] text-neutral-500 leading-snug">
              Coordina file reali, ricerche web, calendari e automazioni.
            </p>
          </button>

          {/* EXAM / STUDY */}
          <button
            type="button"
            onClick={() => onSelectPrompt('Devo prepararmi per l\'esame: crea un programma di studio e simulazioni con verifiche attive.')}
            className="p-3 bg-[#111111] hover:bg-[#161616] border border-[#202020] hover:border-rose-500/40 rounded-xl transition-all text-left group"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-semibold text-white">ORCHESTRATORE</span>
            </div>
            <p className="text-xs text-neutral-300 font-medium mb-1">"Devo prepararmi all'esame"</p>
            <p className="text-[11px] text-neutral-500 leading-snug">
              Combina Mind, Do, Learn e World in un'unica risposta integrata.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
