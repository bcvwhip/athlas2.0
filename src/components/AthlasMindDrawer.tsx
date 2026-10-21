import React, { useEffect, useState } from 'react';
import {
  Brain,
  CheckCircle2,
  EyeOff,
  Flame,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { MindContextOverview, MindMemoryItem } from '../types.js';
import { addMindMemory, clearMindMemories, deleteMindMemory, fetchMindMemories } from '../lib/api.js';

interface AthlasMindDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isIncognito: boolean;
  onToggleIncognito: (enabled: boolean) => void;
}

export const AthlasMindDrawer: React.FC<AthlasMindDrawerProps> = ({
  isOpen,
  onClose,
  isIncognito,
  onToggleIncognito,
}) => {
  const [memories, setMemories] = useState<MindMemoryItem[]>([]);
  const [overview, setOverview] = useState<MindContextOverview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState<'goal' | 'project' | 'preference' | 'constraint'>('goal');
  const [isAdding, setIsAdding] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetchMindMemories();
      setMemories(res.memories);
      setOverview(res.overview);
    } catch (err) {
      console.warn('Error loading Mind memories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleDelete = async (id: string) => {
    const ok = await deleteMindMemory(id);
    if (ok) {
      setMemories((prev) => prev.filter((m) => m.id !== id));
      loadData();
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Sei sicuro di voler cancellare tutta la memoria di Athlas Mind?')) return;
    const ok = await clearMindMemories();
    if (ok) {
      setMemories([]);
      loadData();
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;
    try {
      await addMindMemory({
        category: newCategory,
        key: newKey.trim(),
        value: newValue.trim(),
      });
      setNewKey('');
      setNewValue('');
      setIsAdding(false);
      loadData();
    } catch (err) {
      console.warn('Error adding memory:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md h-full bg-[#0E0E0E] border-l border-[#262626] shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#222222]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">ATHLAS MIND</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-medium">
                  {memories.length} ricordi attivi
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Memoria trasparente controllata al 100% da te.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Incognito mode bar */}
        <div className="px-5 py-3 bg-[#131313] border-b border-[#202020] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-neutral-300">
            <EyeOff className={`w-4 h-4 ${isIncognito ? 'text-amber-400' : 'text-neutral-500'}`} />
            <div>
              <div className="font-semibold text-white">Modalità Privata / Incognito</div>
              <div className="text-[10px] text-neutral-400">Non salva memorie durante la sessione</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onToggleIncognito(!isIncognito)}
            className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
              isIncognito ? 'bg-amber-500' : 'bg-neutral-700'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                isIncognito ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-left">
          {/* Quick Overview Stats */}
          {overview && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-[#141414] border border-[#222222] rounded-xl">
                <div className="text-neutral-500 text-[10px] uppercase font-bold flex items-center gap-1 mb-1">
                  <Target className="w-3 h-3 text-cyan-400" />
                  Obiettivi attivi
                </div>
                <div className="text-lg font-bold text-white font-mono">
                  {overview.activeGoals.length}
                </div>
              </div>
              <div className="p-3 bg-[#141414] border border-[#222222] rounded-xl">
                <div className="text-neutral-500 text-[10px] uppercase font-bold flex items-center gap-1 mb-1">
                  <Flame className="w-3 h-3 text-amber-400" />
                  Progetti in corso
                </div>
                <div className="text-lg font-bold text-white font-mono">
                  {overview.currentProjects.length}
                </div>
              </div>
            </div>
          )}

          {/* Add Memory trigger */}
          {!isAdding ? (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="w-full py-2 bg-[#161616] hover:bg-[#202020] border border-[#2a2a2a] text-neutral-300 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>Aggiungi un obiettivo o preferenza</span>
            </button>
          ) : (
            <form onSubmit={handleAdd} className="p-3.5 bg-[#141414] border border-[#2a2a2a] rounded-xl space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-white">
                <span>Nuovo Ricordo Mind</span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-neutral-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {(['goal', 'project', 'preference', 'constraint'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewCategory(cat)}
                    className={`py-1 px-2 rounded-lg text-[11px] font-medium transition-colors ${
                      newCategory === cat
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-[#1a1a1a] text-neutral-400'
                    }`}
                  >
                    {cat === 'goal' ? 'Obiettivo' : cat === 'project' ? 'Progetto' : cat === 'preference' ? 'Preferenza' : 'Vincolo'}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Etichetta (es. Esame di Fisica, Dieta)"
                className="w-full px-2.5 py-1.5 bg-[#1a1a1a] border border-[#333333] rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none"
              />

              <textarea
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Dettaglio o contenuto da ricordare..."
                rows={2}
                className="w-full px-2.5 py-1.5 bg-[#1a1a1a] border border-[#333333] rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none resize-none"
              />

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1 text-xs text-neutral-400 hover:text-white"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg"
                >
                  Salva
                </button>
              </div>
            </form>
          )}

          {/* List of active memories */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-neutral-500">
              <span>Ricordi Memorizzati</span>
              {memories.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-normal lowercase"
                >
                  cancella tutto
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-xs text-neutral-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Caricamento mappa cognitiva...</span>
              </div>
            ) : memories.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-500 bg-[#121212] rounded-xl border border-[#202020]">
                Nessun ricordo attivo. Mentre conversi con 3 Athlas, Mind apprenderà autonomamente i tuoi obiettivi e vincoli.
              </div>
            ) : (
              memories.map((m) => (
                <div
                  key={m.id}
                  className="group flex items-start justify-between gap-3 p-3 bg-[#131313] hover:bg-[#181818] border border-[#222222] rounded-xl transition-all"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-neutral-200">{m.key}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 font-mono">
                        {m.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-snug">{m.value}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id)}
                    title="Elimina questo ricordo"
                    className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-rose-400 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
