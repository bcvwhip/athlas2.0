import {
  Check,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  Maximize2,
  RefreshCw,
  Send,
  Sparkles,
  Wand2,
  X,
  ZoomIn,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useState } from 'react';
import { GeneratedImage, ImageAspectRatio } from '../types.js';

interface GeneratedImageCardProps {
  image: GeneratedImage;
  onRegenerate?: (image: GeneratedImage, ratio?: ImageAspectRatio) => void;
  onEdit?: (image: GeneratedImage, editInstruction: string) => void;
  onCreateVariant?: (image: GeneratedImage) => void;
  isLoading?: boolean;
}

export const GeneratedImageCard: React.FC<GeneratedImageCardProps> = ({
  image,
  onRegenerate,
  onEdit,
  onCreateVariant,
  isLoading = false,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [editInstruction, setEditInstruction] = useState('');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState<ImageAspectRatio>(image.aspectRatio || '1:1');
  const [imageLoaded, setImageLoaded] = useState(false);

  // Aspect ratio styling
  const ratioClasses: Record<ImageAspectRatio, string> = {
    '1:1': 'aspect-square',
    '16:9': 'aspect-video',
    '9:16': 'aspect-[9/16] max-h-[560px]',
    '4:3': 'aspect-[4/3]',
    '3:4': 'aspect-[3/4] max-h-[560px]',
  };

  const ratioOptions: Array<{ id: ImageAspectRatio; label: string; desc: string }> = [
    { id: '1:1', label: '1:1', desc: 'Quadrato' },
    { id: '16:9', label: '16:9', desc: 'Cinema / Wallpaper' },
    { id: '9:16', label: '9:16', desc: 'Verticale / Story' },
    { id: '4:3', label: '4:3', desc: 'Classico' },
    { id: '3:4', label: '3:4', desc: 'Ritratto' },
  ];

  const quickEditChips = [
    'Cambia sfondo in una notte cyberpunk con neon',
    'Rendila più scura con contrasto elevato e ombre marcate',
    'Aggiungi illuminazione volumetrica e pioggia riflessa',
    'Stile pittura ad olio cinematografica',
    'Mantieni il soggetto ma posizionalo in un deserto al tramonto',
  ];

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(image.enhancedPrompt || image.prompt);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handleDownload = () => {
    // Direct browser download
    const link = document.createElement('a');
    link.href = image.downloadUrl || image.imageUrl;
    link.download = `3athlas_${image.id}.${image.imageUrl.endsWith('.png') ? 'png' : 'jpg'}`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApplyEdit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editInstruction.trim()) return;
    if (onEdit) {
      onEdit(image, editInstruction.trim());
      setShowEditPanel(false);
      setEditInstruction('');
    }
  };

  return (
    <div
      id={`image-card-${image.id}`}
      className="my-3 max-w-2xl w-full rounded-2xl bg-[#111114] border border-white/10 shadow-2xl overflow-hidden transition-all duration-300 hover:border-white/20 group"
    >
      {/* 1. Header Bar with Metadata & Model Badge */}
      <div className="px-4 py-2.5 bg-black/40 border-b border-white/5 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <span className="font-semibold text-gray-200 tracking-wide">3 athlas Vision</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300 font-mono">
            {image.model || 'Gemini 3.1 Flash Image'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-cyan-300 font-medium border border-cyan-500/20">
            {image.aspectRatio}
          </span>
          <button
            onClick={() => setIsLightboxOpen(true)}
            title="Ingrandisci a schermo intero"
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Main Image Preview Container */}
      <div className="relative w-full overflow-hidden bg-black/60 flex items-center justify-center">
        {!imageLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#131318] animate-pulse z-0">
            <Sparkles className="w-8 h-8 text-cyan-400/40 mb-2 animate-spin" />
            <span className="text-xs text-gray-400 font-mono">Rendering immagine...</span>
          </div>
        )}

        <div className={`w-full ${ratioClasses[image.aspectRatio || '1:1']} relative flex items-center justify-center`}>
          <img
            src={image.imageUrl}
            alt={image.prompt}
            loading="lazy"
            referrerPolicy="no-referrer"
            onLoad={() => setImageLoaded(true)}
            onClick={() => setIsLightboxOpen(true)}
            className={`w-full h-full object-contain cursor-zoom-in transition-transform duration-500 hover:scale-[1.01] ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Floating Quick Action Overlay on Hover */}
          <div className="absolute top-3 right-3 flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-lg">
            <button
              onClick={() => setIsLightboxOpen(true)}
              title="Visualizza schermo intero"
              className="p-1.5 rounded-lg text-gray-200 hover:text-white hover:bg-white/20 transition-all"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              title="Scarica immagine ad alta risoluzione"
              className="p-1.5 rounded-lg text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/20 transition-all"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Prompt Overview */}
      <div className="px-4 py-3 bg-[#0D0D10] border-t border-white/5">
        <p className="text-xs text-gray-300 leading-relaxed line-clamp-2 select-text">
          <span className="font-semibold text-white mr-1.5">Prompt:</span>
          {image.prompt}
        </p>
      </div>

      {/* 4. Format / Aspect Ratio Selector Pills */}
      <div className="px-4 py-2 bg-black/30 border-t border-white/5 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[11px] text-gray-400 font-medium">Formato:</span>
        <div className="flex items-center space-x-1.5">
          {ratioOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                setSelectedRatio(opt.id);
                if (opt.id !== image.aspectRatio && onRegenerate) {
                  onRegenerate(image, opt.id);
                }
              }}
              title={opt.desc}
              className={`px-2 py-1 rounded-md text-[10px] font-mono transition-all ${
                image.aspectRatio === opt.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Interactive Action Buttons Row */}
      <div className="p-3 bg-[#0A0A0C] border-t border-white/10 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">
          {/* Download Button */}
          <button
            id={`btn-download-${image.id}`}
            onClick={handleDownload}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all active:scale-95 border border-white/10 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Scarica</span>
          </button>

          {/* Regenerate Button */}
          {onRegenerate && (
            <button
              id={`btn-regenerate-${image.id}`}
              onClick={() => onRegenerate(image, selectedRatio)}
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white text-xs font-medium transition-all active:scale-95 border border-white/5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Rigenera</span>
            </button>
          )}

          {/* Edit Button */}
          {onEdit && (
            <button
              id={`btn-edit-${image.id}`}
              onClick={() => setShowEditPanel((prev) => !prev)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 border ${
                showEditPanel
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white border-white/5'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-purple-400" />
              <span>Modifica</span>
            </button>
          )}

          {/* Create Variant Button */}
          {onCreateVariant && (
            <button
              id={`btn-variant-${image.id}`}
              onClick={() => onCreateVariant(image)}
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white text-xs font-medium transition-all active:scale-95 border border-white/5"
            >
              <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Crea variante</span>
            </button>
          )}
        </div>

        {/* Copy Prompt Button */}
        <button
          id={`btn-copy-prompt-${image.id}`}
          onClick={handleCopyPrompt}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-medium transition-all border border-white/5"
        >
          {isCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copiato!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-gray-400" />
              <span>Copia prompt</span>
            </>
          )}
        </button>
      </div>

      {/* 6. Inline Interactive Modification Panel (Collapsible) */}
      <AnimatePresence>
        {showEditPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-[#0F0F14] border-t border-cyan-500/20 p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-cyan-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Modifica contestuale dell'immagine</span>
              </span>
              <button
                onClick={() => setShowEditPanel(false)}
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Inspiration Chips */}
            <div className="flex flex-wrap gap-1.5">
              {quickEditChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => setEditInstruction(chip)}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 hover:text-white border border-white/10 transition-colors text-left"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={handleApplyEdit} className="flex items-center space-x-2">
              <input
                type="text"
                value={editInstruction}
                onChange={(e) => setEditInstruction(e.target.value)}
                placeholder="Es. cambia lo sfondo, rendila più luminosa, aggiungi pioggia..."
                className="flex-1 bg-black/50 border border-white/10 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!editInstruction.trim() || isLoading}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-semibold text-xs transition-all flex items-center space-x-1.5 disabled:opacity-40"
              >
                <span>Applica</span>
                <Send className="w-3 h-3" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col p-4 sm:p-6"
            onClick={() => setIsLightboxOpen(false)}
          >
            {/* Modal Top Bar */}
            <div
              className="flex items-center justify-between pb-4 border-b border-white/10 text-white z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3">
                <span className="font-bold text-sm tracking-wide">3 athlas Vision</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-gray-300 font-mono">
                  {image.aspectRatio} • {image.model}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 text-black font-medium text-xs hover:bg-cyan-400 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Scarica file originale</span>
                </button>
                <button
                  onClick={() => setIsLightboxOpen(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Image Viewport */}
            <div
              className="flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={image.imageUrl}
                alt={image.prompt}
                className="max-h-[82vh] max-w-[92vw] object-contain rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10"
              />
            </div>

            {/* Modal Bottom Details */}
            <div
              className="pt-3 border-t border-white/10 text-center max-w-3xl mx-auto text-xs text-gray-400 select-text"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="line-clamp-2">
                <span className="text-white font-medium mr-1.5">Prompt:</span>
                {image.enhancedPrompt || image.prompt}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
