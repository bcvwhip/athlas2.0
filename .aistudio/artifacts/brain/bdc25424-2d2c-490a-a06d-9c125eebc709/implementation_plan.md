# 3 ATHLAS — Le 5 Super Abilità & Athlas Orchestrator

Trasformazione architetturale ed esperienziale di **3 ATHLAS** da assistente conversazionale a piattaforma cognitiva d'azione universale fondata su 5 Super Abilità integrate (**ATHLAS MIND**, **ATHLAS DO**, **ATHLAS MIRROR**, **ATHLAS LEARN**, **ATHLAS WORLD**), coordinate da un Orchestratore Unificato con 3 livelli di autonomia, adattamento empatico dell'interfaccia e voce in tempo reale.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Decisioni convalidate in Fase 1 e allineamenti architetturali per la realizzazione immediata:

- **ATHLAS MIRROR (Visione in tempo reale)**: Convalidato supporto a cattura schermo live (`getDisplayMedia`), streaming webcam (`getUserMedia` video), e analisi istantanea di foto/documenti. Diagnosi visiva strutturata: identificazione di cosa guarda l'utente, localizzazione del problema, causa radice e guida operativa passo-passo.
- **Livello di Autonomia Predefinito**: Livello 2 (**Assistenza & Proposta**) attivo per default. 3 Athlas formula e struttura la comprensione e il piano operativo (DO/WORLD), e richiede l'approvazione esplicita prima di innescare azioni nel sistema (download, generazione file, modifiche, automazioni esterne o chiamate critiche). L'utente può commutare liberamente tra Livello 1 (Solo Consiglio) e Livello 3 (Autonomia con conferma su sole azioni critiche).
- **Adattamento del Profilo (Persona)**: Rilevamento automatico dal contesto d'uso con selettore rapido in testata (Bambino, Ragazzo, Adulto, Professionista, Persona Anziana), con adattamento visivo di complessità del linguaggio, dimensione dei controlli, scaffolding cognitivo e modalità vocale.
- **Preservazione dell'Ecosistema Esistente**: Conservazione di tutte le funzioni esistenti (motori Mistral, Gemini Vision/GenAI server-side, generazione reale di documenti DOCX/XLSX/PPTX/PDF/CSV, ImageCore Diffusion/FLUX, persistenza database locale e sintesi vocale neurale).

---

## 1. Overview & Core Concept

3 ATHLAS supera il paradigma del chatbot reattivo ("domanda $\rightarrow$ testo") introducendo un cervello proattivo che comprende chi è l'utente, dove si trova, cosa vuole raggiungere e coordina gli strumenti digitali e visivi necessari per arrivarci.

### Le 5 Super Abilità

1. **ATHLAS MIND (Memoria & Contesto Cognitivo)**
   - Mantiene una mappa vivente degli obiettivi, abitudini, vincoli e stato corrente dell'utente (progetti in corso, scadenze, preferenze espresse).
   - Gestore memoria trasparente: l'utente visualizza, modifica o elimina qualsiasi elemento memorizzato con 1 clic ("Cosa sa Athlas di me").
   - Quando l'utente dice *"Non so cosa fare"*, Mind incrocia impegni, abitudini, file recenti e stato d'animo per proporre priorità concrete e mirate.

2. **ATHLAS DO (Action & Planning Engine)**
   - Trasforma qualsiasi intenzione ad alto livello (*"Voglio organizzare il mio viaggio"*, *"Devo prepararmi all'esame"*) nella catena:
     $$\text{INTENZIONE} \rightarrow \text{COMPRENSIONE} \rightarrow \text{PIANO} \rightarrow \text{RICERCA} \rightarrow \text{AZIONI} \rightarrow \text{VERIFICA} \rightarrow \text{RISULTATO}$$
   - Mostra una checklist interattiva dinamica con stato di avanzamento per ogni fase, verifiche di coerenza e nodi di autorizzazione.

3. **ATHLAS MIRROR (Assistente Visivo & Screen Companion)**
   - Analisi multimodale in streaming (schermo, webcam, screenshot o file caricati).
   - Risponde alla domanda fondamentale: *"Cosa sta cercando di ottenere questa persona?"*.
   - Rileva errori software, interfacce complesse, moduli contabili o schermate di codice, evidenziando il problema e guidando l'utente passo-passo.

