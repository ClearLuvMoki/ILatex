import { lazy } from "react";
import { Route, Routes } from "react-router";
import RouterPath from "./paths";

const SidePage = lazy(() => import("@/render/pages/sider"));
const TabPage = lazy(() => import("@/render/pages/tab"));
const CodeEditorPage = lazy(() => import("@/render/pages/code-editor"));
const ImageEditorPage = lazy(() => import("@/render/pages/image-editor"));
const MarkdownEditorPage = lazy(() => import("@/render/pages/markdown-editor"));
const PreviewPage = lazy(() => import("@/render/pages/preview"));

export const RichRouters = [
  { path: RouterPath.Sider, component: <SidePage /> },
  { path: RouterPath.Tabs, component: <TabPage /> },
  { path: RouterPath.CodeEditor, component: <CodeEditorPage /> },
  { path: RouterPath.ImageEditor, component: <ImageEditorPage /> },
  { path: RouterPath.MarkdownEditor, component: <MarkdownEditorPage /> },
  { path: RouterPath.Preview, component: <PreviewPage /> },
];

export const Routers = () => {
  return (
    <Routes>
      {RichRouters.map((route) => {
        return <Route key={route.path} path={route.path} element={route.component} />;
      })}
    </Routes>
  );
};
