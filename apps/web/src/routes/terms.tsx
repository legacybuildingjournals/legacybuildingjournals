import { TERMS_DESCRIPTION, TERMS_TITLE } from "@legacy-building/ui/lib/terms";
import { createFileRoute } from "@tanstack/react-router";

import { LegalDocumentPage } from "@/components/legal/legal-document-page";

const TERMS_OF_SERVICE_TERMLY_ID = "a16551ea-902e-4376-ac31-1ab53392efd6";

export const Route = createFileRoute("/terms")({
	component: TermsPage,
	head: () => ({
		meta: [{ title: "Terms of Service · Legacy Building" }],
	}),
});

function TermsPage() {
	return (
		<LegalDocumentPage
			title={TERMS_TITLE}
			description={TERMS_DESCRIPTION}
			termlyId={TERMS_OF_SERVICE_TERMLY_ID}
		/>
	);
}
