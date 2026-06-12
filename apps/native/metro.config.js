const path = require("node:path");
const { config: loadEnv } = require("dotenv");

loadEnv({ path: path.resolve(__dirname, ".env") });

const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const {
	wrapWithReanimatedMetroConfig,
} = require("react-native-reanimated/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const monorepoRoot = path.resolve(__dirname, "../..");
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
	path.resolve(__dirname, "node_modules"),
	path.resolve(monorepoRoot, "node_modules"),
];

const uniwindConfig = withUniwindConfig(wrapWithReanimatedMetroConfig(config), {
	cssEntryFile: "./global.css",
	dtsFile: "./uniwind-types.d.ts",
});

uniwindConfig.resolver.assetExts = [
	...uniwindConfig.resolver.assetExts,
	"lottie",
];

module.exports = uniwindConfig;
