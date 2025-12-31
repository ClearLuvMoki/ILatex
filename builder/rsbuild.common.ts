import { defineConfig, loadEnv } from "@rsbuild/core";

const { publicVars } = loadEnv({
    prefixes: [""],
    cwd: `${process.cwd()}/env`,
    mode: process.env?.NODE_ENV === "development" ? "dev" : "",
});

const CommonConfig = defineConfig({
    tools: {
        rspack: {
            ignoreWarnings: [/Critical dependency/],
        },
    },
    performance: {
        buildCache: false,
    },
    source: {
        define: publicVars,
        decorators: {
            version: "legacy",
        },
    }
});

export default CommonConfig;
