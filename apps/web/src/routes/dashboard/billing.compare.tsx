import { createFileRoute } from "@tanstack/react-router";

import { BillingComparePlansPage } from "@/features/billing/BillingComparePlansPage";

export const Route = createFileRoute("/dashboard/billing/compare")({
	component: BillingComparePlansPage,
});
