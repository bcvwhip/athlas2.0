// Prosody, emotional adaptation, wake word recognition, and natural voice processing

export type VocalEmotion = 'serious' | 'humorous' | 'confused' | 'enthusiastic' | 'urgent' | 'neutral';

export interface EmotionalProsody {
  emotion: VocalEmotion;
  label: string;
  description: string;
  pitchMultiplier: number;
  rateMultiplier: number;
  color: string;
}

export const EMOTIONAL_PROFILES: Record<VocalEmotion, EmotionalProsody> = {
  serious: {
    emotion: 'serious',
    label: 'Professionale & Analitico',
    description: 'Timbro chiaro, fermo e posato con dizione precisa per questioni formali o tecniche.',
    pitchMultiplier: 0.98,
    rateMultiplier: 0.98,
    color: '#60A5FA', // Blue
  },
  humorous: {
    emotion: 'humorous',
    label: 'Leggero & Spontaneo',
    description: 'Intonazione calda, vivace e sorridente con ritmo leggermente brioso.',
    pitchMultiplier: 1.06,
    rateMultiplier: 1.04,
    color: '#F59E0B', // Amber
  },
  confused: {
    emotion: 'confused',
    label: 'Paziente & Rassicurante',
    description: 'Cadenza calma, accogliente e distesa con pause chiarificatrici.',
    pitchMultiplier: 1.01,
    rateMultiplier: 0.91,
    color: '#10B981', // Emerald
  },
  enthusiastic: {
    emotion: 'enthusiastic',
    label: 'Energico & Coinvolgente',
    description: 'Inflessione luminosa, vibrante ed espressiva che trasmette slancio.',
    pitchMultiplier: 1.10,
    rateMultiplier: 1.06,
    color: '#EC4899', // Pink
  },
  urgent: {
    emotion: 'urgent',
    label: 'Diretto & Veloce',
    description: 'Risposta immediata, senza preamboli, con ritmo spedito ed essenziale.',
    pitchMultiplier: 1.00,
    rateMultiplier: 1.15,
    color: '#EF4444', // Red
  },
  neutral: {
    emotion: 'neutral',
    label: 'Equilibrato & Naturale',
    description: 'Intonazione fluida, amichevole e presente.',
    pitchMultiplier: 1.00,
    rateMultiplier: 1.00,
    color: '#00E5FF', // Cyan
  },
};

/**
 * Natural short feedbacks when wake word is detected
 */
export const NATURAL_WAKE_FEEDBACKS = [
  'Sì?',
  'Dimmi.',
  'Sono qui.',
  'Come posso aiutarti?',
  'Ti ascolto.',
  'Dimmi pure.',
];

export function getRandomWakeFeedback(): string {
  const index = Math.floor(Math.random() * NATURAL_WAKE_FEEDBACKS.length);
  return NATURAL_WAKE_FEEDBACKS[index];
}

/**
 * Natural interjections to start spoken answers organically
 */
export const CONVERSATIONAL_INTERJECTIONS = [
  'Certo',
  'Va bene',
  'Ho capito',
  'Certamente',
  'Dunque',
  'Ecco qui',
];

/**
 * Robust wake word detector supporting:
 * - "Hey 3 athlas"
 * - "Ehi 3 athlas"
 * - "Hey Athlas"
 * - "Attiva 3 athlas"
 * - "Hey Atlas", "Ehi Atlas", "Attiva Atlas", "3 athlas", "Ehi Athlas"
 * - Handles phonetic variants where speech recognition outputs "tre" instead of "3"
 */
