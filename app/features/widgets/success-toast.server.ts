import { randomUUID } from "node:crypto";
import { redirect } from "react-router";

type Solution = "announcement" | "notice" | "countdown";
type Operation = "created" | "updated" | "deleted";

export function redirectWithSuccessToast(
  solution: Solution,
  operation: Operation,
) {
  const params = new URLSearchParams({
    noticeproToast: `${solution}.${operation}`,
    noticeproToastId: randomUUID(),
  });

  return redirect(`/app/${solution}?${params.toString()}`);
}
