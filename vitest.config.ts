import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            exclude: ["src/server.ts", "src/tools/connectStrava.ts"],
            thresholds: {
                lines: 70,
                functions: 70,
            },
        },
    },
});
