import type { LoaderFunctionArgs } from "react-router";

import db from "../db.server";
import { authenticate } from "../shopify.server";
import {
  WIDGET_STATUSES,
  WIDGET_TYPES,
} from "../features/widgets/widget.constants";
import { widgetScope } from "../features/widgets/widget.server";
import { getStorefrontWidgetLimit } from "../features/billing/storefront-plan.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, admin } = await authenticate.public.appProxy(request);
  const headers = { "Cache-Control": "no-store" };

  if (!session || !admin) {
    return Response.json(
      { error: "App proxy session unavailable" },
      { status: 401, headers },
    );
  }

  const now = new Date();

  const eligibleCountdowns = await db.widget.findMany({
    where: {
      ...widgetScope(session.shop, WIDGET_TYPES.COUNTDOWN),
      status: WIDGET_STATUSES.ACTIVE,
      countdownEndsAt: { not: null },
      AND: [
        {
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        },
        {
          OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        },
      ],
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      message: true,
      backgroundColor: true,
      textColor: true,
      countdownEndsAt: true,
      countdownShowDays: true,
      countdownSticky: true,
      countdownDesktopOffset: true,
      countdownMobileOffset: true,
      countdownExpiredText: true,
    },
  });

  let countdowns = eligibleCountdowns;

  // Zero or one eligible widget already fits the Free allowance.
  if (eligibleCountdowns.length > 1) {
    const limit = await getStorefrontWidgetLimit(admin, session.shop);

    if (limit !== null) {
      countdowns = eligibleCountdowns.slice(0, limit);
    }
  }

  const multiFormat =
    new URL(request.url).searchParams.get("format") === "multi";

  const serverNow = new Date().toISOString();

  return Response.json(
    multiFormat
      ? { countdowns, serverNow }
      : { countdown: countdowns[0] ?? null, serverNow },
    { headers },
  );
}
