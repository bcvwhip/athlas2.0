import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronRight,
  Eye,
  HelpCircle,
  Monitor,
  RefreshCw,
  Sparkles,
  Upload,
  Video,
  VideoOff,
  X,
  Zap,
} from 'lucide-react';
import { MirrorDiagnosis, PersonaType } from '../types.js';
import { diagnoseMirrorScene } from '../lib/api.js';

interface AthlasMirrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySolution?: (text: string) => void;
  currentPersona: PersonaType;
}

export const AthlasMirrorModal: React.FC<AthlasMirrorModalProps> = ({
  isOpen,
  onClose,
  onApplySolution,
  currentPersona,
}) => {
  const [streamMode, setStreamMode] = useState<'screen' | 'camera' | 'upload'>('screen');
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState('Non riesco a fare questa cosa, dove sbaglio?');
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<MirrorDiagnosis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop media stream on close
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      setCapturedImage(null);
      setDiagnosis(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Start Screen Sharing
  const startScreenCapture = async () => {
    try {
      stopStream();
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsStreaming(true);
      setStreamMode('screen');

      stream.getVideoTracks()[0].onended = () => {
        stopStream();
      };
    } catch (err: unknown) {
      console.warn('Screen share canceled or not permitted:', err);
      setErrorMessage('Accesso allo schermo annullato o non consentito dal browser.');
    }
  };

  // Start Webcam Stream
  const startCameraCapture = async () => {
    try {
      stopStream();
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsStreaming(true);
      setStreamMode('camera');
    } catch (err: unknown) {
      console.warn('Camera access error:', err);
      setErrorMessage('Impossibile accedere alla webcam: verifica le autorizzazioni.');
    }
  };

  // Capture Frame from Video
  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    handleDiagnose(dataUrl);
  };

  // Handle Image File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setCapturedImage(base64);
      setStreamMode('upload');
      stopStream();
      handleDiagnose(base64);
    };
    reader.readAsDataURL(file);
  };

  // Trigger Diagnosis with ATHLAS MIRROR
  const handleDiagnose = async (base64Img: string) => {
    setIsDiagnosing(true);
    setErrorMessage(null);
    try {
      const res = await diagnoseMirrorScene({
        prompt: userQuery,
        base64Image: base64Img,
        personaOverride: currentPersona,
      });
      setDiagnosis(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore durante l\'analisi visiva';
      setErrorMessage(msg);
    } finally {
      setIsDiagnosing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0E0E0E] border border-[#262626] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222222]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">ATHLAS MIRROR</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 font-medium">
                  Assistente Visivo Personale
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Osserva schermo o webcam, capisce cosa vuoi ottenere e ti guida passo-passo.
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Input Source Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={startScreenCapture}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                streamMode === 'screen' && isStreaming
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-[#181818] text-neutral-300 hover:bg-[#222222] border border-[#2a2a2a]'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>Condividi Schermo Live</span>
            </button>

            <button
              type="button"
              onClick={startCameraCapture}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                streamMode === 'camera' && isStreaming
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-[#181818] text-neutral-300 hover:bg-[#222222] border border-[#2a2a2a]'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Avvia Webcam Live</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 bg-[#181818] text-neutral-300 hover:bg-[#222222] border border-[#2a2a2a] transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Carica Screenshot o Foto</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {isStreaming && (
              <button
                type="button"
                onClick={stopStream}
                className="px-3 py-2 rounded-xl text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 ml-auto"
              >
                Ferma Condivisione
              </button>
            )}
          </div>

          {/* User query contextual input */}
          <div className="flex items-center gap-2 bg-[#141414] border border-[#262626] rounded-xl px-3 py-2">
            <span className="text-xs text-neutral-400 shrink-0">Cosa vuoi fare?</span>
            <input
              type="text"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Es: Non riesco a completare questo modulo, dimmi dove sbaglio..."
              className="flex-1 bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none"
            />
            {capturedImage && (
              <button
                type="button"
                onClick={() => handleDiagnose(capturedImage)}
                disabled={isDiagnosing}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
              >
                {isDiagnosing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                <span>Rianalizza</span>
              </button>
            )}
          </div>

          {/* Viewport for Stream or Captured Image */}
          <div className="relative aspect-video bg-black/60 rounded-xl border border-[#222222] overflow-hidden flex items-center justify-center">
            {/* Live Video element */}
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-contain ${isStreaming ? 'block' : 'hidden'}`}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Static captured image if not live streaming */}
            {!isStreaming && capturedImage && (
              <img
                src={capturedImage}
                alt="Mirror Capture"
                className="w-full h-full object-contain"
              />
            )}

            {/* Empty state when no stream and no image */}
            {!isStreaming && !capturedImage && (
              <div className="text-center p-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
                  <Monitor className="w-6 h-6" />
                </div>
                <div className="text-sm font-medium text-neutral-300">
                  Nessuna sorgente visiva attiva
                </div>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Condividi lo schermo della finestra in cui riscontri un problema oppure carica un'immagine.
                </p>
              </div>
            )}

            {/* Live Snap Button Overlay */}
            {isStreaming && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
                <button
                  type="button"
                  onClick={captureFrame}
                  disabled={isDiagnosing}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-full transition-all flex items-center gap-2 shadow-md active:scale-95"
                >
                  {isDiagnosing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  <span>Analizza questo fotogramma</span>
                </button>
              </div>
            )}
          </div>

          {/* Error notice */}
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* DIAGNOSIS RESULTS CARD (5 Core Points from User Prompt) */}
          {diagnosis && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Diagnosi Visiva Intelligente</span>
                </div>
                <span className="text-[11px] text-neutral-500 font-mono">
                  Accuratezza {(diagnosis.confidence * 100).toFixed(0)}%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Cosa sta cercando di ottenere */}
                <div className="p-3.5 bg-[#141414] border border-[#242424] rounded-xl">
                  <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                    Cosa stai cercando di ottenere
                  </div>
                  <p className="text-xs text-neutral-200 leading-relaxed font-medium">
                    {diagnosis.userIntent}
                  </p>
                </div>

                {/* 2. Cosa sta guardando */}
                <div className="p-3.5 bg-[#141414] border border-[#242424] rounded-xl">
                  <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-purple-400" />
                    Cosa sto guardando
                  </div>
                  <p className="text-xs text-neutral-200 leading-relaxed font-medium">
                    {diagnosis.detectedSubject}
                  </p>
                </div>

                {/* 3. Dove si trova il problema */}
                <div className="p-3.5 bg-[#141414] border border-amber-500/20 bg-amber-500/5 rounded-xl">
                  <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Dove si trova il problema
                  </div>
                  <p className="text-xs text-neutral-200 leading-relaxed">
                    {diagnosis.detectedProblem}
                  </p>
                </div>

                {/* 4. Causa radice */}
                <div className="p-3.5 bg-[#141414] border border-[#242424] rounded-xl">
                  <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    Causa probabile
                  </div>
                  <p className="text-xs text-neutral-200 leading-relaxed">
                    {diagnosis.rootCause}
                  </p>
                </div>
              </div>

              {/* 5. Guida passo-passo */}
              <div className="p-4 bg-[#141414] border border-[#242424] rounded-xl space-y-3">
                <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Cosa devi fare — Guida passo-passo</span>
                </div>

                <div className="space-y-2">
                  {diagnosis.guidedSteps.map((step) => (
                    <div
                      key={step.stepNumber}
                      className="flex items-start gap-3 p-2.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]"
                    >
                      <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {step.stepNumber}
                      </div>
                      <div className="flex-1 text-xs">
                        <div className="text-neutral-200 font-medium">{step.instruction}</div>
                        {step.visualHint && (
                          <div className="text-[11px] text-purple-400 mt-0.5 flex items-center gap-1">
                            <span>🔍 Riferimento visivo:</span>
                            <span className="font-semibold">{step.visualHint}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Optional suggested action application */}
                {diagnosis.suggestedAction && onApplySolution && (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const summary = `Diagnosi Mirror applicata: ${diagnosis.userIntent}. Azione consigliata: ${diagnosis.suggestedAction?.label}`;
                        onApplySolution(summary);
                        onClose();
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <span>Invia diagnosi alla chat</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
