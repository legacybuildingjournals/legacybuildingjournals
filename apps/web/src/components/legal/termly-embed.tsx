import IframeResizer from "@iframe-resizer/react";
import { memo } from "react";

const TERMLY_ORIGIN = "https://app.termly.io";

type TermlyEmbedProps = {
	dataId: string;
	title: string;
};

function termlyIframeSrc(documentId: string) {
	return `${TERMLY_ORIGIN}/policy-viewer/iframe-content.html?policyUUID=${documentId}&viewMethod=embedded`;
}

/**
 * Embeds a live Termly policy and auto-resizes the iframe so only the page scrolls.
 */
function TermlyEmbedComponent({ dataId, title }: TermlyEmbedProps) {
	return (
		<IframeResizer
			key={dataId}
			title={title}
			src={termlyIframeSrc(dataId)}
			license="GPLv3"
			checkOrigin={[TERMLY_ORIGIN]}
			scrolling={false}
			log={false}
			warningTimeout={0}
			style={{
				width: "1px",
				minWidth: "100%",
				border: 0,
				display: "block",
				overflow: "hidden",
			}}
			loading="lazy"
			referrerPolicy="strict-origin-when-cross-origin"
		/>
	);
}

export const TermlyEmbed = memo(TermlyEmbedComponent);
