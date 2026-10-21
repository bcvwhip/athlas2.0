export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface UserSettings {
  userId: string;
  theme: 'dark' | 'light' | 'system';
  model: string;
  systemPrompt: string;
  temperature: number;
  ttsVoice: string;
  ttsRate: number;
  sttLanguage: string;
  mistralApiKeyOverride?: string;
  geminiApiKeyOverride?: string;
  autonomyLevel?: AutonomyLevel;
  persona?: PersonaType;
  isIncognitoMind?: boolean;
}

export type FileCategory = 'pdf' | 'docx' | 'xlsx' | 'csv' | 'txt' | 'image' | 'code' | 'other';

export interface FileAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  fileCategory?: FileCategory;
  pageCount?: number;
  rowCount?: number;
  wordCount?: number;
  sheets?: string[];
  analysisSummary?: string;
  analysisState?: 'analyzing' | 'reading' | 'processing' | 'completed' | 'error';
  extractedText?: string;
  createdAt: string;
}

export type GeneratedFileFormat = 'docx' | 'xlsx' | 'pptx' | 'pdf' | 'csv' | 'txt' | 'json' | 'md';

export interface GeneratedFile {
  id: string;
  originalName: string;
  format: GeneratedFileFormat;
  size: number;
  downloadUrl: string;
  description?: string;
  generatedBy: '3 athlas';
  createdAt: string;
}

export type ImageAspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export interface ImageGenerationStep {
  step: 'optimizing' | 'generating' | 'finalizing';
  text: string;
}

export interface GeneratedImage {
  id: string;
  conversationId: string;
  messageId?: string;
  prompt: string;
  enhancedPrompt?: string;
  aspectRatio: ImageAspectRatio;
  imageUrl: string;
  downloadUrl: string;
  width: number;
  height: number;
  model: string;
  referenceImageId?: string;
  referenceImageUrl?: string;
  createdAt: string;
  generatedBy: '3 athlas';
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: FileAttachment[];
  generatedFiles?: GeneratedFile[];
  generatedImages?: GeneratedImage[];
  rating?: 1 | -1 | 0;
  createdAt: string;
  updatedAt?: string;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  lastMessageSnippet?: string;
}

export interface ChatStreamChunk {
  delta?: string;
  done?: boolean;
  error?: string;
  messageId?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  settings: UserSettings;
}

export type VoicePersonalityId = 'aria' | 'nova' | 'orion' | 'luna';

export interface VoicePersonality {
  id: VoicePersonalityId;
  name: string;
  tagline: string;
  description: string;
  pitch: number;
  rate: number;
  color: string;
  gender: 'female' | 'male';
  recommendedVoiceKeywords: string[];
}

export type VoiceOrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface VoiceSettings {
  personality: VoicePersonalityId;
  continuousConversation: boolean;
  bargeInEnabled: boolean;
  autoSpeakResponse: boolean;
  micSensitivity: number; // 0.0 to 1.0
  soundEffects: boolean;
  wakeWordEnabled?: boolean; // Listens for "Hey 3 athlas" / "Attiva 3 athlas"
  emotionalAdaptation?: boolean; // Adapts tone, pitch & cadence to user emotion
}

// ==========================================
// 3 ATHLAS: 5 SUPER ABILITIES & ORCHESTRATION
// ==========================================

export type AutonomyLevel = 'level_1' | 'level_2' | 'level_3';

export type PersonaType = 'child' | 'teen' | 'adult' | 'pro' | 'senior';

export interface PersonaConfig {
  id: PersonaType;
  label: string;
  tagline: string;
  toneDescription: string;
  badgeColor: string;
}

export type AthlasAbility = 'mind' | 'do' | 'mirror' | 'learn' | 'world';

// 1. ATHLAS MIND (Contextual Memory & Cognitive Map)
export type MemoryCategory = 'goal' | 'habit' | 'project' | 'preference' | 'constraint' | 'recent_task';

