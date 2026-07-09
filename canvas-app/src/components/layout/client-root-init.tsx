import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { App } from "antd";

import { createModelChannel, useConfigStore } from "@/stores/use-config-store";
import { useAssetStore } from "@/stores/use-asset-store";

export function ClientRootInit({ children }: { children: ReactNode }) {
    const { message } = App.useApp();
    const handledConfigParams = useRef(false);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const config = useConfigStore((state) => state.config);
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);

    useEffect(() => {
        if (handledConfigParams.current) return;
        const searchParams = new URLSearchParams(window.location.search);
        const baseUrl = searchParams.get("baseUrl") || searchParams.get("baseurl");
        const apiKey = searchParams.get("apiKey") || searchParams.get("apikey");
        if (!baseUrl && !apiKey) return;
        handledConfigParams.current = true;
        searchParams.delete("baseUrl");
        searchParams.delete("baseurl");
        searchParams.delete("apiKey");
        searchParams.delete("apikey");
        window.history.replaceState(null, "", `${window.location.pathname}${searchParams.size ? `?${searchParams}` : ""}${window.location.hash}`);
        const firstChannel = config.channels[0];
        updateConfig(
            "channels",
            firstChannel
                ? config.channels.map((channel, index) =>
                      index === 0
                          ? {
                                ...channel,
                                ...(baseUrl ? { baseUrl } : {}),
                                ...(apiKey ? { apiKey } : {}),
                            }
                          : channel,
                  )
                : [createModelChannel({ id: "default", name: "默认渠道", baseUrl: baseUrl || undefined, apiKey: apiKey || "" })],
        );
        if (baseUrl) updateConfig("baseUrl", baseUrl);
        if (apiKey) updateConfig("apiKey", apiKey);
        openConfigDialog(false);
        message.success("已导入本地直连配置");
    }, [config.channels, message, openConfigDialog, updateConfig]);

    // Lumio 语境桥：生图站点「在画布中打开」会把图写进同源 localStorage。
    // 这里读取并加入「我的素材」，用户即可拖到画布上继续迭代。
    // 全程 try/catch 隔离：任何失败(如跨域取图)都只提示，绝不影响画布加载。
    const handledHandoff = useRef(false);
    useEffect(() => {
        if (handledHandoff.current) return;
        let raw: string | null = null;
        try {
            raw = window.localStorage.getItem("lumio:canvas-handoff");
        } catch {
            return;
        }
        if (!raw) return;
        handledHandoff.current = true;
        try {
            window.localStorage.removeItem("lumio:canvas-handoff");
        } catch {
            /* ignore */
        }
        let payload: { url?: string; prompt?: string } = {};
        try {
            payload = JSON.parse(raw) as { url?: string; prompt?: string };
        } catch {
            return;
        }
        if (!payload.url) return;
        void (async () => {
            try {
                const res = await fetch(payload.url as string);
                const blob = await res.blob();
                const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result));
                    reader.onerror = () => reject(new Error("read failed"));
                    reader.readAsDataURL(blob);
                });
                const dims = await new Promise<{ w: number; h: number }>((resolve) => {
                    const img = new window.Image();
                    img.onload = () => resolve({ w: img.naturalWidth || 1024, h: img.naturalHeight || 1024 });
                    img.onerror = () => resolve({ w: 1024, h: 1024 });
                    img.src = dataUrl;
                });
                useAssetStore.getState().addAsset({
                    kind: "image",
                    title: payload.prompt?.slice(0, 40) || "来自生图",
                    data: { dataUrl, width: dims.w, height: dims.h, bytes: blob.size, mimeType: blob.type || "image/png" },
                });
                message.success("已从生图带入一张图，在「我的素材」里，可拖到画布");
            } catch {
                message.info("已从生图跳转到画布（图片带入失败，可在生图站重试）");
            }
        })();
    }, [message]);

    return <>{children}</>;
}
