import {
  AuthResponse,
  AutonomyLevel,
  Conversation,
  DoPlan,
  DoStep,
  FileAttachment,
  GeneratedFile,
  GeneratedFileFormat,
  GeneratedImage,
  ImageAspectRatio,
  ImageGenerationStep,
  LearnProgress,
  Message,
  MindContextOverview,
  MindMemoryItem,
  MirrorDiagnosis,
  OrchestratorDispatchResult,
  PersonaType,
  User,
  UserSettings,
} from '../types.js';

const TOKEN_KEY = 'athlas_auth_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, { ...options, headers });

  // Store new or refreshed token issued by server
  const newToken = res.headers.get('x-athlas-token') || res.headers.get('X-Athlas-Token');
  if (newToken) {
    setAuthToken(newToken);
  }

  return res;
}

export async function fetchHealth(): Promise<{
  status: string;
  platform: string;
  mistralConfigured: boolean;
  model: string;
}> {
  const res = await fetch('/api/health');
  return res.json();
}

export async function fetchCurrentUser(): Promise<{ user: User; settings: UserSettings } | null> {
  const res = await apiFetch('/api/auth/me');
  if (!res.ok) {
    return null;
  }
  return res.json();
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Errore durante il login');
  setAuthToken(data.token);
  return data;
}

export async function registerUser(
  email: string,
  password: string,
  name?: string,
  guestUserId?: string
): Promise<AuthResponse & { migrationStats?: { migratedConversations: number; migratedFiles: number } }> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password, name, guestUserId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Errore durante la registrazione');
  setAuthToken(data.token);
  return data;
}

export async function createGuestUser(): Promise<AuthResponse> {
  const res = await fetch('/api/auth/guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Errore creazione guest session');
  setAuthToken(data.token);
  return data;
}

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await apiFetch('/api/conversations');
  if (!res.ok) return [];
  return res.json();
}

export async function createConversation(title?: string, model?: string): Promise<Conversation> {
  const res = await apiFetch('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ title, model }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Impossibile creare la conversazione');
  }
  return res.json();
}

export async function updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation> {
  const res = await apiFetch(`/api/conversations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Impossibile aggiornare la conversazione');
  }
  return res.json();
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await apiFetch(`/api/conversations/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Impossibile eliminare la conversazione');
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const res = await apiFetch(`/api/conversations/${conversationId}/messages`);
  if (!res.ok) return [];
  return res.json();
}

export async function updateMessage(id: string, updates: Partial<Message>): Promise<Message> {
  const res = await apiFetch(`/api/messages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Impossibile aggiornare il messaggio');
  return res.json();
}

export async function uploadFile(file: File, conversationId?: string): Promise<FileAttachment> {
  const formData = new FormData();
  formData.append('file', file);
  if (conversationId) formData.append('conversationId', conversationId);

  const res = await apiFetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Errore durante il caricamento del file');
  return data;
}

export async function fetchFiles(): Promise<FileAttachment[]> {
  const res = await apiFetch('/api/files');
  if (!res.ok) return [];
  return res.json();
}

export async function deleteFile(id: string): Promise<void> {
  const res = await apiFetch(`/api/files/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Impossibile eliminare il file');
}

export async function searchConversations(query: string): Promise<
  Array<{ conversation: Conversation; matchedMessages: Message[] }>
> {
  if (!query.trim()) return [];
  const res = await apiFetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function updateUserSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
  const res = await apiFetch('/api/settings', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Impossibile aggiornare le impostazioni');
  return res.json();
}

export async function generateFile(payload: {
  format: GeneratedFileFormat;
  title?: string;
  description?: string;
  content: string;
  filename?: string;
  conversationId?: string;
  messageId?: string;
}): Promise<GeneratedFile> {
  const res = await apiFetch('/api/files/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Errore durante la generazione del file');
  return data;
}

export async function fetchConversationFiles(conversationId: string): Promise<{
  uploaded: FileAttachment[];
  generated: GeneratedFile[];
}> {
  const res = await apiFetch(`/api/conversations/${conversationId}/files`);
  if (!res.ok) return { uploaded: [], generated: [] };
  return res.json();
}

export async function generateImageDirect(payload: {
  prompt: string;
  aspectRatio?: ImageAspectRatio;
  conversationId?: string;
  messageId?: string;
  referenceImageId?: string;
  referenceImageBase64?: string;
}): Promise<GeneratedImage> {
  const res = await apiFetch('/api/images/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Errore durante la generazione dell\'immagine');
  return data;
}

export async function editImageDirect(payload: {
  imageId: string;
  editPrompt: string;
  aspectRatio?: ImageAspectRatio;
  conversationId?: string;
  messageId?: string;
}): Promise<GeneratedImage> {
  const res = await apiFetch('/api/images/edit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Errore durante la modifica dell\'immagine');
  return data;
}

export async function fetchConversationImages(conversationId: string): Promise<GeneratedImage[]> {
  const res = await apiFetch(`/api/conversations/${conversationId}/images`);
  if (!res.ok) return [];
  return res.json();
}

export async function streamChatResponse(
  payload: {
    conversationId: string;
    content?: string;
    attachments?: FileAttachment[];
    regenerateMessageId?: string;
    editMessageId?: string;
    modelOverride?: string;
    aspectRatio?: ImageAspectRatio;
    isImageMode?: boolean;
    referenceImageId?: string;
  },
  onChunk: (delta: string) => void,
  onError: (error: string) => void,
  onDone: (fullText: string) => void,
  onGeneratedFile?: (file: GeneratedFile) => void,
  onGeneratedImage?: (image: GeneratedImage) => void,
  onImageStep?: (step: ImageGenerationStep) => void,
  onImageError?: (error: string) => void,
  signal?: AbortSignal
) {
  let accumulated = '';
  try {
    const res = await apiFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      onError(err.error || `Errore HTTP ${res.status}`);
      return;
    }

    if (!res.body) {
      onError('Corpo risposta non disponibile');
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.replace(/^data:\s*/, '');

        if (dataStr === '[DONE]') {
          onDone(accumulated);
          return;
        }

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.error) {
            onError(parsed.error);
            return;
          }
          if (parsed.generatedFile && onGeneratedFile) {
            onGeneratedFile(parsed.generatedFile);
          }
          if (parsed.generatedImage && onGeneratedImage) {
            onGeneratedImage(parsed.generatedImage);
          }
          if (parsed.imageStep && onImageStep) {
            onImageStep(parsed.imageStep);
          }
          if (parsed.imageError && onImageError) {
            onImageError(parsed.imageError);
          }
          if (parsed.delta) {
            accumulated += parsed.delta;
            onChunk(parsed.delta);
          }
        } catch {
          // Incomplete chunk
        }
      }
    }

    onDone(accumulated);
  } catch (err: unknown) {
    if (signal?.aborted) {
      onDone(accumulated);
      return;
    }
    const msg = err instanceof Error ? err.message : 'Errore durante la connessione streaming';
    onError(msg);
  }
}

