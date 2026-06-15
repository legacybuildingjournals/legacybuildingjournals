import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/library")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/dashboard/library"!</div>;
}
