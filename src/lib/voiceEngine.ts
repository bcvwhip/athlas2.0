import { VoiceOrbState, VoicePersonality, VoicePersonalityId, VoiceSettings } from '../types.js';
import { soundFx } from './audioFeedback.js';
import { apiFetch } from './api.js';
import {
  analyzeVocalEmotion,
  detectWakeWord,
  EMOTIONAL_PROFILES,
  formatTextForSpokenVoice,
  getRandomWakeFeedback,
  selectBestItalianVoice,
  VocalEmotion,
} from './voiceProsody.js';

export const VOICE_PERSONALITIES: Record<VoicePersonalityId, VoicePersonality> = {
  aria: {
    id: 'aria',
    name: 'Aria',
    tagline: 'Calma e professionale',
    description: 'Timbro equilibrato, rassicurante e analitico per lavoro, studio e riflessione.',
    pitch: 1.0,
    rate: 1.0,
    color: '#00F2FE',
    gender: 'female',
    recommendedVoiceKeywords: ['Elsa', 'Microsoft', 'Online', 'Natural', 'federica', 'alice', 'elena', 'chiara', 'female', 'google', 'it-IT'],
  },
  nova: {
    id: 'nova',
    name: 'Nova',
    tagline: 'Energica e moderna',
    description: 'Cadenza vivace, brillante e stimolante per brainstorming e creatività.',
    pitch: 1.12,
    rate: 1.05,
    color: '#9D4EDD',
    gender: 'female',
    recommendedVoiceKeywords: ['elena', 'chiara', 'giulia', 'young', 'natural', 'it-IT'],
  },
  orion: {
    id: 'orion',
    name: 'Orion',
    tagline: 'Profonda e autorevole',
    description: 'Tono caldo, solenne e profondo con presenza calma e decisa.',
    pitch: 0.88,
    rate: 0.96,
    color: '#3B82F6',
    gender: 'male',
    recommendedVoiceKeywords: ['cosimo', 'giorgio', 'diego', 'carlo', 'male', 'natural', 'it-IT'],
  },
  luna: {
    id: 'luna',
    name: 'Luna',
    tagline: 'Dolce e rassicurante',
    description: 'Voce morbida, empatica e fluida per conversazioni distese e confidenziali.',
    pitch: 1.04,
    rate: 0.94,
    color: '#10B981',
    gender: 'female',
    recommendedVoiceKeywords: ['lucia', 'paola', 'silvia', 'soft', 'alice', 'natural', 'it-IT'],
  },
};

// Recognition interface
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: { new (): ISpeechRecognition };
    webkitSpeechRecognition?: { new (): ISpeechRecognition };
  }
}

export interface VoiceEngineCallbacks {
  onStateChange: (state: VoiceOrbState) => void;
  onInterimTranscript: (text: string) => void;
  onFinalTranscript: (text: string) => void;
  onSpeechComplete: (text: string) => void;
  onAudioData: (level: number, frequencies: Uint8Array) => void;
  onBargeIn: () => void;
  onWordBoundary?: (charIndex: number, length: number) => void;
  onTtsStart: () => void;
  onTtsEnd: () => void;
  onError: (errorMessage: string) => void;
  onVoiceCommand?: (
    command:
      | 'exit_voice'
      | 'new_chat'
      | 'stop_speaking'
      | 'summarize'
      | 'show_help'
      | 'pause_voice'
      | 'resume_voice'
      | 'mute_microphone'
      | 'unmute_microphone'
      | 'repeat_response'
  ) => void;
  onWakeWordDetected?: (matchedWord: string, commandQuery?: string) => void;
  onEmotionDetected?: (emotion: VocalEmotion) => void;
}

export class VoiceEngine {
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private recognition: ISpeechRecognition | null = null;

