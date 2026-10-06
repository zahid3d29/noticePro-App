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

  const eligibleAnnouncements = await db.widget.findMany({
    where: {
      ...widgetScope(session.shop, WIDGET_TYPES.ANNOUNCEMENT),
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
      position: true,
      backgroundColor: true,
      textColor: true,
      dismissible: true,
    },
  });

  let announcements = eligibleAnnouncements;

  // Zero or one eligible widget already fits the Free allowance.
  if (eligibleAnnouncements.length > 1) {
    const limit = await getStorefrontWidgetLimit(admin, session.shop);

    if (limit !== null) {
      announcements = eligibleAnnouncements.slice(0, limit);
    }
  }

  const multiFormat =
    new URL(request.url).searchParams.get("format") === "multi";

  return Response.json(
    multiFormat ? { announcements } : (announcements[0] ?? null),
    { headers },
  );
}
