import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lumio Image Studio",
  description: "Gemini and GPT Image generation workspace"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