  private state: VoiceOrbState = 'idle';
  private callbacks: VoiceEngineCallbacks;
  private settings: VoiceSettings;
  private isMuted: boolean = false;
  private isDestroyed: boolean = false;
  private recognitionSuspended: boolean = false;
  private recognitionPaused: boolean = false;
  private recognitionRestartTimer: ReturnType<typeof setTimeout> | null = null;
  private recognitionStarting = false;
  private fallbackRecorder: MediaRecorder | null = null;
  private fallbackChunks: Blob[] = [];
  private fallbackSubmitting = false;
  private useFallbackTranscription = false;

  private animationFrameId: number | null = null;
  private freqData: Uint8Array = new Uint8Array(64);
  private currentVolume: number = 0;

  // Emotion tracking
  private currentEmotion: VocalEmotion = 'neutral';

  // VAD state
  private isSpeakingVAD: boolean = false;
  private speechStartTime: number = 0;
  private silenceStartTime: number = 0;
  private accumulatedTranscript: string = '';
  private vadSilenceTimeoutId: any = null;

  // Wake word state
  private wakeWordProcessing: boolean = false;

  // TTS state
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private ttsSyntheticTimer: any = null;
  private ttsSimulatedVolume: number = 0;
  private isGivingFeedback: boolean = false;

  constructor(callbacks: VoiceEngineCallbacks, initialSettings?: Partial<VoiceSettings>) {
    this.callbacks = callbacks;
    this.settings = {
      personality: 'aria',
      continuousConversation: true,
      bargeInEnabled: true,
      autoSpeakResponse: true,
      micSensitivity: 0.75,
      soundEffects: true,
      wakeWordEnabled: true,
      emotionalAdaptation: true,
      ...initialSettings,
    };
  }

  public updateSettings(newSettings: Partial<VoiceSettings>) {
    this.settings = { ...this.settings, ...newSettings };
  }

  public getState(): VoiceOrbState {
    return this.state;
  }

  public getEmotion(): VocalEmotion {
    return this.currentEmotion;
  }

  public setState(newState: VoiceOrbState) {
    if (this.state !== newState) {
      this.state = newState;
      this.callbacks.onStateChange(newState);
    }
  }

  public async start(): Promise<boolean> {
    try {
      this.isDestroyed = false;
      await this.initMicrophone();
      this.initRecognition();
      this.startAudioLoop();
      // Start in listening mode ready for speech or wake word
      this.startListening();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Impossibile accedere al microfono';
      this.callbacks.onError(msg);
      return false;
    }
  }

