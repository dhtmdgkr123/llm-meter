import type { TokenRecord, ProviderId } from '../core/types.ts';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export abstract class BaseProvider {
  abstract readonly id: ProviderId;
  abstract readonly name: string;

  abstract collectRecords(from?: Date, to?: Date): Promise<TokenRecord[]>;

  protected async listFiles(dir: string, pattern: RegExp): Promise<string[]> {
    const results: string[] = [];

    async function walk(currentDir: string) {
      let entries;
      try {
        entries = await readdir(currentDir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (pattern.test(entry.name)) {
          results.push(fullPath);
        }
      }
    }

    await walk(dir);
    return results;
  }

  protected async readLines(filePath: string): Promise<string[]> {
    const text = await readFile(filePath, 'utf-8');
    return text.split('\n').filter(line => line.trim().length > 0);
  }
}
