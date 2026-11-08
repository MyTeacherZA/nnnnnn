# The Firmament Architecture & Non-Negotiable Guardrail Engine

This document details the production architecture, cognitive psychometrics, selective CAPS curriculum retrieval, and security model implemented in **MyTutorZA**.

---

## 1. The User Profile: The Foundation

Every learner completes a **24-item forced-choice diagnostic** ("This vs. That") based on **The Firmament Framework**. The learner only ever sees the 24 items written for their own grade (Grades 3–12), so the scenarios match their developmental stage. Each of the **8 cognitive dimensions** contributes exactly 3 items, which makes every dimension decisive (3–0 or 2–1) and impossible to tie. Rather than storing vague user settings, this generates a strict, structured JSON data foundation that travels with every AI request:

```json
{
  "studentName": "Lunga Manana",
  "grade": "Grade 9",
  "country": "US",
  "cognitiveScore": "The Analyst-Visual (Air engine, Methodical / Precision-Paced)",
  "processingSpeed": "Methodical / Precision-Paced",
  "retentionProfile": "Visual Retention (high spatial retention; needs visual schematics and diagrams)",
  "scaffoldNeeds": "Provide a step-by-step template and one worked example before asking the learner to continue. …",
  "firmamentRules": [
    "LAW 1: Blindness to Generic Tutoring — Never use generic chat openings or boilerplate textbook regurgitations.",
    "LAW 2: Socratic Zero-Direct-Answer Law — Never solve problems for the student or reveal the final answer.",
    "LAW 3: Cognitive Modality Alignment — Frame all analogies using the student's sensory modality.",
    "LAW 4: Curriculum Grounding — Quote the active state standard, UK specification point or CAPS ATP.",
    "LAW 5: Affective Safety — Respect ego-threat and defensive-presentation poles; never shame an error."
  ],
  "dimensions": {
    "structure": { "score": 2, "poleLabel": "Internal Structural Synthesis" },
    "tempo": { "score": -1, "poleLabel": "Deliberate Precision" },
    "load": { "score": 3, "poleLabel": "High Working Memory Bandwidth" },
    "pathway": { "score": 2, "poleLabel": "Visual-Spatial & Kinesthetic" },
    "efficacy": { "score": 1, "poleLabel": "High Academic Self-Efficacy" },
    "egoThreat": { "score": -2, "poleLabel": "High Ego Threat" },
    "presentation": { "score": -1, "poleLabel": "Defensive Self-Presentation" },
    "helplessness": { "score": 3, "poleLabel": "Persistent Mastery Orientation" }
  },
  "lifePath": {
    "number": 7,
    "archetype": "The Analyst",
    "description": "Learns through deep inquiry, theory and solitary reflection.",
    "strengths": ["Analysis", "Depth", "Pattern recognition"]
  },
  "mercury": {
    "element": "Air",
    "pacingStyle": "Conceptual & Guided Discovery Dialogue",
    "learningRhythm": "Interactive conversational inquiry and conceptual synthesis"
  },
  "cognitiveVector": {
    "primaryModality": "Visual",
    "secondaryModality": "Kinesthetic",
    "analogySet": "weather maps, sports formations, dollar-and-cents charts",
    "reasoningScaffold": "Mental Picture → Spatial Diagram → Mathematical Expression"
  },
  "cognitiveProfileGuide": {
    "title": "Air Mercury — Conceptual Synthesis Engine",
    "learningAbility": "Rapid, associative processing …",
    "digestion": "Conceptual and comparative …",
    "logic": "Formed through dialectic reasoning …",
    "recollection": "Triggered by conceptual keywords and comparative matrices …",
    "retention": "Achieved when information is integrated into an interconnected web …",
    "aiInstruction": "Utilise side-by-side comparative tables and dialectic Socratic questioning …"
  }
}
```

### The 8 Cognitive Dimensions

| # | Dimension | Pole A (+) | Pole B (−) |
|---|-----------|-----------|-----------|
| 1 | Field Independence vs Dependence | Internal structural synthesis | External contextual anchor |
| 2 | Conceptual Tempo | High velocity / trial-and-error | Deliberate precision |
| 3 | Cognitive Load Capacity | High working-memory bandwidth | Micro-chunking / low overload |
| 4 | Perceptual Processing Pathway | Visual-spatial & kinesthetic | Linear syntactic & verbal |
| 5 | Academic Self-Efficacy | High self-efficacy | Guarded self-efficacy |
| 6 | Ego Threat & Academic Vulnerability | Low ego threat | High ego threat |
| 7 | Defensive Self-Presentation | Transparent presentation | Defensive presentation |
| 8 | Learned Helplessness | Persistent mastery orientation | Learned helplessness risk |

