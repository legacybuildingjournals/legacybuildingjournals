import type { LucideIcon } from "lucide-react";
import { BookOpen, Camera, Cloud, FileText, Mic, Pencil } from "lucide-react";

export type BillingPlanChoice = "trial" | "monthly" | "annual";

/** Light background for the subscribed-user billing management page. */
export const BILLING_MANAGE_BG = "#f5f5f5";

/** Feature bullets on the active-plan card (matches billing management mockup). */
export const MANAGE_PLAN_FEATURES = [
	"Unlimited Journal Entries",
	"Voice recording",
	"Add a photo to each entry",
	"PDF Export",
	"Secure cloud backup",
] as const;

export const BILLING_FEATURES: {
	icon: LucideIcon;
	title: string;
	description: string;
}[] = [
	{
		icon: Pencil,
		title: "Unlimited journal entries",
		description: "Write, save, and revisit your stories",
	},
	{
		icon: Mic,
		title: "Voice recording",
		description: "Capture moments in your own voice",
	},
	{
		icon: Camera,
		title: "Add a photo to each entry",
		description: "One photo per entry to bring memories to life",
	},
	{
		icon: FileText,
		title: "PDF export",
		description: "Download any entry as a PDF",
	},
	{
		icon: BookOpen,
		title: "Turn entries into a printed book",
		description: "Order a physical softcover or hardcover journal",
	},
	{
		icon: Cloud,
		title: "Secure cloud backup",
		description: "Private, safe, and always accessible",
	},
];

export function buildTrialSteps(monthlyPriceLabel: string) {
	return [
		{
			label: "Today",
			description: "Start writing. No charge.",
			done: true,
		},
		{
			label: "Day 5",
			description: "Reminder sent. Review anytime.",
			done: false,
		},
		{
			label: "Day 7",
			description: `${monthlyPriceLabel}/month`,
			subdescription: "billed monthly",
			done: false,
		},
	] as const;
}

/** User-facing plan change actions (Billing & Plans, Compare Plans). */
export const BILLING_PLAN_ACTION_COPY = {
	changePlan: "Change plan",
	comparePlansTitle: "Change plan",
	comparePlansSubtitle:
		"Choose the plan that works best for you, then confirm your update.",
	switchToAnnual: "Switch to annual",
	switchToMonthly: "Switch to monthly",
	scheduleSwitchToMonthly: "Schedule switch to monthly",
	currentPlan: "Current plan",
	continueToCheckout: "Continue to checkout",
} as const;

/** Subscribe / paywall marketing copy. */
export const BILLING_SUBSCRIBE_COPY = {
	/** Keeps the full trial phrase on one line in CTAs (use with whitespace-nowrap). */
	startTrialCta: "Start my 7-day free trial",
	trialStateLabel: "7-day free trial",
	printedBooksNote:
		"Printed books are ordered separately. Your subscription unlocks the feature to create and order them.",
} as const;
