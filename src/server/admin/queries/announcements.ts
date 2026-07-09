import { adminQuery, isLocalPreview } from "../db";

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  placement: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

export type AnnouncementInput = {
  title: string;
  body: string;
  placement: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
};

const MOCK_ANNOUNCEMENTS: AnnouncementRow[] = [
  {
    id: "an_1",
    title: "夏季创作大赛开启 🎨",
    body: "参与夏季创作大赛，上传你的最佳 AI 作品，赢取海量额度与周边奖励！",
    placement: "home_banner",
    status: "active",
    startsAt: "2026-07-01T00:00:00Z",
    endsAt: "2026-07-31T23:59:59Z",
    createdAt: "2026-06-28T00:00:00Z"
  },
  {
    id: "an_2",
    title: "新模型 gpt-image-2 上线",
    body: "全新 gpt-image-2 模型已上线，画质与出图速度全面提升，欢迎体验。",
    placement: "home_notice",
    status: "active",
    startsAt: null,
    endsAt: null,
    createdAt: "2026-06-20T00:00:00Z"
  },
  {
    id: "an_3",
    title: "系统维护通知",
    body: "平台已于 6 月 15 日凌晨完成计划内维护，服务已全部恢复，感谢理解。",
    placement: "global_modal",
    status: "ended",
    startsAt: "2026-06-14T16:00:00Z",
    endsAt: "2026-06-15T02:00:00Z",
    createdAt: "2026-06-13T00:00:00Z"
  },
  {
    id: "an_4",
    title: "邀请奖励翻倍",
    body: "限时活动：邀请好友注册，双方额度奖励翻倍，敬请期待正式开启。",
    placement: "login_banner",
    status: "draft",
    startsAt: null,
    endsAt: null,
    createdAt: "2026-07-05T00:00:00Z"
  }
];

export async function listAnnouncements(): Promise<AnnouncementRow[]> {
  if (isLocalPreview()) {
    return MOCK_ANNOUNCEMENTS;
  }

  const result = await adminQuery<{
    id: string;
    title: string;
    body: string;
    placement: string;
    status: string;
    starts_at: string | null;
    ends_at: string | null;
    created_at: string;
  }>(
    `
      select id, title, body, placement, status, starts_at, ends_at, created_at
      from announcements
      order by created_at desc
    `
  );

  return result.rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    placement: r.placement,
    status: r.status,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    createdAt: r.created_at
  }));
}

export async function createAnnouncement(input: AnnouncementInput): Promise<string> {
  if (isLocalPreview()) {
    return `an_${Date.now()}`;
  }

  const result = await adminQuery<{ id: string }>(
    `
      insert into announcements (title, body, placement, status, starts_at, ends_at)
      values ($1, $2, $3, $4, $5, $6)
      returning id
    `,
    [input.title, input.body, input.placement, input.status, input.startsAt, input.endsAt]
  );

  return result.rows[0]!.id;
}

export async function updateAnnouncement(
  id: string,
  patch: Partial<AnnouncementInput>
): Promise<boolean> {
  if (isLocalPreview()) {
    return true;
  }

  const columns: Record<keyof AnnouncementInput, string> = {
    title: "title",
    body: "body",
    placement: "placement",
    status: "status",
    startsAt: "starts_at",
    endsAt: "ends_at"
  };

  const sets: string[] = [];
  const args: unknown[] = [];
  (Object.keys(columns) as Array<keyof AnnouncementInput>).forEach((key) => {
    if (patch[key] !== undefined) {
      args.push(patch[key]);
      sets.push(`${columns[key]} = $${args.length}`);
    }
  });

  if (sets.length === 0) {
    return false;
  }

  sets.push(`updated_at = now()`);
  args.push(id);

  const result = await adminQuery(
    `update announcements set ${sets.join(", ")} where id = $${args.length}`,
    args
  );

  return (result.rowCount ?? 0) > 0;
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  if (isLocalPreview()) {
    return true;
  }

  const result = await adminQuery(`delete from announcements where id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}
