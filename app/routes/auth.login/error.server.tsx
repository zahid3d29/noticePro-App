import type { LoginError } from "@shopify/shopify-app-react-router/server";
import { LoginErrorType } from "@shopify/shopify-app-react-router/server";

interface LoginErrorMessage {
  shop?: string;
}

export function loginErrorMessage(loginErrors: LoginError): LoginErrorMessage {
  if (loginErrors?.shop === LoginErrorType.MissingShop) {
    return { shop: "Open NoticePro from your Shopify admin to continue." };

  } else if (loginErrors?.shop === LoginErrorType.InvalidShop) {
    return {
      shop: "This shop information is invalid. Reopen NoticePro from your Shopify admin.",
    };

  }

  return {};
}
