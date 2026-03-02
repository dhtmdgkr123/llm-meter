import { Option } from 'commander';
import type { ProviderId } from '../core/types.ts';

export const fromOption = new Option('--from <date>', 'Start date (YYYY-MM-DD)');
export const toOption = new Option('--to <date>', 'End date (YYYY-MM-DD)');
export const providerOption = new Option('--provider <name>', 'Filter by provider')
  .choices(['claude', 'codex', 'gemini'] satisfies ProviderId[]);
export const jsonOption = new Option('--json', 'Output as JSON').default(false);
export const verboseOption = new Option('--verbose', 'Show per-model breakdown').default(false);
