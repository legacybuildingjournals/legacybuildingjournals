import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/billing/compare")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/dashboard/billing/compare"!</div>;
}
