import { defineConfig, mergeRsbuildConfig } from "@rsbuild/core";
import { releaseMainPath, srcMainPath } from "./paths";
import { join } from "node:path";
import CommonConfig from "./rsbuild.common";

const Config = defineConfig({
    tools: {
        rspack: {
            target: "electron-main",
        },
    },
    source: {
        entry: {
            index: join(srcMainPath, "./index.ts"),
            preload: join(srcMainPath, "./preload.ts"),
        },
    },
    output: {
        target: "node",
        distPath: {
            root: join(releaseMainPath),
        },
        cleanDistPath: true,
    },
});

module.exports = mergeRsbuildConfig(CommonConfig, Config);
