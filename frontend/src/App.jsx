import { useEffect, useMemo, useState } from "react";
import "./app.css";
import { PERSONAS, PERSONA_KEYS } from "./personas.js";
import { API_BASE, HEALTH_URL } from "./config.js";

const SAMPLE_ITEM = {
  name: "Yellow Chilli Lagos",
  category: "Nigerian Restaurant",
  description:
    "Upscale Nigerian cuisine in Victoria Island. Known for pepper soup and native rice.",
  location: "Victoria Island, Lagos",
};

const THINKING_STEPS = [
  "Building user persona",
  "Retrieving relevant past reviews",
  "Asking Claude to reason in-character",
  "Parsing structured response",
];

/* ============================================================
   Client-side mirror of the backend persona builder.
   Used for the instant-feedback "Persona Profile" card so the
   judge sees the system thinking BEFORE the first API call.
   ============================================================ */
function computePersona(reviews) {
  if (!reviews || reviews.length === 0) {
    return {
      avgRating: 3.5,
      reviewCount: 0,
      tone: "casual",
      verbosity: "medium",
      topCategories: [],
      isColdStart: true,
    };
  }
  const avgRating = reviews.reduce((s, r) => s + r.stars, 0) / reviews.length;
  const avgWords =
    reviews.reduce((s, r) => s + (r.text || "").split(/\s+/).length, 0) /
    reviews.length;
  const verbosity =
    avgWords > 80 ? "detailed" : avgWords > 30 ? "medium" : "brief";
  const allText = reviews.map((r) => r.text || "").join(" ").toLowerCase();
  const tone =
    allText.includes("amazing") || allText.includes("love")
      ? "enthusiastic"
      : allText.includes("terrible") ||
        allText.includes("never again") ||
        allText.includes("disappointed")
      ? "critical"
      : "balanced";
  const cats = reviews
    .flatMap((r) => r.categories || [])
    .reduce((a, c) => ((a[c] = (a[c] || 0) + 1), a), {});
  const topCategories = Object.entries(cats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c);
  return {
    avgRating: parseFloat(avgRating.toFixed(1)),
    reviewCount: reviews.length,
    tone,
    verbosity,
    topCategories,
    isColdStart: false,
  };
}

/* ============================================================
   Hooks
   ============================================================ */

function useBackendHealth() {
  const [status, setStatus] = useState("checking"); // checking | online | offline
  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      try {
        const r = await fetch(HEALTH_URL);
        if (!cancelled) setStatus(r.ok ? "online" : "offline");
      } catch {
        if (!cancelled) setStatus("offline");
      }
    };
    ping();
    const id = setInterval(ping, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);
  return status;
}

function useThinkingStep(active) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!active) {
      setStep(0);
      return;
    }
    setStep(0);
    const id = setInterval(
      () => setStep((s) => Math.min(s + 1, THINKING_STEPS.length - 1)),
      900
    );
    return () => clearInterval(id);
  }, [active]);
  return step;
}

/* ============================================================
   Small presentational components
   ============================================================ */

function ThinkingLabel({ step }) {
  return (
    <>
      {THINKING_STEPS[step] || "Working"}
      <span className="thinking-dots" aria-hidden>
        <span /> <span /> <span />
      </span>
    </>
  );
}