export interface MindMemoryItem {
  id: string;
  userId: string;
  category: MemoryCategory;
  key: string;
  value: string;
  confidence: number; // 0.0 to 1.0
  isUserConfirmed?: boolean;
  sourceConversationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MindContextOverview {
  activeGoals: MindMemoryItem[];
  currentProjects: MindMemoryItem[];
  knownPreferences: MindMemoryItem[];
  recentStruggles: MindMemoryItem[];
  nextProbableNeeds: string[];
  totalMemoriesCount: number;
}

// 2. ATHLAS DO (Goal Planner & Execution Engine)
export type DoStepStatus = 'pending' | 'in_progress' | 'completed' | 'needs_confirmation' | 'skipped' | 'failed';
export type RiskLevel = 'safe' | 'sensitive' | 'critical';

export interface DoStep {
  id: string;
  order: number;
  title: string;
  description: string;
  ability: AthlasAbility;
  status: DoStepStatus;
  riskLevel: RiskLevel;
  confirmationPrompt?: string;
  toolCallId?: string;
  toolName?: string;
  toolPayload?: Record<string, any>;
  result?: {
    summary: string;
    data?: any;
    error?: string;
    completedAt?: string;
  };
}

export interface DoPlan {
  id: string;
  conversationId: string;
  userId: string;
  goal: string;
  intentSummary: string;
  currentPhase: 'understanding' | 'planning' | 'research' | 'actions' | 'verification' | 'result';
  steps: DoStep[];
  progressPercent: number;
  autonomyLevel: AutonomyLevel;
  status: 'active' | 'awaiting_confirmation' | 'completed' | 'paused';
  createdAt: string;
  updatedAt: string;
}

// 3. ATHLAS MIRROR (Visual AI Screen/Camera/File Companion)
export type MirrorInputSource = 'screen' | 'camera' | 'snapshot' | 'document' | 'image_upload';

export interface MirrorDiagnosis {
  id: string;
  inputSource: MirrorInputSource;
  userIntent: string; // "Cosa sta cercando di ottenere questa persona?"
  detectedSubject: string; // What is being looked at
  detectedProblem: string; // Where the problem/bottleneck is located
  rootCause: string; // Why it's happening
  guidedSteps: Array<{
    stepNumber: number;
    instruction: string;
    visualHint?: string; // e.g. "Pulsante blu in alto a destra", "Riga 42"
  }>;
  suggestedAction?: {
    label: string;
    autoFixable: boolean;
    toolCall?: { tool: string; args: any };
  };
  confidence: number;
  timestamp: string;
}

// 4. ATHLAS LEARN (Adaptive Pedagogy Engine)
export type PedagogyStrategy = 'deductive' | 'analogy' | 'visual_schema' | 'interactive_challenge' | 'step_by_step';

export interface LearnExercise {
  id: string;
  question: string;
  strategy: PedagogyStrategy;
  options?: string[];
  correctOptionIndex?: number;
  hint: string;
  conceptKey: string;
  explanation: string;
}

export interface LearnProgress {
  topic: string;
  userId: string;
  currentStrategy: PedagogyStrategy;
  difficultyLevel: 1 | 2 | 3 | 4 | 5;
  masteryScore: number; // 0 to 100
  attemptCount: number;
  failedAttemptsOnConcept: number;
  activeExercise?: LearnExercise;
  historyOfStrategiesUsed: PedagogyStrategy[];
  lastFeedback?: string;
}

// 5. ATHLAS WORLD (Digital-to-Real Bridge Tools)
export type WorldToolName =
  | 'web_search'
  | 'browser_navigate'
  | 'create_calendar_event'
  | 'draft_email'
  | 'generate_document'
  | 'generate_image'
  | 'read_system_clipboard';

export interface WorldToolCall {
  id: string;
  tool: WorldToolName;
  description: string;
  params: Record<string, any>;
  riskLevel: RiskLevel;
  executed: boolean;
  result?: any;
}

// Unified Orchestrator Response
export interface OrchestratorDispatchResult {
  intent: string;
  primaryAbility: AthlasAbility;
  activeAbilities: AthlasAbility[];
  autonomyLevel: AutonomyLevel;
  persona: PersonaType;
  mindContext?: MindContextOverview;
  doPlan?: DoPlan;
  mirrorDiagnosis?: MirrorDiagnosis;
  learnProgress?: LearnProgress;
  worldActions?: WorldToolCall[];
  directReply?: string;
  needsConfirmation?: {
    actionId: string;
    prompt: string;
    risk: RiskLevel;
  };
}

// Augment Message to carry Orchestrator payloads
declare module './types.js' {
  interface Message {
    orchestratorResult?: OrchestratorDispatchResult;
    doPlan?: DoPlan;
    mirrorDiagnosis?: MirrorDiagnosis;
    learnProgress?: LearnProgress;
    activeAbility?: AthlasAbility;
  }
}

