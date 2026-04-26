import { ImageStudio } from "@/components/ImageStudio";
import { readPromptFromSearchParam } from "@/components/studioPrompt";

type HomeSearchParams = Promise<{
  prompt?: string | string[];
}>;

export default async function Home({
  searchParams
}: {
  searchParams: HomeSearchParams;
}) {
  const params = await searchParams;
  const initialPrompt = readPromptFromSearchParam(params.prompt) || "";

  return <ImageStudio initialPrompt={initialPrompt} />;
}
