import type { authenticate } from "../../shopify.server";
import { getVerifiedAppPlan } from "./partner-subscription.server";

type AdminClient = Awaited<ReturnType<typeof authenticate.admin>>["admin"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function getAuthenticatedAppPlan(
  admin: AdminClient,
  expectedShopDomain: string,
) {
  const response = await admin.graphql(`
    query NoticeProAuthenticatedShop {
      shop {
        id
        myshopifyDomain
      }
    }
  `);

  if (!response.ok) {
    throw new Error("Authenticated shop lookup failed.");
  }

  const result: unknown = await response.json();

  if (
    !isRecord(result) ||
    (result.errors !== undefined &&
      (!Array.isArray(result.errors) || result.errors.length > 0)) ||
    !isRecord(result.data) ||
    !isRecord(result.data.shop)
  ) {
    throw new Error("Authenticated shop lookup returned invalid data.");
  }

  const shop = result.data.shop;

  if (
    typeof shop.id !== "string" ||
    !/^gid:\/\/shopify\/Shop\/\d+$/.test(shop.id) ||
    shop.myshopifyDomain !== expectedShopDomain
  ) {
    throw new Error("Authenticated shop identity does not match.");
  }

  return getVerifiedAppPlan(shop.id, expectedShopDomain);
}
