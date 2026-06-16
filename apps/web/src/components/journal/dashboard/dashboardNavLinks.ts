import type { LucideIcon } from "lucide-react";
import { CreditCard, LayoutDashboard, Library, UserCircle } from "lucide-react";

import { ROUTES } from "@/lib/routes";

export const dashboardNavItems = [
	{
		id: "desk",
		label: "Desk",
		to: ROUTES.dashboardDesk,
		icon: LayoutDashboard,
	},
	{
		id: "library",
		label: "Library",
		to: ROUTES.dashboardLibrary,
		icon: Library,
	},
	{
		id: "account",
		label: "Account",
		to: ROUTES.dashboardAccount,
		icon: UserCircle,
	},
	{
		id: "billing",
		label: "Billing",
		to: ROUTES.dashboardBilling,
		icon: CreditCard,
	},
] as const satisfies ReadonlyArray<{
	id: string;
	label: string;
	to: string;
	icon: LucideIcon;
}>;

export function isDashboardNavActive(pathname: string, to: string): boolean {
	if (to === ROUTES.dashboardBilling) {
		return pathname === to || pathname.startsWith(`${to}/`);
	}

	return pathname === to;
}
