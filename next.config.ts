import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb"
    }
  },
  // 无限画布(canvas-app, Vite SPA)构建产物置于 public/canvas/。
  // /canvas 及其客户端路由回退到 SPA 入口；真实静态资源(assets/icons)先于
  // fallback 由文件系统命中，正常直出。
  async rewrites() {
    return {
      beforeFiles: [{ source: "/canvas", destination: "/canvas/index.html" }],
      afterFiles: [],
      fallback: [{ source: "/canvas/:path*", destination: "/canvas/index.html" }]
    };
  }
};

export default nextConfig;
