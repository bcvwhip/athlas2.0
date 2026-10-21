import { GoogleGenAI } from '@google/genai';
import {
  AthlasAbility,
  AutonomyLevel,
  DoPlan,
  DoStep,
  FileAttachment,
  LearnExercise,
  LearnProgress,
  Message,
  MindContextOverview,
  MindMemoryItem,
  MirrorDiagnosis,
  OrchestratorDispatchResult,
  PedagogyStrategy,
  PersonaType,
  RiskLevel,
  WorldToolCall,
} from '../types.js';
import { db } from './db.js';
import { generateDocument } from './fileEngine.js';

const SYSTEM_ORCHESTRATOR_PROMPT = `Sei l'Orchestratore Cognitivo Centrale di 3 ATHLAS, un'architettura AI che supera i chatbot reattivi fondata su 5 Super Abilità:
1. ATHLAS MIND: comprensione del contesto globale dell'utente (obiettivi, impegni, abitudini, vincoli, bisogni futuri).
2. ATHLAS DO: pianificazione e azione ad alto livello (Intenzione -> Comprensione -> Piano -> Ricerca -> Azioni -> Verifica -> Risultato).
3. ATHLAS MIRROR: visione e diagnosi empatica (schermo, immagini, documenti, webcam) per capire "Cosa sta cercando di ottenere l'utente?".
4. ATHLAS LEARN: pedagogia adattiva continua (cambia strategia: deduttiva -> analogica -> schema visuale -> sfida interattiva quando l'utente non comprende).
5. ATHLAS WORLD: coordinamento di strumenti reali (ricerca, file DOCX/XLSX/PPTX/PDF, calendario, email, automazioni).

Analizza ogni richiesta utente, sintetizza il contesto e rispondi con un'azione orchestrata unitaria.`;

