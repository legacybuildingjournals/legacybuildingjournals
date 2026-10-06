#!/usr/bin/env node
/**
 * Bumps `expo.version` in app.json — the marketing version users see on the
 * store listing (1.0.9), not the build number.
 *
 * EAS cannot do this for us. `autoIncrement` in eas.json only accepts a
 * boolean in the pinned eas-cli, and with `appVersionSource: "remote"` it
 * increments the iOS buildNumber / Android versionCode that EAS tracks on its
 * own servers. The version string has always been hand-edited, which is easy
 * to forget and ships two different builds claiming to be the same version.
 *
 * Usage:
 *   node scripts/bump-app-version.mjs                # 1.0.9 -> 1.0.10
 *   node scripts/bump-app-version.mjs --minor        # 1.0.9 -> 1.1.0
 *   node scripts/bump-app-version.mjs --major        # 1.0.9 -> 2.0.0
 *   node scripts/bump-app-version.mjs --set 1.2.3    # exact
 *   node scripts/bump-app-version.mjs --no-commit    # leave it uncommitted
 *   node scripts/bump-app-version.mjs --dry-run      # print, change nothing
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appJsonPath = join(
	dirname(dirname(fileURLToPath(import.meta.url))),
	"app.json",
);
const args = new Set(process.argv.slice(2));
const setIndex = process.argv.indexOf("--set");
const explicit = setIndex === -1 ? null : process.argv[setIndex + 1];

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

function nextVersion(current) {
	if (explicit) {
		if (!SEMVER.test(explicit)) {
			throw new Error(`--set expects MAJOR.MINOR.PATCH, got "${explicit}"`);
		}
		return explicit;
	}

	const match = SEMVER.exec(current);
	if (!match) {
		throw new Error(
			`expo.version is "${current}", which is not MAJOR.MINOR.PATCH. Pass --set to fix it.`,
		);
	}

	const [major, minor, patch] = match.slice(1).map(Number);
	if (args.has("--major")) return `${major + 1}.0.0`;
	if (args.has("--minor")) return `${major}.${minor + 1}.0`;
	return `${major}.${minor}.${patch + 1}`;
}

const raw = readFileSync(appJsonPath, "utf8");
const current = JSON.parse(raw).expo?.version;
if (!current) throw new Error("No expo.version found in app.json");

const next = nextVersion(current);

if (args.has("--dry-run")) {
	console.log(`[version] would bump ${current} -> ${next} (dry run)`);
	process.exit(0);
}

// Replace the literal rather than re-serialising: app.json is tab-indented and
// hand-ordered, and JSON.stringify would reformat the whole file.
const needle = `"version": "${current}"`;
if (!raw.includes(needle)) {
	throw new Error(`Could not find ${needle} in app.json`);
}
writeFileSync(appJsonPath, raw.replace(needle, `"version": "${next}"`));
console.log(`[version] ${current} -> ${next}`);

if (args.has("--no-commit")) {
	console.log("[version] left uncommitted (--no-commit)");
	process.exit(0);
}

// EAS builds from the git tree, so an uncommitted bump either prompts or ships
// the old version. Committing here keeps the build non-interactive.
try {
	const git = (...a) =>
		execFileSync("git", a, { cwd: dirname(appJsonPath), stdio: "pipe" });
	git("add", appJsonPath);
	// Pathspec-limited on purpose: a bare `git commit` would sweep up anything
	// else the user already had staged into a commit labelled as a version bump.
	git(
		"commit",
		"-m",
		`chore(native): bump version to ${next}`,
		"--no-verify",
		"--",
		appJsonPath,
	);
	console.log(
		`[version] committed app.json as "chore(native): bump version to ${next}"`,
	);
} catch (err) {
	console.warn(
		`[version] bumped the file but could not commit it: ${err instanceof Error ? err.message : err}`,
	);
	console.warn("[version] commit app.json yourself before building.");
	process.exit(1);
}
