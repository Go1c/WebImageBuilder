import { createBrowserRouter, Outlet } from "react-router-dom";

import UserLayout from "@/layouts/user-layout";
import AssetsPage from "@/pages/assets";
import CanvasPage from "@/pages/canvas";
import CanvasProjectPage from "@/pages/canvas/project";
import ConfigPage from "@/pages/config";
import HomePage from "@/pages/home";
import ImagePage from "@/pages/image";
import NotFound from "@/pages/not-found";
import PromptsPage from "@/pages/prompts";
import VideoPage from "@/pages/video";

// Lumio 集成：嵌入 Next 的 /canvas 子路径时用 Vite BASE_URL 作 react-router basename，
// 独立运行(base "/")时 basename 为空，两种部署都成立。
const routerBasename = import.meta.env.BASE_URL.replace(/\/+$/, "");

export const router = createBrowserRouter(
    [
        {
            element: (
                <UserLayout>
                    <Outlet />
                </UserLayout>
            ),
            children: [
                { path: "/", element: <HomePage /> },
                { path: "/image", element: <ImagePage /> },
                { path: "/video", element: <VideoPage /> },
                { path: "/assets", element: <AssetsPage /> },
                { path: "/prompts", element: <PromptsPage /> },
                { path: "/canvas", element: <CanvasPage /> },
                { path: "/canvas/:id", element: <CanvasProjectPage /> },
                { path: "/config", element: <ConfigPage /> },
            ],
        },
        { path: "*", element: <NotFound /> },
    ],
    { basename: routerBasename || undefined }
);