  private async initMicrophone() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Il browser non supporta la cattura audio (getUserMedia)');
    }

    // High quality speech capture with hardware cancellation
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioContextClass();
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    const source = this.audioCtx.createMediaStreamSource(this.micStream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.75;
    source.connect(this.analyser);

    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
  }

  private initRecognition() {
    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) {
      this.useFallbackTranscription = true;
      this.callbacks.onError('Riconoscimento browser non disponibile: attivo la trascrizione audio di riserva.');
      return;
    }

    this.recognition = new SpeechRecognitionConstructor();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'it-IT';

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (this.isMuted) return;
      if (this.state === 'thinking') return;

      let interim = '';
      let finalStr = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalStr += item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      const activeText = (finalStr || interim).trim();

      // 1. If currently speaking (AI answering) and barge-in is enabled:
      if (this.state === 'speaking' && this.settings.bargeInEnabled && !this.isGivingFeedback) {
        if (activeText.length > 2) {
          console.log('[Barge-In] Speech detected during voice output:', activeText);
          this.handleBargeIn();
          return;
        }
      }

      // 2. Check for Wake Word detection (e.g. "Hey 3 athlas", "Attiva 3 athlas", "Hey Athlas")
      if (this.settings.wakeWordEnabled && (this.state === 'idle' || this.state === 'listening')) {
        const wakeCheck = detectWakeWord(activeText);
        if (wakeCheck.detected && !this.wakeWordProcessing) {
          this.handleWakeWordActivation(wakeCheck.matchedWakeWord || '3 athlas', wakeCheck.commandQuery);
          return;
        }
      }

      // 3. Normal speech recognition streaming
      if (interim) {
        this.callbacks.onInterimTranscript(interim);
        this.checkVoiceCommands(interim);
      }

      if (finalStr) {
        const trimmed = finalStr.trim();
        if (trimmed) {
          this.accumulatedTranscript += (this.accumulatedTranscript ? ' ' : '') + trimmed;
          this.callbacks.onFinalTranscript(this.accumulatedTranscript);
          this.checkVoiceCommands(this.accumulatedTranscript);

          // Detect emotion in user speech
          if (this.settings.emotionalAdaptation) {
            const detected = analyzeVocalEmotion(this.accumulatedTranscript);
            if (detected !== this.currentEmotion) {
              this.currentEmotion = detected;
              this.callbacks.onEmotionDetected?.(detected);
            }
          }

          // Reset silence timer on speech to allow natural pauses
          this.resetSilenceTimer();
        }
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      if (
        event.error === 'not-allowed' ||
        event.error === 'service-not-allowed' ||
        event.error === 'audio-capture'
      ) {
        // Some mobile Edge builds expose SpeechRecognition but cannot keep its
        // remote recognition session alive. The recorded-audio path still works.
        this.useFallbackTranscription = true;
        this.recognitionSuspended = true;
        this.setState('idle');
      }
      if (event.error === 'network') {
        this.useFallbackTranscription = true;
        this.scheduleRecognitionRestart();
      }
      console.warn('SpeechRecognition warning:', event.error);
    };

    this.recognition.onend = () => {
      // Auto-restart continuous recognition if active and not muted
      if (!this.isDestroyed && !this.isMuted && !this.recognitionSuspended && !this.recognitionPaused) {
        this.scheduleRecognitionRestart();
      }
    };
  }

  private scheduleRecognitionRestart() {
    if (this.recognitionRestartTimer || this.isDestroyed || this.isMuted || this.recognitionPaused) return;
    this.recognitionRestartTimer = setTimeout(() => {
      this.recognitionRestartTimer = null;
      if (this.isDestroyed || this.isMuted || this.recognitionSuspended || this.recognitionPaused) return;
      try {
        this.recognitionStarting = true;
        this.recognition?.start();
      } catch {
        this.scheduleRecognitionRestart();
      } finally {
        this.recognitionStarting = false;
      }
    }, 250);
  }

  /**
   * Handles wake word triggers ("Hey 3 athlas", "Attiva 3 athlas", etc.)
   */
  private handleWakeWordActivation(matchedPhrase: string, commandQuery?: string) {
    this.wakeWordProcessing = true;
    console.log(`[Wake Word] Activated via: "${matchedPhrase}" | Query: "${commandQuery || ''}"`);

    // 1. Play futuristic audio chime
    if (this.settings.soundEffects) {
      soundFx.playWakeChime();
    }

    // 2. Notify callback
    this.callbacks.onWakeWordDetected?.(matchedPhrase, commandQuery);

    // 3. Reset transcripts
    this.accumulatedTranscript = '';
    this.callbacks.onInterimTranscript('');
    this.callbacks.onFinalTranscript('');

    // Case A: User said wake word + direct command in one sentence (e.g. "Hey 3 athlas, spiegami la relatività")
    if (commandQuery && commandQuery.trim().length > 3) {
      const query = commandQuery.trim();
      this.wakeWordProcessing = false;

      // Detect emotion
      if (this.settings.emotionalAdaptation) {
        this.currentEmotion = analyzeVocalEmotion(query);
        this.callbacks.onEmotionDetected?.(this.currentEmotion);
      }

      this.setState('thinking');
      this.callbacks.onSpeechComplete(query);
      return;
    }

    // Case B: User said only the wake word: "Hey 3 athlas"
    // Give immediate natural feedback vocally: "Dimmi.", "Sì?", "Sono qui.", "Ti ascolto."
    const naturalFeedback = getRandomWakeFeedback();
    this.isGivingFeedback = true;
    this.setState('speaking');

    this.speakUtterance(
      naturalFeedback,
      () => {
        // When feedback finishes, immediately listen for the user's request!
        this.isGivingFeedback = false;
        this.wakeWordProcessing = false;
        this.accumulatedTranscript = '';
        if (this.settings.soundEffects) {
          soundFx.playListenChime();
        }
        this.startListening();
      },
      // Quick, warm feedback delivery
      { rate: 1.05, pitch: 1.02 }
    );
  }

  private checkVoiceCommands(text: string): boolean {
    const lower = text.toLowerCase().trim();

    if (
      lower === 'aiuto' ||
      lower.includes('cosa puoi fare') ||
      lower.includes('quali comandi') ||
      lower.includes('elenco comandi')
    ) {
      this.callbacks.onVoiceCommand?.('show_help');
      return true;
    }

    if (
      lower.includes('passa alla modalità testo') ||
      lower.includes('torna al testo') ||
      lower.includes('modalità testo') ||
      lower.includes('chiudi voce')
    ) {
      this.callbacks.onVoiceCommand?.('exit_voice');
      return true;
    }

    if (
      lower.includes('crea una lista') ||
      lower.includes('nuova chat') ||
      lower.includes('nuova conversazione')
    ) {
      this.callbacks.onVoiceCommand?.('new_chat');
      return true;
    }

    if (
      lower.includes('fermati') ||
      lower.includes('silenzio') ||
      lower.includes('stop') ||
      lower.includes('aspetta un attimo')
    ) {
      this.stopSpeaking();
      this.callbacks.onVoiceCommand?.('stop_speaking');
      return true;
    }

    if (lower.includes('metti in pausa') || lower === 'pausa voce' || lower === 'pausa') {
      this.callbacks.onVoiceCommand?.('pause_voice');
      return true;
    }

    if (lower.includes('riprendi') || lower.includes('continua ad ascoltare')) {
      this.callbacks.onVoiceCommand?.('resume_voice');
      return true;
    }

    if (lower.includes('disattiva microfono') || lower.includes('silenzia microfono')) {
      this.callbacks.onVoiceCommand?.('mute_microphone');
      return true;
    }

    if (lower.includes('attiva microfono') || lower.includes('riattiva microfono')) {
      this.callbacks.onVoiceCommand?.('unmute_microphone');
      return true;
    }

    if (lower.includes('ripeti la risposta') || lower === 'ripeti') {
      this.callbacks.onVoiceCommand?.('repeat_response');
      return true;
    }

    if (lower.includes('riassumi questa conversazione') || lower.includes('fai un riassunto')) {
      this.callbacks.onVoiceCommand?.('summarize');
      return true;
    }

    return false;
  }

  private startAudioLoop() {
    const loop = () => {
      if (this.isDestroyed) return;

      let level = 0;

      if (this.state === 'speaking') {
        // While speaking, simulate acoustic dynamic frequencies matching spoken words
        level = this.ttsSimulatedVolume;
        for (let i = 0; i < this.freqData.length; i++) {
          const harmonic = Math.sin(Date.now() * 0.015 + i * 0.4) * 0.5 + 0.5;
          this.freqData[i] = Math.floor(level * 255 * harmonic);
        }
        this.callbacks.onAudioData(level, this.freqData);

        // Barge-in energy check via mic
        if (this.settings.bargeInEnabled && this.analyser && !this.isMuted && !this.isGivingFeedback) {
          const tempBuffer = new Uint8Array(this.analyser.frequencyBinCount);
          this.analyser.getByteFrequencyData(tempBuffer);
          let sum = 0;
          for (let i = 0; i < tempBuffer.length; i++) sum += tempBuffer[i];
          const micLevel = sum / (tempBuffer.length * 255);

          const threshold = 0.09 + (1 - this.settings.micSensitivity) * 0.08;
          if (micLevel > threshold) {
            console.log('[Barge-In] Acoustic energy detected over voice response!');
            this.handleBargeIn();
          }
        }
      } else if (this.analyser && !this.isMuted) {
        // Read real microphone frequency data
        this.analyser.getByteFrequencyData(this.freqData);

        let sum = 0;
        for (let i = 0; i < this.freqData.length; i++) {
          sum += this.freqData[i];
        }
        level = sum / (this.freqData.length * 255);
        this.currentVolume = level;
        this.callbacks.onAudioData(level, this.freqData);

        // VAD (Voice Activity Detection) logic
        this.processVAD(level);
      } else {
        this.callbacks.onAudioData(0, this.freqData);
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  private processVAD(level: number) {
    if (this.state !== 'listening') return;

    const threshold = 0.04 + (1 - this.settings.micSensitivity) * 0.06;

    if (level > threshold) {
      if (!this.isSpeakingVAD) {
        this.isSpeakingVAD = true;
        this.speechStartTime = Date.now();
        if (this.useFallbackTranscription) {
          this.startFallbackRecording();
        }
        if (this.vadSilenceTimeoutId) {
          clearTimeout(this.vadSilenceTimeoutId);
          this.vadSilenceTimeoutId = null;
        }
      }
    } else {
      if (this.isSpeakingVAD) {
        if (!this.silenceStartTime) {
          this.silenceStartTime = Date.now();
        }
        // When speech pause exceeds 1.4s, commit speech
        if ((this.accumulatedTranscript.trim() || this.fallbackRecorder) && !this.vadSilenceTimeoutId) {
          this.vadSilenceTimeoutId = setTimeout(() => {
            this.stopFallbackRecording();
            if (this.accumulatedTranscript.trim()) this.commitSpeech();
          }, 1400);
        }
      }
    }
  }

  private resetSilenceTimer() {
    if (this.vadSilenceTimeoutId) {
      clearTimeout(this.vadSilenceTimeoutId);
      this.vadSilenceTimeoutId = null;
    }
    this.vadSilenceTimeoutId = setTimeout(() => {
      this.stopFallbackRecording();
      if (this.accumulatedTranscript.trim()) {
        this.commitSpeech();
      }
    }, 1500);
  }

  private startFallbackRecording() {
    if (this.fallbackRecorder || this.fallbackSubmitting || !this.micStream || typeof MediaRecorder === 'undefined') return;
    try {
      this.fallbackChunks = [];
      const supportedMimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/aac',
      ];
      const mimeType = supportedMimeTypes.find((type) => MediaRecorder.isTypeSupported(type));
      this.fallbackRecorder = mimeType
        ? new MediaRecorder(this.micStream, { mimeType })
        : new MediaRecorder(this.micStream);
      this.fallbackRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.fallbackChunks.push(event.data);
      };
      this.fallbackRecorder.onstop = () => {
        const blob = new Blob(this.fallbackChunks, { type: this.fallbackRecorder?.mimeType || mimeType || 'audio/webm' });
        this.fallbackRecorder = null;
        this.fallbackChunks = [];
        if (blob.size > 1000) void this.transcribeFallbackAudio(blob);
      };
      this.fallbackRecorder.start();
    } catch {
      this.fallbackRecorder = null;
    }
  }

  private stopFallbackRecording() {
    if (!this.fallbackRecorder || this.fallbackRecorder.state === 'inactive') return;
    this.fallbackRecorder.stop();
    if (this.vadSilenceTimeoutId) {
      clearTimeout(this.vadSilenceTimeoutId);
      this.vadSilenceTimeoutId = null;
    }
  }

  private async transcribeFallbackAudio(blob: Blob) {
    if (this.fallbackSubmitting) return;
    this.fallbackSubmitting = true;
    try {
      const audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Impossibile leggere l\'audio registrato'));
        reader.readAsDataURL(blob);
      });
      const response = await apiFetch('/api/voice/transcribe', {
        method: 'POST',
        body: JSON.stringify({ audio }),
      });
      if (!response.ok) throw new Error('Trascrizione non disponibile');
      const result = await response.json() as { text?: string };
      const text = result.text?.trim() || '';
      if (text) {
        this.callbacks.onFinalTranscript(text);
        if (!this.checkVoiceCommands(text)) {
          this.setState('thinking');
          this.callbacks.onSpeechComplete(text);
        }
      }
    } catch (error) {
      console.warn('Whisper fallback:', error);
    } finally {
      this.fallbackSubmitting = false;
      this.isSpeakingVAD = false;
      if (!this.isMuted && !this.recognitionPaused) this.setState('listening');
    }
  }

  public commitSpeech() {
    if (this.vadSilenceTimeoutId) {
      clearTimeout(this.vadSilenceTimeoutId);
      this.vadSilenceTimeoutId = null;
    }

    const textToSubmit = this.accumulatedTranscript.trim();
    this.accumulatedTranscript = '';
    this.isSpeakingVAD = false;
    this.silenceStartTime = 0;

    if (textToSubmit) {
      this.setState('thinking');
      this.callbacks.onSpeechComplete(textToSubmit);
    }
  }

  private handleBargeIn() {
    if (this.settings.soundEffects) {
      soundFx.playBargeInClick();
    }
    this.stopSpeaking();
    this.callbacks.onBargeIn();
    this.accumulatedTranscript = '';
    this.startListening();
  }

  public startListening() {
    this.setMicrophoneEnabled(true);
    this.recognitionPaused = false;
    this.recognitionSuspended = false;
    this.isSpeakingVAD = false;
    this.silenceStartTime = 0;
    this.accumulatedTranscript = '';
    this.setState('listening');

    if (this.recognition && !this.isMuted) {
      if (this.recognitionRestartTimer) {
        clearTimeout(this.recognitionRestartTimer);
        this.recognitionRestartTimer = null;
      }
      try {
        this.recognitionStarting = true;
        this.recognition.start();
      } catch {
        // Already started
      } finally {
        this.recognitionStarting = false;
      }
    }
  }

  public stopListening() {
    this.recognitionPaused = true;
    if (this.recognitionRestartTimer) {
      clearTimeout(this.recognitionRestartTimer);
      this.recognitionRestartTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignored
      }
    }
    this.stopFallbackRecording();
    if (this.vadSilenceTimeoutId) {
      clearTimeout(this.vadSilenceTimeoutId);
      this.vadSilenceTimeoutId = null;
    }
  }

  private setMicrophoneEnabled(enabled: boolean) {
    this.micStream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopListening();
      if (this.state === 'listening') {
        this.setState('idle');
      }
    } else {
      if (this.state === 'idle') {
        this.startListening();
      }
    }
  }

  /**
   * Ultra-natural adaptive speech synthesis with emotional context modulation
   */
  public speak(
    rawText: string,
    personalityId?: VoicePersonalityId,
    onWordHighlight?: (charIndex: number, length: number) => void
  ) {
    if (!('speechSynthesis' in window)) {
      this.callbacks.onError('Sintesi vocale non supportata da questo browser');
      return;
    }

    this.stopSpeaking();
    this.setState('speaking');
    this.callbacks.onTtsStart();

    // Format text prosody for human-like conversational delivery
    const cleanSpokenText = formatTextForSpokenVoice(rawText);

    if (!cleanSpokenText) {
      this.handleTtsFinished();
      return;
    }

    const personality =
      VOICE_PERSONALITIES[personalityId || this.settings.personality] || VOICE_PERSONALITIES.aria;

    // Calculate emotional pitch & rate modulation
    let effectivePitch = personality.pitch;
    let effectiveRate = personality.rate;

    if (this.settings.emotionalAdaptation) {
      const emoProfile = EMOTIONAL_PROFILES[this.currentEmotion] || EMOTIONAL_PROFILES.neutral;
      effectivePitch *= emoProfile.pitchMultiplier;
      effectiveRate *= emoProfile.rateMultiplier;
    }

    void this.speakNeural(cleanSpokenText, onWordHighlight, effectiveRate, effectivePitch);
  }

  private async speakNeural(
    text: string,
    onWordHighlight?: (charIndex: number, length: number) => void,
    rate = 1,
    pitch = 1
  ) {
    this.setMicrophoneEnabled(false);
    this.stopListening();
    try {
      const response = await apiFetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, rate, pitch }),
      });
      if (!response.ok) throw new Error('Neural TTS non disponibile');

      const audio = new Audio(URL.createObjectURL(await response.blob()));
      this.currentAudio = audio;
      audio.onended = () => {
        URL.revokeObjectURL(audio.src);
        this.currentAudio = null;
        this.callbacks.onTtsEnd();
        this.handleTtsFinished();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audio.src);
        this.currentAudio = null;
        this.speakUtterance(text, () => this.handleTtsFinished(), {
          pitch,
          rate,
          onWordHighlight,
        });
      };
      await audio.play();
    } catch (error) {
      console.warn('Neural TTS fallback:', error);
      this.speakUtterance(text, () => this.handleTtsFinished(), {
        pitch,
        rate,
        onWordHighlight,
      });
    }
  }

  /**
   * Internal utterance handler
   */
  private speakUtterance(
    text: string,
    onEnd: () => void,
    options?: {
      pitch?: number;
      rate?: number;
      personality?: VoicePersonality;
      onWordHighlight?: (charIndex: number, length: number) => void;
    }
  ) {
    this.setMicrophoneEnabled(false);
    this.stopListening();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'it-IT';
    utterance.rate = options?.rate || 1.0;
    utterance.pitch = options?.pitch || 1.0;

    // Pick best high-definition Italian neural voice
    const voices = window.speechSynthesis.getVoices();
    const chosenVoice = selectBestItalianVoice(
      voices,
      options?.personality?.recommendedVoiceKeywords || ['alice', 'cosimo', 'natural', 'google']
    );

    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    this.startTtsSimulation();

    utterance.onboundary = (event: SpeechSynthesisEvent) => {
      if (event.name === 'word') {
        this.ttsSimulatedVolume = Math.min(1.0, 0.45 + Math.random() * 0.45);
        if (options?.onWordHighlight) {
          options.onWordHighlight(event.charIndex, event.charLength || 5);
        }
        this.callbacks.onWordBoundary?.(event.charIndex, event.charLength || 5);
      }
    };

    utterance.onend = () => {
      this.stopTtsSimulation();
      this.currentUtterance = null;
      this.callbacks.onTtsEnd();
      onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      this.stopTtsSimulation();
      this.currentUtterance = null;
      this.callbacks.onTtsEnd();
      onEnd();
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  private startTtsSimulation() {
    this.stopTtsSimulation();
    this.ttsSimulatedVolume = 0.4;
    this.ttsSyntheticTimer = setInterval(() => {
      const t = Date.now() * 0.008;
      const base = Math.sin(t) * 0.25 + 0.4;
      const modulation = Math.sin(t * 2.3) * 0.15;
      this.ttsSimulatedVolume = Math.max(0.1, Math.min(0.9, base + modulation));
    }, 60);
  }

  private stopTtsSimulation() {
    if (this.ttsSyntheticTimer) {
      clearInterval(this.ttsSyntheticTimer);
      this.ttsSyntheticTimer = null;
    }
    this.ttsSimulatedVolume = 0;
  }

  public stopSpeaking() {
    this.stopTtsSimulation();
    this.setMicrophoneEnabled(true);
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
    this.isGivingFeedback = false;
  }

  private handleTtsFinished() {
    this.setMicrophoneEnabled(true);
    // If continuous conversation is on, return smoothly to "IN ASCOLTO"
    if (this.settings.continuousConversation && !this.isMuted) {
      setTimeout(() => {
        if (this.state === 'speaking' || this.state === 'thinking') {
          this.startListening();
        }
      }, 400);
    } else {
      // Otherwise stay in "PRONTO"
      this.setState('idle');
    }
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.recognitionRestartTimer) {
      clearTimeout(this.recognitionRestartTimer);
      this.recognitionRestartTimer = null;
    }
    this.stopSpeaking();
    this.stopListening();
    this.fallbackRecorder = null;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }
}
