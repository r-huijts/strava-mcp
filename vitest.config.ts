import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "text-summary"],
            include: [
                "src/tools/getActivityComments.ts",
            ],
            thresholds: {
                lines: 80,
                branches: 80,
            },
        },
    },
});