// ==========================================
// 3 ATHLAS ORCHESTRATOR & 5 ABILITIES CLIENT
// ==========================================

export async function dispatchOrchestrator(payload: {
  conversationId: string;
  content: string;
  attachments?: FileAttachment[];
  autonomyOverride?: AutonomyLevel;
  personaOverride?: PersonaType;
  mirrorFrameBase64?: string;
}): Promise<OrchestratorDispatchResult> {
  const res = await apiFetch('/api/orchestrator/dispatch', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Errore elaborazione Orchestrator');
  }
  return res.json();
}

export async function fetchMindMemories(): Promise<{
  memories: MindMemoryItem[];
  overview: MindContextOverview;
}> {
  const res = await apiFetch('/api/mind/memories');
  if (!res.ok) throw new Error('Impossibile caricare memorie Mind');
  return res.json();
}

export async function addMindMemory(memory: {
  category: string;
  key: string;
  value: string;
  confidence?: number;
}): Promise<MindMemoryItem> {
  const res = await apiFetch('/api/mind/memories', {
    method: 'POST',
    body: JSON.stringify(memory),
  });
  if (!res.ok) throw new Error('Impossibile salvare memoria');
  return res.json();
}

export async function deleteMindMemory(id: string): Promise<boolean> {
  const res = await apiFetch(`/api/mind/memories/${id}`, { method: 'DELETE' });
  return res.ok;
}

export async function clearMindMemories(): Promise<boolean> {
  const res = await apiFetch('/api/mind/memories', { method: 'DELETE' });
  return res.ok;
}

export async function fetchDoPlans(conversationId?: string): Promise<DoPlan[]> {
  const query = conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : '';
  const res = await apiFetch(`/api/do/plans${query}`);
  if (!res.ok) return [];
  return res.json();
}

export async function createDoPlan(
  goal: string,
  conversationId?: string,
  autonomyOverride?: AutonomyLevel,
  personaOverride?: PersonaType
): Promise<DoPlan> {
  const res = await apiFetch('/api/do/plans', {
    method: 'POST',
    body: JSON.stringify({ goal, conversationId, autonomyOverride, personaOverride }),
  });
  if (!res.ok) throw new Error('Impossibile creare piano DO');
  return res.json();
}

export async function executeDoPlanStep(
  planId: string,
  stepId: string,
  userConfirmed = false
): Promise<{ plan: DoPlan; executedStep: DoStep }> {
  const res = await apiFetch(`/api/do/plans/${planId}/step/${stepId}`, {
    method: 'POST',
    body: JSON.stringify({ userConfirmed }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Errore esecuzione passaggio');
  }
  return res.json();
}

export async function diagnoseMirrorScene(payload: {
  prompt?: string;
  base64Image?: string;
  personaOverride?: PersonaType;
}): Promise<MirrorDiagnosis> {
  const res = await apiFetch('/api/mirror/diagnose', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Errore diagnosi visiva');
  }
  return res.json();
}

export async function checkLearnExercise(payload: {
  topic: string;
  selectedOptionIndex: number;
  correctOptionIndex: number;
}): Promise<{ isCorrect: boolean; progress: LearnProgress }> {
  const res = await apiFetch('/api/learn/exercise/check', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Errore verifica risposta');
  return res.json();
}