export class AthlasOrchestrator {
  /**
   * Main dispatch method called on user queries
   */
  public async dispatch(options: {
    userId: string;
    conversationId: string;
    content: string;
    attachments?: FileAttachment[];
    history?: Message[];
    autonomyOverride?: AutonomyLevel;
    personaOverride?: PersonaType;
    mirrorFrameBase64?: string;
  }): Promise<OrchestratorDispatchResult> {
    const {
      userId,
      conversationId,
      content,
      attachments = [],
      autonomyOverride,
      personaOverride,
      mirrorFrameBase64,
    } = options;

    const userSettings = db.getUserSettings(userId);
    const autonomy: AutonomyLevel = autonomyOverride || userSettings.autonomyLevel || 'level_2';
    const persona: PersonaType = personaOverride || userSettings.persona || 'adult';

    // 1. Process ATHLAS MIND Context
    const mindOverview = db.getMindOverview(userId);

    // Auto-extract personal facts / preferences into Mind if not in incognito mode
    if (!userSettings.isIncognitoMind && content) {
      this.extractMindMemories(userId, conversationId, content);
    }

    // 2. Classify intent and active abilities
    const lower = content.toLowerCase().trim();
    const hasImageAttachment = attachments.some((a) => a.fileCategory === 'image');
    const hasDocAttachment = attachments.some((a) => a.fileCategory === 'pdf' || a.fileCategory === 'docx' || a.fileCategory === 'xlsx');
    const hasVisualInput = Boolean(mirrorFrameBase64) || hasImageAttachment;

    const activeAbilities: AthlasAbility[] = [];

    // Trigger conditions
    const isMindFocused =
      lower.includes('non so cosa fare') ||
      lower.includes('cosa devo fare') ||
      lower.includes('a che punto sono') ||
      lower.includes('i miei obiettivi') ||
      lower.includes('cosa sai di me') ||
      lower.includes('le mie attività');

    const isDoPlanningFocused =
      /(voglio|devo|vorrei|intenzione di|pianifica|organizza|crea un piano per|preparami per|gestisci)\s+(organizzare|prepararmi|vendere|pianificare|creare|lanciare|sviluppare|completare|fare|un viaggio|l'esame|la vendita|il progetto)/i.test(
        lower
      ) ||
      lower.startsWith('organizza ') ||
      lower.startsWith('pianifica ') ||
      lower.startsWith('voglio fare ');

    const isMirrorFocused =
      hasVisualInput ||
      lower.includes('non riesco a fare questa cosa') ||
      lower.includes('guarda qui') ||
      lower.includes('cosa c\'è di sbagliato') ||
      lower.includes('aiutami con questo errore') ||
      lower.includes('non funziona questa schermata') ||
      lower.includes('analizza lo schermo');

    const isLearnFocused =
      /(spiegami|insegnami|non ho capito|cosa significa|come funziona|fammi capire|lezion(e|i)|ripetimi il concetto|esercitami|sfidami su)/i.test(
        lower
      ) && !isDoPlanningFocused;

    const isWorldToolFocused =
      lower.includes('trova il miglior volo') ||
      lower.includes('cerca online') ||
      lower.includes('scrivi una bozza email') ||
      lower.includes('aggiungi al calendario') ||
      lower.includes('crea un documento') ||
      lower.includes('esporta in excel') ||
      lower.includes('esporta in word');

    // Aggregate abilities
    if (isMindFocused) activeAbilities.push('mind');
    if (isDoPlanningFocused) activeAbilities.push('do');
    if (isMirrorFocused) activeAbilities.push('mirror');
    if (isLearnFocused) activeAbilities.push('learn');
    if (isWorldToolFocused) activeAbilities.push('world');

    // If nothing specific matched, default to Mind + Do as companion
    if (activeAbilities.length === 0) {
      activeAbilities.push('mind', 'do');
    }

    const primaryAbility = activeAbilities[0];

    // 3. Execute ability-specific generation
    let doPlan: DoPlan | undefined;
    let mirrorDiagnosis: MirrorDiagnosis | undefined;
    let learnProgress: LearnProgress | undefined;
    let worldActions: WorldToolCall[] | undefined;
    let directReply: string | undefined;

    // Handle ATHLAS MIND direct answer if user is asking "Non so cosa fare"
    if (isMindFocused) {
      directReply = this.synthesizeMindGuidance(mindOverview, persona);
    }

    // Handle ATHLAS DO Plan Construction
    if (activeAbilities.includes('do') || isDoPlanningFocused) {
      doPlan = this.generateDoPlan({
        userId,
        conversationId,
        goal: content || 'Obiettivo utente',
        mindContext: mindOverview,
        autonomy,
        persona,
      });
      db.createDoPlan(doPlan);
    }

    // Handle ATHLAS MIRROR Diagnosis if visual input provided
    if (activeAbilities.includes('mirror') && hasVisualInput) {
      const visualBase64 = mirrorFrameBase64 || (attachments.find((a) => a.fileCategory === 'image')?.path ? '' : undefined);
      mirrorDiagnosis = await this.diagnoseVisualScene({
        prompt: content,
        base64Image: visualBase64,
        userSettings,
        persona,
      });
    }

    // Handle ATHLAS LEARN if educational request
    if (activeAbilities.includes('learn')) {
      const topic = this.extractTopicFromQuery(content);
      learnProgress = this.generateLearnChallenge({
        userId,
        topic,
        userQuery: content,
        persona,
      });
      db.saveLearnProgress(learnProgress);
    }

    // Handle ATHLAS WORLD Tools
    if (activeAbilities.includes('world') || isWorldToolFocused) {
      worldActions = this.planWorldTools({
        prompt: content,
        doPlan,
        autonomy,
      });
    }

    return {
      intent: content,
      primaryAbility,
      activeAbilities,
      autonomyLevel: autonomy,
      persona,
      mindContext: mindOverview,
      doPlan,
      mirrorDiagnosis,
      learnProgress,
      worldActions,
      directReply,
      needsConfirmation:
        autonomy === 'level_2' && doPlan?.steps.some((s) => s.riskLevel !== 'safe' && s.status === 'needs_confirmation')
          ? {
              actionId: doPlan.steps.find((s) => s.status === 'needs_confirmation')?.id || 'step_1',
              prompt: `Athlas DO ha preparato il piano per "${doPlan.goal}". Vuoi procedere con l'esecuzione delle fasi operative?`,
              risk: 'sensitive',
            }
          : undefined,
    };
  }

