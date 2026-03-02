import type { TokenRecord, ProviderId } from '../../core/types.ts';
import { getAllProviders, getProvider } from '../../providers/registry.ts';

export async function collectAllRecords(
  from: Date,
  to: Date,
  providerFilter?: ProviderId,
): Promise<TokenRecord[]> {
  if (providerFilter) {
    const provider = getProvider(providerFilter);
    return provider.collectRecords(from, to);
  }

  const providers = getAllProviders();
  const results = await Promise.all(
    providers.map(p => p.collectRecords(from, to))
  );

  return results.flat();
}
