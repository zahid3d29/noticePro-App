import type { LoaderFunctionArgs } from "react-router";

import db from "../db.server";
import {
  WIDGET_STATUSES,
  WIDGET_TYPES,
} from "../features/widgets/widget.constants";
import { widgetScope } from "../features/widgets/widget.server";
import { authenticate } from "../shopify.server";

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

  const widget = await db.widget.findFirst({
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

  return Response.json(widget, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