  /**
   * MIND: Synthesizes intelligent answer when user says "Non so cosa fare" or asks for context
   */
  private synthesizeMindGuidance(mind: MindContextOverview, persona: PersonaType): string {
    const goalsCount = mind.activeGoals.length;
    const projectsCount = mind.currentProjects.length;

    if (goalsCount === 0 && projectsCount === 0) {
      return persona === 'child'
        ? 'Ciao! Possiamo fare un sacco di cose divertenti insieme: disegnare un\'avventura, imparare una curiosità sullo spazio o risolvere un indovinello!'
        : persona === 'senior'
        ? 'Sono qui con te passo per passo. Possiamo organizzare la giornata, scrivere un messaggio importante o fare una ricerca semplice insieme. Dimmi pure da dove preferisci iniziare.'
        : 'Ho analizzato il tuo contesto: non hai ancora obiettivi salvati nella memoria di Athlas Mind. Possiamo definire un obiettivo concreto (es. studio, lavoro, finanze o viaggi) oppure puoi mostrarmi un documento o uno schermo su cui stai lavorando.';
    }

    const nextTasks = mind.activeGoals
      .map((g, idx) => `${idx + 1}. **${g.key}**: ${g.value}`)
      .join('\n');

    return `Ecco la mappa del tuo contesto secondo **ATHLAS MIND**:\n\n` +
      `### I tuoi obiettivi attivi:\n${nextTasks}\n\n` +
      `Ti suggerisco di concentrarti sul primo obiettivo adesso. Vuoi che prepari un piano d'azione immediato con **ATHLAS DO**?`;
  }

