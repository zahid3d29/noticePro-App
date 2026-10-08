import type { LoaderFunctionArgs } from "react-router";
import { Link, redirect } from "react-router";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (shop !== null && shop.trim().length > 0) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return null;
};

export default function App() {
  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>NoticePro: Alerts &amp; Countdowns</h1>

        <p className={styles.text}>
          Create announcement bars, storefront notices, and deadline-based
          countdowns.
        </p>

        <p className={styles.text}>
          If NoticePro is installed, open it from your Shopify admin to manage
          your widgets.
        </p>

        <p className={styles.text}>
          <Link to="/privacy">Privacy policy</Link>
          {" · "}
          <a href="mailto:noticeproapp@gmail.com">Contact support</a>
        </p>
      </div>
    </div>
  );
}
