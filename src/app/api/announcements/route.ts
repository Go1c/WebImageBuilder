import { listActivePublicAnnouncements } from "@/server/admin/queries/announcements";
import { jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const active = await listActivePublicAnnouncements();
    const rows = active.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      placement: "home_banner" as const,
      startsAt: row.startsAt,
      endsAt: row.endsAt
    }));
    return jsonOk({ rows });
  } catch (error) {
    return jsonError(error);
  }
}
