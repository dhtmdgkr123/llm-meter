import { BaseProvider } from './base.ts';
import type { TokenRecord, ProviderId } from '../core/types.ts';
import { isInRange, fileMtimeInRange } from '../core/date-utils.ts';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { stat } from 'node:fs/promises';

interface ClaudeAssistantRecord {
  type: string;
  timestamp: string;
  sessionId?: string;
  uuid?: string;
  requestId?: string;
  message?: {
    model?: string;
    id?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
  };
}

export class ClaudeProvider extends BaseProvider {
  readonly id: ProviderId = 'claude';
  readonly name = 'Claude Code';

  private basePath: string;

  constructor(basePath?: string) {
    super();
    this.basePath = basePath ?? join(homedir(), '.claude', 'projects');
  }

  async collectRecords(from?: Date, to?: Date): Promise<TokenRecord[]> {
    const files = await this.listFiles(this.basePath, /\.jsonl$/);

    const filtered: string[] = [];
    for (const f of files) {
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
    // Deduplicate by message.id:requestId — keep first occurrence (matches ccusage)
    const seen = new Set<string>();
    const allRecords: TokenRecord[] = [];

    for (let i = 0; i < filtered.length; i += batchSize) {
      const batch = filtered.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(f => this.parseFile(f, from, to))
      );
      for (const records of batchResults) {
        for (const { record, dedupKey } of records) {
          if (dedupKey) {
            if (seen.has(dedupKey)) continue;
            seen.add(dedupKey);
          }
          allRecords.push(record);
        }
      }
    }

    return allRecords;
  }

  private async parseFile(
    filePath: string,
    from?: Date,
    to?: Date,
  ): Promise<{ record: TokenRecord; dedupKey?: string }[]> {
    const results: { record: TokenRecord; dedupKey?: string }[] = [];
    const lines = await this.readLines(filePath);

    const sessionId = basename(filePath, '.jsonl');

    for (const line of lines) {
      try {
        const entry: ClaudeAssistantRecord = JSON.parse(line);
        if (entry.type !== 'assistant') continue;
        if (!entry.message?.usage) continue;

        const timestamp = new Date(entry.timestamp);
        if (isNaN(timestamp.getTime())) continue;
        if (!isInRange(timestamp, from, to)) continue;

        const model = entry.message.model ?? 'unknown';
        if (model === '<synthetic>' || model === 'unknown') continue;

        const usage = entry.message.usage;
        const inputTokens = usage.input_tokens ?? 0;
        const outputTokens = usage.output_tokens ?? 0;
        const cachedInputTokens = usage.cache_read_input_tokens ?? 0;
        const cacheCreationTokens = usage.cache_creation_input_tokens ?? 0;

        // Dedup key: message.id:requestId (matches ccusage)
        const messageId = entry.message.id;
        const requestId = entry.requestId;
        const dedupKey = messageId && requestId
          ? `${messageId}:${requestId}`
          : undefined;

        results.push({
          record: {
            provider: 'claude',
            sessionId: entry.sessionId ?? sessionId,
            timestamp,
            model,
            inputTokens,
            outputTokens,
            cachedInputTokens,
            cacheCreationTokens,
            reasoningTokens: 0,
            totalTokens: inputTokens + outputTokens + cachedInputTokens + cacheCreationTokens,
          },
          dedupKey,
        });
      } catch {
        continue;
      }
    }

    return results;
  }
}
