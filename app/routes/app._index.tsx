import { Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";

import db from "../db.server";
import { authenticate } from "../shopify.server";
import {
  WIDGET_STATUSES,
  WIDGET_TYPES,
} from "../features/widgets/widget.constants";
import { getAuthenticatedAppPlan } from "../features/billing/admin-plan.server";

const solutions = [
  {
    type: WIDGET_TYPES.ANNOUNCEMENT,
    title: "Announcement",
    href: "/app/announcement",
    placement: "App embed",
    description:
      "Share a sitewide message in a top or bottom announcement bar.",
    setup: "Enable the Announcement app embed in the theme you want to use.",
    accent: "#2563EB",
  },
  {
    type: WIDGET_TYPES.NOTICE,
    title: "Notice",
    href: "/app/notice",
    placement: "App block",
    description:
      "Place delivery updates or helpful information near relevant content.",
    setup: "Add the Notice app block to a compatible section or page template.",
    accent: "#B45309",
  },
  {
    type: WIDGET_TYPES.COUNTDOWN,
    title: "Countdown",
    href: "/app/countdown",
    placement: "App embed",
    description:
      "Highlight a real offer deadline with a responsive countdown bar.",
    setup:
      "Enable the Countdown app embed, then check its deadline and placement.",
    accent: "#0F766E",
  },
] as const;

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);

  let plan: Awaited<ReturnType<typeof getAuthenticatedAppPlan>> | null = null;

  try {
    plan = await getAuthenticatedAppPlan(admin, session.shop);
  } catch {
    console.warn("NoticePro Dashboard plan verification unavailable.");
  }

  const groups = await db.widget.groupBy({
    by: ["type", "status"],
    where: {
      shopDomain: session.shop,
      type: {
        in: [
          WIDGET_TYPES.ANNOUNCEMENT,
          WIDGET_TYPES.NOTICE,
          WIDGET_TYPES.COUNTDOWN,
        ],
      },
    },
    _count: { _all: true },
  });

  const cards = solutions.map((solution) => {
    const matchingGroups = groups.filter(
      (group) => group.type === solution.type,
    );

    const saved = matchingGroups.reduce(
      (sum, group) => sum + group._count._all,
      0,
    );

    const active = matchingGroups
      .filter((group) => group.status === WIDGET_STATUSES.ACTIVE)
      .reduce((sum, group) => sum + group._count._all, 0);

    const draft = matchingGroups
      .filter((group) => group.status === WIDGET_STATUSES.DRAFT)
      .reduce((sum, group) => sum + group._count._all, 0);

    return { ...solution, saved, active, draft };
  });

  const totals = cards.reduce(
    (sum, card) => ({
      saved: sum.saved + card.saved,
      active: sum.active + card.active,
      draft: sum.draft + card.draft,
    }),
    { saved: 0, active: 0, draft: 0 },
  );

  const shopHandle = session.shop.replace(/\.myshopify\.com$/, "");

  const pricingPlansUrl =
    `https://admin.shopify.com/store/${encodeURIComponent(shopHandle)}` +
    "/charges/noticepro-alerts-countdowns/pricing_plans";

  return { cards, totals, plan, pricingPlansUrl };
}

const dashboardGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
  gap: "16px",
};

const dashboardCardStyle = {
  padding: "20px",
  border: "1px solid #DDE0E4",
  borderRadius: "12px",
  background: "#FFFFFF",
};

