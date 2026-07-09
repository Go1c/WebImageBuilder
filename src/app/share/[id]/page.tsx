import { ShareReportButton } from "@/components/ShareReportButton";
import { SharePromptCopyButton } from "@/components/SharePromptCopyButton";
import { ShareProtectedImage } from "@/components/ShareProtectedImage";
import { ShareUnavailableRedirect } from "@/components/ShareUnavailableRedirect";
import { getPromptShare } from "@/server/db/repositories";
import { buildPromptShareImageUrl, buildPromptTryUrl } from "@/server/shares";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// 访客预览水印:内容安全要求,不可移除。
const SHARE_PREVIEW_WATERMARK = "img.lumio.games · 仅供预览";

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const share = await getPromptShare(id);

  return {
    title: share ? "Lumio 提示词分享" : "分享不存在",
    description: share ? share.prompt.slice(0, 120) : "该分享不存在或已不可访问"
  };
}

export default async function PromptSharePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const share = await getPromptShare(id);

  const topbar = <ShareTopbar />;

  if (!share) {
    return (
      <>
        {topbar}
        <ShareUnavailableRedirect />
      </>
    );
  }

  const tryUrl = buildPromptTryUrl(share.prompt);
  const imageUrl = buildPromptShareImageUrl(id);
  const relativeTime = formatRelativeTime(share.createdAt);

  return (
    <>
      {topbar}
      <main className="share-page">
        <section className="share-card" aria-label="提示词分享">
          <div className="share-image-wrap">
            <ShareProtectedImage
              imageUrl={imageUrl}
              alt="分享图片预览"
              watermark={SHARE_PREVIEW_WATERMARK}
            />
          </div>
          <div className="share-content">
            <p className="share-eyebrow">LUMIO 提示词卡片</p>
            <h1>用这条提示词生成图片</h1>
            {/* share-params(模型 / 比例·分辨率 / 细节)暂无数据来源,数据齐备后补齐 */}
            <pre className="share-prompt">{share.prompt}</pre>
            {relativeTime ? (
              <span className="share-author">{relativeTime}生成</span>
            ) : null}
            <a className="share-cta" href={tryUrl}>
              ✦ 我也要生成 · 免费 3 次
            </a>
            <div className="share-secondary">
              <SharePromptCopyButton prompt={share.prompt} />
              <a href={imageUrl} download>
                下载图片
              </a>
              <ShareReportButton shareId={id} />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

// 访客精简顶栏:品牌 + 免费额度 + 登录。不出现完整导航——访客动线聚焦转化。
// 「全站已生成 N 次」计数在本站无数据来源,按诚实原则省略,不编造。
function ShareTopbar() {
  return (
    <header className="studio-topbar" aria-label="站点顶栏">
      <a className="studio-brand" href="/">
        <span className="studio-brand-mark" aria-hidden="true">
          ✦
        </span>
        <span>LumioImageStudio</span>
      </a>
      <div className="studio-account">
        <span className="pill quota-pill">
          免费体验 <strong>3 次</strong>
        </span>
        <a className="pill login-pill" href="/">
          登录
        </a>
      </div>
    </header>
  );
}

function formatRelativeTime(iso: string): string | null {
  const created = new Date(iso).getTime();
  if (Number.isNaN(created)) {
    return null;
  }

  const diffMs = Date.now() - created;
  if (diffMs < 0) {
    return "刚刚";
  }

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    const minutes = Math.max(1, Math.floor(diffMs / minute));
    return `${minutes} 分钟前`;
  }
  if (diffMs < day) {
    return `${Math.floor(diffMs / hour)} 小时前`;
  }
  if (diffMs < 30 * day) {
    return `${Math.floor(diffMs / day)} 天前`;
  }
  return `${Math.floor(diffMs / (30 * day))} 个月前`;
}
