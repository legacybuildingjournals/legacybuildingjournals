import { Image, Page, StyleSheet } from "@react-pdf/renderer";

import { frontCoverImageDataUrl } from "../front-cover-image";

const styles = StyleSheet.create({
	page: {
		padding: 0,
		backgroundColor: "#0f5a56",
	},
	// Pinned to the page edges rather than sized to it: an absolute layer as
	// tall as the page counts as overflow and spills onto an extra page.
	image: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		objectFit: "cover",
	},
});

/**
 * Opening page of an exported book: the fixed Legacy Building leather cover.
 * The artwork is already cropped to A4, so it fills the page edge to edge.
 */
export function FrontCoverPage() {
	return (
		<Page size="A4" style={styles.page}>
			<Image src={frontCoverImageDataUrl} style={styles.image} />
		</Page>
	);
}
