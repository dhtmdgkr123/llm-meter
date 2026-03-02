import type { BaseProvider } from './base.ts';
import type { ProviderId } from '../core/types.ts';
import { ClaudeProvider } from './claude.ts';
import { CodexProvider } from './codex.ts';
import { GeminiProvider } from './gemini.ts';

const providers: Map<ProviderId, BaseProvider> = new Map();

function ensureRegistered() {
  if (providers.size === 0) {
    providers.set('claude', new ClaudeProvider());
    providers.set('codex', new CodexProvider());
    providers.set('gemini', new GeminiProvider());
  }
}

export function getProvider(id: ProviderId): BaseProvider {
  ensureRegistered();
  const p = providers.get(id);
  if (!p) throw new Error(`Unknown provider: ${id}`);
  return p;
}

export function getAllProviders(): BaseProvider[] {
  ensureRegistered();
  return Array.from(providers.values());
}

export function getProviderIds(): ProviderId[] {
  return ['claude', 'codex', 'gemini'];
}
