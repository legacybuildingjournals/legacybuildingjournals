import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// convex-test runs functions against a simulated Convex backend, which
		// needs the edge runtime rather than node.
		environment: "edge-runtime",
		include: ["convex/**/*.test.ts"],
		server: { deps: { inline: ["convex-test"] } },
	},
});
