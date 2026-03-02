export type ProviderId = 'claude' | 'codex' | 'gemini';

export interface TokenRecord {
  provider: ProviderId;
  sessionId: string;
  timestamp: Date;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  cacheCreationTokens: number;
  reasoningTokens: number;
  totalTokens: number;
}

export interface ProviderUsage {
  provider: ProviderId;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  cacheCreationTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  cost: number;
  models: Map<string, ModelUsage>;
}

export interface ModelUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  cacheCreationTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  cost: number;
}

export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  cacheCreationTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  cost: number;
}

export interface UsageBucket {
  period: string;
  providers: Map<ProviderId, ProviderUsage>;
  totals: UsageTotals;
}

export interface CliOptions {
  from?: string;
  to?: string;
  provider?: ProviderId;
  json: boolean;
  verbose: boolean;
}
