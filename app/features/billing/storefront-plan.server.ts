import { getAuthenticatedAppPlan } from "./admin-plan.server";
import { activeWidgetLimitForPlan } from "./plan-policy.server";

type AdminClient = Parameters<typeof getAuthenticatedAppPlan>[0];

type CacheEntry = {
  limit: number | null;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<number | null>>();

function remember(shopDomain: string, limit: number | null, ttl: number) {
  if (cache.size >= 1000 && !cache.has(shopDomain)) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }

  cache.set(shopDomain, {
    limit,
    expiresAt: Date.now() + ttl,
  });
}

// Only use with the authenticated app-proxy Admin context.
export async function getStorefrontWidgetLimit(
  admin: AdminClient,
  shopDomain: string,
): Promise<number | null> {
  const cached = cache.get(shopDomain);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.limit;
  }

  cache.delete(shopDomain);

  const existingLookup = pending.get(shopDomain);
  if (existingLookup) return existingLookup;

  const lookup = (async () => {
    try {
      const plan = await getAuthenticatedAppPlan(admin, shopDomain);
      const limit = activeWidgetLimitForPlan(plan);
      remember(shopDomain, limit, 30000);
      return limit;
    } catch {
      // Conservative storefront allowance, not a confirmed downgrade.
      // Never retain unlimited access after an expired cache fails refresh.
      remember(shopDomain, 1, 5000);
      return 1;
    }
  })();

  pending.set(shopDomain, lookup);

  try {
    return await lookup;
  } finally {
    pending.delete(shopDomain);
  }
}
