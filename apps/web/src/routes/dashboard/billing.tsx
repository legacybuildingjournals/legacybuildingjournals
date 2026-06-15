import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/billing")({
	component: BillingLayout,
});

function BillingLayout() {
	return <Outlet />;
}
