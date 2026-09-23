import { createFileRoute } from "@tanstack/react-router";

import { PreAppOnboarding } from "@/features/onboarding/pre-app-onboarding";

export const Route = createFileRoute("/preapponboarding")({
	component: PreAppOnboarding,
});
