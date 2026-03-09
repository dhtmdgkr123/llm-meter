import { BaseProvider } from './base.ts';
import type { TokenRecord, ProviderId } from '../core/types.ts';
import { isInRange, fileMtimeInRange } from '../core/date-utils.ts';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { stat } from 'node:fs/promises';

interface TokenUsageRaw {
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  reasoning_output_tokens: number;
  total_tokens: number;
}

interface CodexRecord {
  timestamp: string;
  type: string;
  payload: {
    type?: string;
    info?: {
      total_token_usage?: {
        input_tokens?: number;
        cached_input_tokens?: number;
        output_tokens?: number;
        reasoning_output_tokens?: number;
        total_tokens?: number;
      };
      last_token_usage?: {
        input_tokens?: number;
        cached_input_tokens?: number;
        output_tokens?: number;
        reasoning_output_tokens?: number;
        total_tokens?: number;
      };
    } | null;
    model?: string;
    collaboration_mode?: {
      settings?: {
        model?: string;
      };
    };
  };
}

const ZERO_USAGE: TokenUsageRaw = {
  input_tokens: 0,
  cached_input_tokens: 0,
  output_tokens: 0,
  reasoning_output_tokens: 0,
  total_tokens: 0,
};

function normalizeUsage(raw?: {
  input_tokens?: number;
  cached_input_tokens?: number;
  output_tokens?: number;
  reasoning_output_tokens?: number;
  total_tokens?: number;
}): TokenUsageRaw | null {
  if (!raw) return null;
  const input = raw.input_tokens ?? 0;
  const output = raw.output_tokens ?? 0;
  return {
    input_tokens: input,
    cached_input_tokens: Math.min(raw.cached_input_tokens ?? 0, input),
    output_tokens: output,
    reasoning_output_tokens: raw.reasoning_output_tokens ?? 0,
    total_tokens: (raw.total_tokens && raw.total_tokens > 0) ? raw.total_tokens : input + output,
  };
}

function subtractUsage(a: TokenUsageRaw, b: TokenUsageRaw): TokenUsageRaw {
  return {
    input_tokens: Math.max(0, a.input_tokens - b.input_tokens),
    cached_input_tokens: Math.max(0, a.cached_input_tokens - b.cached_input_tokens),
    output_tokens: Math.max(0, a.output_tokens - b.output_tokens),
    reasoning_output_tokens: Math.max(0, a.reasoning_output_tokens - b.reasoning_output_tokens),
    total_tokens: Math.max(0, a.total_tokens - b.total_tokens),
  };
}

function isZeroUsage(u: TokenUsageRaw): boolean {
  return u.input_tokens === 0 && u.output_tokens === 0;
}

export class CodexProvider extends BaseProvider {
  readonly id: ProviderId = 'codex';
  readonly name = 'Codex CLI';

  private basePaths: string[];

  constructor(basePaths?: string[]) {
    super();
    const home = homedir();
    this.basePaths = basePaths ?? [
      join(home, '.codex', 'sessions'),
    ];
  }

  async collectRecords(from?: Date, to?: Date): Promise<TokenRecord[]> {
    const allFiles: string[] = [];
    for (const base of this.basePaths) {
      const files = await this.listFiles(base, /^rollout-.*\.jsonl$/);
      allFiles.push(...files);
    }

    const filtered: string[] = [];
    for (const f of allFiles) {
      try {
        const s = await stat(f);
        if (fileMtimeInRange(s.mtimeMs, from, to)) {
          filtered.push(f);
        }
      } catch {
        continue;
      }
    }

    const batchSize = 10;
    const records: TokenRecord[] = [];

    for (let i = 0; i < filtered.length; i += batchSize) {
      const batch = filtered.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(f => this.parseFile(f, from, to))
      );
      for (const fileRecords of batchResults) {
        records.push(...fileRecords);
      }
    }

    return records;
  }

  private async parseFile(filePath: string, from?: Date, to?: Date): Promise<TokenRecord[]> {
    const lines = await this.readLines(filePath);
    const results: TokenRecord[] = [];
    const sessionId = basename(filePath, '.jsonl');

    let model = 'unknown';
    let previousTotals: TokenUsageRaw = { ...ZERO_USAGE };

    for (const line of lines) {
      try {
        const entry: CodexRecord = JSON.parse(line);

        // Track model from turn_context
        if (entry.type === 'turn_context') {
          const turnModel = entry.payload.model ??
            entry.payload.collaboration_mode?.settings?.model;
          if (turnModel) model = turnModel;
        }

        // Process each token_count event individually (like ccusage)
        if (
          entry.type === 'event_msg' &&
          entry.payload.type === 'token_count' &&
          entry.payload.info
        ) {
          const info = entry.payload.info;
          const totalUsage = normalizeUsage(info.total_token_usage);
          const lastUsage = normalizeUsage(info.last_token_usage);

          // Prefer last_token_usage as per-turn delta (matches ccusage);
          // fall back to diff of total_token_usage
          let delta: TokenUsageRaw | null = lastUsage;
          if (!delta && totalUsage) {
            delta = subtractUsage(totalUsage, previousTotals);
          }

          // Update previous totals for fallback diff calculation
          if (totalUsage) {
            previousTotals = totalUsage;
          }

          if (!delta || isZeroUsage(delta)) continue;

          const timestamp = new Date(entry.timestamp);
          if (isNaN(timestamp.getTime())) continue;
          if (!isInRange(timestamp, from, to)) continue;

          // Codex input_tokens includes cached portion; extract non-cached input
          const nonCachedInput = delta.input_tokens - delta.cached_input_tokens;
          const outputTokens = delta.output_tokens;

          results.push({
            provider: 'codex',
            sessionId,
            timestamp,
            model,
            inputTokens: nonCachedInput,
            outputTokens,
            cachedInputTokens: delta.cached_input_tokens,
            cacheCreationTokens: 0,
            reasoningTokens: delta.reasoning_output_tokens,
            totalTokens: nonCachedInput + outputTokens + delta.cached_input_tokens,
          });
        }
      } catch {
        continue;
      }
    }

    return results;
  }
}
