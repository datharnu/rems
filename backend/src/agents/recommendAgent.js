import Anthropic from '@anthropic-ai/sdk';
import { buildPersona } from '../utils/personaBuilder.js';

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

export async function getRecommendations(userHistory, options = {}) {
  assertKey();

  const persona = buildPersona(userHistory);
  const { followUp = null, domain = 'restaurants', conversationHistory = [] } =
    options;

  const systemPrompt = `You are a smart Nigerian recommendation agent. You reason carefully about what a user would enjoy before recommending anything. You understand Nigerian culture, food, and consumer behavior deeply.

Always reason step by step BEFORE giving recommendations. Show your reasoning in the "reasoning" field.

Respond ONLY in this exact JSON format:
{
  "reasoning": "<your step-by-step thought process about this user's preferences>",
  "recommendations": [
    {
      "rank": 1,
      "name": "<item name>",
      "category": "<category>",
      "why": "<one sentence personalized reason for this user>",
      "confidence": <0.0-1.0>
    }
  ],
  "follow_up_question": "<optional clarifying question to refine further>"
}`;

  const userMessage = followUp
    ? `Follow-up request: ${followUp}`
    : `USER PERSONA:
- Avg rating given: ${persona.avgRating}/5
- Preference style: ${persona.tone}, ${persona.verbosity} reviewer
- Top categories they enjoy: ${persona.topCategories.join(', ') || 'general'}
- Review history size: ${persona.reviewCount} reviews
${persona.isColdStart ? '- Cold start user: no history. Use popular Nigerian picks as baseline.' : ''}

Recommend the top 5 ${domain} this user would genuinely enjoy. Think like a knowledgeable Nigerian friend giving honest advice.`;

  const messages = [
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: systemPrompt,
    messages,
  });

  const text = response.content[0].text.trim();
  const parsed = safeParseJson(text);

  return {
    ...parsed,
    _persona: persona,
    _model: MODEL,
    _conversationHistory: [
      ...messages,
      { role: 'assistant', content: text },
    ],
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
