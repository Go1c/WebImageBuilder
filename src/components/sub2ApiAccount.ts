import type { Sub2ApiUser } from "@/server/sub2api/client";

export type Sub2ApiSessionView = {
  authenticated: boolean;
  user: Sub2ApiUser | null;
};

export function formatSub2ApiBalance(balance: number | undefined): string {
  return `$${Number(balance || 0).toFixed(2)}`;
}

export function getSub2ApiAccountLabel(session: Sub2ApiSessionView | null): string {
  if (!session?.authenticated || !session.user) {
    return "登录";
  }

  return session.user.email || session.user.username || "已登录";
}
