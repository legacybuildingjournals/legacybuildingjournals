export type PlanInterval = "monthly" | "annual";

export type PlanStatus = PlanInterval | "free";

export type BillingProvider = "stripe" | "apple" | "google";

/** Format a smallest-currency-unit amount (cents) as a currency string. */
export function formatAmount(amountCents: number, currency = "usd"): string {
	return new Intl.NumberFormat(undefined, {
		style: "currency",
		currency: currency.toUpperCase(),
		minimumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
	}).format(amountCents / 100);
}

/** Human label for a plan status shown in account settings. */
export function planStatusLabel(plan: PlanStatus): string {
	if (plan === "free") return "Free";
	if (plan === "annual") return "Annual";
	return "Monthly";
}

/** Feature bullets on the native paywall modal. */
export const PAYWALL_FEATURES = [
	{
		title: "Unlimited journal entries",
		description: "Write, save, and revisit your stories",
	},
	{
		title: "Voice recording",
		description: "Capture moments in your own words",
	},
	{
		title: "Add a photo to each entry",
		description: "One photo per entry to bring memories to life",
	},
	{
		title: "PDF export",
		description: "Download any entry as a PDF",
	},
	{
		title: "Turn entries into a printed book",
		description: "Order a physical or hardcover journal",
	},
	{
		title: "Secure cloud backup",
		description: "Private, safe, and always accessible",
	},
] as const;