export function detectWakeWord(transcript: string): {
  detected: boolean;
  matchedWakeWord?: string;
  commandQuery?: string;
} {
  if (!transcript || typeof transcript !== 'string') {
    return { detected: false };
  }

  const raw = transcript.toLowerCase().trim();
  const normalized = raw
    .replace(/['’]/g, ' ')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Pattern definitions
  const wakeWordPhrases = [
    'hey 3 athlas',
    'ehi 3 athlas',
    'hey athlas',
    'attiva 3 athlas',
    'attivare 3 athlas',
    'ehi athlas',
    'attiva athlas',
    'attivare athlas',
    'ok 3 athlas',
    'ok athlas',
    'ciao 3 athlas',
    'ciao athlas',
    // Phonetic Italian variations (3 transcribed as "tre", athlas as "atlas")
    'hey tre athlas',
    'ehi tre athlas',
    'attiva tre athlas',
    'attivare tre athlas',
    'hey 3 atlas',
    'ehi 3 atlas',
    'hey atlas',
    'attiva 3 atlas',
    'attivare 3 atlas',
    'ehi atlas',
    'attiva atlas',
    'attivare atlas',
    'hey tre atlas',
    'ehi tre atlas',
    'attiva tre atlas',
    'attivare tre atlas',
    // Minimal direct calls
    '3 athlas',
    'tre athlas',
    '3 atlas',
    'tre atlas',
  ];

  for (const phrase of wakeWordPhrases) {
    const idx = normalized.indexOf(phrase);
    if (idx !== -1) {
      // Check if it's a standalone phrase or followed by query
      const remainder = normalized.slice(idx + phrase.length).trim();
      return {
        detected: true,
        matchedWakeWord: phrase,
        commandQuery: remainder.length > 0 ? remainder : undefined,
      };
    }
  }

  // Regex fallback for loose prefix match
  const looseRegex = /^(?:hey|ehi|ok|ciao|attiva|attivare)?\s*(?:3|tre)?\s*(?:athlas|atlas)(?:\s+(.+))?$/i;
  const match = normalized.match(looseRegex);
  if (match) {
    const query = match[1]?.trim();
    return {
      detected: true,
      matchedWakeWord: match[0].split(query || '')[0].trim(),
      commandQuery: query && query.length > 0 ? query : undefined,
    };
  }

  return { detected: false };
}

/**
 * Detect emotional tone from user speech or conversational context
 */
export function analyzeVocalEmotion(userText: string): VocalEmotion {
  if (!userText) return 'neutral';
  const text = userText.toLowerCase();

  // 1. Urgent check
  if (
    text.includes('urgente') ||
    text.includes('presto') ||
    text.includes('subito') ||
    text.includes('emergenza') ||
    text.includes('fai in fretta') ||
    text.includes('rapido') ||
    text.includes('immediatamente') ||
    text.includes('al volo')
  ) {
    return 'urgent';
  }

  // 2. Confused / Help needed check
  if (
    text.includes('non ho capito') ||
    text.includes('non riesco') ||
    text.includes('cosa significa') ||
    text.includes('come mai') ||
    text.includes('non mi è chiaro') ||
    text.includes('aiutami a capire') ||
    text.includes('spiegami meglio') ||
    text.includes('sono confuso') ||
    text.includes('non capisco') ||
    text.includes('come si fa') ||
    text.includes('aiuto') ||
    text.includes('perché non va')
  ) {
    return 'confused';
  }

  // 3. Enthusiastic / Positive check
  if (
    text.includes('fantastico') ||
    text.includes('incredibile') ||
    text.includes('bellissimo') ||
    text.includes('wow') ||
    text.includes('evviva') ||
    text.includes('grandioso') ||
    text.includes('ottimo') ||
    text.includes('stupendo') ||
    text.includes('geniale') ||
    text.includes('sei un grande') ||
    text.includes('eccellente') ||
    text.includes('adoro') ||
    text.includes('perfetto!') ||
    (text.includes('!') && !text.includes('non'))
  ) {
    return 'enthusiastic';
  }

  // 4. Humorous / playful check
  if (
    text.includes('ahah') ||
    text.includes('haha') ||
    text.includes('scherzo') ||
    text.includes('battuta') ||
    text.includes('ridere') ||
    text.includes('divertente') ||
    text.includes('buffo') ||
    text.includes('raccontami una barzelletta') ||
    text.includes('simpatico')
  ) {
    return 'humorous';
  }

  // 5. Serious / Professional check
  if (
    text.includes('codice') ||
    text.includes('algoritmo') ||
    text.includes('funzione') ||
    text.includes('analisi') ||
    text.includes('relazione') ||
    text.includes('bilancio') ||
    text.includes('contratto') ||
    text.includes('progetto') ||
    text.includes('statistica') ||
    text.includes('definizione tecnica') ||
    text.includes('architettura') ||
    text.includes('documento')
  ) {
    return 'serious';
  }

  return 'neutral';
}

/**
 * Prepares raw text from AI for natural spoken synthesis:
 * - Strips code blocks and replaces with clean human notice
 * - Strips Markdown headers, asterisks, bullet points
 * - Inserts natural prosodic breath pauses (commas, ellipses)
 * - Expands common symbols to smooth Italian words
 */
export function formatTextForSpokenVoice(rawText: string): string {
  if (!rawText) return '';

  let text = rawText;

  // 1. Handle code blocks: don't recite syntax, summarize naturally
  text = text.replace(/```[\s\S]*?```/g, ' Ho inserito il blocco di codice corrispondente nella chat. ');
  text = text.replace(/`([^`]+)`/g, '$1');

  // 2. Handle URLs
  text = text.replace(/https?:\/\/[^\s]+/g, ' link web ');

  // 3. Remove markdown headers and list formatting
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/^\s*[-*+]\s+/gm, ', ');
  text = text.replace(/^\s*\d+\.\s+/gm, ', ');

  // 4. Remove bold/italics markers
  text = text.replace(/[*_~]/g, '');

  // 5. Expand symbols for natural speech
  text = text.replace(/\+/g, ' più ');
  text = text.replace(/=/g, ' uguale a ');
  text = text.replace(/%/g, ' per cento ');
  text = text.replace(/&/g, ' e ');
  text = text.replace(/€/g, ' euro ');
  text = text.replace(/\$/g, ' dollari ');

  // 6. Natural spoken prosody: replace semicolons and dashes with breathable commas
  text = text.replace(/[;—–]/g, ', ');

  // 7. Ensure clean whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // 8. If text is an extremely long response, keep first key paragraphs for voice
  // while the full response remains visible in chat.
  if (text.length > 500) {
    const sentences = text.split(/(?<=[.!?])\s+/);
    if (sentences.length > 4) {
      const vocalPortion = sentences.slice(0, 4).join(' ');
      return `${vocalPortion} Ti ho riportato l'analisi completa con tutti i dettagli nel testo della chat.`;
    }
  }

  return text;
}

