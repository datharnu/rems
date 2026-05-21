# Rems 🇳🇬

> **A behavioral simulation & recommendation agent for the Nigerian consumer market.**
> Built on Claude. Engineered for authenticity. Single-command demo.

**DSN × BCT LLM Agent Challenge — Solo submission by [odun.dev](https://odun.dev)**

---

## What it does

Rems solves the two challenge tasks as a single coherent agent:

| | Task | What Rems does |
|---|---|---|
| **A** | User Modeling | Given a Nigerian user's review history + a target item, produces the rating *and* review text they would actually post — in natural Nigerian English, with rating calibrated to their behavioral baseline. |
| **B** | Recommendation Agent | Reasoning-first, multi-turn recommendations. Reasons step-by-step about the user's preferences, returns ranked picks with confidence scores, gracefully handles cold-start, and supports follow-up refinement ("something cheaper near Lekki"). |

Both tasks are powered by the **same persona + lite-RAG pipeline**, so the agent has a single, consistent mental model of the user across reviewing and recommending.

---

## Why it wins

1. **Cultural authenticity, not caricature.** The prompts allow Nigerian English ("mehn", "abeg", "on God") but instruct the model to use them *sparingly and naturally* — not forced. Direct, expressive, community-aware sentiment.
2. **Behavioral grounding.** Every Claude call is anchored in (a) a distilled user **persona** (`avgRating`, `tone`, `verbosity`, `topCategories`) and (b) the **most relevant past reviews** retrieved by category overlap. The model never hallucinates from a blank slate.
3. **Agentic by construction.** Task B reasons before recommending (`reasoning` field is part of the response schema), preserves conversation state across turns, and asks its own clarifying follow-ups.
4. **Cold-start handled.** A user with zero reviews falls back to a "popular Nigerian baseline" path automatically — no crashes, no empty output.
5. **Demo-ready UX.** Four hand-crafted personas, one-click switching, on-screen persona profile, retrieved-review transparency. Judges can flip between an enthusiastic foodie and a critical reviewer and *see* Rems produce drastically different output for the same item.
6. **Production-grade infra.** Multi-stage Docker build, nginx reverse-proxy (same-origin, no CORS), healthcheck-gated startup, non-root containers. `docker compose up` and you're live.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                            Browser                               │
│                http://localhost:3000  (same origin)              │
└────────────────────────────┬────────────────────────────────────┘
                             │ /api/*  (same-origin fetch)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  frontend container (nginx)                      │
│  • serves the built Vite/React SPA from /usr/share/nginx/html    │
│  • reverse-proxies /api/* and /health to backend:3001            │
│  • gzip, security headers, immutable asset caching               │
└────────────────────────────┬────────────────────────────────────┘
                             │ docker network
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  backend container (Node 20)                     │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Express app                                                 │ │
│  │   /health                                                   │ │
│  │   /api/simulate    →  reviewAgent.simulateReview()          │ │
│  │   /api/recommend   →  recommendAgent.getRecommendations()   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                            ▼                                     │
│  ┌──────────────────────┐  ┌────────────────────────────────┐  │
│  │  personaBuilder.js   │  │  contextBuilder.js   (lite-RAG) │  │
│  │  → avg rating, tone, │  │  → top-K past reviews by        │  │
│  │    verbosity, cats,  │  │    category overlap             │  │
│  │    cold-start flag   │  │                                  │  │
│  └──────────────────────┘  └────────────────────────────────┘  │
│                            ▼                                     │
│              ┌─────────────────────────────────┐                │
│              │  Claude (claude-sonnet-4-6)     │                │
│              │  Structured JSON response       │                │
│              └─────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

**Key design choices**

- **Two utilities, one model of the user.** `personaBuilder` and `contextBuilder` are deterministic — no LLM calls — so they're fast, cheap, and reproducible. They reduce a noisy review history into something Claude can act on confidently.
- **JSON-only output with regex fallback.** Both agents force strict JSON; if Claude wraps it in prose, a regex extracts the first `{…}` block. The frontend never shows raw model output.
- **Multi-turn done correctly.** Task B echoes the *backend-validated* `_conversationHistory` (with the leading user turn) so the next request always satisfies Anthropic's "first message must be `user`" constraint.
- **Same-origin from day one.** No `localhost:3001` baked into the JS bundle — works on a judge's phone, on a VPN, behind a tunnel, anywhere.

---

## Quick start

### Prerequisites
- Docker Desktop (or Docker Engine + Compose v2)
- An [Anthropic API key](https://console.anthropic.com/settings/keys)

### Run it (one command path)

```bash
# 1. Add your API key
cp backend/.env.example backend/.env
# Open backend/.env and replace the placeholder with your real key

# 2. Launch
docker compose up --build
```

Compose builds both images, waits for the backend `/health` check to pass, then starts the frontend nginx.

Open **http://localhost:3000**.

### Or run without Docker

```bash
# Terminal 1
cd backend && npm install && npm run dev

# Terminal 2
cd frontend && npm install && npm run dev
```

The Vite dev server proxies `/api/*` to `localhost:3001`, so the React code is *identical* in dev and Docker — no environment-conditional code.

### Stopping

```bash
docker compose down
```

---

## Demo script (60 seconds, for judges)

> **The point of the demo: prove the system actually models the user, not just dresses up a prompt.**

1. **Open** http://localhost:3000. Note the green "Backend online" pill — the frontend is health-checking the backend live.
2. **Persona section** — Rems shows the *computed persona* for the selected user (avg rating, tone, verbosity, top categories). This is the deterministic distillation that grounds Claude's output. Currently showing **Tunde A. (Enthusiastic foodie)**.
3. **Task A** — Click **Simulate Review**. Watch the button cycle through "Building user persona → Retrieving relevant past reviews → Asking Claude → Parsing response." A ~5-star review appears in natural Nigerian English. Expand "Grounded with N relevant past reviews" to see which of Tunde's history Rems retrieved.
4. **Switch persona to Amaka O. (Critical reviewer)**. Click **Simulate Review** again for the *same item*. Rating drops to 2–3 stars, tone turns biting, verbosity grows. Same item, totally different output — because the persona changed.
5. **Switch to "New User (cold start)"**. Same item, click Simulate. Rems falls back to a Nigerian-consumer baseline and returns a sensible mid-rating review without crashing.
6. **Task B** — Switch tab. Click **Get Recommendations**. The agent's `reasoning` block appears above the ranked list — judges can see *why* it picked each spot. Type **"something cheaper, closer to Lekki"** into the follow-up box. The recommendations refine based on the multi-turn conversation history.

**Total time: 60 seconds. Three pillars demonstrated: persona modeling, RAG grounding, agentic multi-turn.**

---

## What to test (checklist)

- [ ] Backend health pill is green.
- [ ] Selecting a persona instantly updates the on-screen profile card.
- [ ] Task A produces a review in Nigerian English with a rating consistent with the persona's avg.
- [ ] Switching personas and re-running Task A produces clearly different reviews for the same item.
- [ ] "Cold start" persona returns a sensible review with no errors.
- [ ] Task B shows step-by-step reasoning above the ranked list.
- [ ] Follow-up box refines the recommendations (multi-turn badge appears with turn count).
- [ ] Reset button clears the conversation cleanly.
- [ ] Stopping the backend (`docker compose stop backend`) flips the status pill to red within 10 seconds and shows a friendly offline banner.
- [ ] Removing the API key from `backend/.env` and restarting surfaces the dedicated "missing API key" UI message — not a generic 500.

---

## Project structure

```
hackathon/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── simulate.js          # Task A endpoint
│   │   │   └── recommend.js         # Task B endpoint
│   │   ├── agents/
│   │   │   ├── reviewAgent.js       # Task A logic
│   │   │   └── recommendAgent.js    # Task B logic
│   │   ├── utils/
│   │   │   ├── personaBuilder.js    # deterministic persona distillation
│   │   │   ├── contextBuilder.js    # lite RAG by category overlap
│   │   │   └── yelpLoader.js        # sample dataset loader
│   │   └── index.js
│   ├── data/yelp_sample.json        # 5 sample users
│   ├── Dockerfile                   # non-root user, healthcheck
│   ├── .env.example                 # template (copy to backend/.env)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  # the entire UI
│   │   ├── app.css                  # design system + animations
│   │   ├── personas.js              # 4 demo personas
│   │   └── main.jsx
│   ├── nginx.conf                   # SPA fallback + /api reverse proxy
│   ├── Dockerfile                   # multi-stage: Node build → nginx runtime
│   └── package.json
├── docker-compose.yml               # healthcheck-gated, networked
├── .gitignore                       # protects .env at every depth
└── README.md
```

---

## API reference

### `GET /health`

```json
{ "status": "ok", "agent": "Naija Review Agent" }
```

### `POST /api/simulate` — Task A

Request:

```json
{
  "userHistory": {
    "reviews": [
      { "stars": 5, "text": "...", "categories": ["Nigerian", "BBQ"] }
    ]
  },
  "itemDetails": {
    "name": "Yellow Chilli Lagos",
    "category": "Nigerian Restaurant",
    "description": "Upscale Nigerian cuisine in Victoria Island",
    "location": "Victoria Island, Lagos"
  }
}
```

Response:

```json
{
  "success": true,
  "rating": 5,
  "review": "Mehn, Yellow Chilli came through again...",
  "persona_notes": "Consistent with their enthusiastic Nigerian-food bias.",
  "_persona": { "avgRating": 4.6, "tone": "enthusiastic", "...": "..." },
  "_retrievedReviews": [ /* the past reviews used to ground generation */ ],
  "_contextUsed": 3,
  "_model": "claude-sonnet-4-6"
}
```

### `POST /api/recommend` — Task B

Request:

```json
{
  "userHistory": { "reviews": [ /* ... */ ] },
  "domain": "restaurants",
  "followUp": "something cheaper near Lekki",
  "conversationHistory": [ /* echoed back from previous response */ ]
}
```

Response:

```json
{
  "success": true,
  "reasoning": "Step 1: This user trends toward authentic Nigerian spots...",
  "recommendations": [
    {
      "rank": 1,
      "name": "Bukka Hut Lekki",
      "category": "Nigerian Fast Food",
      "why": "Matches their love for accessible Nigerian comfort food.",
      "confidence": 0.86
    }
  ],
  "follow_up_question": "Are vegetarian-friendly options a priority?",
  "_persona": { /* ... */ },
  "_conversationHistory": [ /* full history to send back on next turn */ ],
  "_model": "claude-sonnet-4-6"
}
```

### Error responses

```json
{ "error": "ANTHROPIC_API_KEY is not configured...", "code": "MISSING_API_KEY" }
```

Status codes: `503` for missing config, `400` for missing fields, `500` for unexpected errors, `404` for unknown sample user IDs.

---

## Security & safety notes

- The Anthropic API key lives **only on the backend**, sourced from `backend/.env` (git-ignored). It is never bundled into the frontend.
- Backend runs as the non-root `node` user inside its container.
- Nginx sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` on every response.
- All requests are same-origin in production → no CORS attack surface.
- Sample dataset is hand-crafted, not scraped — no PII concerns.

---

## Tech stack

- **Backend**: Node.js 20, Express
- **LLM**: Anthropic Claude (`claude-sonnet-4-6` — current Sonnet alias)
- **Frontend**: React 18, Vite 5 (no UI framework — every animation is hand-written CSS keyframes)
- **Infra**: Docker multi-stage, nginx 1.27 alpine, docker-compose v2

Frontend bundle: **~150 kB JS, ~13 kB CSS** uncompressed (~48 kB / ~3.5 kB gzipped).

---

## Credits

Built by [**odun.dev**](https://odunayo-portfolio-eight.vercel.app) for the DSN × BCT LLM Agent Challenge, May 2026.