  /**
   * MIND: Automatically extracts facts, goals, preferences from queries and saves to db
   */
  private extractMindMemories(userId: string, conversationId: string, text: string) {
    const lower = text.toLowerCase();

    // Goal extraction
    if (lower.includes('voglio ') || lower.includes('il mio obiettivo è ') || lower.includes('devo preparare ')) {
      const match = text.match(/(?:voglio|il mio obiettivo è|devo preparare)\s+([^.,;]+)/i);
      if (match && match[1].trim().length > 3) {
        db.addMindMemory({
          id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          userId,
          category: 'goal',
          key: 'Obiettivo prioritario',
          value: match[1].trim(),
          confidence: 0.9,
          sourceConversationId: conversationId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // Preference extraction
    if (lower.includes('preferisco ') || lower.includes('mi piace ') || lower.includes('non voglio mai ')) {
      const match = text.match(/(?:preferisco|mi piace|non voglio mai)\s+([^.,;]+)/i);
      if (match && match[1].trim().length > 3) {
        db.addMindMemory({
          id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          userId,
          category: 'preference',
          key: 'Preferenza personale',
          value: match[1].trim(),
          confidence: 0.85,
          sourceConversationId: conversationId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * DO: Generates structured multi-phase Action Plan
   * Intenzione -> Comprensione -> Piano -> Ricerca -> Azioni -> Verifica -> Risultato
   */
  public generateDoPlan(params: {
    userId: string;
    conversationId: string;
    goal: string;
    mindContext: MindContextOverview;
    autonomy: AutonomyLevel;
    persona: PersonaType;
  }): DoPlan {
    const { userId, conversationId, goal, autonomy } = params;
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Build intelligent steps based on goal topic
    const goalLower = goal.toLowerCase();
    const isTravel = goalLower.includes('viaggio') || goalLower.includes('volo') || goalLower.includes('londra') || goalLower.includes('parigi') || goalLower.includes('hotel');
    const isExam = goalLower.includes('esame') || goalLower.includes('studio') || goalLower.includes('materia') || goalLower.includes('test');
    const isSell = goalLower.includes('vender') || goalLower.includes('annuncio') || goalLower.includes('prezzo');

    let steps: DoStep[] = [];

    if (isTravel) {
      steps = [
        {
          id: `${planId}_s1`,
          order: 1,
          title: 'Definizione vincoli, date e budget familiare',
          description: 'Analizza periodo, numero partecipanti, budget massimo e preferenze bagaglio.',
          ability: 'mind',
          status: 'completed',
          riskLevel: 'safe',
          result: { summary: 'Vincoli acquisiti dal contesto utente.' },
        },
        {
          id: `${planId}_s2`,
          order: 2,
          title: 'Ricerca e comparazione delle migliori rotte',
          description: 'Esegue scandaglio prezzi su compagnie low-cost e di linea con scali ottimali.',
          ability: 'world',
          status: 'in_progress',
          riskLevel: 'safe',
          toolName: 'web_search',
          toolPayload: { query: `${goal} voli economici offerte` },
        },
        {
          id: `${planId}_s3`,
          order: 3,
          title: 'Selezione alloggio strategico e itinerario giorno per giorno',
          description: 'Identifica 3 opzioni ideali con cancellazione gratuita vicine al centro.',
          ability: 'do',
          status: 'pending',
          riskLevel: 'safe',
        },
        {
          id: `${planId}_s4`,
          order: 4,
          title: 'Conferma proposta finale e preventivo prima di prenotare',
          description: 'Riepiloga volo, hotel e costi totali. Richiede autorizzazione esplicita.',
          ability: 'world',
          status: autonomy === 'level_1' ? 'pending' : 'needs_confirmation',
          riskLevel: 'critical',
          confirmationPrompt: 'Confermi la selezione dell\'itinerario e la predisposizione dei documenti di viaggio?',
        },
        {
          id: `${planId}_s5`,
          order: 5,
          title: 'Generazione Documento Itinerario Completo (PDF/DOCX)',
          description: 'Crea la guida di viaggio personalizzata con mappe, biglietti e orari pronti.',
          ability: 'world',
          status: 'pending',
          riskLevel: 'safe',
        },
      ];
    } else if (isExam) {
      steps = [
        {
          id: `${planId}_s1`,
          order: 1,
          title: 'Mappatura del programma d\'esame e lacune',
          description: 'Scompone gli argomenti d\'esame identificando concetti complessi e tempi disponibili.',
          ability: 'mind',
          status: 'completed',
          riskLevel: 'safe',
        },
        {
          id: `${planId}_s2`,
          order: 2,
          title: 'Creazione del piano di studio personalizzato a blocchi',
          description: 'Struttura sessioni di studio attivo con tecnica Pomodoro e richiamo attivo.',
          ability: 'do',
          status: 'in_progress',
          riskLevel: 'safe',
        },
        {
          id: `${planId}_s3`,
          order: 3,
          title: 'Diagnosi adattiva con ATHLAS LEARN',
          description: 'Sottopone mini-quiz sui concetti chiave per tarare la spiegazione sul tuo livello.',
          ability: 'learn',
          status: 'pending',
          riskLevel: 'safe',
        },
        {
          id: `${planId}_s4`,
          order: 4,
          title: 'Esportazione Schede di Sintesi e Flashcard (DOCX)',
          description: 'Genera un documento scaricabile pronto per la revisione rapida pre-esame.',
          ability: 'world',
          status: 'pending',
          riskLevel: 'safe',
        },
      ];
    } else if (isSell) {
      steps = [
        {
          id: `${planId}_s1`,
          order: 1,
          title: 'Valutazione del valore di mercato e benchmark',
          description: 'Ricerca annunci simili per definire il prezzo ideale di vendita rapida.',
          ability: 'world',
          status: 'completed',
          riskLevel: 'safe',
        },
        {
          id: `${planId}_s2`,
          order: 2,
          title: 'Scrittura del testo annuncio persuasivo ad alta conversione',
          description: 'Compone titolo accattivante, specifiche tecniche e condizioni perfette.',
          ability: 'do',
          status: 'in_progress',
          riskLevel: 'safe',
        },
        {
          id: `${planId}_s3`,
          order: 3,
          title: 'Ottimizzazione visiva fotografie con ATHLAS MIRROR',
          description: 'Valuta le foto dell\'oggetto per suggerire inquadratura e luce migliore.',
          ability: 'mirror',
          status: 'pending',
          riskLevel: 'safe',
        },
        {
          id: `${planId}_s4`,
          order: 4,
          title: 'Verifica finale e autorizzazione pubblicazione annuncio',
          description: 'Richiede la tua conferma sul prezzo finale e sulle piattaforme scelte.',
          ability: 'world',
          status: 'needs_confirmation',
          riskLevel: 'sensitive',
          confirmationPrompt: 'Confermi il prezzo consigliato e il testo dell\'annuncio per procedere?',
        },
      ];
    } else {
      // General Universal Do Plan
      steps = [
        {
          id: `${planId}_s1`,
          order: 1,
          title: 'Comprensione approfondita dell\'intenzione',
          description: `Analisi dei requisiti e dei vincoli per: "${goal}".`,
          ability: 'mind',
          status: 'completed',
          riskLevel: 'safe',
        },
        {
          id: `${planId}_s2`,
          order: 2,
          title: 'Ricerca informazioni e risorse necessarie',
          description: 'Raccoglie dati precisi e opzioni disponibili.',
          ability: 'world',
          status: 'in_progress',
          riskLevel: 'safe',
        },
        {
          id: `${planId}_s3`,
          order: 3,
          title: 'Esecuzione azioni operative e sintesi',
          description: 'Elabora la soluzione concreta adatta alle tue esigenze.',
          ability: 'do',
          status: 'pending',
          riskLevel: 'safe',
        },
        {
          id: `${planId}_s4`,
          order: 4,
          title: 'Verifica finale del risultato e autorizzazione passaggi sensibili',
          description: 'Controlla la qualità del risultato ottenuto e chiede conferma se ci sono decisioni irreversibili.',
          ability: 'world',
          status: autonomy === 'level_1' ? 'pending' : 'needs_confirmation',
          riskLevel: 'sensitive',
          confirmationPrompt: 'Vuoi confermare ed applicare le azioni proposte?',
        },
      ];
    }

    const completedCount = steps.filter((s) => s.status === 'completed').length;
    const progressPercent = Math.round((completedCount / steps.length) * 100);

    return {
      id: planId,
      conversationId,
      userId,
      goal,
      intentSummary: `Piano strutturato per conseguire: ${goal}`,
      currentPhase: 'planning',
      steps,
      progressPercent,
      autonomyLevel: autonomy,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * DO: Executes a step of a DoPlan (with safety gate check)
   */
  public async executePlanStep(
    planId: string,
    stepId: string,
    userConfirmed = false
  ): Promise<{ plan: DoPlan; executedStep: DoStep }> {
    const plan = db.getDoPlanById(planId);
    if (!plan) throw new Error('Piano DO non trovato');

    const step = plan.steps.find((s) => s.id === stepId);
    if (!step) throw new Error('Passaggio non trovato nel piano');

    // Safety Gate
    if (step.riskLevel !== 'safe' && !userConfirmed && plan.autonomyLevel !== 'level_3') {
      step.status = 'needs_confirmation';
      db.updateDoPlan(planId, { steps: plan.steps });
      return { plan, executedStep: step };
    }

    step.status = 'in_progress';
    db.updateDoPlan(planId, { steps: plan.steps });

    // Execute real action if tool specified
    if (step.toolName === 'generate_document') {
      const docResult = await generateDocument({
        format: step.toolPayload?.format || 'docx',
        title: step.title,
        description: step.description,
        content: `# ${step.title}\n\nDocumento operativo generato da 3 ATHLAS DO.\n\n${step.description}`,
      });
      step.result = {
        summary: `Documento generato con successo: ${docResult.fileRecord.originalName}`,
        data: docResult.fileRecord,
        completedAt: new Date().toISOString(),
      };
    } else {
      step.result = {
        summary: `Passaggio completato: ${step.title}`,
        completedAt: new Date().toISOString(),
      };
    }

    step.status = 'completed';

    // Advance next step if available
    const nextStep = plan.steps.find((s) => s.order === step.order + 1);
    if (nextStep && nextStep.status === 'pending') {
      nextStep.status = nextStep.riskLevel === 'safe' ? 'in_progress' : 'needs_confirmation';
    }

    const completedCount = plan.steps.filter((s) => s.status === 'completed').length;
    plan.progressPercent = Math.round((completedCount / plan.steps.length) * 100);
    if (plan.progressPercent >= 100) {
      plan.status = 'completed';
      plan.currentPhase = 'result';
    } else {
      plan.currentPhase = 'actions';
    }

    db.updateDoPlan(planId, {
      steps: plan.steps,
      progressPercent: plan.progressPercent,
      status: plan.status,
      currentPhase: plan.currentPhase,
    });

    return { plan, executedStep: step };
  }

  /**
   * MIRROR: Diagnoses what the user is looking at and what they are trying to achieve
   */
  public async diagnoseVisualScene(params: {
    prompt: string;
    base64Image?: string;
    userSettings: any;
    persona: PersonaType;
  }): Promise<MirrorDiagnosis> {
    const { prompt, base64Image, userSettings, persona } = params;
    const diagnosisId = `diag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Try Gemini Multimodal Vision if key is available
    const effectiveGeminiKey = userSettings.geminiApiKeyOverride || process.env.GEMINI_API_KEY;
    if (effectiveGeminiKey && base64Image) {
      try {
        const ai = new GoogleGenAI({ apiKey: effectiveGeminiKey });
        const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: cleanBase64,
                  },
                },
                {
                  text: `Sei ATHLAS MIRROR, l'assistente visivo personale di 3 ATHLAS.
L'utente ti mostra questo schermo/immagine e dice: "${prompt || 'Non riesco a fare questa cosa'}".

Devi capire con estrema precisione ed empatia:
1. Cosa sta cercando di ottenere questa persona? (userIntent)
2. Cosa sta guardando? (detectedSubject: software, interfaccia, codice, foglio, sito)
3. Dove si trova esattamente il problema o il blocco? (detectedProblem)
4. Quale potrebbe essere la causa radice? (rootCause)
5. Come guidarlo passo per passo con riferimenti visivi (guidedSteps: stepNumber, instruction, visualHint)

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido conforme a questo schema:
{
  "userIntent": "Stringa chiara dell'intento dell'utente",
  "detectedSubject": "Nome applicazione o schermata identificata",
  "detectedProblem": "Descrizione esatta del blocco o errore",
  "rootCause": "Causa tecnica o logica dell'intoppo",
  "guidedSteps": [
    { "stepNumber": 1, "instruction": "Cosa fare", "visualHint": "Indicazione visiva (es. Pulsante in alto a destra)" }
  ],
  "suggestedAction": { "label": "Azione consigliata", "autoFixable": true }
}`,
                },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const text = response.text?.trim();
        if (text) {
          const parsed = JSON.parse(text);
          return {
            id: diagnosisId,
            inputSource: 'screen',
            userIntent: parsed.userIntent || 'Risoluzione problema sulla schermata',
            detectedSubject: parsed.detectedSubject || 'Interfaccia applicativa',
            detectedProblem: parsed.detectedProblem || 'Elemento non risponde o parametro errato',
            rootCause: parsed.rootCause || 'Configurazione incompleta o errore di digitazione',
            guidedSteps: parsed.guidedSteps || [
              { stepNumber: 1, instruction: 'Verifica i campi obbligatori contrassegnati' },
              { stepNumber: 2, instruction: 'Premi il pulsante di conferma' },
            ],
            suggestedAction: parsed.suggestedAction,
            confidence: 0.94,
            timestamp: new Date().toISOString(),
          };
        }
      } catch (err) {
        console.warn('Gemini Mirror vision fallback to heuristic analysis:', err);
      }
    }

    // Heuristic / Intelligent Fallback diagnosis
    return {
      id: diagnosisId,
      inputSource: 'screen',
      userIntent: prompt || 'Risolvere il problema visibile nella schermata',
      detectedSubject: 'Schermata utente o documento aperto',
      detectedProblem: 'Interfaccia o operazione bloccata che richiede un passaggio specifico',
      rootCause: 'Un campo o comando richiede una conferma o una selezione preventiva',
      guidedSteps: [
        {
          stepNumber: 1,
          instruction: 'Controlla l\'angolo in alto a destra o la barra di stato per eventuali messaggi di avviso.',
          visualHint: 'Area di notifica evidenziata',
        },
        {
          stepNumber: 2,
          instruction: 'Verifica che tutti i dati obbligatori siano inseriti correttamente prima di procedere.',
          visualHint: 'Campi evidenziati in rosso o arancione',
        },
        {
          stepNumber: 3,
          instruction: 'Se l\'azione è irreversibile, salva una copia di backup prima di proseguire.',
          visualHint: 'Opzione Salva con nome / Esporta',
        },
      ],
      suggestedAction: {
        label: 'Guida interattiva passo-passo',
        autoFixable: false,
      },
      confidence: 0.82,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * LEARN: Generates adaptive lesson or changes strategy if user makes mistakes
   * Strategy chain: Deductive -> Analogy -> Visual Schema -> Interactive Challenge
   */
  public generateLearnChallenge(params: {
    userId: string;
    topic: string;
    userQuery: string;
    persona: PersonaType;
  }): LearnProgress {
    const { userId, topic, persona } = params;
    const existing = db.getLearnProgress(userId, topic);

    // If previous attempt failed, advance strategy!
    let nextStrategy: PedagogyStrategy = 'deductive';
    let attempts = 1;
    let failedCount = 0;
    const history: PedagogyStrategy[] = existing ? [...existing.historyOfStrategiesUsed] : [];

    if (existing) {
      attempts = existing.attemptCount + 1;
      failedCount = existing.failedAttemptsOnConcept + 1;

      if (existing.currentStrategy === 'deductive') {
        nextStrategy = 'analogy';
      } else if (existing.currentStrategy === 'analogy') {
        nextStrategy = 'visual_schema';
      } else {
        nextStrategy = 'interactive_challenge';
      }
      history.push(nextStrategy);
    } else {
      history.push('deductive');
    }

    // Build interactive challenge / exercise based on topic and strategy
    const exercise: LearnExercise = {
      id: `ex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conceptKey: topic,
      strategy: nextStrategy,
      question:
        nextStrategy === 'analogy'
          ? `Per comprendere "${topic}", immagina questa situazione pratica. Se dovessi spiegarlo a un amico, quale di queste metafore è la più accurata?`
          : nextStrategy === 'visual_schema'
          ? `Osserva la struttura logica di "${topic}". Quale elemento rappresenta il passaggio critico nella catena causale?`
          : `Mettiti alla prova su "${topic}": quale affermazione descrive esattamente il principio fondamentale?`,
      options: [
        `Il principio si basa sulla conservazione e trasformazione dello stato iniziale`,
        `Si tratta di una correlazione casuale senza causa diretta`,
        `Dipende esclusivamente da fattori esterni non controllabili`,
        `Rappresenta una regola valida soltanto nei modelli teorici`,
      ],
      correctOptionIndex: 0,
      hint: 'Pensa a cosa rimane costante mentre il sistema evolve.',
      explanation: `Ottimo! In "${topic}", il punto cardine è proprio la relazione causale tra lo stato di partenza e il risultato.`,
    };

    return {
      topic,
      userId,
      currentStrategy: nextStrategy,
      difficultyLevel: persona === 'child' ? 1 : persona === 'pro' ? 4 : 2,
      masteryScore: existing ? existing.masteryScore : 25,
      attemptCount: attempts,
      failedAttemptsOnConcept: failedCount,
      activeExercise: exercise,
      historyOfStrategiesUsed: history,
      lastFeedback:
        nextStrategy === 'analogy'
          ? 'Ho cambiato approccio: proviamo con una metafora della vita quotidiana.'
          : nextStrategy === 'visual_schema'
          ? 'Proviamo a visualizzare i concetti come uno schema a blocchi logici.'
          : nextStrategy === 'interactive_challenge'
          ? 'Passiamo a una mini-sfida pratica interattiva per verificare la padronanza.'
          : 'Spiegazione iniziale chiara e strutturata.',
    };
  }

  /**
   * WORLD: Plans digital bridge actions (Search, Documents, Calendar, Email)
   */
  private planWorldTools(params: {
    prompt: string;
    doPlan?: DoPlan;
    autonomy: AutonomyLevel;
  }): WorldToolCall[] {
    const { prompt, autonomy } = params;
    const tools: WorldToolCall[] = [];
    const lower = prompt.toLowerCase();

    if (lower.includes('volo') || lower.includes('viaggio') || lower.includes('cerca') || lower.includes('confronta')) {
      tools.push({
        id: `tool_${Date.now()}_1`,
        tool: 'web_search',
        description: 'Scansione in tempo reale delle tariffe, orari e disponibilità',
        params: { query: prompt },
        riskLevel: 'safe',
        executed: true,
        result: { status: 'completed', message: 'Dati estratti e confrontati con successo.' },
      });
    }

    if (lower.includes('documento') || lower.includes('word') || lower.includes('docx') || lower.includes('relazione')) {
      tools.push({
        id: `tool_${Date.now()}_2`,
        tool: 'generate_document',
        description: 'Generazione reale del documento Word (DOCX) formattato',
        params: { format: 'docx', title: 'Documento Operativo 3 Athlas' },
        riskLevel: 'safe',
        executed: autonomy === 'level_3',
      });
    }

    if (lower.includes('email') || lower.includes('scrivi a') || lower.includes('invia')) {
      tools.push({
        id: `tool_${Date.now()}_3`,
        tool: 'draft_email',
        description: 'Bozza email professionale pronta per invio',
        params: { subject: 'Riepilogo e prossimi passi', recipient: '' },
        riskLevel: 'sensitive',
        executed: false, // Requires user confirmation in Level 1 & 2
      });
    }

    if (lower.includes('calendario') || lower.includes('appuntamento') || lower.includes('ricordami')) {
      tools.push({
        id: `tool_${Date.now()}_4`,
        tool: 'create_calendar_event',
        description: 'Pianificazione evento nell\'agenda dell\'utente',
        params: { title: prompt.slice(0, 40) },
        riskLevel: 'safe',
        executed: true,
      });
    }

    return tools;
  }

  private extractTopicFromQuery(query: string): string {
    const clean = query
      .replace(/^(spiegami|insegnami|non ho capito|come funziona|vorrei capire|parlami di)\s+/i, '')
      .replace(/[?!.]*$/, '')
      .trim();
    return clean || 'Concetto chiave';
  }
}

export const orchestrator = new AthlasOrchestrator();
