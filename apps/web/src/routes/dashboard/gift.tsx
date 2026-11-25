import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/gift")({
	component: GiftLayout,
});

function GiftLayout() {
	return <Outlet />;
}