/**
 * Find best natural neural Italian voice from SpeechSynthesis
 */
export function selectBestItalianVoice(
  voices: SpeechSynthesisVoice[],
  preferredKeywords: string[] = []
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  // Filter Italian voices
  const itVoices = voices.filter(
    (v) => v.lang.startsWith('it') || v.lang.includes('IT') || v.lang.includes('ita')
  );

  if (itVoices.length === 0) {
    // Fallback to any voice
    return voices[0] || null;
  }

  // Priority 1: User's personality preferred keywords (e.g. "alice", "cosimo", "federica")
  if (preferredKeywords.length > 0) {
    for (const kw of preferredKeywords) {
      const match = itVoices.find((v) => v.name.toLowerCase().includes(kw.toLowerCase()));
      if (match) return match;
    }
  }

  // Priority 2: High-definition Natural / Neural Italian voices (Google, Microsoft Natural, Apple)
  const premiumKeywords = [
    'elsa',
    'natural',
    'microsoft',
    'online',
    'google',
    'isabella',
    'alice',
    'federica',
    'siri',
    'premium',
    'enhanced',
  ];

  for (const kw of premiumKeywords) {
    const match = itVoices.find((v) => v.name.toLowerCase().includes(kw));
    if (match) return match;
  }

  // Priority 3: First Italian voice
  return itVoices[0];
}
