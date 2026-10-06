import type { LoaderFunctionArgs } from "react-router";

import db from "../db.server";
import {
  WIDGET_STATUSES,
  WIDGET_TYPES,
} from "../features/widgets/widget.constants";
import { widgetScope } from "../features/widgets/widget.server";
import { getStorefrontWidgetLimit } from "../features/billing/storefront-plan.server";
import { authenticate } from "../shopify.server";

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

  const eligibleNotices = await db.widget.findMany({
    where: {
      ...widgetScope(session.shop, WIDGET_TYPES.NOTICE),
      status: WIDGET_STATUSES.ACTIVE,
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
      buttonText: true,
      buttonUrl: true,
      backgroundColor: true,
      textColor: true,
      dismissible: true,
    },
  });

  let notices = eligibleNotices;

  // Zero or one eligible widget already fits the Free allowance.
  if (eligibleNotices.length > 1) {
    const limit = await getStorefrontWidgetLimit(admin, session.shop);

    if (limit !== null) {
      notices = eligibleNotices.slice(0, limit);
    }
  }

  const multiFormat =
    new URL(request.url).searchParams.get("format") === "multi";

  return Response.json(multiFormat ? { notices } : (notices[0] ?? null), {
    headers,
  });
}
