import { createFileRoute } from "@tanstack/react-router";

import { ShareClaimPage } from "@/features/sharing/ShareClaimPage";

/** Public share-invite claim page (link in the invite email). */
export const Route = createFileRoute("/share/$token")({
	component: ShareClaimRoute,
});

function ShareClaimRoute() {
	const { token } = Route.useParams();
	return <ShareClaimPage token={token} />;
}
