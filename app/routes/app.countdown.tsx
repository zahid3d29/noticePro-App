import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useLocation,
} from "react-router";
import { useEffect, useState } from "react";

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import db from "../db.server";
import { authenticate } from "../shopify.server";
import {
  WIDGET_STATUSES,
  WIDGET_TYPES,
} from "../features/widgets/widget.constants";
import {
  activeWidgetScope,
  widgetIdScope,
  widgetScope,
} from "../features/widgets/widget.server";
import CountdownPreview from "../features/widgets/CountdownPreview";
import LoadingSubmitButton from "../components/LoadingSubmitButton";
import { redirectWithSuccessToast } from "../features/widgets/success-toast.server";
import { getAuthenticatedAppPlan } from "../features/billing/admin-plan.server";
import {
  canActivateAnotherWidget,
  type AppPlan,
} from "../features/billing/plan-policy.server";


export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const editId = new URL(request.url).searchParams.get("edit");

  const countdowns = await db.widget.findMany({
    where: widgetScope(session.shop, WIDGET_TYPES.COUNTDOWN),
    orderBy: { createdAt: "desc" },
  });

  const editingCountdown = editId
    ? await db.widget.findFirst({
        where: widgetIdScope(session.shop, WIDGET_TYPES.COUNTDOWN, editId),
      })
    : null;

  return { countdowns, editingCountdown };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const actionType = String(formData.get("_action") || "create");
  const widgetId = String(formData.get("widgetId") || "");

  if (!["create", "update", "delete"].includes(actionType)) {
    return { error: "Invalid Countdown action." };
  }

  if (actionType === "delete") {
    if (!widgetId) {
      return { error: "The Countdown could not be found." };
    }

    const deleted = await db.widget.deleteMany({
      where: widgetIdScope(session.shop, WIDGET_TYPES.COUNTDOWN, widgetId),
    });

    if (deleted.count === 0) {
      return { error: "The Countdown could not be found." };
    }

    return redirectWithSuccessToast("countdown", "deleted");
  }



  const existingCountdown =
    actionType === "update" && widgetId
      ? await db.widget.findFirst({
          where: widgetIdScope(session.shop, WIDGET_TYPES.COUNTDOWN, widgetId),
        })
      : null;

  if (actionType === "update" && !existingCountdown) {
    return { error: "The Countdown could not be found." };
  }

  const name = String(formData.get("name") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const status = String(formData.get("status") || "DRAFT");

  const backgroundColor = String(
    formData.get("backgroundColor") || "#00B9B8",
  ).trim();

  const textColor = String(formData.get("textColor") || "#FFFFFF").trim();

  const deadlineValue = String(formData.get("countdownEndsAt") || "").trim();

  const countdownTimeZone = String(
    formData.get("countdownTimeZone") || "UTC",
  ).trim();

  const countdownExpiredText =
    String(formData.get("countdownExpiredText") || "").trim() || "Expired!";

  const countdownShowDays = formData.get("countdownShowDays") === "on";

  const countdownSticky = formData.get("countdownSticky") === "on";

  const countdownDesktopOffset = Number(
    formData.get("countdownDesktopOffset") || 0,
  );

  const countdownMobileOffset = Number(
    formData.get("countdownMobileOffset") || 0,
  );

  if (!name) {
    return { error: "Please enter a Countdown name." };
  }

  if (!message) {
    return { error: "Please enter the offer message." };
  }

  if (status !== WIDGET_STATUSES.DRAFT && status !== WIDGET_STATUSES.ACTIVE) {
    return { error: "Please choose Draft or Active." };
  }

  if (
    !/^#[0-9a-f]{6}$/i.test(backgroundColor) ||
    !/^#[0-9a-f]{6}$/i.test(textColor)
  ) {
    return { error: "Please choose valid six-digit hex colors." };
  }

  // Require an explicit UTC marker or offset.
  // The admin form will convert the browser-local input to ISO UTC.
  if (!/(Z|[+-]\d{2}:\d{2})$/i.test(deadlineValue)) {
    return { error: "Please enter a valid deadline with a timezone." };
  }

  const countdownEndsAt = new Date(deadlineValue);

  if (Number.isNaN(countdownEndsAt.getTime())) {
    return { error: "Please enter a valid Countdown deadline." };
  }

  try {
    new Intl.DateTimeFormat("en", {
      timeZone: countdownTimeZone,
    }).format(countdownEndsAt);
  } catch {
    return { error: "The Countdown timezone is invalid." };
  }

  const offsets = [countdownDesktopOffset, countdownMobileOffset];

  if (
    offsets.some(
      (value) => !Number.isInteger(value) || value < 0 || value > 200,
    )
  ) {
    return {
      error: "Sticky offsets must be whole numbers from 0 to 200 pixels.",
    };
  }

  if (status === WIDGET_STATUSES.ACTIVE) {
    // Allow an already-active timer to retain its expired state,
    // but do not newly activate a timer whose deadline has passed.
    if (
      existingCountdown?.status !== WIDGET_STATUSES.ACTIVE &&
      countdownEndsAt.getTime() <= Date.now()
    ) {
      return {
        error: "Choose a future deadline before activating this Countdown.",
      };
    }

    const activeCount = await db.widget.count({
      where: activeWidgetScope(
        session.shop,
        WIDGET_TYPES.COUNTDOWN,
        actionType === "update" ? widgetId : undefined,
      ),
    });
    if (activeCount >= 1) {
      let plan: AppPlan;

      try {
        plan = await getAuthenticatedAppPlan(admin, session.shop);
      } catch {
        return {
          error:
            "We could not verify your plan. Please try again, or save this Countdown as a draft.",
        };
      }

      if (!canActivateAnotherWidget(plan, activeCount)) {
        return {
          error:
            "The Free plan allows one active Countdown. Save this one as a draft or deactivate your current Countdown first.",
        };
      }
    }

  }

  const countdownData = {
    type: WIDGET_TYPES.COUNTDOWN,
    name,
    message,
    status,
    position: "TOP",
    backgroundColor,
    textColor,
    dismissible: false,
    countdownEndsAt,
    countdownTimeZone,
    countdownShowDays,
    countdownSticky,
    countdownDesktopOffset,
    countdownMobileOffset,
    countdownExpiredText,
  };

  if (actionType === "update") {
    const updated = await db.widget.updateMany({
      where: widgetIdScope(session.shop, WIDGET_TYPES.COUNTDOWN, widgetId),
      data: countdownData,
    });

    if (updated.count === 0) {
      return { error: "The Countdown could not be found." };
    }
  } else {
    await db.widget.create({
      data: {
        shopDomain: session.shop,
        ...countdownData,
      },
    });
  }

  return redirectWithSuccessToast(
    "countdown",
    actionType === "update" ? "updated" : "created",
  );
}

