import { Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { MyStoryEntry } from "@/components/my-story-pdf/types";
import { fitPdfImageSize } from "@/lib/journal/fitPdfImageSize";

const TEAL = "#007A7A";

const HEADER_HEIGHT = 32;
const HEADER_GAP = 24;

const styles = StyleSheet.create({
	page: {
		paddingTop: HEADER_HEIGHT + HEADER_GAP,
		paddingHorizontal: 40,
		paddingBottom: 40,
	},
	headerBar: {
		position: "absolute",
		top: 0,
		left: -40,
		right: -40,
		backgroundColor: TEAL,
		height: HEADER_HEIGHT,
	},
	photoWrap: {
		alignItems: "center",
	},
	photoPlaceholder: {
		width: 260,
		height: 200,
		backgroundColor: "#e8e8e8",
	},
	heading: {
		fontFamily: "Times-Bold",
		fontSize: 16,
		color: "#111111",
		textAlign: "center",
		marginTop: 14,
	},
	date: {
		fontFamily: "Times-Italic",
		fontSize: 10,
		color: "#888888",
		textAlign: "center",
		marginTop: 4,
	},
	body: {
		fontFamily: "Helvetica",
		fontSize: 11,
		color: "#222222",
		lineHeight: 1.6,
		marginTop: 14,
		textAlign: "left",
	},
});

type EntryPageProps = MyStoryEntry;

export function EntryPage({
	heading,
	date,
	body,
	imageBase64,
	imageWidth,
	imageHeight,
}: EntryPageProps) {
	const photoSize =
		imageWidth && imageHeight ? fitPdfImageSize(imageWidth, imageHeight) : null;

	return (
		<Page size="A4" style={styles.page}>
			<View fixed style={styles.headerBar} />
			<View style={styles.photoWrap}>
				{imageBase64 ? (
					<Image
						src={imageBase64}
						style={
							photoSize
								? {
										width: photoSize.width,
										height: photoSize.height,
										objectFit: "contain",
									}
								: {
										maxWidth: 515,
										maxHeight: 360,
										objectFit: "contain",
									}
						}
					/>
				) : (
					<View style={styles.photoPlaceholder} />
				)}
			</View>
			<Text style={styles.heading}>{heading}</Text>
			<Text style={styles.date}>{date}</Text>
			{body.trim() ? <Text style={styles.body}>{body.trim()}</Text> : null}
		</Page>
	);
}
