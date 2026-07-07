import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Server-driven reminder sweeps. Convex crons run in UTC, so this is a single
 * global send time rather than each user's local time — 16:00 UTC lands late
 * morning in the Americas and early evening in Europe. Per-user throttles
 * (`lastInactivityPushAt` / `lastExportReminderAt`) keep these from repeating
 * daily. Adjust the hour to match your primary audience if needed.
 */
crons.daily(
	"inactivity reminders",
	{ hourUTC: 16, minuteUTC: 0 },
	internal.notifications.actions.runInactivitySweep,
	{},
);

crons.daily(
	"export reminders",
	{ hourUTC: 16, minuteUTC: 30 },
	internal.notifications.actions.runExportSweep,
	{},
);

export default crons;
