import prisma from "../db.server";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

export async function loader() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers,
    });
  } catch {
    return new Response(JSON.stringify({ status: "unavailable" }), {
      status: 503,
      headers,
    });
  }
}
