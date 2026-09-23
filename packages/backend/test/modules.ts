/**
 * Module map handed to `convexTest`.
 *
 * Lives outside `convex/` so it is never pushed as a Convex module, and globs
 * from here because `import.meta.glob` resolves relative to the file that calls
 * it — a glob written inside `convex/onboarding/` silently misses its own
 * directory, which surfaces as "Could not find module for: …" at call time.
 */
export const testModules = import.meta.glob("../convex/**/*.ts");
