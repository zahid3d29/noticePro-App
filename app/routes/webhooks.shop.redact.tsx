import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}; deleting shop data.`);

  await db.widget.deleteMany({
    where: { shopDomain: shop },
  });

  await db.session.deleteMany({
    where: { shop },
  });

  return new Response();
};