4. **ATHLAS LEARN (Pedagogia & Maestria Adattiva)**
   - Profila lo stile di apprendimento (visivo, analogico, deduttivo, pratico).
   - Se l'utente non comprende un concetto, non ripete la stessa frase: cambia attivamente paradigma (Spiegazione logica $\rightarrow$ Metafora della vita quotidiana $\rightarrow$ Esempio visivo/schematico $\rightarrow$ Mini-sfida interattiva verificata).

5. **ATHLAS WORLD (Ponte Digitale-Reale & Coordinamento Strumenti)**
   - Decide autonomamente e coordina: ricerca web, manipolazione documenti, calendario locale/eventi, email draft, generazione immagini, calcoli tabellari e comandi del browser.
   - L'utente non deve sapere quale strumento chiamare: dice *"Fai questo"*, e World orchestra la catena di esecuzione.

---

## 2. User Experience & Visual Design

### Homepage "Minimal Core"
L'interfaccia centrale accoglie l'utente con una presenza essenziale ed elegante (sfondo scuro profondo `#0A0A0A`, accenti ciano/ambra raffinati, tipografia *Plus Jakarta Sans* e *JetBrains Mono*):

- **Domanda Guida Centrale**: *"Cosa vuoi fare?"*
- **4 Porte d'Azione Primarie**:
  - 🎤 **Parla** (Attivazione vocale istantanea, supporto wake word *"Hey 3 Athlas"*)
  - ⌨️ **Scrivi** (Composer intelligente con suggerimenti proattivi)
  - 📷 **Mostra** (Athlas Mirror: Condividi schermo, avvia camera o incolla screenshot)
  - 📄 **Carica** (Trascina documenti, fogli di calcolo, presentazioni o codice)
- **Top Bar Contract**:
  - *Zone 1*: Wordmark `3 ATHLAS` con indicatore di autonomia (`Livello 2 · Assistenza`)
  - *Zone 2*: Navigazione rapida contestuale (`Studio`, `Attività`, `Memoria Mind`, `Mirror Live`)
  - *Zone 3*: Selettore Persona (Bambino · Ragazzo · Adulto · Professionista · Anziano) e Profilo

### Visualizzazione del Flusso Orchestrato
Quando una richiesta viene elaborata, l'interfaccia non si limita a stampare testo, ma rivela il quadro cognitivo di Athlas:
- **Card di Comprensione & Intenzione** (Cosa ho capito)
- **Piano d'Azione DO** (Fasi operative con checkbox interattive)
- **Nodi di Approvazione Sicura** (Pulsanti chiari *"Conferma ed Esegui"* o *"Modifica Piano"*)
- **Schede di Risultato Reale** (Download file generati, report visivi, eventi calendario pronti)

---

## 3. Key Product Decisions & Trade-Offs

- **Decisione 1: Orchestratore Unico vs Moduli Separati**
  - *Scelta*: Un unico orchestratore neurale (`AthlasOrchestrator`) analizza ogni input (testo, voce, schermo, file) e determina quali delle 5 abilità attivare simultaneamente.
  - *Motivazione*: L'utente non deve scegliere tra "modalità planner" o "modalità visione": dice semplicemente ciò che desidera e Athlas aggrega Mind, Do, Mirror, Learn e World in una sola risposta coerente.

- **Decisione 2: Livelli di Autonomia e Safety Gate**
  - *Scelta*: Livello 2 come standard predefinito con categorizzazione automatica del rischio per ogni azione (`safe`, `sensitive`, `critical`).
  - *Motivazione*: Garantisce totale trasparenza e fiducia, impedendo operazioni irreversibili senza il consenso esplicito dell'utente.

- **Decisione 3: Privacy & Gestione Memoria di Athlas Mind**
  - *Scelta*: Memoria contestuale archiviata localmente in `data/db.json` con pannello utente per visualizzare ogni fatto appreso, raggruppato per categoria (Obiettivi, Vincoli, Preferenze, Attività), con pulsanti di eliminazione immediata o disattivazione temporanea ("Modalità Incognito").

---

## 4. Technical Architecture & Data Strategy

### Diagramma del Sistema Cognitivo

