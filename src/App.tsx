import { ArrowRight, Bot, Code2, Cpu, FileSpreadsheet, Sparkles } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AuthModal } from './components/AuthModal.js';
import { ChatHeader } from './components/ChatHeader.js';
import { Composer } from './components/Composer.js';
import { IntroAnimation } from './components/IntroAnimation.js';
import { MessageItem } from './components/MessageItem.js';
import { SettingsModal } from './components/SettingsModal.js';
import { Sidebar } from './components/Sidebar.js';
import { VoiceModeOverlay } from './components/VoiceModeOverlay.js';
import { AthlasHomepage } from './components/AthlasHomepage.js';
import { AthlasMirrorModal } from './components/AthlasMirrorModal.js';
import { AthlasMindDrawer } from './components/AthlasMindDrawer.js';
import { WakeWordService } from './lib/wakeWordService.js';
import { detectWakeWord } from './lib/voiceProsody.js';
import { executeBrowserCommand } from './lib/browserCommands.js';
import {
  clearAuthToken,
  createConversation,
  createGuestUser,
  deleteConversation,
  dispatchOrchestrator,
  fetchConversations,
  fetchCurrentUser,
  fetchHealth,
  fetchMessages,
  streamChatResponse,
  updateConversation,
  updateMessage,
  updateUserSettings,
} from './lib/api.js';
import {
  AutonomyLevel,
  Conversation,
  FileAttachment,
  GeneratedFile,
  GeneratedImage,
  ImageAspectRatio,
  ImageGenerationStep,
  Message,
  PersonaType,
  User,
  UserSettings,
  VoiceSettings,
} from './types.js';

