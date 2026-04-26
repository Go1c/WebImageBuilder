import "../../../v2.css";
import { V2ProjectDetailPage } from "@/components/lumio/V2ProjectDetailPage";

export const metadata = { title: "项目详情 · Lumio v2" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <V2ProjectDetailPage id={id} />;
}
