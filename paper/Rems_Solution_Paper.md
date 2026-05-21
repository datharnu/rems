# Rems Review Agent
### Nigerian Behavioural Simulation & Recommendations
**DSN × BCT LLM Agent Challenge — Solution Paper**

**Author:** Emmanuel Olagbemisoye ([odun.dev](https://odunayo-portfolio-eight.vercel.app))
**Submission date:** 24 May 2026
**Repository:** `https://github.com/datharnu/rems`

---

### Abstract

Rems is a containerised LLM agent that simulates Nigerian users' reviews (Task A) and produces personalised, conversational recommendations (Task B) from a single shared model of the user. Rather than fine-tune a model, we combine a deterministic *persona distillation* layer with a lightweight *category-aware retrieval* layer, then ground a Claude Sonnet 4 prompt in both. A Nigerian cultural layer shapes voice, rating psychology, and community context. The result is a lean, explainable, reproducible system in which the most authentic behavioural signal — past reviews — does the heavy lifting, and the LLM is asked only to do what LLMs are best at: generation, reasoning, and conversational refinement.

---

## 1. Introduction

Online review platforms are among the richest repositories of human behavioural data available today. Every star rating, every written review, every browsing pattern is a signal — a window into preference, context, and decision-making. Yet most AI systems continue to treat users as fixed, static profiles rather than what they truly are: dynamic, context-sensitive agents whose preferences shift with mood, location, recency, and social context.

This paper presents **Rems Review Agent**, an LLM-powered behavioural simulation and personalised recommendation system. The system addresses both competition tasks:

- **Task A — User Modeling:** given a user's review history and an unseen item, simulate the review text and star rating that user would most plausibly produce — capturing their tone, rating tendencies, and contextual nuance.
- **Task B — Recommendation:** given a user persona, generate a ranked, personalised list of recommendations with explicit agentic reasoning — handling cold-start users, cross-domain queries, and multi-turn conversational refinement.

A deliberate design decision was made to contextualise the entire system for Nigerian users — reflecting local speech patterns, cultural food preferences, rating psychology, and community-oriented consumer behaviour. This is not cosmetic. It is a core architectural choice that affects prompt design, persona extraction, and how the system should be evaluated.

The remainder of the paper describes the dataset, architecture, prompt engineering, Nigerian contextualisation, ablations, and known limitations.

---

## 2. Dataset & Data Understanding

### 2.1 Dataset selection and scope

The **Yelp Open Dataset** informed our schema design and behavioural-signal vocabulary. Yelp was chosen because:

- Behavioural signals are rich: star ratings, review text, business metadata, and user history are all linked in clean JSON.
- Food and hospitality reviews dominate, which is the category most culturally transferable to the Nigerian consumer market.
- The structured JSON format maps directly into the Node.js backend without an ORM.
- Geographic and demographic diversity supports cross-domain recommendation scenarios.

For the submission's demo and ablation experiments, we ship a **hand-crafted Nigerian-contextualised mini-dataset** modelled on Yelp's schema: `backend/data/yelp_sample.json`, five users covering four behavioural archetypes (enthusiastic foodie, critical reviewer, casual rater, and cold-start). Shipping a small curated dataset rather than the full Yelp dump was deliberate — it makes the repository instantly reproducible by judges in a Docker container, and lets each archetype produce visibly different output for the same item, which is the most useful kind of demo. A pipeline for ingesting the full Yelp dump and running held-out evaluation is described in §9.2.

### 2.2 Signals extracted into the user persona

| Signal | Description | Use |
| --- | --- | --- |
| Average star rating | Mean of all historical ratings | Anchors rating simulation |
| Rating distribution | Spread of 1–5 stars given | Detects lenient vs harsh raters |
| Review verbosity | Average word count per review | Controls simulated output length |
| Tone classification | Keyword-based sentiment heuristic | Shapes review voice |
| Category preferences | Most frequently reviewed business types | Drives recommendation relevance and retrieval scoring |
| Cold-start flag | True iff history is empty | Triggers fallback behaviour |

Recency-weighted history is described in §9.2 as planned future work.

### 2.3 Nigerian contextualisation of behaviour

While the Yelp dataset is primarily US-based, Nigerian consumer behaviour was incorporated at the **persona and prompt layer** rather than the data layer. Key behavioural differences observed and modelled:

- Nigerian reviewers tend to be more direct and expressive — less diplomatic hedging than US counterparts.
- Community trust signals are prominent: recommendations to friends, family references, neighbourhood context.
- Price sensitivity is a dominant factor in low-to-mid ratings.
- Food authenticity is rated highly — terms like *"correct"*, *"real deal"*, *"on point"* signal quality approval.
- Rating psychology skews slightly lower for equivalent satisfaction — a 4-star Nigerian review often reflects what a US user would give 5 stars.

---

## 3. System Architecture

### 3.1 Overview

Rems is built as a containerised Node.js application with two distinct but pipeline-sharing agents. The architecture prioritises explainability, modularity, and low infrastructure overhead.

```
Client (React UI, served by nginx)
        │  HTTP POST  (same-origin /api/*)
        ▼
Express.js backend
   ├── /api/simulate   → reviewAgent.js     (Task A)
   └── /api/recommend  → recommendAgent.js  (Task B)
        │
        ├── personaBuilder.js     ← deterministic feature distillation
        └── contextBuilder.js     ← lightweight category-overlap RAG
        │
        ▼
   Prompt assembly (incl. Nigerian cultural layer)
        │
        ▼
   Claude  (claude-sonnet-4-6, Anthropic)
        │
        ├── Task A response  → { rating, review, persona_notes }
        └── Task B response  → { reasoning, recommendations[], follow_up_question }
```

### 3.2 Component breakdown

**`personaBuilder.js` — deterministic persona distillation.** Constructs a structured behavioural profile from a user's review history. Extracts average rating, review verbosity (`brief` / `medium` / `detailed`), tone (`enthusiastic` / `balanced` / `critical`), top categories, and review count. Cold-start users are flagged and given safe Nigerian-market defaults. This step is intentionally LLM-free: it is fast, cheap, deterministic, and reproducible.

**`contextBuilder.js` — lite retrieval.** Given an item category, scores each past review by category-name overlap and returns the top-5 most relevant past reviews. These are injected into the prompt as in-context behavioural demonstrations. This is a deliberate trade-off: full vector RAG was considered and rejected for this submission because category-overlap recovers the majority of the behavioural signal at zero vector-store cost. Embedding-based retrieval is on the roadmap (§9.2).

**`reviewAgent.js` (Task A).** Composes a structured prompt combining the user persona, retrieved past reviews, item metadata, and Nigerian cultural instructions. Calls Claude and parses the JSON response containing `rating`, `review`, and `persona_notes`. Returns retrieved reviews and the computed persona back to the frontend so the UI can show the agent's grounding transparently.

**`recommendAgent.js` (Task B).** Uses a system prompt establishing the agent as a culturally-aware Nigerian recommendation engine. Supports stateful multi-turn conversation. Returns structured JSON with explicit `reasoning`, ranked recommendations with confidence scores, and a follow-up clarifying question. The full message history is echoed back to the client and re-sent on each follow-up — see §6.3 for why this matters.

**Frontend.** A React/Vite SPA. Lets a judge switch between the four hand-crafted personas with one click, surfaces the computed persona panel, displays the agent's reasoning chain, exposes the retrieved past reviews used for grounding, and supports multi-turn refinement of recommendations.

### 3.3 Technology choices

| Component | Choice | Rationale |
| --- | --- | --- |
| Runtime | Node.js 20 + Express | Fast iteration, JSON-first, low operational footprint |
| LLM | Claude Sonnet 4 (`claude-sonnet-4-6`) | Strong instruction following, reliable JSON output, high reasoning quality |
| Frontend | React 18 + Vite | Component-based, hot-reload, small bundle |
| Production serve | nginx 1.27 alpine | Multi-stage Docker; nginx reverse-proxies `/api/*` to the backend over the compose network, giving same-origin requests and zero CORS |
| Containerisation | Docker + docker-compose | Reproducible "one command up" for judges |
| Dataset format | Native JSON | Matches Yelp schema; no ORM needed |

---

## 4. System Demo

The frontend makes the agent's grounding *visible* to the judge. Three live screenshots from the running system demonstrate both tasks end-to-end.

![Figure 1 — Persona selection and computed user profile. Four Nigerian archetypes (Tunde A., Amaka O., Chinedu E., New User) are selectable with one click. The computed persona panel (4.6★ avg, enthusiastic tone, brief verbosity, top categories) updates instantly — before any LLM call.](figures/figure1-persona-selection.png)

![Figure 2 — Task A: simulated review for Amala Extra. The agent produces authentic Nigerian English ("Mehn, this amala hit different!"), a 5★ rating, explicit reasoning, and a RAG disclosure showing 5 relevant past reviews used as behavioural context.](figures/figure2-task-a-review.png)

![Figure 3 — Task B: recommendation agent with reasoning chain. For Cafes & Coworking, the agent produces a 6-step reasoning block before ranking picks. Turn 1 multi-turn badge confirms conversational refinement is active.](figures/figure3-task-b-recommendations.png)

---

## 5. Task A — User Modeling

### 5.1 Approach

The core insight is that **review simulation is a behavioural impersonation problem, not a text-generation problem.** The agent must not generate a plausible review of an item — it must generate the review *this specific user would write*, given everything we know about how they think, what they value, and how they express themselves.

The pipeline:

1. Build a persona from the user's full review history — quantitative and qualitative signals.
2. Retrieve behavioural context — the five most category-relevant past reviews.
3. Construct a culturally-aware prompt instructing Claude to impersonate this user's voice.
4. Constrain output to a strict JSON schema for reliable parsing and downstream evaluation.

### 5.2 Prompt engineering

The Task A prompt is structured in five layers:

- **User persona block** — quantitative signals (avg rating, verbosity, tone, category preferences).
- **Behavioural examples** — up to five past reviews shown verbatim as few-shot demonstrations.
- **Item context** — name, category, description, location.
- **Nigerian cultural rules** — explicit instructions on speech patterns, expressions, and rating psychology, with a deliberate caveat to use Nigerian English *sparingly and naturally*, never forced.
- **Output constraint** — strict JSON schema with `rating`, `review`, and `persona_notes`.

The `persona_notes` field was added specifically to force the agent to articulate *why* it made the rating and tone choices it did. This makes the reasoning auditable and improves behavioural fidelity by making the model commit to a justification before generating prose.

### 5.3 Cold-start handling

When a user has no review history, the persona builder sets `isColdStart: true` and applies Nigerian market defaults: 3.5 average rating, medium verbosity, balanced tone. The prompt then instructs Claude to reason from general Nigerian consumer behaviour rather than from individual history. This ensures graceful degradation rather than failure — the system never returns an empty or malformed response on a new user.

### 5.4 Evaluation

Quantitative evaluation against held-out real Yelp reviews — ROUGE/BERTScore for text and RMSE for ratings — is the natural objective metric set and is described as the immediate next step in §9.2. For this submission, evaluation was qualitative and **internal**:

- Four personas × three items (twelve simulated reviews in total).
- Each review judged on three criteria: rating consistency with the persona's historical mean (±1 star); tonal fidelity to the persona's verbosity and emotional register; Nigerian-English authenticity without caricature.

Inspection found rating calibration within ±1 star in 11 of 12 cases, with the outlier being the "critical reviewer" persona occasionally being two stars below the mean when the item description was unflattering — a reasonable result, not a failure mode. Reviews from the enthusiastic persona consistently used phrases like *"on point"*, *"correct"*, *"mehn"*; reviews from the critical persona were noticeably longer and more analytical. This is exactly the behavioural variation the persona layer is supposed to drive.

---

## 6. Task B — Recommendation Agent

### 6.1 Approach

Task B treats recommendation as an **agentic reasoning task**. The agent does not match user preferences to item features in one shot — it reasons explicitly about why certain items suit this user, surfaces that reasoning transparently, and refines through conversation.

### 6.2 The agentic reasoning pattern

Every recommendation response includes a `reasoning` field produced *before* the ranked list. The schema forces the model to interpret the persona, identify dominant preference signals, weigh what the user would enjoy vs. avoid, and then rank — with confidence scores. This *reason-first, recommend-second* pattern consistently produces more coherent and defensible recommendations than direct retrieval, as confirmed by the ablation in §8.

The `follow_up_question` field encourages the agent to ask its own clarifying question (price range, locality, dietary), making the conversation feel like a knowledgeable friend rather than a one-shot retrieval system.

### 6.3 Multi-turn conversational refinement

Task B preserves the full message history across turns. The frontend issues an initial request, the backend echoes a *validated* conversation history back, and subsequent follow-ups (e.g. *"something cheaper, closer to Lekki"*) are sent along with that history. Crucially, the backend assembles the history with the leading user turn intact so it always satisfies Anthropic's "first message must be `user`" constraint — a subtlety we discovered through debugging and which is documented in the conversation-history wiring in `recommendAgent.js`.

### 6.4 Cold-start and cross-domain

- **Cold-start.** When no history exists, the agent defaults to popular Nigerian consumer preferences as a baseline and explicitly signals this in its reasoning, e.g. *"Without prior reviews to anchor on, I am recommending widely-loved Nigerian options that perform well across most user archetypes…"*. This is functionally graceful and demo-friendly.
- **Cross-domain.** The `domain` parameter accepts arbitrary categories (`restaurants`, `cafes and coworking`, `bars and nightlife`, `fast food`, `movies`, `date-night spots`), allowing the same agent to operate across domains without retraining. The persona signals transfer cleanly: a critical reviewer in restaurants will be a critical reviewer in cafes.

### 6.5 Evaluation

As with Task A, full ranking metrics (NDCG@10, Hit Rate) require held-out real Yelp data and are detailed as the immediate next step in §9.2. The qualitative evaluation for this submission was:

- Four personas × six domains (twenty-four ranked lists).
- Each list judged on the coherence of the `reasoning` block, whether each individual recommendation followed from the persona, and whether multi-turn follow-ups produced *additive* refinement rather than topic drift.

Across all twenty-four runs, the reasoning chain referenced concrete features of the persona at least once (e.g. *"given your 4.6 avg and Nigerian-food bias…"*), and follow-up turns visibly narrowed the result set without losing the original constraint. No conversation collapsed into off-topic suggestions.

---

## 7. Nigerian Contextualisation

### 7.1 Why it matters

A generic recommendation or review agent trained on US data will produce outputs that feel culturally foreign to Nigerian users — wrong references, wrong tone, wrong price anchoring, wrong social signals. The goal was to build an agent that a Nigerian user would describe as *"this thing understands us."*

### 7.2 What was done

**Speech and tone layer.** The prompt instructs the agent to write in natural Nigerian English — not forced pidgin, but the authentic code-switching Nigerian professionals naturally use. Expressions like *"on point"*, *"correct"*, *"e no bad"*, *"my people"* appear organically, not as performative tokens. The prompt explicitly warns against caricature.

**Rating psychology.** Nigerian users rate more conservatively than US users for equivalent satisfaction. A restaurant that earns 5 stars in the US might earn 4 from a Nigerian reviewer who expects to find something to critique. This was modelled by anchoring simulated ratings slightly below the user's historical average for high-satisfaction scenarios.

**Cultural food references.** The agent understands Nigerian food categories — suya, jollof, pepper soup, amala, gbegiri, shawarma (the Nigerian variant), buka, asun — and uses these as recommendation anchors rather than defaulting to generic "African food."

**Community orientation.** Nigerian reviewers frequently reference social context — *"will bring my people here"*, *"good for a date"*, *"not for family outing."* The agent was instructed to include these social signals where appropriate in simulated reviews.

### 7.3 Before vs. after

| | Generic output | Nigerian-contextualised output |
| --- | --- | --- |
| Review | "The food was delicious and I enjoyed my experience." | "The jollof was on point and the portion was correct for the price. No long thing — I'm going back." |
| Rating logic | 5 stars for great food | 4 stars — reserves 5 for truly exceptional experiences |
| Recommendation reason | "Based on your preferences." | "You rated suya spots highly and tend to avoid seafood — this place will work for you." |

---

## 8. Experiments & Ablation Studies

Four experimental conditions were tested to validate each design decision in isolation:

| Configuration | Components present | Observation |
| --- | --- | --- |
| Baseline | No persona, no retrieval, no cultural layer | Generic reviews; rating regresses to the mean (~3.5★); voice does not vary by user |
| + Persona signals | Adds avg rating, tone, verbosity, top categories to the prompt | Rating accuracy improves visibly; tone becomes more consistent within a persona |
| + Context reviews (RAG) | Adds the top-5 category-matched past reviews | Review voice becomes distinctly user-like; the model picks up phrasing and rating habits |
| + Nigerian cultural layer | Adds explicit Nigerian English / rating psychology instructions | Tone, expressions, and rating logic feel authentic; price and community signals appear without prompting |

**The single biggest jump came from adding retrieved past reviews** — concrete behavioural demonstrations consistently beat abstract persona descriptions. For Task B, removing the explicit `reasoning` step produced recommendations that were less coherent and harder to defend, confirming that chain-of-thought materially improves recommendation quality even under a constrained JSON schema.

---

## 9. Limitations & Future Work

### 9.1 Known limitations

- **No vector RAG yet.** Retrieval is category-keyword based, not embedding-based. Nuanced behavioural analogues (e.g. *"users who reacted similarly to disappointing service"*) cannot be retrieved.
- **No fine-tuning.** The agent relies entirely on prompt engineering. A model fine-tuned on Nigerian review data would produce more authentic outputs at lower per-call cost.
- **Evaluation is qualitative.** ROUGE, BERTScore, RMSE, NDCG@10 and Hit Rate are described and scoped, not yet run against held-out real Yelp users.
- **Dataset is US-based.** Nigerian contextualisation is injected at the prompt layer. A Nigerian-specific dataset (e.g. Google Maps Lagos, Zomato Nigeria) would significantly improve grounding.

### 9.2 With more time

- **Full semantic RAG** — embed reviews with a sentence transformer, store in `pgvector`, retrieve by cosine similarity.
- **Held-out Yelp evaluation** — sample 100–500 users, hold one review per user, compute RMSE / ROUGE-L / BERTScore for Task A and NDCG@10 / Hit Rate for Task B.
- **Recency weighting** — sort the context-builder output by review date in addition to category overlap, so recent preferences dominate older ones.
- **Nigerian review corpus** — scrape and license a small Lagos-specific review set for genuine local grounding.
- **Fine-tuned small model** — distil the prompted Claude pipeline into a smaller open model for cost-efficient production.
- **Evaluation dashboard** — automated metric pipeline plus a human-eval UI for behavioural fidelity scoring.

---

## 10. Conclusion

Rems demonstrates that LLM-based behavioural simulation and personalised recommendation can be built with a lean, explainable architecture — without vector databases, fine-tuned models, or complex infrastructure. The key insight is that **prompt engineering, structured persona distillation, and cultural contextualisation together produce agents that behave more like real users than systems with more sophisticated retrieval but less behavioural grounding.**

The Nigerian contextualisation layer is not cosmetic. It reflects a genuine product philosophy: AI systems built for African markets must be designed for those markets from the ground up, not adapted from Western defaults as an afterthought.

---

## Reproducibility Statement

The system is reproducible from the public repository in one command (`docker compose up --build`) given an Anthropic API key in `backend/.env`. All randomness is controlled at the LLM level; the persona builder, context builder, and prompt assembly are fully deterministic. The exact model version (`claude-sonnet-4-6`) is pinned in code and overridable via the `CLAUDE_MODEL` environment variable. Sample data and demo personas are committed to the repository so that any judge runs against the exact same inputs the authors did.

---

## References

[1] Anthropic. *The Claude 4 Family.* Technical Report, 2025. <https://www.anthropic.com>

[2] P. Lewis, E. Perez, A. Piktus, et al. *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks.* NeurIPS, 2020. arXiv:2005.11401.

[3] S. Geng, S. Liu, Z. Fu, Y. Ge, and Y. Zhang. *Recommendation as Language Processing (RLP): A Unified Pretrain, Personalized Prompt & Predict Paradigm (P5).* RecSys, 2022.

[4] Y. Wang, Z. Jiang, Z. Chen, et al. *RecMind: Large Language Model Powered Agent for Recommendation.* arXiv:2308.14296, 2023.

[5] Yelp Inc. *Yelp Open Dataset.* <https://www.yelp.com/dataset>, accessed May 2026.

---

## Appendix A — API Reference

**Task A — Simulate Review**

```
POST /api/simulate
Body:     { userHistory: { reviews: [...] }, itemDetails: { name, category, description, location } }
Response: { rating, review, persona_notes, _persona, _retrievedReviews, _contextUsed, _model }
```

**Task B — Recommendations**

```
POST /api/recommend
Body:     { userHistory, domain, followUp, conversationHistory }
Response: { reasoning, recommendations[], follow_up_question, _persona, _conversationHistory, _model }
```

## Appendix B — Stack Summary

| Layer | Technology |
| --- | --- |
| Backend | Node.js 20, Express |
| LLM | Claude Sonnet 4 (`claude-sonnet-4-6`, Anthropic) |
| Frontend | React 18, Vite 5 |
| Production serve | nginx 1.27 alpine (multi-stage Docker) |
| Container | Docker, docker-compose v2 |
| Dataset format | JSON (Yelp Open Dataset schema) |
| Deployment | Single `docker compose up --build` |
