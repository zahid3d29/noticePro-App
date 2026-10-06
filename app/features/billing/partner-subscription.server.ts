import type { AppPlan } from "./plan-policy.server";

const SUBSCRIPTION_QUERY = `
  query NoticeProEntitlement($appId: ID!, $shopId: ID!) {
    activeSubscription(appId: $appId, shopId: $shopId) {
      shop {
        id
        myshopifyDomain
      }
      items {
        handle
      }
    }
  }
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Call only with the shop ID and domain obtained from an
// authenticated Admin API context, never from form or URL input.
export async function getVerifiedAppPlan(
  shopId: string,
  shopDomain: string,
): Promise<AppPlan> {
  const organizationId = process.env.SHOPIFY_PARTNER_ORG_ID;
  const token = process.env.SHOPIFY_PARTNER_API_TOKEN;
  const appId = process.env.SHOPIFY_PARTNER_APP_ID;

  if (
    !organizationId ||
    !/^\d+$/.test(organizationId) ||
    !token ||
    !appId ||
    !/^gid:\/\/shopify\/App\/\d+$/.test(appId) ||
    !/^gid:\/\/shopify\/Shop\/\d+$/.test(shopId) ||
    !shopDomain
  ) {
    throw new Error("Subscription verification configuration is invalid.");
  }

  let result: unknown;

  try {
    const response = await fetch(
      `https://partners.shopify.com/${organizationId}/api/2026-07/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
        body: JSON.stringify({
          query: SUBSCRIPTION_QUERY,
          variables: { appId, shopId },
        }),
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) {
      throw new Error("Partner API request failed.");
    }

    result = await response.json();
  } catch {
    throw new Error("Subscription verification is temporarily unavailable.");
  }

  if (
    !isRecord(result) ||
    (result.errors !== undefined &&
      (!Array.isArray(result.errors) || result.errors.length > 0)) ||
    !isRecord(result.data) ||
    !Object.hasOwn(result.data, "activeSubscription")
  ) {
    throw new Error("Subscription verification returned an invalid response.");
  }

  const subscription = result.data.activeSubscription;

  // No contract means Free entitlement, not a verified Free subscription.
  if (subscription === null) {
    return "FREE";
  }

  if (
    !isRecord(subscription) ||
    !isRecord(subscription.shop) ||
    subscription.shop.id !== shopId ||
    subscription.shop.myshopifyDomain !== shopDomain ||
    !Array.isArray(subscription.items) ||
    !subscription.items.every(
      (item) => isRecord(item) && typeof item.handle === "string",
    )
  ) {
    throw new Error("Subscription verification returned mismatched data.");
  }

  return subscription.items.some(
    (item) => isRecord(item) && item.handle === "pro",
  )
    ? "PRO"
    : "FREE";
}