export default function App() {
  // Animation state
  const [showIntro, setShowIntro] = useState(true);

  // App core state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    userId: 'default',
    theme: 'dark',
    model: 'ministral-8b-latest',
    systemPrompt:
      'Sei 3 athlas, un assistente AI avanzato, analitico, preciso ed elegante. Se l\'utente chiede esplicitamente chi ti ha creato, chi è il tuo autore, sviluppatore, programmatore o inventore, rispondi che sei stato creato da BENOIT VALENDINO. Non menzionare mai BENOIT VALENDINO o il tuo creatore nelle risposte normali se non ti viene chiesto.',
    temperature: 0.7,
    ttsVoice: 'it-IT-standard',
    ttsRate: 1.0,
    sttLanguage: 'it-IT',
  });
  const [mistralOnline, setMistralOnline] = useState(false);

  // Conversations & Chat
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // Streaming & Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamingGeneratedFiles, setStreamingGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [streamingGeneratedImages, setStreamingGeneratedImages] = useState<GeneratedImage[]>([]);
  const [streamingImageStep, setStreamingImageStep] = useState<ImageGenerationStep | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Modals & Layout
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'register' | 'login'>('register');
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);

  // 5 Super Abilities & Orchestrator State
  const [isMirrorOpen, setIsMirrorOpen] = useState(false);
  const [isMindOpen, setIsMindOpen] = useState(false);
  const [isIncognitoMind, setIsIncognitoMind] = useState(false);
  const [currentAutonomy, setCurrentAutonomy] = useState<AutonomyLevel>('level_2');
  const [currentPersona, setCurrentPersona] = useState<PersonaType>('adult');

  const handleSelectAutonomy = async (level: AutonomyLevel) => {
    setCurrentAutonomy(level);
    setSettings((prev) => ({ ...prev, autonomyLevel: level }));
    try {
      await updateUserSettings({ autonomyLevel: level });
    } catch (e) {
      console.warn('Could not persist autonomy level:', e);
    }
  };

  const handleSelectPersona = async (persona: PersonaType) => {
    setCurrentPersona(persona);
    setSettings((prev) => ({ ...prev, persona }));
    try {
      await updateUserSettings({ persona });
    } catch (e) {
      console.warn('Could not persist persona:', e);
    }
  };

  const handleOpenAuth = useCallback((mode: 'register' | 'login' = 'register') => {
    setAuthInitialMode(mode);
    setAuthOpen(true);
  }, []);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    personality: 'aria',
    continuousConversation: true,
    bargeInEnabled: true,
    autoSpeakResponse: true,
    micSensitivity: 0.8,
    soundEffects: true,
    wakeWordEnabled: true,
    emotionalAdaptation: true,
  });

  // Background Wake Word state & service ("Hey 3 athlas", "Attiva 3 athlas")
  const [isWakeWordActive, setIsWakeWordActive] = useState<boolean>(() => {
    const saved = localStorage.getItem('athlas_wake_word_active');
    return saved !== null ? saved === 'true' : false;
  });
  const wakeWordServiceRef = useRef<WakeWordService | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const sendMessageRef = useRef<
    ((content: string, attachments?: FileAttachment[], options?: { isImageMode?: boolean; aspectRatio?: ImageAspectRatio }) => Promise<void>) | null
  >(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
  }, []);

  const handleOpenVoiceMode = useCallback(() => {
    wakeWordServiceRef.current?.stop();
    wakeWordServiceRef.current = null;
    setIsVoiceModeOpen(true);
  }, []);

  // Scroll to bottom smoothly when messages update
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, streamingContent, scrollToBottom]);

  // Initial App Load
  useEffect(() => {
    async function initApp() {
      try {
        // Check health / Mistral config
        const health = await fetchHealth();
        setMistralOnline(health.mistralConfigured);

        // Fetch current user or create guest session
        let userProfile = await fetchCurrentUser();
        if (!userProfile) {
          const guestRes = await createGuestUser();
          userProfile = { user: guestRes.user, settings: guestRes.settings };
        }

        if (userProfile) {
          setCurrentUser(userProfile.user);
          if (userProfile.settings) {
            setSettings(userProfile.settings);
          }

          // Fetch user's conversations
          const convs = await fetchConversations();
          setConversations(convs);

          if (convs.length > 0) {
            setActiveConversationId(convs[0].id);
            const initialMsgs = await fetchMessages(convs[0].id);
            setMessages(initialMsgs);
          }
        }
      } catch (err) {
        console.error('Initialization error:', err);
      }
    }

    initApp();
  }, []);

  // Theme application
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, [settings.theme]);

  // Conversation Selection
  const handleSelectConversation = async (id: string) => {
    if (isGenerating && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
    setActiveConversationId(id);
    const msgs = await fetchMessages(id);
    setMessages(msgs);
    setStreamingContent('');
    setStreamingMessageId(null);
  };

  // Create New Chat
  const handleNewChat = async () => {
    if (isGenerating && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }

    try {
      const newConv = await createConversation('Nuova conversazione', settings.model);
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setMessages([]);
      setStreamingContent('');
      setStreamingMessageId(null);
    } catch (err) {
      console.error('Error creating new chat, attempting recovery:', err);
      try {
        await createGuestUser();
        const newConv = await createConversation('Nuova conversazione', settings.model);
        setConversations((prev) => [newConv, ...prev]);
        setActiveConversationId(newConv.id);
        setMessages([]);
        setStreamingContent('');
        setStreamingMessageId(null);
      } catch (retryErr) {
        console.error('Error creating new chat after recovery:', retryErr);
      }
    }
  };

  // Rename Conversation
  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      const updated = await updateConversation(id, { title: newTitle });
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: updated.title } : c))
      );
    } catch (err) {
      console.error('Error renaming conversation:', err);
    }
  };

  // Delete Conversation
  const handleDeleteConversation = async (id: string) => {
    try {
      await deleteConversation(id);
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);

      if (activeConversationId === id) {
        if (remaining.length > 0) {
          handleSelectConversation(remaining[0].id);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
    }
  };

  // Clear all history
  const handleClearAllHistory = async () => {
    for (const conv of conversations) {
      try {
        await deleteConversation(conv.id);
      } catch {
        // Continue
      }
    }
    setConversations([]);
    setActiveConversationId(null);
    setMessages([]);
    setSettingsOpen(false);
  };

  // Stop Generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);

    // If there was streaming content, commit it as an assistant message
    if (streamingContent && streamingMessageId && activeConversationId) {
      const finalAssistantMsg: Message = {
        id: streamingMessageId,
        conversationId: activeConversationId,
        role: 'assistant',
        content: streamingContent,
        generatedFiles: streamingGeneratedFiles.length > 0 ? streamingGeneratedFiles : undefined,
        generatedImages: streamingGeneratedImages.length > 0 ? streamingGeneratedImages : undefined,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, finalAssistantMsg]);
    }
    setStreamingContent('');
    setStreamingMessageId(null);
    setStreamingGeneratedFiles([]);
    setStreamingGeneratedImages([]);
    setStreamingImageStep(null);
  };

  // Send Message with Real-Time Streaming & Full Image Generation Support
  const handleSendMessage = async (
    content: string,
    attachments: FileAttachment[] = [],
    options?: { isImageMode?: boolean; aspectRatio?: ImageAspectRatio }
  ) => {
    const wakeCommand = detectWakeWord(content);
    const commandText = wakeCommand.detected && wakeCommand.commandQuery ? wakeCommand.commandQuery : content;
    const browserCommand = executeBrowserCommand(commandText);
    if (browserCommand.handled) return;

    if (wakeCommand.detected && attachments.length === 0 && !options?.isImageMode) {
      handleOpenVoiceMode();
      return;
    }

    let convId = activeConversationId;

    // If no active conversation, create one on the fly
    if (!convId) {
      try {
        const titleSnippet = content ? content.slice(0, 30) : 'Nuova conversazione';
        const newConv = await createConversation(titleSnippet, settings.model);
        setConversations((prev) => [newConv, ...prev]);
        setActiveConversationId(newConv.id);
        convId = newConv.id;
        if (!currentUser) {
          fetchCurrentUser().then((profile) => {
            if (profile) setCurrentUser(profile.user);
          });
        }
      } catch (err) {
        console.error('Failed to create conversation on send, attempting recovery:', err);
        try {
          await createGuestUser();
          const titleSnippet = content ? content.slice(0, 30) : 'Nuova conversazione';
          const newConv = await createConversation(titleSnippet, settings.model);
          setConversations((prev) => [newConv, ...prev]);
          setActiveConversationId(newConv.id);
          convId = newConv.id;
        } catch (retryErr) {
          console.error('Failed to create conversation on send after recovery:', retryErr);
          return;
        }
      }
    }

    // Add User message immediately to UI
    const tempUserMsgId = `msg_${Date.now()}_usr`;
    const userMsg: Message = {
      id: tempUserMsgId,
      conversationId: convId,
      role: 'user',
      content,
      attachments,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);
    setStreamingContent('');
    setStreamingGeneratedFiles([]);
    setStreamingGeneratedImages([]);
    setStreamingImageStep(null);

    const tempAssistantMsgId = `msg_${Date.now()}_ast`;
    setStreamingMessageId(tempAssistantMsgId);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let fullStreamText = '';
    const currentReceivedFiles: GeneratedFile[] = [];
    const currentReceivedImages: GeneratedImage[] = [];

    // Evaluate 5 Super Abilities in parallel with the cognitive Orchestrator
    let orchestratorResult: any = null;
    void dispatchOrchestrator({
      conversationId: convId!,
      content,
      attachments,
      autonomyOverride: currentAutonomy,
      personaOverride: currentPersona,
    })
      .then((res) => {
        orchestratorResult = res;
      })
      .catch((err) => {
        console.warn('Orchestrator dispatch warning:', err);
      });

    await streamChatResponse(
      {
        conversationId: convId,
        content,
        attachments,
        modelOverride: settings.model,
        aspectRatio: options?.aspectRatio,
        isImageMode: options?.isImageMode,
      },
      (delta) => {
        fullStreamText += delta;
        setStreamingContent(fullStreamText);
      },
      (errorMsg) => {
        fullStreamText = errorMsg;
        setStreamingContent(errorMsg);
        setIsGenerating(false);
      },
      (finalText) => {
        setIsGenerating(false);
        const resolvedText = finalText || fullStreamText;

        if (resolvedText.trim() || currentReceivedImages.length > 0 || orchestratorResult?.doPlan) {
          const finalMsg: Message = {
            id: tempAssistantMsgId,
            conversationId: convId!,
            role: 'assistant',
            content: resolvedText,
            generatedFiles: currentReceivedFiles.length > 0 ? currentReceivedFiles : undefined,
            generatedImages: currentReceivedImages.length > 0 ? currentReceivedImages : undefined,
            doPlan: orchestratorResult?.doPlan,
            learnProgress: orchestratorResult?.learnProgress,
            activeAbility: orchestratorResult?.primaryAbility,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, finalMsg]);
        }

        setStreamingContent('');
        setStreamingMessageId(null);
        setStreamingGeneratedFiles([]);
        setStreamingGeneratedImages([]);
        setStreamingImageStep(null);
        abortControllerRef.current = null;

        // Keep the optimistic local chat to avoid replacing the visible conversation.
        fetchConversations().then(setConversations);
      },
      (file) => {
        currentReceivedFiles.push(file);
        setStreamingGeneratedFiles((prev) => [...prev, file]);
      },
      (image) => {
        currentReceivedImages.push(image);
        setStreamingGeneratedImages((prev) => [...prev, image]);
      },
      (step) => {
        setStreamingImageStep(step);
      },
      (imgError) => {
        console.error('Image generation stream error:', imgError);
      },
      controller.signal
    );
  };

  sendMessageRef.current = handleSendMessage;

  // Regenerate Response
  const handleRegenerateMessage = async (assistantMsgId: string) => {
    if (!activeConversationId || isGenerating) return;

    // Remove this assistant message and subsequent messages
    const targetIdx = messages.findIndex((m) => m.id === assistantMsgId);
    if (targetIdx === -1) return;

    const trimmedMessages = messages.slice(0, targetIdx);
    setMessages(trimmedMessages);

    setIsGenerating(true);
    setStreamingContent('');
    setStreamingGeneratedFiles([]);
    setStreamingGeneratedImages([]);
    setStreamingImageStep(null);

    const newAssistantMsgId = `msg_${Date.now()}_ast`;
    setStreamingMessageId(newAssistantMsgId);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let fullStreamText = '';
    const currentReceivedFiles: GeneratedFile[] = [];
    const currentReceivedImages: GeneratedImage[] = [];

    await streamChatResponse(
      {
        conversationId: activeConversationId,
        regenerateMessageId: assistantMsgId,
        modelOverride: settings.model,
      },
      (delta) => {
        fullStreamText += delta;
        setStreamingContent(fullStreamText);
      },
      (errorMsg) => {
        setStreamingContent(errorMsg);
        setIsGenerating(false);
      },
      (finalText) => {
        setIsGenerating(false);
        if (finalText.trim() || currentReceivedImages.length > 0) {
          const finalMsg: Message = {
            id: newAssistantMsgId,
            conversationId: activeConversationId,
            role: 'assistant',
            content: finalText,
            generatedFiles: currentReceivedFiles.length > 0 ? currentReceivedFiles : undefined,
            generatedImages: currentReceivedImages.length > 0 ? currentReceivedImages : undefined,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, finalMsg]);
        }
        setStreamingContent('');
        setStreamingMessageId(null);
        setStreamingGeneratedFiles([]);
        setStreamingGeneratedImages([]);
        setStreamingImageStep(null);
        abortControllerRef.current = null;

      },
      (file) => {
        currentReceivedFiles.push(file);
        setStreamingGeneratedFiles((prev) => [...prev, file]);
      },
      (image) => {
        currentReceivedImages.push(image);
        setStreamingGeneratedImages((prev) => [...prev, image]);
      },
      (step) => {
        setStreamingImageStep(step);
      },
      (imgError) => {
        console.error('Image stream error during regeneration:', imgError);
      },
      controller.signal
    );
  };

  // Background Wake Word listener when voice overlay is closed ("Hey 3 athlas", "Attiva 3 athlas", etc.)
  useEffect(() => {
    if (!isWakeWordActive || !navigator.mediaDevices?.getUserMedia) return;

    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        microphoneStreamRef.current = stream;
      })
      .catch((err) => {
        console.warn('Microfono automatico non disponibile:', err);
      });

    return () => {
      cancelled = true;
      microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
      microphoneStreamRef.current = null;
    };
  }, [isWakeWordActive]);

  useEffect(() => {
    if (isVoiceModeOpen || !isWakeWordActive) {
      if (wakeWordServiceRef.current) {
        wakeWordServiceRef.current.stop();
        wakeWordServiceRef.current = null;
      }
      return;
    }

    const service = new WakeWordService({
      onWake: async (matchedWord, commandQuery) => {
        console.log(`[App] Wake Word detected in background: "${matchedWord}" | Query: "${commandQuery || ''}"`);
        service.stop();
        wakeWordServiceRef.current = null;
        setIsVoiceModeOpen(true);
        if (commandQuery && commandQuery.trim().length > 2) {
          // Direct command spoken with wake word
          await sendMessageRef.current?.(commandQuery.trim(), []);
        }
      },
      onError: (err) => {
        console.warn('Wake word background listener warning:', err);
      },
    });

    service.start();
    wakeWordServiceRef.current = service;

    return () => {
      service.stop();
      wakeWordServiceRef.current = null;
    };
  }, [isVoiceModeOpen, isWakeWordActive]);

  const handleToggleWakeWord = () => {
    setIsWakeWordActive((prev) => {
      const next = !prev;
      localStorage.setItem('athlas_wake_word_active', String(next));
      return next;
    });
  };

  // Edit Message
  const handleEditMessage = async (userMsgId: string, updatedContent: string) => {
    if (!activeConversationId || isGenerating) return;

    const targetIdx = messages.findIndex((m) => m.id === userMsgId);
    if (targetIdx === -1) return;

    // Update user message content and remove anything after it
    const updatedUserMsg = { ...messages[targetIdx], content: updatedContent };
    const trimmed = [...messages.slice(0, targetIdx), updatedUserMsg];
    setMessages(trimmed);

    setIsGenerating(true);
    setStreamingContent('');
    setStreamingGeneratedFiles([]);
    setStreamingGeneratedImages([]);
    setStreamingImageStep(null);

    const newAssistantMsgId = `msg_${Date.now()}_ast`;
    setStreamingMessageId(newAssistantMsgId);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let fullStreamText = '';
    const currentReceivedFiles: GeneratedFile[] = [];
    const currentReceivedImages: GeneratedImage[] = [];

    await streamChatResponse(
      {
        conversationId: activeConversationId,
        content: updatedContent,
        editMessageId: userMsgId,
        modelOverride: settings.model,
      },
      (delta) => {
        fullStreamText += delta;
        setStreamingContent(fullStreamText);
      },
      (errorMsg) => {
        setStreamingContent(errorMsg);
        setIsGenerating(false);
      },
      (finalText) => {
        setIsGenerating(false);
        if (finalText.trim() || currentReceivedImages.length > 0) {
          const finalMsg: Message = {
            id: newAssistantMsgId,
            conversationId: activeConversationId,
            role: 'assistant',
            content: finalText,
            generatedFiles: currentReceivedFiles.length > 0 ? currentReceivedFiles : undefined,
            generatedImages: currentReceivedImages.length > 0 ? currentReceivedImages : undefined,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, finalMsg]);
        }
        setStreamingContent('');
        setStreamingMessageId(null);
        setStreamingGeneratedFiles([]);
        setStreamingGeneratedImages([]);
        setStreamingImageStep(null);
        abortControllerRef.current = null;

      },
      (file) => {
        currentReceivedFiles.push(file);
        setStreamingGeneratedFiles((prev) => [...prev, file]);
      },
      (image) => {
        currentReceivedImages.push(image);
        setStreamingGeneratedImages((prev) => [...prev, image]);
      },
      (step) => {
        setStreamingImageStep(step);
      },
      (imgError) => {
        console.error('Image stream error on message edit:', imgError);
      },
      controller.signal
    );
  };

  // Message Rating
  const handleRateMessage = async (messageId: string, rating: 1 | -1 | 0) => {
    try {
      await updateMessage(messageId, { rating });
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, rating } : m))
      );
    } catch (err) {
      console.error('Error rating message:', err);
    }
  };

  // Dedicated Image Actions Handlers
  const handleRegenerateImage = async (image: GeneratedImage, ratio?: ImageAspectRatio) => {
    if (isGenerating) return;
    const effectiveRatio = ratio || image.aspectRatio || '1:1';
    const prompt = `Rigenera l'immagine con soggetto: "${image.prompt}" in formato ${effectiveRatio}`;
    await handleSendMessage(prompt, [], { isImageMode: true, aspectRatio: effectiveRatio });
  };

  const handleEditImage = async (image: GeneratedImage, editInstruction: string) => {
    if (isGenerating) return;
    const prompt = `Modifica l'immagine precedente "${image.prompt}": ${editInstruction}. Mantieni coerenza visiva e artistica.`;
    await handleSendMessage(prompt, [], { isImageMode: true, aspectRatio: image.aspectRatio });
  };

  const handleCreateVariantImage = async (image: GeneratedImage) => {
    if (isGenerating) return;
    const prompt = `Crea una variante alternativa di questa immagine: "${image.prompt}". Mantieni il soggetto e l'atmosfera ma sperimenta una diversa inquadratura o composizione fotografica.`;
    await handleSendMessage(prompt, [], { isImageMode: true, aspectRatio: image.aspectRatio });
  };

  // Model Selection
  const handleSelectModel = (newModel: string) => {
    setSettings((prev) => ({ ...prev, model: newModel }));
    if (activeConversationId) {
      updateConversation(activeConversationId, { model: newModel });
    }
  };

  // Logout
  const handleLogout = async () => {
    clearAuthToken();
    setCurrentUser(null);
    setSettingsOpen(false);

    // Recreate a clean guest session
    try {
      const guestRes = await createGuestUser();
      setCurrentUser(guestRes.user);
      setSettings(guestRes.settings);
      setConversations([]);
      setActiveConversationId(null);
      setMessages([]);
    } catch {
      // Ignored
    }
  };

  // Quick Starter Prompts
  const starterPrompts = [
    {
      icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
      title: 'Generazione Immagini Vision',
      prompt: "Crea un'immagine cinematografica di una città futuristica di notte con luci al neon e riflessi sull'asfalto bagnato.",
    },
    {
      icon: <Code2 className="w-4 h-4 text-gray-300" />,
      title: 'Analisi Codice & Debug',
      prompt: 'Analizza e ottimizza questo algoritmo per ridurre la complessità computazionale a O(n).',
    },
    {
      icon: <FileSpreadsheet className="w-4 h-4 text-gray-300" />,
      title: 'Elaborazione Dati CSV / File',
      prompt: 'Come posso strutturare ed estrarre metriche chiave da un file CSV contenente transazioni?',
    },
    {
      icon: <Cpu className="w-4 h-4 text-gray-300" />,
      title: 'Architettura Software',
      prompt: 'Spiega i vantaggi e svantaggi di una architettura a microservizi rispetto a un monolito modulare.',
    },
    {
      icon: <Sparkles className="w-4 h-4 text-gray-300" />,
      title: 'Ragionamento Complesso',
      prompt: 'Spiega in modo chiaro e approfondito il principio di indeterminazione di Heisenberg.',
    },
  ];

  return (
    <div className="relative flex h-screen w-full bg-[#0A0A0A] text-[#E5E5E5] overflow-hidden select-text font-['Plus_Jakarta_Sans']">
      {/* 1. Introductory Animation (1-1.5s) */}
      {showIntro && <IntroAnimation onComplete={handleIntroComplete} />}

      {/* 2. Left Sidebar (Desktop & Mobile Drawer) */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAuth={handleOpenAuth}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenMind={() => setIsMindOpen(true)}
        onOpenMirror={() => setIsMirrorOpen(true)}
      />

      {/* 3. Main Chat Container */}
      <main className="flex-1 flex flex-col h-full min-w-0 lg:ml-72 sm:lg:ml-[280px] bg-[#0A0A0A] relative">
        {/* Top Header */}
        <ChatHeader
          currentModel={settings.model}
          onSelectModel={handleSelectModel}
          mistralOnline={mistralOnline}
          onOpenSidebar={() => setSidebarOpen(true)}
          onNewChat={handleNewChat}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenAuth={handleOpenAuth}
          onOpenVoiceMode={handleOpenVoiceMode}
          isWakeWordActive={isWakeWordActive}
          onToggleWakeWord={handleToggleWakeWord}
          currentUser={currentUser}
          settings={settings}
          onOpenMirror={() => setIsMirrorOpen(true)}
          onOpenMind={() => setIsMindOpen(true)}
          currentAutonomy={currentAutonomy}
          onSelectAutonomy={handleSelectAutonomy}
          currentPersona={currentPersona}
          onSelectPersona={handleSelectPersona}
        />

        {/* Message Scrollable Viewport */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 space-y-4">
          {/* Welcome Screen with Minimal Core Homepage ("Cosa vuoi fare?") */}
          {messages.length === 0 && !streamingContent && (
            <AthlasHomepage
              onStartVoice={handleOpenVoiceMode}
              onFocusComposer={() => {
                const composerInput = document.querySelector('textarea');
                composerInput?.focus();
              }}
              onOpenMirror={() => setIsMirrorOpen(true)}
              onOpenFileUpload={() => {
                const uploadBtn = document.querySelector('input[type="file"]') as HTMLInputElement;
                uploadBtn?.click();
              }}
              onSelectPrompt={(text) => handleSendMessage(text)}
              currentPersona={currentPersona}
              currentAutonomy={currentAutonomy}
            />
          )}

          {/* Render Actual Messages */}
          {messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              onRegenerate={msg.role === 'assistant' ? handleRegenerateMessage : undefined}
              onEdit={msg.role === 'user' ? handleEditMessage : undefined}
              onRate={msg.role === 'assistant' ? handleRateMessage : undefined}
              onRegenerateImage={handleRegenerateImage}
              onEditImage={handleEditImage}
              onCreateVariantImage={handleCreateVariantImage}
            />
          ))}

          {/* Active Streaming Message Preview */}
          {isGenerating && (streamingContent || streamingGeneratedImages.length > 0) && (
            <div className="space-y-2">
              {streamingImageStep && (
                <div className="w-full max-w-4xl mx-auto px-4 py-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs flex items-center space-x-2.5 shadow-lg shadow-cyan-950/30 animate-pulse">
                  <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
                  <span className="font-mono text-[11px] font-medium tracking-wide">
                    {streamingImageStep.text}
                  </span>
                </div>
              )}
              <MessageItem
                message={{
                  id: streamingMessageId || 'streaming_placeholder',
                  conversationId: activeConversationId || '',
                  role: 'assistant',
                  content: streamingContent,
                  generatedFiles: streamingGeneratedFiles,
                  generatedImages: streamingGeneratedImages,
                  createdAt: new Date().toISOString(),
                }}
                isStreaming={true}
                onRegenerateImage={handleRegenerateImage}
                onEditImage={handleEditImage}
                onCreateVariantImage={handleCreateVariantImage}
              />
            </div>
          )}

          {/* Loading Indicator while waiting for first chunk or during image generation */}
          {isGenerating && !streamingContent && streamingGeneratedImages.length === 0 && (
            <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 flex items-center space-x-3 text-gray-400 text-xs font-mono animate-pulse">
              <div className="w-7 h-7 rounded-lg bg-[#1A1A1A] border border-[#333333] flex items-center justify-center">
                {streamingImageStep ? (
                  <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
                ) : (
                  <Bot className="w-4 h-4 text-gray-200 animate-spin" />
                )}
              </div>
              <span>
                {streamingImageStep
                  ? streamingImageStep.text
                  : '3 athlas sta elaborando la richiesta...'}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 4. Bottom Composer Input Area */}
        <Composer
          onSendMessage={handleSendMessage}
          isGenerating={isGenerating}
          onStopGeneration={handleStopGeneration}
          conversationId={activeConversationId || undefined}
          sttLanguage={settings.sttLanguage}
                onOpenVoiceMode={handleOpenVoiceMode}
        />
      </main>

      {/* 5. Modals */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentUser={currentUser}
        settings={settings}
        onUpdateSettings={(newSettings) => {
          setSettings(newSettings);
          if (newSettings.autonomyLevel) setCurrentAutonomy(newSettings.autonomyLevel);
          if (newSettings.persona) setCurrentPersona(newSettings.persona);
          if (newSettings.isIncognitoMind !== undefined) setIsIncognitoMind(newSettings.isIncognitoMind);
        }}
        onLogout={handleLogout}
        onClearAllHistory={handleClearAllHistory}
        onOpenAuth={handleOpenAuth}
      />

      <AuthModal
        isOpen={authOpen}
        initialMode={authInitialMode}
        currentGuestId={currentUser?.id}
        hasExistingConversations={conversations.length > 0}
        onClose={() => setAuthOpen(false)}
        onAuthSuccess={(authData) => {
          setCurrentUser(authData.user);
          setSettings(authData.settings);
          fetchConversations().then(async (convs) => {
            setConversations(convs);
            if (convs.length > 0) {
              const currentStillExists = convs.some((c) => c.id === activeConversationId);
              const targetId = currentStillExists && activeConversationId ? activeConversationId : convs[0].id;
              setActiveConversationId(targetId);
              const msgs = await fetchMessages(targetId);
              setMessages(msgs);
            }
          });
        }}
      />

      {/* 6. Immersive 3 Athlas Next-Gen Voice Mode (3D Dynamic Orb, VAD, Barge-In, Continuous Conversation) */}
      <VoiceModeOverlay
        isOpen={isVoiceModeOpen}
        onClose={() => setIsVoiceModeOpen(false)}
        activeConversation={conversations.find((c) => c.id === activeConversationId) || null}
        messages={messages}
        isGenerating={isGenerating}
        streamingContent={streamingContent}
        onSendMessage={async (text) => {
          await handleSendMessage(text, []);
        }}
        onExecuteBrowserCommand={async (text) => executeBrowserCommand(text)}
        onNewConversation={handleNewChat}
        initialVoiceSettings={voiceSettings}
        onUpdateVoiceSettings={(newVoiceSettings) => setVoiceSettings(newVoiceSettings)}
      />

      {/* 7. ATHLAS MIRROR Modal (Live Screen, Webcam, Diagnostic Companion) */}
      <AthlasMirrorModal
        isOpen={isMirrorOpen}
        onClose={() => setIsMirrorOpen(false)}
        currentPersona={currentPersona}
        onApplySolution={(solutionText) => {
          handleSendMessage(solutionText);
        }}
      />

      {/* 8. ATHLAS MIND Drawer (Transparent User-Controlled Cognitive Memory) */}
      <AthlasMindDrawer
        isOpen={isMindOpen}
        onClose={() => setIsMindOpen(false)}
        isIncognito={isIncognitoMind}
        onToggleIncognito={async (enabled) => {
          setIsIncognitoMind(enabled);
          setSettings((prev) => ({ ...prev, isIncognitoMind: enabled }));
          try {
            await updateUserSettings({ isIncognitoMind: enabled });
          } catch (e) {
            console.warn('Could not persist incognito state:', e);
          }
        }}
      />
    </div>
  );
}
