import {
  Brain,
  Camera,
  ChevronDown,
  Menu,
  Mic,
  Plus,
  Settings,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';
import React, { useState } from 'react';
import { AVAILABLE_MISTRAL_MODELS } from '../server/mistral.js';
import { AutonomyLevel, PersonaType, User, UserSettings } from '../types.js';
import { AutonomySelector } from './AutonomySelector.js';
import { PersonaSelector } from './PersonaSelector.js';

interface ChatHeaderProps {
  currentModel: string;
  onSelectModel: (model: string) => void;
  mistralOnline: boolean;
  onOpenSidebar: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onOpenAuth: (mode?: 'register' | 'login') => void;
  onOpenVoiceMode?: () => void;
  isWakeWordActive?: boolean;
  onToggleWakeWord?: () => void;
  currentUser: User | null;
  settings: UserSettings;
  onOpenMirror: () => void;
  onOpenMind: () => void;
  currentAutonomy: AutonomyLevel;
  onSelectAutonomy: (level: AutonomyLevel) => void;
  currentPersona: PersonaType;
  onSelectPersona: (persona: PersonaType) => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  currentModel,
  onSelectModel,
  mistralOnline,
  onOpenSidebar,
  onNewChat,
  onOpenSettings,
  onOpenAuth,
  onOpenVoiceMode,
  isWakeWordActive = true,
  onToggleWakeWord,
  currentUser,
  onOpenMirror,
  onOpenMind,
  currentAutonomy,
  onSelectAutonomy,
  currentPersona,
  onSelectPersona,
}) => {
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  const isGuest =
    !currentUser ||
    currentUser.id.startsWith('guest_') ||
    currentUser.email.endsWith('@athlas.local');

  const selectedModelObj =
    AVAILABLE_MISTRAL_MODELS.find((m) => m.id === currentModel) || AVAILABLE_MISTRAL_MODELS[0];

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-3 sm:px-6 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#222222]">
      {/* Left controls: Menu + Wordmark / Model */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        <button
          id="mobile-menu-toggle"
          onClick={onOpenSidebar}
          aria-label="Apri menu laterale"
          className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-[#1A1A1A] lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={onNewChat}
          aria-label="Nuova chat"
          className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-[#1A1A1A] lg:hidden"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Brand label */}
        <button
          type="button"
          onClick={onNewChat}
          className="font-extrabold text-sm sm:text-base text-white tracking-tight flex items-center gap-1.5 hover:opacity-85 transition-opacity"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>3 ATHLAS</span>
        </button>

        {/* Model Selector Dropdown */}
        <div className="relative hidden md:block">
          <button
            id="model-selector-btn"
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full border border-[#2d2d2d] hover:bg-[#1A1A1A] text-[11px] text-neutral-300 transition-all font-medium"
          >
            <span className="text-neutral-400">{selectedModelObj.name}</span>
            <ChevronDown className="w-3 h-3 text-neutral-500" />
          </button>

          {modelDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setModelDropdownOpen(false)}
              />
              <div className="absolute left-0 top-9 z-50 w-60 rounded-xl bg-[#111111] border border-[#222222] shadow-2xl p-1.5 space-y-1 animate-fadeIn">
                <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-neutral-500 font-semibold border-b border-[#222222] mb-1">
                  Modelli Mistral AI
                </div>
                {AVAILABLE_MISTRAL_MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onSelectModel(m.id);
                      setModelDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors flex flex-col ${
                      m.id === currentModel
                        ? 'bg-[#1A1A1A] text-white font-semibold border border-[#333333]'
                        : 'text-neutral-300 hover:bg-[#161616]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{m.name}</span>
                      {m.recommended && (
                        <span className="text-[9px] px-1 rounded bg-cyan-500/10 text-cyan-400">
                          Consigliato
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Middle Controls: 5 Super Abilities Direct Buttons & Autonomy */}
      <div className="hidden lg:flex items-center gap-2">
        {/* Mind Trigger */}
        <button
          type="button"
          onClick={onOpenMind}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-cyan-300 bg-cyan-950/30 hover:bg-cyan-950/50 border border-cyan-500/30 rounded-lg transition-all"
          title="Apri ATHLAS MIND (Mappa del contesto e memoria)"
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Mind</span>
        </button>

        {/* Mirror Trigger */}
        <button
          type="button"
          onClick={onOpenMirror}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-purple-300 bg-purple-950/30 hover:bg-purple-950/50 border border-purple-500/30 rounded-lg transition-all"
          title="Apri ATHLAS MIRROR (Schermo, webcam o foto)"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Mirror</span>
        </button>

        {/* Autonomy Level Segmented Switcher */}
        <AutonomySelector
          compact
          currentLevel={currentAutonomy}
          onChange={onSelectAutonomy}
        />

        {/* Persona Adaptation Selector */}
        <PersonaSelector
          compact
          currentPersona={currentPersona}
          onChange={onSelectPersona}
        />
      </div>

      {/* Right Controls: User, Voice, Settings */}
      <div className="flex items-center space-x-2">
        {/* Mobile quick icons for Mind & Mirror */}
        <button
          type="button"
          onClick={onOpenMind}
          className="p-1.5 rounded-lg text-cyan-400 hover:bg-[#1A1A1A] lg:hidden"
          title="Athlas Mind"
        >
          <Brain className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onOpenMirror}
          className="p-1.5 rounded-lg text-purple-400 hover:bg-[#1A1A1A] lg:hidden"
          title="Athlas Mirror"
        >
          <Camera className="w-4 h-4" />
        </button>

        {isGuest ? (
          <div className="flex items-center space-x-1.5">
            <button
              id="header-register-btn"
              onClick={() => onOpenAuth('register')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Registrati</span>
            </button>
          </div>
        ) : (
          <button
            id="header-user-btn"
            onClick={onOpenSettings}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full border border-[#333333] hover:bg-[#1A1A1A] text-xs text-neutral-300 transition-colors"
          >
            <div className="w-5 h-5 rounded-full bg-neutral-700 text-white flex items-center justify-center font-bold text-[10px]">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="hidden sm:inline font-medium max-w-[100px] truncate">
              {currentUser?.name}
            </span>
          </button>
        )}

        {/* Voice Mode Quick Trigger */}
        {onOpenVoiceMode && (
          <button
            id="header-voice-mode-btn"
            onClick={onOpenVoiceMode}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-semibold shadow-lg shadow-cyan-950/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Avvia modalità vocale intelligente ('Hey 3 Athlas')"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <Mic className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Voce</span>
          </button>
        )}

        <button
          id="header-settings-btn"
          onClick={onOpenSettings}
          aria-label="Impostazioni"
          title="Impostazioni piattaforma"
          className="p-1.5 sm:p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-[#1A1A1A] transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
