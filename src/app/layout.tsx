import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lumio Image Studio",
  description: "Gemini and GPT Image generation workspace"
};

/**
 * 创作中心 · 主题引导
 * 在首帧绘制前根据偏好写入 <html data-theme>，避免深色闪烁。
 * 默认不写入任何属性（浅色），线上体验零影响；
 * ?theme=dark opt-in 并持久化，?theme=light 复位——供灰度预览与切换。
 */
const THEME_BOOTSTRAP =
  "(function(){try{var K='lumio-theme';var q=new URL(window.location.href).searchParams.get('theme');" +
  "if(q==='dark'||q==='light'){localStorage.setItem(K,q);}var t=localStorage.getItem(K);" +
  "if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');}" +
  "else{document.documentElement.removeAttribute('data-theme');}}catch(e){}})();";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        {children}
      </body>
    </html>
  );
}
