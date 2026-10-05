import type { LoaderFunctionArgs } from "react-router";

import db from "../db.server";
import { authenticate } from "../shopify.server";
import {
  WIDGET_STATUSES,
  WIDGET_TYPES,
} from "../features/widgets/widget.constants";
import { widgetScope } from "../features/widgets/widget.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return Response.json(
      { error: "App proxy session unavailable" },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const now = new Date();

  const countdown = await db.widget.findFirst({
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

  return Response.json(
    {
      countdown,
      serverNow: new Date().toISOString(),
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