Dimension names are **internal only**. The learner never sees a category label — only two competing statements per item.

The **Mercury element** is derived from the dimension vector (with the natal Mercury sign used only as a small tie-breaking prior), and the **Life Path** is derived from the date of birth. The **Cognitive Profile Guide** is looked up from the resulting Mercury element and injected verbatim into the LLM system prompt.

---

## 2. Permanent, Non-Negotiable Guardrail Framework

The core model is **completely blind to generic teaching styles** and **strictly forced to adapt to the active profile**.

### The 5 Laws of the Firmament:

1. **Law 1: Blindness to Generic Teaching**
   - The AI is prohibited from boilerplate greetings (`"Hello! How can I help you today?"`) or generic summaries.
   - It must immediately address the subject matter using the student's archetype and modality.

2. **Law 2: Socratic Zero-Direct-Answer Mandate**
   - Under no circumstances does the model output the final numerical value or solve the problem for the student.
   - It identifies the exact point where understanding broke down (formula choice, sign convention, unit conversion) and asks **one targeted guiding question**.

3. **Law 3: Cognitive Processing & Retention Calibration**
   - **High Processing Speed**: Fast, intellectually rigorous tempo; challenges with higher-order Blooms Level 3 & 4 implications; avoids patronizing padding.
   - **Methodical / Precision-Paced**: Enforces explicit variable labeling, unit verification, and algebraic steps.
   - **Low Retention / Scaffolded Recall**: Embeds spaced retrieval prompts (e.g. asking the student to state what each symbol in the formula represents in their own words).
   - **Sensory Modality**: Visual learners receive coordinate/spatial descriptions; Logical learners receive deductive axioms; Kinesthetic learners receive tactile mechanics.

4. **Law 4: Real-Time Curriculum Grounding (Global)**
   - The active framework is chosen by the learner's country: **US state academic standards** (default), the **UK national curriculum / exam-board specification** (with Scotland, Wales and Northern Ireland variants), or **South African CAPS/DBE** as the fallback.
   - Every response must align with the active framework's standards, command words and mark conventions, and must not mix frameworks.

5. **Law 5: Affective Safety & Regional Authenticity**
   - Ego-threat and defensive-presentation scores control how errors are surfaced: high-threat learners receive private, indirect correction; low-threat learners can handle direct correction.
   - Analogies are region-native: US contexts for US learners, UK contexts for UK learners, and South African contexts (Eskom, taxi math, Soweto Derby) only for ZA learners.
   - Tutoring language is whatever the learner selected.

---

## 3. Selective Curriculum Retrieval (2-Million Token Memory Box)

Instead of dumping 450 PDFs (~30,000,000 tokens) into the context window:

1. **Precision Extraction**: When a student selects **Grade 10 Physical Sciences** and asks a question, `getSelectiveCapsCurriculumContext('Physical Sciences', 'Grade 10', query)` retrieves only:
   - The Grade 10 Physics/Chemistry CAPS Annual Teaching Plan (Term 1 to Term 4 sequence).
   - Official DBE Examination Guidelines & mark allocation principles (Formula: 1 mark, Substitution: 1 mark, Final answer with SI unit: 1 mark).
   - Verbatim definitions required by DBE memoranda for full marks.
   - Chief Examiner Trap Warnings compiled from National Senior Certificate (NSC) marker reports.
   - Approved textbook alignment (Siyavula, Mind the Gap, Platinum).

2. **Active Memory Injection**: This dense document block (~2,000 to 8,000 tokens) is dropped directly into Gemini's `systemInstruction` for that session.
   - Because Gemini reads directly from raw DBE CAPS documents in real-time, **hallucination of the syllabus is eliminated**.

---

## 4. Google Cloud Run & Security Architecture

### Secrets & API Key Protection:
- **Server-Side Isolation**: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_JWT_SECRET` reside strictly in environment variables / `.env` on Google Cloud Run.
- **Frontend Blindness**: The browser never sees or handles API keys. All client operations call backend routes (`/api/tutoring/chat`, `/api/tutoring/analyze-spark-notes`, `/api/spark-notes/sync`).

### User Data Isolation & Row-Level Security (RLS):
- Frontend communicates with Cloud Run backend via authenticated JWT or session tokens.
- Backend passes user credentials to Supabase where Row-Level Security (`auth.uid() = user_id`) isolates data at the database layer.
- Learner A cannot access Learner B's quiz results, study roadmap, or spark notes.
