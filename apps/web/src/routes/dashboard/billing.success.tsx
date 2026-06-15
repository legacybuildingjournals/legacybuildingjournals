import { createFileRoute } from "@tanstack/react-router";

import { PaymentSuccessPage } from "@/features/billing/PaymentSuccessPage";

export const Route = createFileRoute("/dashboard/billing/success")({
	component: PaymentSuccessPage,
});
