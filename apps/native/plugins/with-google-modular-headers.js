const { withDangerousMod } = require("expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

/**
 * Clerk's native Google sign-in pulls in the Swift pods `AppCheckCore`,
 * `GoogleUtilities` and `RecaptchaInterop`, which don't define Clang modules.
 * CocoaPods refuses to integrate them as static libraries unless modular
 * headers are enabled, failing the iOS build during `pod install` with:
 *
 *   "The following Swift pods cannot yet be integrated as static libraries..."
 *
 * We enable `:modular_headers => true` for only those pods (rather than a
 * global `use_modular_headers!`, which breaks React Native's own pods).
 */
const PODS_NEEDING_MODULAR_HEADERS = [
	"GoogleUtilities",
	"RecaptchaInterop",
	"AppCheckCore",
	"GoogleSignIn",
	"AppAuth",
	"GTMSessionFetcher",
	"GTMAppAuth",
];

module.exports = function withGoogleModularHeaders(config) {
	return withDangerousMod(config, [
		"ios",
		(config) => {
			const podfilePath = path.join(
				config.modRequest.platformProjectRoot,
				"Podfile",
			);
			let contents = fs.readFileSync(podfilePath, "utf8");

			const marker = "# >>> google modular headers";
			if (contents.includes(marker)) {
				return config;
			}

			const podLines = PODS_NEEDING_MODULAR_HEADERS.map(
				(name) => `  pod '${name}', :modular_headers => true`,
			).join("\n");
			const block = `\n  ${marker}\n${podLines}\n  # <<< google modular headers\n`;

			// Insert just inside the main app target block so the directives
			// apply to the same target that autolinks the Google pods.
			const targetRegex = /(target\s+['"][^'"]+['"]\s+do\n)/;
			if (!targetRegex.test(contents)) {
				throw new Error(
					"[with-google-modular-headers] Could not find an iOS target block in the Podfile.",
				);
			}
			contents = contents.replace(targetRegex, `$1${block}`);

			fs.writeFileSync(podfilePath, contents);
			return config;
		},
	]);
};
