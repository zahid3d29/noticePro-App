export const meta = () => [
  { title: "Privacy Policy | NoticePro" },
  {
    name: "description",
    content: "Privacy and data-handling information for NoticePro.",
  },
  { name: "robots", content: "noindex" },
];

export default function PrivacyPage() {
  return (
    <main
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "40px 20px",
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#111827",
        lineHeight: 1.7,
        overflowWrap: "anywhere",
      }}
    >
      <h1>NoticePro Privacy Policy</h1>
      <p>Last updated: 6 October 2026</p>

      <p>
        Draft for the current hosted testing configuration. This policy must be
        reviewed before production launch.
      </p>

      <p>
        NoticePro: Alerts &amp; Countdowns is operated by Zahidul Islam, based
        in Bangladesh. This policy describes information handled when merchants
        use the app and visitors interact with its storefront widgets.
      </p>

      <h2>Information we process</h2>
      <p>
        NoticePro stores the Shopify store domain and widget settings entered by
        merchants, including names, messages, button text and links, appearance,
        status, schedules, countdown deadlines, and timestamps. Messages and
        enabled links are intended for public storefront display.
      </p>
      <p>
        Authentication-session records may include access and refresh tokens,
        session expiry, permissions, and merchant or staff account information
        such as user ID, name, email, and locale.
      </p>
      <p>
        NoticePro queries Shopify subscription information to determine Free or
        Pro entitlement. The reviewed application database has no dedicated
        customer or order records.
      </p>

      <h2>How information is used</h2>
      <p>
        Information is used to authenticate the app, save and display widgets,
        calculate countdowns, apply plan allowances, and respond to relevant
        data-deletion requests.
      </p>

      <h2>Browser storage</h2>
      <p>
        NoticePro uses local storage in a visitor&apos;s browser to remember
        dismissed Announcements and Notices. The stored key includes the widget
        identifier and up to the first 80 characters of its displayed message,
        with a dismissal flag. URL encoding is not encryption.
      </p>
      <p>
        The app does not set an automatic expiry for these entries. Visitors can
        remove them by clearing the store&apos;s site data in their browser. The
        dismissal flag is not explicitly included in the widget requests shown
        in the reviewed storefront code.
      </p>

      <h2>Service providers and technical information</h2>
      <p>
        The current hosted testing setup uses Shopify, Render for application
        hosting, and Neon for database hosting. These providers process
        information needed to deliver their services.
      </p>
      <p>
        Requests to the app may involve technical information such as network
        addresses and request metadata processed by hosting infrastructure.
        Application logs include operational events and shop domains.
      </p>

      <h2>Retention and deletion</h2>
      <p>
        Widget settings remain stored while the app is in use. Uninstalling does
        not immediately delete widget settings under the current implementation.
        When NoticePro receives and successfully processes Shopify&apos;s
        shop-data erasure webhook, it deletes matching widget and
        authentication-session records from the live application database.
      </p>
      <p>
        Under the current hosting configuration, Render application logs are
        available for 7 days, and Neon database change history has a 6-hour
        recovery window. Deleted information may remain in recovery history
        until that window expires. These settings do not guarantee immediate
        erasure of every provider-held copy.
      </p>
      <p>
        No separate hosted database exports or external log streaming are
        currently configured. Browser dismissal entries are stored separately on
        visitors&apos; devices and are not removed by server-side deletion.
        Production hosting and retention settings will be reviewed before
        launch.
      </p>

      <h2>Privacy requests and contact</h2>
      <p>
        To ask about access, correction, or deletion of information handled by
        NoticePro, contact Zahidul Islam at{" "}
        <a href="mailto:noticeproapp@gmail.com">noticeproapp@gmail.com</a>. We
        may need to verify your identity and connection to the relevant store
        before acting on a request.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        This policy may be updated when functionality or data-handling practices
        change. The published page will show its latest revision date.
      </p>
    </main>
  );
}