```
┌────────────────────────────────────────────────────────────────────────┐
│                        INTERFACCIA UTENTE (React 19)                    │
│  [🎤 Parla]      [⌨️ Scrivi]      [📷 Mostra (Mirror)]    [📄 Carica]    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      ATHLAS COGNITIVE ORCHESTRATOR                      │
│                                                                        │
│  1. Intent & Emotion Classifier  ◄── Context & Persona Adapter        │
│  2. Pipeline Router:                                                   │
│     ├── 🧠 ATHLAS MIND    (Recupero memoria, obiettivi, profilo)       │
│     ├── ⚡ ATHLAS DO      (Decomposizione piano, fasi, checklist)     │
│     ├── 👁️ ATHLAS MIRROR  (Analisi frame schermo/camera/file)         │
│     ├── 🎓 ATHLAS LEARN   (Diagnosi comprensione, strategie pedagogiche)│
│     └── 🌎 ATHLAS WORLD   (Strumenti: Ricerca, File, Docs, Immagini)   │
│                                                                        │
│  3. Safety & Autonomy Gate (Livello 1 / 2 / 3 Check)                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND ENGINE (server.ts)                      │
│  • /api/orchestrator/dispatch    • /api/mirror/analyze                 │
│  • /api/mind/profile & memory    • /api/do/execute-step                │
│  • /api/learn/adapt-lesson       • /api/world/tool-call                │
│  • Mistral AI Streaming          • Google GenAI Multimodal (Gemini)    │
│  • FileEngine (DOCX, XLSX, PPTX) • ImageCore Diffusion Engine          │
│  • Persistent Local Storage (db.json)                                  │
└────────────────────────────────────────────────────────────────────────┘
```

### Struttura Dati & Modello della Memoria
- `MindMemoryItem`: `{ id, category: 'goal' | 'preference' | 'constraint' | 'fact' | 'schedule', key, value, confidence, createdAt, updatedTimestamp }`
- `DoPlan`: `{ id, goal, steps: Array<{ id, title, description, ability: 'mind'|'do'|'mirror'|'learn'|'world', status: 'pending'|'in_progress'|'completed'|'needs_confirmation', isCritical: boolean, result?: any }> }`
- `MirrorSession`: `{ mode: 'screen' | 'camera' | 'snapshot', active: boolean, diagnosis?: { userIntent, detectedProblem, rootCause, suggestedSteps } }`
- `LearnProgress`: `{ topic, currentStrategy: 'deductive' | 'analogy' | 'visual' | 'interactive', difficultyLevel: 1..5, masteryScore: 0..100, attempts: number }`
- `PersonaProfile`: `{ id: 'child' | 'teen' | 'adult' | 'pro' | 'senior', tone, visualScale, explanationDepth, defaultAutonomy }`

---

## Piano di Esecuzione & Fasi di Lavoro

1. **Fase 1: Core Engine & Modelli Tipizzati**
   - Definizione dei tipi TypeScript in `src/types.ts` per Mind, Do, Mirror, Learn, World, Autonomia e Persona.
   - Creazione del database schema e metodi in `src/server/db.ts` per persistenza di memoria, piani DO, progressi pedagogici e preferenze.

2. **Fase 2: Backend Orchestrator & API Endpoints**
   - Implementazione di `src/server/orchestrator.ts` con classificazione integrata delle intenzioni, coordinamento delle 5 abilità e gestione dei safety gates.
   - Endpoints per Mirror (analisi visione multimodale con Gemini/Mistral), Mind (CRUD memoria contestuale), Do (generazione ed esecuzione piani), Learn (cambio strategia pedagogica) e World (orchestrazione tool integrati).

3. **Fase 3: Frontend Experience & Componenti Rivoluzionari**
   - Homepage minimale e potente con i 4 trigger (`Parla`, `Scrivi`, `Mostra`, `Carica`).
   - Componente `AthlasMirrorModal` per cattura schermo live e webcam con overlay di diagnosi e guida operativa.
   - Componente `AthlasDoPlanView` per visualizzazione interattiva dei passaggi e conferme di sicurezza.
   - Componente `AthlasMindDrawer` per controllo completo e trasparente della memoria.
   - Componente `AthlasLearnCard` per lezioni adattive ed esercizi interattivi con feedback immediato.
   - Selettore e switcher fluido per Persona (Bambino, Ragazzo, Adulto, Professionista, Anziano).

4. **Fase 4: Integrazione Vocale & Wake Word**
   - Collegamento della frase *"Hey 3 Athlas"* all'Orchestratore per attivare le abilità senza toccare lo schermo.

5. **Fase 5: Validazione, Linting & Build**
   - Esecuzione di `lint_applet` e `compile_applet` per garantire zero regressioni e build pulito.
