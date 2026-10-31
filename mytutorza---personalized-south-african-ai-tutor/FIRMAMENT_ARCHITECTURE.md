# The Firmament Architecture & Non-Negotiable Guardrail Engine

This document details the production architecture, cognitive psychometrics, selective CAPS curriculum retrieval, and security model implemented in **MyTutorZA**.

---

## 1. The User Profile: The Foundation

Every learner completes a 16-question psychometric onboarding quiz based on **The Firmament Framework**. Rather than storing vague user settings, this generates a strict, structured JSON data foundation that travels with every AI request:

```json
{
  "studentName": "Lunga Manana",
  "cognitiveScore": "The Architect-Logical-Rule (High Processing Speed, Axiomatic Retention)",
  "processingSpeed": "High Processing Speed",
  "retentionProfile": "Axiomatic Retention (High conceptual retention with formal rule adherence)",
  "scaffoldNeeds": "Needs scaffolded Socratic guidance: explicit prerequisite checks, step-by-step discovery, and zero direct answer disclosure.",
  "firmamentRules": [
    "LAW 1: Blindness to Generic Tutoring — Never use generic chat openings or boilerplate textbook regurgitations.",
    "LAW 2: Socratic Zero-Direct-Answer Law — Never solve problems for the student or reveal the final answer.",
    "LAW 3: Cognitive Modality Alignment — Frame all analogies using the student's sensory modality.",
    "LAW 4: Real-Time CAPS DBE Syllabus Grounding — Quote exact DBE Annual Teaching Plan milestones.",
    "LAW 5: Cultural & Linguistic Resonance — Native South African analogies and 11 official languages."
  ],
  "lifePath": {
    "number": 7,
    "archetype": "The Architect",
    "description": "Driven by analytical inquiry and structural mastery.",
    "strengths": ["Conceptual clarity", "Goal orientation", "Adaptive problem-solving"]
  },
  "mercuryEngine": {
    "element": "Air",
    "pacingStyle": "Conceptual & Socratic Dialogue",
    "learningRhythm": "Interactive conversational inquiry and conceptual synthesis"
  },
  "cognitiveVector": {
    "primaryModality": "Logical-Rule",
    "secondaryModality": "Visual",
    "southAfricanAnalogySet": "Gautrain ticketing systems, Eskom circuits, Drakensberg gradients",
    "reasoningScaffold": "Deductive Axiom → Intermediate Substitution → Final Statement with DBE Reason"
  }
}
```

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

4. **Law 4: Real-Time DBE CAPS Document Grounding**
   - All responses must align with official Department of Basic Education Annual Teaching Plans (ATPs) and chief marker examination conventions.

5. **Law 5: Cultural & Linguistic Authenticity**
   - Native support for all 11 official South African languages, paired with culturally authentic analogies (Eskom power grid, taxi math, Soweto Derby strategies).

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