export default function DashboardPage() {
  const { cards, totals, plan, pricingPlansUrl } =
    useLoaderData<typeof loader>();

  const metrics = [
    { label: "Saved widgets", value: totals.saved },
    { label: "Configured as Active", value: totals.active },
    { label: "Draft widgets", value: totals.draft },
  ];

  return (
    <s-page heading="NoticePro">
      <s-section heading="Your storefront messaging">
        <p style={{ marginTop: 0, color: "#4B5563", lineHeight: 1.6 }}>
          Manage announcements, contextual notices, and offer countdowns from
          one place.
        </p>

        <div style={dashboardGridStyle}>
          {metrics.map((metric) => (
            <div key={metric.label} style={dashboardCardStyle}>
              <p
                style={{
                  margin: "0 0 8px",
                  color: "#4B5563",
                  fontSize: "14px",
                }}
              >
                {metric.label}
              </p>
              <p
                style={{
                  margin: 0,
                  color: "#111827",
                  fontSize: "32px",
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        <p
          style={{
            marginBottom: 0,
            color: "#4B5563",
            fontSize: "13px",
            lineHeight: 1.6,
          }}
        >
          These counts reflect saved settings. Storefront visibility also
          depends on theme placement, scheduling, and visitor dismissal. A
          Countdown may remain configured as Active after its deadline and
          display its expiry message.
        </p>
      </s-section>

      <s-section heading="Your solutions">
        <div style={dashboardGridStyle}>
          {cards.map((card) => (
            <article
              key={card.type}
              style={{
                ...dashboardCardStyle,
                borderTop: `4px solid ${card.accent}`,
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div>
                <p
                  style={{
                    margin: "0 0 8px",
                    color: "#4B5563",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {card.placement}
                </p>

                <h2
                  style={{
                    margin: 0,
                    fontSize: "20px",
                    color: "#111827",
                  }}
                >
                  {card.title}
                </h2>
              </div>

              <p
                style={{
                  margin: 0,
                  color: "#4B5563",
                  lineHeight: 1.6,
                }}
              >
                {card.description}
              </p>

              <dl
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "8px",
                  margin: 0,
                  padding: "12px 0",
                  borderTop: "1px solid #ECEEF0",
                  borderBottom: "1px solid #ECEEF0",
                }}
              >
                {[
                  { label: "Saved", value: card.saved },
                  { label: "Active setting", value: card.active },
                  { label: "Draft", value: card.draft },
                ].map((stat) => (
                  <div key={stat.label}>
                    <dt
                      style={{
                        fontSize: "12px",
                        color: "#4B5563",
                      }}
                    >
                      {stat.label}
                    </dt>
                    <dd
                      style={{
                        margin: "6px 0 0",
                        fontSize: "20px",
                        fontWeight: 600,
                        color: "#111827",
                      }}
                    >
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <p
                style={{
                  margin: 0,
                  color: "#4B5563",
                  fontSize: "13px",
                  lineHeight: 1.6,
                }}
              >
                {card.setup}
              </p>

              <Link
                to={card.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "44px",
                  padding: "0 16px",
                  borderRadius: "8px",
                  background: "#303030",
                  color: "#FFFFFF",
                  fontWeight: 600,
                  textDecoration: "none",
                  marginTop: "auto",
                }}
              >
                {card.saved === 0
                  ? `Create ${card.title}`
                  : `Manage ${card.title}`}
              </Link>
            </article>
          ))}
        </div>
      </s-section>

      <s-section heading="Storefront setup">
        <ol
          style={{
            margin: 0,
            paddingLeft: "20px",
            color: "#4B5563",
            lineHeight: 1.8,
          }}
        >
          <li>Create a widget and save it as Active when ready.</li>
          <li>
            Enable Announcement and Countdown through app embeds. Place Notice
            through an app block.
          </li>
          <li>
            Preview the intended theme and page, check mobile layout, and save
            your theme changes.
          </li>
        </ol>

        <p style={{ marginBottom: 0, color: "#4B5563" }}>
          This dashboard does not verify whether your theme embeds or blocks are
          enabled.
        </p>
      </s-section>
      <s-section
        heading={
          plan === "PRO"
            ? "Pro allowance"
            : plan === "FREE"
              ? "Free allowance"
              : "Plan verification unavailable"
        }
      >
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          {plan === "PRO"
            ? "Pro allows unlimited active Announcements, Notices, and Countdowns. Storefront display still depends on theme placement, scheduling, and visitor dismissal."
            : plan === "FREE"
              ? "Free displays up to one eligible Announcement, one eligible Notice, and one eligible Countdown together. Additional widgets can be saved as drafts. Records retained after a downgrade are not deleted."
              : "We could not verify your current plan. Your saved widgets and counts remain available. Refresh to retry. Additional Active saves still require successful server-side plan verification."}
        </p>
        <p style={{ marginBottom: 0 }}>
          <a href={pricingPlansUrl} target="_top">
            Manage plan
          </a>
        </p>
      </s-section>
    </s-page>
  );
}
