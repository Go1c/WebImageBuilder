import { adminQuery, isLocalPreview } from "../db";
import { transaction } from "@/server/db/client";

export type MaterialStatus = "active" | "hidden";

export type MaterialRow = {
  id: string;
  title: string;
  category: string;
  prompt: string;
  imageUrl: string;
  sortOrder: number;
  status: MaterialStatus;
  createdAt: string;
};

export type PublicMaterial = {
  id: string;
  title: string;
  category: string;
  prompt: string;
  imageUrl: string;
  caseNumber: number;
};

export type MaterialPatch = {
  title?: string;
  category?: string;
  prompt?: string;
  imageUrl?: string;
  sortOrder?: number;
  status?: MaterialStatus;
};

const MOCK_MATERIALS: MaterialRow[] = [
  { title: "城市生命系统图谱", category: "信息图可视化", prompt: "以生命系统隐喻绘制城市脉络，血管化道路与器官化建筑，等距信息图风格", status: "active" },
  { title: "复古胶片人像", category: "人像写真", prompt: "复古胶片质感人像，柔和暖调，颗粒感，35mm 电影镜头，浅景深", status: "active" },
  { title: "极简产品静物", category: "产品电商", prompt: "极简主义产品静物摄影，纯色背景，柔光，高级质感，居中构图", status: "active" },
  { title: "水彩儿童插画", category: "插画风格", prompt: "温暖治愈的水彩儿童插画，柔和笔触，明快色彩，绘本风格", status: "active" },
  { title: "赛博霓虹街景", category: "场景概念", prompt: "赛博朋克霓虹街景，雨夜反光，紫青光效，未来都市概念图", status: "active" },
  { title: "国风工笔花鸟", category: "插画风格", prompt: "中国风工笔花鸟画，细腻线条，绢本设色，留白构图，典雅意境", status: "active" },
  { title: "3D 等距办公室", category: "信息图可视化", prompt: "3D 等距视角办公室场景，柔和材质，扁平配色，微缩模型质感", status: "active" },
  { title: "高级美食摄影", category: "产品电商", prompt: "高级美食摄影，自然光，蒸汽升腾，浅景深，杂志级质感", status: "active" },
  { title: "蒸汽波海报", category: "平面设计", prompt: "蒸汽波复古海报，霓虹渐变，网格与雕塑元素，80 年代未来主义", status: "active" },
  { title: "证件照换装", category: "人像写真", prompt: "标准证件照，纯色背景，正装换装，柔光均匀，专业修图", status: "active" },
  { title: "建筑剖面图解", category: "信息图可视化", prompt: "建筑剖面结构图解，等距透视，标注引线，工程蓝图风格", status: "hidden" },
  { title: "盲盒手办渲染", category: "产品电商", prompt: "盲盒手办 3D 渲染，光滑塑料质感，柔和棚拍光，可爱潮玩风格", status: "active" }
].map((item, index) => ({
  id: `m${index + 1}`,
  title: item.title,
  category: item.category,
  prompt: item.prompt,
  imageUrl: "",
  sortOrder: index + 1,
  status: item.status as MaterialStatus,
  createdAt: new Date(Date.now() - (index + 1) * 3600000).toISOString()
}));

export async function listMaterials(params: { category?: string; status?: "all" | "active" | "hidden" }): Promise<MaterialRow[]> {
  const status = params.status || "all";

  if (isLocalPreview()) {
    let rows = MOCK_MATERIALS.slice();
    if (params.category) rows = rows.filter((r) => r.category === params.category);
    if (status !== "all") rows = rows.filter((r) => r.status === status);
    return rows.sort((a, b) => a.sortOrder - b.sortOrder || b.createdAt.localeCompare(a.createdAt));
  }

  const conditions: string[] = [];
  const args: unknown[] = [];
  if (params.category) { args.push(params.category); conditions.push(`category = $${args.length}`); }
  if (status !== "all") { args.push(status); conditions.push(`status = $${args.length}`); }
  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";

  const result = await adminQuery<{
    id: string; title: string; category: string; prompt: string; image_url: string;
    sort_order: number; status: MaterialStatus; created_at: string;
  }>(
    `
      select id, title, category, prompt, image_url, sort_order, status, created_at
      from material_items
      ${where}
      order by sort_order asc, created_at desc
    `,
    args
  );

  return result.rows.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    prompt: r.prompt,
    imageUrl: r.image_url,
    sortOrder: r.sort_order,
    status: r.status,
    createdAt: r.created_at
  }));
}

