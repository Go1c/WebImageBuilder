import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const sourceRoot = process.argv[2] || "/Users/cui/Downloads/awesome-gpt-image-2-main";
const repoRoot = process.cwd();
const docs = ["docs/gallery-part-1.md", "docs/gallery-part-2.md"];
const publicDir = path.join(repoRoot, "public/prompt-library");
const outputFile = path.join(repoRoot, "src/components/promptLibrary.ts");

mkdirSync(publicDir, { recursive: true });

const items = [];

for (const doc of docs) {
  const docPath = path.join(sourceRoot, doc);
  const markdown = readFileSync(docPath, "utf8").replace(/\r\n/g, "\n");
  const caseBlocks = markdown.split(/\n(?=<a name="case-\d+"><\/a>)/g);

  for (const block of caseBlocks) {
    const caseMatch = block.match(/<a name="case-(\d+)"><\/a>/);
    const headingMatch = block.match(/###\s+例\s+\d+：([^\n]+)/);
    const imageMatch = block.match(/!\[([\s\S]*?)\]\((\.\.\/data\/images\/[^)]+)\)/);
    const promptMatch = block.match(/\*\*提示词：\*\*\s*\n+```text\n([\s\S]*?)\n```/);

    if (!caseMatch || !headingMatch || !imageMatch || !promptMatch) {
      continue;
    }

    const caseNumber = Number(caseMatch[1]);
    const sourceImage = path.resolve(path.dirname(docPath), imageMatch[2]);
    if (!existsSync(sourceImage)) {
      throw new Error(`Image not found for case ${caseNumber}: ${sourceImage}`);
    }

    const extension = path.extname(sourceImage).toLowerCase();
    const fileName = `case${caseNumber}${extension}`;
    copyFileSync(sourceImage, path.join(publicDir, fileName));

    items.push({
      id: `case-${caseNumber}`,
      caseNumber,
      title: imageMatch[1].replace(/\s+/g, " ").trim() || headingMatch[1].trim(),
      category: headingMatch[1].trim(),
      image: `/prompt-library/${fileName}`,
      prompt: promptMatch[1].trim()
    });
  }
}

items.sort((left, right) => left.caseNumber - right.caseNumber);

const output = `export type PromptLibraryItem = {
  id: string;
  caseNumber: number;
  title: string;
  category: string;
  image: string;
  prompt: string;
};

export const promptLibraryItems = ${JSON.stringify(items, null, 2)} satisfies PromptLibraryItem[];
`;

writeFileSync(outputFile, output);
console.log(`Imported ${items.length} prompt library items into ${path.relative(repoRoot, outputFile)}`);
