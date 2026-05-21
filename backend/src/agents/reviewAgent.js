import Anthropic from '@anthropic-ai/sdk';
import { buildPersona } from '../utils/personaBuilder.js';
import { buildContext } from '../utils/contextBuilder.js';

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    '⚠️  ANTHROPIC_API_KEY is not set. Create backend/.env with ANTHROPIC_API_KEY=...'
  );
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function assertKey() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const err = new Error(
      'ANTHROPIC_API_KEY is not configured on the backend. Add it to backend/.env and restart.'
    );
    err.code = 'MISSING_API_KEY';
    err.status = 503;
    throw err;
  }
}

export async function simulateReview(userHistory, itemDetails) {
  assertKey();

  const persona = buildPersona(userHistory);
  const relevantReviews = buildContext(userHistory, itemDetails.category);

  const prompt = `You are simulating a real Nigerian user's review behavior on a platform like Yelp.

USER PERSONA:
- Average star rating they give: ${persona.avgRating}/5
- Review style: ${persona.verbosity} and ${persona.tone}
- Favourite categories: ${persona.topCategories.join(', ') || 'general'}
- Total reviews written: ${persona.reviewCount}
${persona.isColdStart ? '- New user: no prior history, use general Nigerian consumer behavior' : ''}

PAST REVIEWS (for behavioral reference):
${relevantReviews.map((r) => `[${r.stars}★] "${r.text}"`).join('\n\n') || '(none — cold start)'}

ITEM TO REVIEW:
- Name: ${itemDetails.name}
- Category: ${itemDetails.category}
- Description: ${itemDetails.description || 'No description provided'}
- Location: ${itemDetails.location || 'Lagos, Nigeria'}

TASK:
Generate a realistic review this Nigerian user would write for this item.

IMPORTANT BEHAVIORAL RULES:
- Write in natural Nigerian English (not American English)
- Use expressions like "e be like", "this place dey", "on God", "mehn", "abeg" sparingly and naturally — not forced
- Rating should be consistent with their historical behavior
- Length should match their verbosity style
- Capture genuine Nigerian consumer sentiment — direct, expressive, community-aware

Respond ONLY in this exact JSON format, no extra text:
{
  "rating": <number 1-5>,
  "review": "<review text>",
  "persona_notes": "<one sentence explaining why this user would rate this way>"
}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();
  const parsed = safeParseJson(text);

  return {
    ...parsed,
    _persona: persona,
    _retrievedReviews: relevantReviews,
    _contextUsed: relevantReviews.length,
    _model: MODEL,
  };
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
    return { error: 'Parse failed', raw: text };
  }
}