export async function listCategories(): Promise<string[]> {
  if (isLocalPreview()) {
    return Array.from(new Set(MOCK_MATERIALS.map((r) => r.category).filter(Boolean))).sort();
  }

  const result = await adminQuery<{ category: string }>(
    `select distinct category from material_items where category <> '' order by 1`
  );
  return result.rows.map((r) => r.category);
}

export async function createMaterial(input: {
  title: string;
  category: string;
  prompt: string;
  imageUrl: string;
  storageKey?: string | null;
  mimeType?: string | null;
  createdBy?: string | null;
}): Promise<string> {
  if (isLocalPreview()) {
    return `m_${Date.now()}`;
  }

  const result = await adminQuery<{ id: string }>(
    `
      insert into material_items (title, category, prompt, image_url, storage_key, image_mime_type, sort_order, created_by)
      values ($1, $2, $3, $4, $5, $6, (select coalesce(max(sort_order), 0) + 1 from material_items), $7)
      returning id
    `,
    [input.title, input.category, input.prompt, input.imageUrl, input.storageKey ?? null, input.mimeType ?? null, input.createdBy ?? null]
  );
  return result.rows[0].id;
}

export async function updateMaterial(id: string, patch: MaterialPatch): Promise<boolean> {
  if (isLocalPreview()) {
    return true;
  }

  const sets: string[] = [];
  const args: unknown[] = [];
  const push = (column: string, value: unknown) => { args.push(value); sets.push(`${column} = $${args.length}`); };

  if (patch.title !== undefined) push("title", patch.title);
  if (patch.category !== undefined) push("category", patch.category);
  if (patch.prompt !== undefined) push("prompt", patch.prompt);
  if (patch.imageUrl !== undefined) push("image_url", patch.imageUrl);
  if (patch.sortOrder !== undefined) push("sort_order", patch.sortOrder);
  if (patch.status !== undefined) push("status", patch.status);

  if (sets.length === 0) {
    return false;
  }

  sets.push("updated_at = now()");
  args.push(id);
  const result = await adminQuery(`update material_items set ${sets.join(", ")} where id = $${args.length}`, args);
  return (result.rowCount ?? 0) > 0;
}

export async function deleteMaterial(id: string): Promise<boolean> {
  if (isLocalPreview()) {
    return true;
  }

  const result = await adminQuery(`delete from material_items where id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function reorderMaterials(ids: string[]): Promise<boolean> {
  if (isLocalPreview()) {
    return true;
  }

  await transaction(async (client) => {
    for (let index = 0; index < ids.length; index += 1) {
      await client.query(`update material_items set sort_order = $1, updated_at = now() where id = $2`, [index, ids[index]]);
    }
  });
  return true;
}

export async function listPublicMaterials(): Promise<PublicMaterial[]> {
  if (isLocalPreview()) {
    return MOCK_MATERIALS
      .filter((r) => r.status === "active")
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((r) => ({ id: r.id, title: r.title, category: r.category, prompt: r.prompt, imageUrl: r.imageUrl, caseNumber: r.sortOrder }));
  }

  const result = await adminQuery<{ id: string; title: string; category: string; prompt: string; image_url: string; case_number: number | null }>(
    `
      select id, title, category, prompt, image_url, coalesce(legacy_case_number, sort_order) as case_number
      from material_items
      where status = 'active'
      order by sort_order asc
    `
  );
  return result.rows.map((r) => ({ id: r.id, title: r.title, category: r.category, prompt: r.prompt, imageUrl: r.image_url, caseNumber: Number(r.case_number ?? 0) }));
}
