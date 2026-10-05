import type { WidgetType } from "./widget.constants";
import { WIDGET_STATUSES } from "./widget.constants";

export function widgetScope(shopDomain: string, type: WidgetType) {
  return {
    shopDomain,
    type,
  };
}

export function widgetIdScope(
  shopDomain: string,
  type: WidgetType,
  id: string,
) {
  return {
    id,
    shopDomain,
    type,
  };
}

export function activeWidgetScope(
  shopDomain: string,
  type: WidgetType,
  excludedId?: string,
) {
  return {
    shopDomain,
    type,
    status: WIDGET_STATUSES.ACTIVE,
    ...(excludedId
      ? {
          id: {
            not: excludedId,
          },
        }
      : {}),
  };
}
