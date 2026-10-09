import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";

import { pdfColors, pdfMetrics } from "../theme";
import { CalendarIcon } from "./icons";

const styles = StyleSheet.create({
	photoFrame: {
		width: pdfMetrics.photo.width,
		height: pdfMetrics.photo.height,
		borderRadius: pdfMetrics.photo.radius,
		// Deliberately unpainted. The frame used to carry `cardTint`, which read
		// as a green slab either side of a letterboxed photo once the fit changed
		// to `contain`. Left transparent, the letterboxing is just page.
		alignSelf: "center",
		overflow: "hidden",
		alignItems: "center",
		justifyContent: "center",
	},
	photo: {
		// `cover` filled the fixed 16:9 frame by cropping whatever didn't fit
		// it — a portrait photo lost its top and bottom. `contain` shows the
		// whole photo and letterboxes the frame instead.
		width: "100%",
		height: "100%",
		objectFit: "contain",
	},
	title: {
		fontSize: pdfMetrics.title.size,
		fontWeight: 700,
		color: pdfColors.text,
		textAlign: "center",
		marginTop: pdfMetrics.title.marginTop,
	},
	dateRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginTop: pdfMetrics.date.marginTop,
	},
	dateText: {
		fontSize: pdfMetrics.date.size,
		color: pdfColors.textMuted,
		marginLeft: pdfMetrics.date.iconGap,
	},
	rule: {
		width: pdfMetrics.rule.width,
		height: pdfMetrics.rule.thickness,
		backgroundColor: pdfColors.rule,
		alignSelf: "center",
		marginTop: pdfMetrics.rule.marginTop,
	},
});

/**
 * Photo, title, date and divider — the identical top half of both an entry's
 * writing page and its memory (QR) page, so the two read as one spread.
 */
export function EntryHeader({
	title,
	date,
	imageUrl,
}: {
	title: string;
	date: string;
	imageUrl?: string;
}) {
	return (
		<View>
			{imageUrl ? (
				<View style={styles.photoFrame}>
					<Image src={imageUrl} style={styles.photo} />
				</View>
			) : null}
			<Text style={styles.title}>{title}</Text>
			<View style={styles.dateRow}>
				<CalendarIcon
					size={pdfMetrics.date.iconSize}
					color={pdfColors.textMuted}
				/>
				<Text style={styles.dateText}>{date}</Text>
			</View>
			<View style={styles.rule} />
		</View>
	);
}
