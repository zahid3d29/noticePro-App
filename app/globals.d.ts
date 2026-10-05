declare module "*.css";

import type { AnchorHTMLAttributes, HTMLAttributes } from "react";

/* eslint-disable @typescript-eslint/no-namespace */
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "s-app-nav": HTMLAttributes<HTMLElement>;
      "s-link": AnchorHTMLAttributes<HTMLAnchorElement>;
    }
  }
}
