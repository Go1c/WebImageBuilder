import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { AppConfigModal } from "@/components/layout/app-config-modal";
import { AppTopNav } from "@/components/layout/app-top-nav";
import { UnifiedTopbar } from "@/components/layout/unified-topbar";

export default function UserLayout({ children }: { children: ReactNode }) {
    const { pathname } = useLocation();
    // Editor routes (`/canvas`, `/canvas/:id`) stay full-screen and keep their
    // own chrome (AppTopNav / in-editor back affordance) untouched. Every other
    // route gets the unified topbar so the SPA reads as the same product as the
    // main Lumio studio.
    const isEditor = pathname === "/canvas" || pathname.startsWith("/canvas/");

    return (
        <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
            {isEditor ? (
                <AppTopNav />
            ) : (
                <>
                    <UnifiedTopbar />
                    {/* AppTopNav normally mounts the shared config modal; keep it
                        available on non-editor pages (image/video 配置 buttons). */}
                    <AppConfigModal />
                </>
            )}
            <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </div>
    );
}
