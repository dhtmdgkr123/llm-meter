export interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
  cachedInputPer1M: number;
  cacheCreationPer1M?: number;
  // Tiered pricing above 200k tokens
  inputPer1MAbove200k?: number;
  outputPer1MAbove200k?: number;
}

// LiteLLM-aligned pricing (matches ccusage)
const CLAUDE_PRICING: Record<string, ModelPricing> = {
  'claude-opus-4-6': {
    inputPer1M: 5,
    outputPer1M: 25,
    cachedInputPer1M: 0.5,
    cacheCreationPer1M: 6.25,
    inputPer1MAbove200k: 10,
    outputPer1MAbove200k: 37.5,
  },
  'claude-opus-4-5': {
    inputPer1M: 5,
    outputPer1M: 25,
    cachedInputPer1M: 0.5,
    cacheCreationPer1M: 6.25,
    inputPer1MAbove200k: 10,
    outputPer1MAbove200k: 37.5,
  },
  'claude-sonnet-4-6': {
    inputPer1M: 3,
    outputPer1M: 15,
    cachedInputPer1M: 0.3,
    cacheCreationPer1M: 3.75,
    inputPer1MAbove200k: 6,
    outputPer1MAbove200k: 22.5,
  },
  'claude-sonnet-4-5': {
    inputPer1M: 3,
    outputPer1M: 15,
    cachedInputPer1M: 0.3,
    cacheCreationPer1M: 3.75,
    inputPer1MAbove200k: 6,
    outputPer1MAbove200k: 22.5,
  },
  'claude-haiku-4-5': {
    inputPer1M: 1,
    outputPer1M: 5,
    cachedInputPer1M: 0.1,
    cacheCreationPer1M: 1.25,
  },
  'claude-3-5-sonnet': {
    inputPer1M: 3,
    outputPer1M: 15,
    cachedInputPer1M: 0.3,
    cacheCreationPer1M: 3.75,
    inputPer1MAbove200k: 6,
    outputPer1MAbove200k: 30,
  },
  'claude-3-5-haiku': {
    inputPer1M: 0.8,
    outputPer1M: 4,
    cachedInputPer1M: 0.08,
    cacheCreationPer1M: 1,
  },
};

const OPENAI_PRICING: Record<string, ModelPricing> = {
  'o3': {
    inputPer1M: 10,
    outputPer1M: 40,
    cachedInputPer1M: 2.5,
  },
  'o3-mini': {
    inputPer1M: 1.1,
    outputPer1M: 4.4,
    cachedInputPer1M: 0.275,
  },
  'o4-mini': {
    inputPer1M: 1.1,
    outputPer1M: 4.4,
    cachedInputPer1M: 0.275,
  },
  'gpt-4.1': {
    inputPer1M: 2,
    outputPer1M: 8,
    cachedInputPer1M: 0.5,
  },
  'gpt-4.1-mini': {
    inputPer1M: 0.4,
    outputPer1M: 1.6,
    cachedInputPer1M: 0.1,
  },
  'gpt-4.1-nano': {
    inputPer1M: 0.1,
    outputPer1M: 0.4,
    cachedInputPer1M: 0.025,
  },
  'gpt-5.3-codex': {
    inputPer1M: 2,
    outputPer1M: 8,
    cachedInputPer1M: 0.5,
  },
  'codex-mini': {
    inputPer1M: 1.5,
    outputPer1M: 6,
    cachedInputPer1M: 0.375,
  },
};

const GEMINI_PRICING: Record<string, ModelPricing> = {
  'gemini-2.5-pro': {
    inputPer1M: 1.25,
    outputPer1M: 10,
    cachedInputPer1M: 0.3125,
  },
  'gemini-2.5-flash': {
    inputPer1M: 0.15,
    outputPer1M: 0.6,
    cachedInputPer1M: 0.0375,
  },
  'gemini-2.0-flash': {
    inputPer1M: 0.1,
    outputPer1M: 0.4,
    cachedInputPer1M: 0.025,
  },
};

const FALLBACK_PRICING: Record<string, ModelPricing> = {
  claude: {
    inputPer1M: 3,
    outputPer1M: 15,
    cachedInputPer1M: 0.3,
    cacheCreationPer1M: 3.75,
  },
  codex: {
    inputPer1M: 2,
    outputPer1M: 8,
    cachedInputPer1M: 0.5,
  },
  gemini: {
    inputPer1M: 1.25,
    outputPer1M: 10,
    cachedInputPer1M: 0.3125,
  },
};

function normalizeModelName(model: string): string {
  return model.replace(/-\d{8}$/, '');
}

export function getModelPricing(model: string, provider: string): ModelPricing {
  const normalized = normalizeModelName(model);

  const allPricing: Record<string, ModelPricing> = {
    ...CLAUDE_PRICING,
    ...OPENAI_PRICING,
    ...GEMINI_PRICING,
  };

  if (allPricing[normalized]) return allPricing[normalized];

  for (const [key, pricing] of Object.entries(allPricing)) {
    if (normalized.startsWith(key) || normalized.includes(key)) {
      return pricing;
    }
  }

  return FALLBACK_PRICING[provider] ?? FALLBACK_PRICING['claude']!;
}
