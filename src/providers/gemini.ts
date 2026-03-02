import { BaseProvider } from './base.ts';
import type { TokenRecord, ProviderId } from '../core/types.ts';
import { isInRange, fileMtimeInRange } from '../core/date-utils.ts';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { stat, readFile } from 'node:fs/promises';

interface GeminiMessage {
  type?: string;
  tokens?: {
    input?: number;
    output?: number;
    cached?: number;
    thoughts?: number;
    tool?: number;
    total?: number;
    model?: string;
  };
  timestamp?: string;
}

interface GeminiSession {
  messages?: GeminiMessage[];
  createdAt?: string;
  updatedAt?: string;
}

export class GeminiProvider extends BaseProvider {
  readonly id: ProviderId = 'gemini';
  readonly name = 'Gemini CLI';

  private basePath: string;

  constructor(basePath?: string) {
    super();
    this.basePath = basePath ?? join(homedir(), '.gemini', 'tmp');
  }

  async collectRecords(from?: Date, to?: Date): Promise<TokenRecord[]> {
    const files = await this.listFiles(this.basePath, /^session-.*\.json$/);

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
    const records: TokenRecord[] = [];

    for (let i = 0; i < filtered.length; i += batchSize) {
      const batch = filtered.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(f => this.parseFile(f, from, to))
      );
      for (const r of batchResults) {
        records.push(...r);
      }
    }

    return records;
  }

  private async parseFile(filePath: string, from?: Date, to?: Date): Promise<TokenRecord[]> {
    const records: TokenRecord[] = [];

    try {
      const text = await readFile(filePath, 'utf-8');
      const session: GeminiSession = JSON.parse(text);

      if (!session.messages) return records;

      const sessionId = basename(filePath, '.json');

      for (const msg of session.messages) {
        if (msg.type !== 'gemini') continue;
        if (!msg.tokens) continue;

        const timestamp = msg.timestamp
          ? new Date(msg.timestamp)
          : session.updatedAt
            ? new Date(session.updatedAt)
            : new Date();

        if (isNaN(timestamp.getTime())) continue;
        if (!isInRange(timestamp, from, to)) continue;

        const inputTokens = msg.tokens.input ?? 0;
        const outputTokens = (msg.tokens.output ?? 0) + (msg.tokens.thoughts ?? 0);
        const cachedInputTokens = msg.tokens.cached ?? 0;
        const totalTokens = msg.tokens.total ?? (inputTokens + outputTokens + cachedInputTokens);

        records.push({
          provider: 'gemini',
          sessionId,
          timestamp,
          model: msg.tokens.model ?? 'unknown',
          inputTokens,
          outputTokens,
          cachedInputTokens,
          cacheCreationTokens: 0,
          reasoningTokens: msg.tokens.thoughts ?? 0,
          totalTokens,
        });
      }
    } catch {
      // Skip unparseable files
    }

    return records;
  }
}
