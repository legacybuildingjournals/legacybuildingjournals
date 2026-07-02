import {
	PRIVACY_DESCRIPTION,
	PRIVACY_TITLE,
} from "@legacy-building/ui/lib/privacy";
import { createFileRoute } from "@tanstack/react-router";

import { LegalDocumentPage } from "@/components/legal/legal-document-page";

const PRIVACY_POLICY_TERMLY_ID = "fc0b2b2c-efee-4315-81c9-e6df3baa2696";

export const Route = createFileRoute("/privacy")({
	component: PrivacyPage,
	head: () => ({
		meta: [{ title: "Privacy Policy · Legacy Building" }],
	}),
});

function PrivacyPage() {
	return (
		<LegalDocumentPage
			title={PRIVACY_TITLE}
			description={PRIVACY_DESCRIPTION}
			termlyId={PRIVACY_POLICY_TERMLY_ID}
		/>
	);
}
