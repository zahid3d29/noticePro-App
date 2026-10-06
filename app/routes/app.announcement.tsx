import { Form, Link, useActionData, useLoaderData } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import LoadingSubmitButton from "../components/LoadingSubmitButton";

import { authenticate } from "../shopify.server";
import db from "../db.server";

import {
  WIDGET_STATUSES,
  WIDGET_TYPES,
} from "../features/widgets/widget.constants";
import {
  activeWidgetScope,
  widgetIdScope,
  widgetScope,
} from "../features/widgets/widget.server";
import { redirectWithSuccessToast } from "../features/widgets/success-toast.server";
import { getAuthenticatedAppPlan } from "../features/billing/admin-plan.server";
import {
  canActivateAnotherWidget,
  type AppPlan,
} from "../features/billing/plan-policy.server";

function toDateTimeLocal(value: Date | null | undefined) {
  if (!value) return "";

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const editId = url.searchParams.get("edit");

  const widgets = await db.widget.findMany({
    where: widgetScope(session.shop, WIDGET_TYPES.ANNOUNCEMENT),

    orderBy: {
      createdAt: "desc",
    },
  });

  const editingWidget = editId
    ? await db.widget.findFirst({
        where: widgetIdScope(session.shop, WIDGET_TYPES.ANNOUNCEMENT, editId),
      })
    : null;

  return {
    widgets,
    editingWidget,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const actionType = String(formData.get("_action") || "create");
  const widgetId = String(formData.get("widgetId") || "");

  if (actionType === "delete") {
    if (!widgetId) {
      return {
        error: "The widget could not be found.",
      };
    }
    const deleted = await db.widget.deleteMany({
      where: widgetIdScope(session.shop, WIDGET_TYPES.ANNOUNCEMENT, widgetId),
    });

    if (deleted.count === 0) {
      return { error: "The announcement could not be found." };
    }

    return redirectWithSuccessToast("announcement", "deleted");
  }

  const name = String(formData.get("name") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const buttonText = String(formData.get("buttonText") || "").trim();
  const buttonUrl = String(formData.get("buttonUrl") || "").trim();
  const position = String(formData.get("position") || "TOP");
  const backgroundColor = String(formData.get("backgroundColor") || "#111827");
  const textColor = String(formData.get("textColor") || "#FFFFFF");
  const status = String(formData.get("status") || "DRAFT");
  const dismissible = formData.get("dismissible") === "on";

  const startsAtValue = String(formData.get("startsAt") || "").trim();
  const endsAtValue = String(formData.get("endsAt") || "").trim();

  const startsAt = startsAtValue ? new Date(startsAtValue) : null;
  const endsAt = endsAtValue ? new Date(endsAtValue) : null;

  if (startsAt && Number.isNaN(startsAt.getTime())) {
    return {
      error: "Please enter a valid start date and time.",
    };
  }

  if (endsAt && Number.isNaN(endsAt.getTime())) {
    return {
      error: "Please enter a valid end date and time.",
    };
  }

  if (startsAt && endsAt && endsAt <= startsAt) {
    return {
      error: "The end date must be after the start date.",
    };
  }

  if (!name) {
    return {
      error: "Please enter a widget name.",
    };
  }

  if (!message) {
    return {
      error: "Please enter the announcement message.",
    };
  }

  if (actionType === "update") {
    if (!widgetId) {
      return {
        error: "The widget could not be found.",
      };
    }

    const existingWidget = await db.widget.findFirst({
      where: widgetIdScope(session.shop, WIDGET_TYPES.ANNOUNCEMENT, widgetId),
    });

    if (!existingWidget) {
      return {
        error: "The widget could not be found.",
      };
    }
  }

  if (status === WIDGET_STATUSES.ACTIVE) {
    const activeWidgetCount = await db.widget.count({
      where: activeWidgetScope(
        session.shop,
        WIDGET_TYPES.ANNOUNCEMENT,
        actionType === "update" && widgetId ? widgetId : undefined,
      ),
    });

    // The first active Announcement is allowed on Free.
    // Verify Pro only when exceeding that allowance.
    if (activeWidgetCount >= 1) {
      let plan: AppPlan;

      try {
        plan = await getAuthenticatedAppPlan(admin, session.shop);
      } catch {
        return {
          error:
            "We could not verify your plan. Please try again, or save this Announcement as a draft.",
        };
      }

      if (!canActivateAnotherWidget(plan, activeWidgetCount)) {
        return {
          error:
            "The Free plan allows one active Announcement. Save this one as a draft or deactivate your current Announcement first.",
        };
      }
    }
  }

  const widgetData = {
    type: WIDGET_TYPES.ANNOUNCEMENT,
    name,
    status,
    message,
    buttonText: buttonText || null,
    buttonUrl: buttonUrl || null,
    position,
    backgroundColor,
    textColor,
    dismissible,
    startsAt,
    endsAt,
  };

  if (actionType === "update") {
    const updated = await db.widget.updateMany({
      where: widgetIdScope(session.shop, WIDGET_TYPES.ANNOUNCEMENT, widgetId),
      data: widgetData,
    });

    if (updated.count === 0) {
      return { error: "The announcement could not be found." };
    }
  } else {
    await db.widget.create({
      data: {
        shopDomain: session.shop,
        ...widgetData,
      },
    });
  }

  return redirectWithSuccessToast(
    "announcement",
    actionType === "update" ? "updated" : "created",
  );
}

export default function AppHome() {
  const { widgets, editingWidget } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const isEditing = Boolean(editingWidget);

  return (
    <s-page heading="Announcement">
      {actionData?.error ? (
        <s-banner tone="critical" heading="Couldn't save announcement">
          {actionData.error}
        </s-banner>
      ) : null}

      <s-section
        heading={
          isEditing ? "Edit announcement bar" : "Create announcement bar"
        }
      >
        <div style={{ display: "grid", gap: "16px" }}>
          <p>
            Create an announcement for your storefront. You can preview saved
            announcements below.
          </p>

          <s-banner tone="info" heading="Free plan: one active widget per type">
            You can run one Announcement, one Notice, and one Countdown at the
            same time. To activate another Announcement, save it as a draft or
            deactivate your current Announcement first.
          </s-banner>

          <Form method="post">
            <input
              type="hidden"
              name="_action"
              value={isEditing ? "update" : "create"}
            />

            {editingWidget ? (
              <input type="hidden" name="widgetId" value={editingWidget.id} />
            ) : null}

            <div
              style={{
                display: "grid",
                gap: "16px",
                maxWidth: "720px",
              }}
            >
              <s-text-field
                label="Widget name"
                name="name"
                placeholder="Weekend sale announcement"
                defaultValue={editingWidget?.name ?? ""}
                required
              />

              <s-text-area
                label="Announcement message"
                name="message"
                placeholder="Free shipping on orders over $50"
                rows={4}
                defaultValue={editingWidget?.message ?? ""}
                required
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "16px",
                }}
              >
                <s-text-field
                  label="Button text, optional"
                  name="buttonText"
                  placeholder="Shop now"
                  defaultValue={editingWidget?.buttonText ?? ""}
                />

                <label>
                  Button URL, optional
                  <input
                    name="buttonUrl"
                    type="url"
                    placeholder="https://your-store.com/collections/sale"
                    defaultValue={editingWidget?.buttonUrl ?? ""}
                    style={{
                      display: "block",
                      boxSizing: "border-box",
                      width: "100%",
                      marginTop: "6px",
                      padding: "10px",
                      border: "1px solid #8c9196",
                      borderRadius: "8px",
                    }}
                  />
                </label>
              </div>

              <s-select
                label="Position"
                name="position"
                value={editingWidget?.position ?? "TOP"}
              >
                <s-option value="TOP">Top of page</s-option>
                <s-option value="BOTTOM">Bottom of page</s-option>
              </s-select>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "16px",
                }}
              >
                <label>
                  Background color
                  <input
                    name="backgroundColor"
                    type="color"
                    defaultValue={editingWidget?.backgroundColor ?? "#111827"}
                    style={{ display: "block", marginTop: "6px" }}
                  />
                </label>

                <label>
                  Text color
                  <input
                    name="textColor"
                    type="color"
                    defaultValue={editingWidget?.textColor ?? "#FFFFFF"}
                    style={{ display: "block", marginTop: "6px" }}
                  />
                </label>
              </div>

              <s-checkbox
                name="dismissible"
                value="on"
                label="Allow visitors to close the announcement"
                defaultChecked={editingWidget?.dismissible ?? true}
              />

              <s-select
                label="Save as"
                name="status"
                value={editingWidget?.status ?? "DRAFT"}
              >
                <s-option value="DRAFT">Draft</s-option>
                <s-option value="ACTIVE">Active</s-option>
              </s-select>

              <p style={{ margin: 0 }}>
                Optional schedule. Times use your store server’s local timezone.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "16px",
                }}
              >
                <label>
                  Starts at
                  <input
                    name="startsAt"
                    type="datetime-local"
                    defaultValue={toDateTimeLocal(editingWidget?.startsAt)}
                    style={{
                      display: "block",
                      boxSizing: "border-box",
                      width: "100%",
                      marginTop: "6px",
                      padding: "10px",
                      border: "1px solid #8c9196",
                      borderRadius: "8px",
                    }}
                  />
                </label>

                <label>
                  Ends at
                  <input
                    name="endsAt"
                    type="datetime-local"
                    defaultValue={toDateTimeLocal(editingWidget?.endsAt)}
                    style={{
                      display: "block",
                      boxSizing: "border-box",
                      width: "100%",
                      marginTop: "6px",
                      padding: "10px",
                      border: "1px solid #8c9196",
                      borderRadius: "8px",
                    }}
                  />
                </label>
              </div>

              <div
                style={{ display: "flex", gap: "12px", alignItems: "center" }}
              >
                <LoadingSubmitButton
                  label={
                    isEditing ? "Update announcement" : "Save announcement"
                  }
                  pendingLabel={isEditing ? "Saving…" : "Creating…"}
                />

                {isEditing ? <Link to="/app/announcement">Cancel</Link> : null}
              </div>
            </div>
          </Form>
        </div>
      </s-section>

      <s-section heading="Your announcements">
        {widgets.length === 0 ? (
          <p>
            No announcements yet. Use the form above to create your first one.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "16px" }}>
            {widgets.map((widget) => (
              <div
                key={widget.id}
                style={{
                  display: "grid",
                  gap: "12px",
                  padding: "16px",
                  border: "1px solid #d1d5db",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <strong>{widget.name}</strong>
                  <s-badge
                    color={widget.status === "ACTIVE" ? "strong" : "base"}
                  >
                    {widget.status}
                  </s-badge>
                </div>

                <p style={{ margin: 0 }}>{widget.message}</p>

                <div>
                  <strong>Storefront preview</strong>
                  <div
                    style={{
                      marginTop: "8px",
                      padding: "14px 18px",
                      backgroundColor: widget.backgroundColor,
                      color: widget.textColor,
                      textAlign: "center",
                      borderRadius: "8px",
                    }}
                  >
                    <span>{widget.message}</span>

                    {widget.buttonText && widget.buttonUrl ? (
                      <a
                        href={widget.buttonUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-block",
                          marginLeft: "12px",
                          padding: "6px 12px",
                          color: widget.backgroundColor,
                          backgroundColor: widget.textColor,
                          borderRadius: "4px",
                          textDecoration: "none",
                        }}
                      >
                        {widget.buttonText}
                      </a>
                    ) : null}
                  </div>
                </div>

                <div
                  style={{ display: "flex", gap: "12px", alignItems: "center" }}
                >
                  <Link to={`?edit=${widget.id}`}>Edit</Link>

                  <Form method="post">
                    <input type="hidden" name="_action" value="delete" />
                    <input type="hidden" name="widgetId" value={widget.id} />

                    <LoadingSubmitButton
                      intent="delete"
                      widgetId={widget.id}
                      label="Delete"
                      pendingLabel="Deleting…"
                    />
                  </Form>
                </div>
              </div>
            ))}
          </div>
        )}
      </s-section>
    </s-page>
  );
}
