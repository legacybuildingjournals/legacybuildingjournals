import {
	Image,
	Line,
	Page,
	Path,
	StyleSheet,
	Svg,
	Text,
	View,
} from "@react-pdf/renderer";

import { backCoverBackgroundDataUrl } from "../back-cover-background";
import { PDF_FONT_FAMILY } from "../fonts";
import type { JournalBackCover } from "../types";

/** Gold foil used for the title, rule and heart on the leather. */
const GOLD = "#d9ad62";
const CREAM = "#f6ecdc";

const styles = StyleSheet.create({
	page: {
		fontFamily: PDF_FONT_FAMILY,
		padding: 0,
		backgroundColor: "#0f5a56",
	},
	// Pinned to the page edges rather than sized to it: an absolute layer as
	// tall as the page counts as overflow and spills onto an extra page.
	background: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		objectFit: "cover",
	},
	content: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		alignItems: "center",
		paddingTop: 170,
		paddingHorizontal: 90,
	},
	contentNoPhoto: {
		paddingTop: 300,
	},
	photoFrame: {
		width: 300,
		height: 206,
		padding: 7,
		backgroundColor: CREAM,
		transform: "rotate(-1.2deg)",
	},
	photo: {
		width: "100%",
		height: "100%",
		objectFit: "cover",
	},
	title: {
		marginTop: 30,
		fontSize: 21,
		letterSpacing: 2.5,
		color: GOLD,
		textAlign: "center",
	},
	divider: {
		marginTop: 14,
	},
	message: {
		marginTop: 14,
		fontSize: 11.5,
		lineHeight: 1.65,
		color: CREAM,
		textAlign: "center",
		maxWidth: 360,
	},
});

/** Gold rule with a small outlined heart in the middle, as on the template. */
function HeartDivider() {
	return (
		<Svg width={240} height={14} viewBox="0 0 240 14" style={styles.divider}>
			<Line x1={0} y1={7} x2={104} y2={7} stroke={GOLD} strokeWidth={0.8} />
			<Line x1={136} y1={7} x2={240} y2={7} stroke={GOLD} strokeWidth={0.8} />
			<Path
				d="M120 12.5 C114 8.6 111.5 6.4 111.5 4.1 C111.5 2.3 112.9 1 114.6 1 C116.1 1 117.3 1.8 120 4.2 C122.7 1.8 123.9 1 125.4 1 C127.1 1 128.5 2.3 128.5 4.1 C128.5 6.4 126 8.6 120 12.5 Z"
				stroke={GOLD}
				strokeWidth={0.9}
				fill="none"
			/>
		</Svg>
	);
}

/**
 * Closing page of an exported book: the teal leather back cover with the
 * user's photo, title and message. Every part is optional — with nothing
 * filled in it is just the leather cover.
 */
export function BackCoverPage({ imageUrl, title, message }: JournalBackCover) {
	const titleText = title?.trim() ?? "";
	const messageText = message?.trim() ?? "";
	const hasText = titleText.length > 0 || messageText.length > 0;

	return (
		<Page size="A4" style={styles.page}>
			<Image src={backCoverBackgroundDataUrl} style={styles.background} />
			<View
				style={[styles.content, imageUrl ? {} : styles.contentNoPhoto]}
				wrap={false}
			>
				{imageUrl ? (
					<View style={styles.photoFrame}>
						<Image src={imageUrl} style={styles.photo} />
					</View>
				) : null}
				{titleText ? (
					<Text style={styles.title}>{titleText.toUpperCase()}</Text>
				) : null}
				{hasText ? <HeartDivider /> : null}
				{messageText ? <Text style={styles.message}>{messageText}</Text> : null}
			</View>
		</Page>
	);
}