const countdownInputStyle = {
  boxSizing: "border-box" as const,
  display: "block",
  width: "100%",
  marginTop: "6px",
  padding: "10px",
  border: "1px solid #8c9196",
  borderRadius: "8px",
  font: "inherit",
};

function toLocalDateInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())}T${pad(date.getHours())}:` +
    `${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

export default function CountdownPage() {
  const { countdowns, editingCountdown } = useLoaderData<typeof loader>();

  const actionData = useActionData<typeof action>();
  const location = useLocation();

  const [deadlineLocal, setDeadlineLocal] = useState("");
  const [timeZone, setTimeZone] = useState("UTC");
  const [ready, setReady] = useState(false);

  const storedDeadline = editingCountdown?.countdownEndsAt
    ? new Date(editingCountdown.countdownEndsAt).toISOString()
    : "";

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");

    const deadline = storedDeadline
      ? new Date(storedDeadline)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    setDeadlineLocal(toLocalDateInput(deadline));
    setReady(true);
  }, [storedDeadline, location.key]);

  let deadlineISO = "";

  if (deadlineLocal) {
    const parsedDeadline = new Date(deadlineLocal);

    if (!Number.isNaN(parsedDeadline.getTime())) {
      deadlineISO = parsedDeadline.toISOString();
    }
  }

  const isEditing = Boolean(editingCountdown);

  return (
    <s-page heading="Countdown">
      {actionData?.error ? (
        <s-banner tone="critical" heading="Couldn't save Countdown">
          {actionData.error}
        </s-banner>
      ) : null}

      <s-section heading={isEditing ? "Edit Countdown" : "Create Countdown"}>
        <div style={{ display: "grid", gap: "16px" }}>
          <p>Create a deadline-based offer timer for your storefront.</p>

          <s-banner tone="info" heading="Free plan: one active widget per type">
            You can run one Announcement, one Notice, and one Countdown at the
            same time.
          </s-banner>

          <Form
            method="post"
            key={`${editingCountdown?.id || "new"}:${location.key}`}
          >
            <input
              type="hidden"
              name="_action"
              value={isEditing ? "update" : "create"}
            />

            {editingCountdown ? (
              <input
                type="hidden"
                name="widgetId"
                value={editingCountdown.id}
              />
            ) : null}

            <input type="hidden" name="countdownEndsAt" value={deadlineISO} />

            <input type="hidden" name="countdownTimeZone" value={timeZone} />

            <div
              style={{
                display: "grid",
                gap: "16px",
                maxWidth: "720px",
              }}
            >
              <label>
                Countdown name
                <input
                  name="name"
                  required
                  defaultValue={editingCountdown?.name ?? ""}
                  placeholder="Weekend sale"
                  style={countdownInputStyle}
                />
              </label>

              <label>
                Offer message
                <textarea
                  name="message"
                  required
                  rows={3}
                  defaultValue={
                    editingCountdown?.message ?? "Special offer ends soon!"
                  }
                  style={countdownInputStyle}
                />
              </label>

              <label>
                Deadline date and time
                <input
                  type="datetime-local"
                  step={1}
                  required
                  value={deadlineLocal}
                  onChange={(event) => setDeadlineLocal(event.target.value)}
                  style={countdownInputStyle}
                />
              </label>

              <p>
                {ready
                  ? `Enter the deadline in your browser timezone: ${timeZone}.`
                  : "Loading your browser timezone…"}{" "}
                The deadline is stored as a UTC instant. Editing it displays
                that same instant in your current browser timezone.
              </p>

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
                    type="color"
                    name="backgroundColor"
                    defaultValue={
                      editingCountdown?.backgroundColor ?? "#00B9B8"
                    }
                    style={{
                      ...countdownInputStyle,
                      height: "48px",
                      padding: "4px",
                    }}
                  />
                </label>

                <label>
                  Text color
                  <input
                    type="color"
                    name="textColor"
                    defaultValue={editingCountdown?.textColor ?? "#FFFFFF"}
                    style={{
                      ...countdownInputStyle,
                      height: "48px",
                      padding: "4px",
                    }}
                  />
                </label>
              </div>

              <label>
                <input
                  type="checkbox"
                  name="countdownShowDays"
                  defaultChecked={editingCountdown?.countdownShowDays ?? false}
                />{" "}
                Show days separately
              </label>

              <p>
                When days are hidden, the timer will display the total remaining
                hours instead.
              </p>

              <label>
                <input
                  type="checkbox"
                  name="countdownSticky"
                  defaultChecked={editingCountdown?.countdownSticky ?? false}
                />{" "}
                Keep the Countdown bar visible while scrolling
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "16px",
                }}
              >
                <label>
                  Desktop sticky offset, px
                  <input
                    type="number"
                    name="countdownDesktopOffset"
                    min={0}
                    max={200}
                    step={1}
                    defaultValue={editingCountdown?.countdownDesktopOffset ?? 0}
                    style={countdownInputStyle}
                  />
                </label>

                <label>
                  Mobile sticky offset, px
                  <input
                    type="number"
                    name="countdownMobileOffset"
                    min={0}
                    max={200}
                    step={1}
                    defaultValue={editingCountdown?.countdownMobileOffset ?? 0}
                    style={countdownInputStyle}
                  />
                </label>
              </div>

              <p>Offsets apply only when sticky mode is enabled.</p>

              <label>
                Text shown after expiry
                <input
                  name="countdownExpiredText"
                  defaultValue={
                    editingCountdown?.countdownExpiredText ?? "Expired!"
                  }
                  style={countdownInputStyle}
                />
              </label>

              <label>
                Status
                <select
                  name="status"
                  defaultValue={
                    editingCountdown?.status ?? WIDGET_STATUSES.DRAFT
                  }
                  style={countdownInputStyle}
                >
                  <option value={WIDGET_STATUSES.DRAFT}>Draft</option>
                  <option value={WIDGET_STATUSES.ACTIVE}>Active</option>
                </select>
              </label>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <LoadingSubmitButton
                  label={isEditing ? "Save changes" : "Create Countdown"}
                  pendingLabel={isEditing ? "Saving…" : "Creating…"}
                  disabled={!ready || !deadlineISO}
                />

                {isEditing ? (
                  <Link to="/app/countdown">Cancel editing</Link>
                ) : null}
              </div>
            </div>
          </Form>
        </div>
      </s-section>

      <s-section heading="Saved Countdowns">
        {countdowns.length === 0 ? (
          <p>No Countdowns yet. Create your first one above.</p>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {countdowns.map((countdown) => (
              <div
                key={countdown.id}
                style={{
                  padding: "16px",
                  border: "1px solid #d2d5d8",
                  borderRadius: "10px",
                  display: "grid",
                  gap: "8px",
                }}
              >
                <p style={{ margin: 0, fontWeight: 600 }}>{countdown.name}</p>

                <p style={{ margin: 0 }}>Status: {countdown.status}</p>

                <p style={{ margin: 0 }}>{countdown.message}</p>

                <p style={{ margin: 0 }}>
                  Deadline:{" "}
                  {countdown.countdownEndsAt
                    ? new Date(countdown.countdownEndsAt).toISOString()
                    : "Not set"}{" "}
                  — UTC
                </p>
                <CountdownPreview
                  deadlineISO={
                    countdown.countdownEndsAt
                      ? new Date(countdown.countdownEndsAt).toISOString()
                      : null
                  }
                  message={countdown.message}
                  backgroundColor={countdown.backgroundColor}
                  textColor={countdown.textColor}
                  showDays={countdown.countdownShowDays}
                  expiredText={countdown.countdownExpiredText}
                />

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "16px",
                  }}
                >
                  <Link
                    to={`/app/countdown?edit=${encodeURIComponent(
                      countdown.id,
                    )}`}
                  >
                    Edit
                  </Link>

                  <Form
                    method="post"
                    onSubmit={(event) => {
                      if (
                        !window.confirm(
                          "Delete this Countdown? This cannot be undone.",
                        )
                      ) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="_action" value="delete" />
                    <input type="hidden" name="widgetId" value={countdown.id} />
                    <LoadingSubmitButton
                      intent="delete"
                      widgetId={countdown.id}
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
