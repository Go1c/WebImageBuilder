import { ShareReportButton } from "@/components/ShareReportButton";
import { ShareProtectedImage } from "@/components/ShareProtectedImage";
import { ShareUnavailableRedirect } from "@/components/ShareUnavailableRedirect";
import { getPromptShare } from "@/server/db/repositories";
import { PROMPT_SHARE_COMPLIANCE_NOTICE, buildPromptTryUrl } from "@/server/shares";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  if (!share) {
    return <ShareUnavailableRedirect />;
  }

  const tryUrl = buildPromptTryUrl(share.prompt);

  return (
    <main className="share-page">
      <section className="share-card" aria-label="提示词分享">
        <div className="share-image-wrap">
          <ShareProtectedImage
            imageUrl={share.imageUrl}
            alt="分享缩略图"
            watermark={PROMPT_SHARE_COMPLIANCE_NOTICE}
          />
        </div>
        <div className="share-content">
          <p className="share-eyebrow">Lumio 提示词分享</p>
          <h1>用这个提示词生成图片</h1>
          <p className="share-compliance">{PROMPT_SHARE_COMPLIANCE_NOTICE}</p>
          <p className="share-prompt">{share.prompt}</p>
          <div className="share-actions">
            <a className="share-primary" href={tryUrl}>
              快去试试
            </a>
            <ShareReportButton shareId={id} />
          </div>
        </div>
      </section>
    </main>
  );
}
