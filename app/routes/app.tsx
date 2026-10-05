import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
// import type { AnchorHTMLAttributes, HTMLAttributes } from "react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";
import AppLoadingIndicator from "../components/AppLoadingIndicator";
import loadingIndicatorStyles from "../components/AppLoadingIndicator.css?url";
import SuccessToastController from "../components/SuccessToastController";



export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};
export const links = () => [
  {
    rel: "stylesheet",
    href: loadingIndicatorStyles,
  },
];


export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Dashboard</s-link>
        <s-link href="/app/announcement">Announcement</s-link>
        <s-link href="/app/notice">Notice</s-link>
        <s-link href="/app/countdown">Countdown</s-link>
      </s-app-nav>
      <AppLoadingIndicator />
      <SuccessToastController />
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
