import "../v2.css";
import { V2App } from "@/components/lumio/V2App";

export const metadata = {
  title: "Lumio v2 · 重做版"
};

export default async function V2Page({
  searchParams
}: {
  searchParams?: Promise<{ project?: string }>;
}) {
  const params = await searchParams;
  return <V2App forceSessionId={params?.project} />;
}
