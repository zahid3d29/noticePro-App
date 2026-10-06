export const APP_PLANS = {
  FREE: "FREE",
  PRO: "PRO",
} as const;

export type AppPlan = (typeof APP_PLANS)[keyof typeof APP_PLANS];

// null means unlimited active widgets per solution type.
export function activeWidgetLimitForPlan(plan: AppPlan): number | null {
  return plan === APP_PLANS.PRO ? null : 1;
}

export function canActivateAnotherWidget(
  plan: AppPlan,
  otherActiveWidgetCount: number,
): boolean {
  if (!Number.isInteger(otherActiveWidgetCount) || otherActiveWidgetCount < 0) {
    throw new Error("Active widget count must be a non-negative integer.");
  }

  const limit = activeWidgetLimitForPlan(plan);

  return limit === null || otherActiveWidgetCount < limit;
}
