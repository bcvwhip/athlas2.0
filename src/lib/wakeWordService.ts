import { soundFx } from './audioFeedback.js';
import { detectWakeWord } from './voiceProsody.js';

export interface WakeWordServiceCallbacks {
  onWake: (matchedWord: string, commandQuery?: string) => void;
  onError?: (error: string) => void;
  onStatusChange?: (active: boolean) => void;
}

export class WakeWordService {
  private recognition: any = null;
  private isRunning: boolean = false;
  private callbacks: WakeWordServiceCallbacks;
  private isPaused: boolean = false;
  private hasFatalError: boolean = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(callbacks: WakeWordServiceCallbacks) {
    this.callbacks = callbacks;
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public start(): boolean {
    if (!this.isSupported()) {
      this.callbacks.onError?.('Il browser non supporta il riconoscimento vocale continuo per la wake word.');
      return false;
    }

    if (this.isRunning) return true;

    try {
      this.hasFatalError = false;
      const SpeechRecognitionConstructor = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognitionConstructor();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'it-IT';

      this.recognition.onresult = (event: any) => {
        if (this.isPaused) return;

        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }

        const trimmed = transcript.trim();
        if (trimmed) {
          const check = detectWakeWord(trimmed);
          if (check.detected) {
            console.log('[WakeWordService] Detected wake command in background:', trimmed);
            soundFx.playWakeChime();
            this.callbacks.onWake(check.matchedWakeWord || '3 athlas', check.commandQuery);
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }
        if (
          event.error === 'not-allowed' ||
          event.error === 'service-not-allowed' ||
          event.error === 'audio-capture' ||
          event.error === 'not-supported'
        ) {
          this.hasFatalError = true;
          this.isRunning = false;
          this.callbacks.onStatusChange?.(false);
        }
        if (event.error === 'network') {
          this.scheduleRestart();
        }
        console.warn('[WakeWordService] warning:', event.error);
      };

      this.recognition.onend = () => {
        // Auto-restart if should still be running and not explicitly stopped
        if (this.isRunning && !this.isPaused && !this.hasFatalError) {
          this.scheduleRestart();
        }
      };

      this.recognition.start();
      this.isRunning = true;
      this.callbacks.onStatusChange?.(true);
      return true;
    } catch (err) {
      console.warn('Failed to start WakeWordService:', err);
      this.isRunning = false;
      this.callbacks.onStatusChange?.(false);
      return false;
    }
  }

  private scheduleRestart() {
    if (this.restartTimer || !this.isRunning || this.isPaused || this.hasFatalError) return;
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      if (!this.isRunning || this.isPaused || this.hasFatalError) return;
      try {
        this.recognition?.start();
      } catch {
        this.scheduleRestart();
      }
    }, 500);
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    this.isPaused = false;
    if (this.isRunning && this.recognition) {
      try {
        this.recognition.start();
      } catch {
        // Ignore
      }
    }
  }

  public stop() {
    this.isRunning = false;
    this.isPaused = false;
    this.hasFatalError = false;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore
      }
      this.recognition = null;
    }
    this.callbacks.onStatusChange?.(false);
  }

  public getStatus(): boolean {
    return this.isRunning;
  }
}