function StarRating({ rating }) {
  const n = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return (
    <div className="stars" aria-label={`${n} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`s ${s <= n ? "" : "empty"}`}>
          ★
        </span>
      ))}
      <span className="num">{n}/5</span>
    </div>
  );
}

function PersonaSwitcher({ value, onChange }) {
  return (
    <div className="persona-switcher" role="tablist" aria-label="Demo personas">
      {PERSONA_KEYS.map((key) => {
        const p = PERSONAS[key];
        const active = key === value;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={active}
            className={`persona-chip ${active ? "active" : ""}`}
            onClick={() => onChange(key)}
          >
            <span className="persona-chip-name">{p.name}</span>
            <span className="persona-chip-role">{p.role}</span>
          </button>
        );
      })}
    </div>
  );
}

function PersonaProfile({ persona, reviewCount }) {
  return (
    <div className="persona-card">
      <div className="persona-card-head">
        <span className="result-label">Computed user persona</span>
        <span className="persona-card-hint">distilled from history</span>
      </div>
      <div className="persona-stats">
        <Stat
          label="Avg rating"
          value={persona.isColdStart ? "—" : `${persona.avgRating}★`}
        />
        <Stat
          label="Reviews"
          value={reviewCount}
          accent={persona.isColdStart ? "warn" : undefined}
        />
        <Stat
          label="Tone"
          value={persona.tone}
        />
        <Stat
          label="Verbosity"
          value={persona.verbosity}
        />
      </div>
      <div className="persona-cats">
        {persona.isColdStart ? (
          <span className="chip chip-warn">cold start — fallback path</span>
        ) : persona.topCategories.length === 0 ? (
          <span className="chip">no categories</span>
        ) : (
          persona.topCategories.map((c) => (
            <span className="chip" key={c}>
              {c}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className={`stat ${accent ? `stat-${accent}` : ""}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function RetrievedReviews({ reviews }) {
  if (!reviews || reviews.length === 0) return null;
  return (
    <details className="retrieved">
      <summary>
        <span className="retrieved-dot" /> Grounded with {reviews.length} relevant
        past review{reviews.length === 1 ? "" : "s"} (Poor-man's RAG)
      </summary>
      <div className="retrieved-list">
        {reviews.map((r, i) => (
          <div className="retrieved-item" key={i}>
            <span className="retrieved-stars">{"★".repeat(r.stars || 0)}</span>
            <span className="retrieved-text">
              <em>{r.businessName || "Unknown"}</em> — “{r.text}”
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}

/* ============================================================
   Task A — Simulate Review
   ============================================================ */
function TaskA({ userHistory }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [itemName, setItemName] = useState(SAMPLE_ITEM.name);
  const [itemCategory, setItemCategory] = useState(SAMPLE_ITEM.category);
  const [itemDesc, setItemDesc] = useState(SAMPLE_ITEM.description);

  const step = useThinkingStep(loading);

  const simulate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userHistory,
          itemDetails: {
            name: itemName,
            category: itemCategory,
            description: itemDesc,
            location: "Lagos, Nigeria",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error || "Request failed"), { code: data.code });
      setResult(data);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="task-header">
        <span className="badge">Task A</span>
        <h2 className="task-title">User Modeling — Simulate Review</h2>
        <p className="task-sub">
          The agent steps into the selected user's shoes and writes a review
          they'd actually post for this item.
        </p>
      </div>

      <div className="form-group">
        <label className="label">Business Name</label>
        <input
          className="input"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          placeholder="e.g. Yellow Chilli Lagos"
        />
      </div>
      <div className="form-group">
        <label className="label">Category</label>
        <input
          className="input"
          value={itemCategory}
          onChange={(e) => setItemCategory(e.target.value)}
          placeholder="e.g. Nigerian Restaurant"
        />
      </div>
      <div className="form-group">
        <label className="label">Description</label>
        <textarea
          className="textarea"
          value={itemDesc}
          onChange={(e) => setItemDesc(e.target.value)}
          placeholder="Describe the item..."
        />
      </div>

      <button
        className="btn btn-primary"
        onClick={simulate}
        disabled={loading}
      >
        {loading ? (
          <>
            <span className="spinner" aria-hidden />
            <ThinkingLabel step={step} />
          </>
        ) : (
          <>Simulate Review</>
        )}
      </button>

      <ErrorBanner error={error} />

      {result && (
        <div className="result" key={result.review}>
          <div className="result-head">
            <span className="result-label">Simulated output</span>
            <StarRating rating={result.rating} />
          </div>
          <p className="review-text">"{result.review}"</p>
          {result.persona_notes && (
            <div className="agent-note">
              <span className="lbl">Reasoning</span>
              <span>{result.persona_notes}</span>
            </div>
          )}
          <RetrievedReviews reviews={result._retrievedReviews} />
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Task B — Recommendations
   ============================================================ */
function TaskB({ userHistory }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [domain, setDomain] = useState("restaurants");
  const [followUp, setFollowUp] = useState("");
  const [conversationHistory, setConversationHistory] = useState([]);
  const [turnCount, setTurnCount] = useState(0);

  const step = useThinkingStep(loading);

  const recommend = async (isFollowUp = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userHistory,
          domain,
          followUp: isFollowUp ? followUp : null,
          conversationHistory,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error || "Request failed"), { code: data.code });
      setResult(data);
      setTurnCount((t) => t + 1);

      // Trust the backend-validated conversation history so multi-turn
      // calls always start with a user message (Anthropic requirement).
      if (data._conversationHistory) {
        setConversationHistory(data._conversationHistory);
      }
      setFollowUp("");
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setConversationHistory([]);
    setTurnCount(0);
    setFollowUp("");
    setError(null);
  };

  // Reset multi-turn state if the user persona changes.
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userHistory]);

  return (
    <div className="card">
      <div className="task-header">
        <span className="badge">Task B</span>
        <h2 className="task-title">Recommendation Agent</h2>
        <p className="task-sub">
          Reasoning-first, multi-turn recommendations personalized to this
          user's history.
        </p>
      </div>

      <div className="form-group">
        <label className="label">Domain</label>
        <select
          className="select"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        >
          <option value="restaurants">Restaurants</option>
          <option value="food spots">Food Spots</option>
          <option value="bars and nightlife">Bars & Nightlife</option>
          <option value="fast food">Fast Food</option>
          <option value="cafes and coworking">Cafes & Coworking</option>
          <option value="date-night spots">Date-night Spots</option>
        </select>
      </div>

      {!result ? (
        <button
          className="btn btn-primary"
          onClick={() => recommend(false)}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner" aria-hidden />
              <ThinkingLabel step={step} />
            </>
          ) : (
            <>Get Recommendations</>
          )}
        </button>
      ) : (
        <div className="row">
          <input
            className="input"
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            placeholder='e.g. "something cheaper near Lekki"'
            onKeyDown={(e) =>
              e.key === "Enter" && followUp && !loading && recommend(true)
            }
          />
          <button
            className="btn btn-primary"
            onClick={() => recommend(true)}
            disabled={loading || !followUp}
          >
            {loading ? <span className="spinner" aria-hidden /> : <>Follow up</>}
          </button>
          <button className="btn btn-subtle" onClick={reset}>
            Reset
          </button>
        </div>
      )}

      {turnCount > 0 && (
        <div className="turn-badge">
          <span className="ping" /> Turn {turnCount} — multi-turn active
        </div>
      )}

      <ErrorBanner error={error} />

      {result && (
        <div className="result" key={turnCount}>
          {result.reasoning && (
            <div className="agent-note" style={{ marginBottom: 16 }}>
              <span className="lbl">Reasoning</span>
              <span>{result.reasoning}</span>
            </div>
          )}

          <div className="recs">
            {(result.recommendations || []).map((rec, i) => (
              <div className="rec" key={i}>
                <div className="rec-rank">#{rec.rank ?? i + 1}</div>
                <div className="rec-body">
                  <div className="rec-name">{rec.name}</div>
                  {rec.category && <div className="rec-cat">{rec.category}</div>}
                  {rec.why && <div className="rec-why">{rec.why}</div>}
                </div>
                <div className="rec-conf">
                  {Math.round((rec.confidence || 0) * 100)}%
                </div>
              </div>
            ))}
          </div>

          {result.follow_up_question && (
            <div className="follow-up-hint">💬 {result.follow_up_question}</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Error banner — friendly messages for common failure modes
   ============================================================ */
function ErrorBanner({ error }) {
  if (!error) return null;

  if (error.code === "MISSING_API_KEY") {
    return (
      <div className="error error-soft">
        <strong>Backend is missing the Anthropic API key.</strong>
        <div>
          Add <code>ANTHROPIC_API_KEY=...</code> to{" "}
          <code>backend/.env</code> and restart the backend.
        </div>
      </div>
    );
  }
  return <div className="error">Error: {error.message || String(error)}</div>;
}

/* ============================================================
   App shell
   ============================================================ */
export default function App() {
  const [activeTab, setActiveTab] = useState("A");
  const [personaKey, setPersonaKey] = useState("tunde");
  const persona = PERSONAS[personaKey];

  const userHistory = useMemo(
    () => ({ reviews: persona.reviews }),
    [persona]
  );
  const computedPersona = useMemo(
    () => computePersona(persona.reviews),
    [persona]
  );

  const backendStatus = useBackendHealth();

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <div className="logo-mark" aria-hidden>R</div>
            <div className="brand-text">
              <h1 className="brand-name">
                Rems<span className="dot">.</span>
              </h1>
              <span className="brand-tagline">
                Nigerian behavioral simulation & recommendations
              </span>
            </div>
          </div>
          <div className="builder">
            <BackendStatusPill status={backendStatus} />
            <span>built by</span>
            <a href="https://odunayo-portfolio-eight.vercel.app" target="_blank" rel="noreferrer">
              odun.dev
            </a>
          </div>
        </div>
      </header>

      {backendStatus === "offline" && (
        <div className="offline-banner">
          <strong>Backend unreachable.</strong> Start it with{" "}
          <code>docker compose up</code> or{" "}
          <code>cd backend && npm run dev</code>.
        </div>
      )}

      <main className="content">
        <section className="persona-section">
          <div className="section-head">
            <div>
              <h2 className="section-title">1. Choose a demo persona</h2>
              <p className="section-sub">
                Four hand-crafted user archetypes. Switch between them to watch
                Rems produce drastically different output for the same item.
              </p>
            </div>
          </div>

          <PersonaSwitcher value={personaKey} onChange={setPersonaKey} />

          <div className="persona-detail">
            <div className="persona-blurb">
              <div className="persona-blurb-title">
                {persona.name}{" "}
                <span className="persona-blurb-role">— {persona.role}</span>
              </div>
              <div className="persona-blurb-text">{persona.blurb}</div>
            </div>
            <PersonaProfile
              persona={computedPersona}
              reviewCount={persona.reviews.length}
            />
          </div>
        </section>

        <section>
          <div className="section-head">
            <h2 className="section-title">2. Pick a task</h2>
          </div>
          <div className="tabs flush">
            <div className="tabs-inner">
              <button
                className={`tab ${activeTab === "A" ? "active" : ""}`}
                onClick={() => setActiveTab("A")}
              >
                Task A · User Modeling
              </button>
              <button
                className={`tab ${activeTab === "B" ? "active" : ""}`}
                onClick={() => setActiveTab("B")}
              >
                Task B · Recommendations
              </button>
            </div>
          </div>

          <div className="tab-pane" key={`${activeTab}-${personaKey}`}>
            {activeTab === "A" ? (
              <TaskA userHistory={userHistory} />
            ) : (
              <TaskB userHistory={userHistory} />
            )}
          </div>
        </section>

        {persona.reviews.length > 0 && (
          <div className="card history">
            <div className="history-head">
              {persona.name}'s review history · loaded into the agent
            </div>
            <div className="history-list">
              {persona.reviews.map((r, i) => (
                <div className="history-item" key={i}>
                  <span className="history-stars">{"★".repeat(r.stars)}</span>
                  <span className="history-text">
                    <em>{r.businessName}</em> — {r.text.slice(0, 110)}
                    {r.text.length > 110 ? "…" : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        Built with Claude · DSN × BCT Hackathon 2026 · crafted by{" "}
        <a href="https://odunayo-portfolio-eight.vercel.app" target="_blank" rel="noreferrer">
          odun.dev
        </a>
      </footer>
    </div>
  );
}

function BackendStatusPill({ status }) {
  const label =
    status === "online"
      ? "Backend online"
      : status === "offline"
      ? "Backend offline"
      : "Connecting…";
  return (
    <span className={`status-pill status-${status}`} title={label}>
      <span className="status-dot" />
      <span className="status-label">{label}</span>
    </span>
  );
}
