import { Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { digLogoDataUrl } from "../brand-logo";
import { PDF_FONT_FAMILY } from "../fonts";
import { pdfColors, pdfMetrics } from "../theme";
import type { JournalStoryType } from "../types";

const styles = StyleSheet.create({
	coverPage: {
		fontFamily: PDF_FONT_FAMILY,
		backgroundColor: pdfColors.headerBar,
		padding: 0,
	},
	whiteBlock: {
		width: "55%",
		height: "44%",
		backgroundColor: pdfColors.white,
		alignSelf: "center",
		alignItems: "center",
		justifyContent: "flex-end",
		paddingBottom: 16,
	},
	coverPrefix: {
		fontSize: 42,
		fontWeight: 700,
		color: pdfColors.headerBar,
		textAlign: "center",
		width: "100%",
	},
	coverTitle: {
		fontSize: 52,
		fontWeight: 700,
		color: pdfColors.white,
		textAlign: "center",
		marginTop: 10,
	},
	coverLower: {
		flex: 1,
		justifyContent: "flex-end",
		alignItems: "center",
		paddingBottom: 72,
	},
	coverJournalName: {
		fontSize: 14,
		color: pdfColors.white,
		textAlign: "center",
		letterSpacing: 1,
	},
	dedicationPage: {
		fontFamily: PDF_FONT_FAMILY,
		backgroundColor: pdfColors.white,
		paddingTop: 0,
		paddingHorizontal: pdfMetrics.paddingX,
		paddingBottom: 40,
	},
	headerBar: {
		marginLeft: -pdfMetrics.paddingX,
		marginRight: -pdfMetrics.paddingX,
		height: pdfMetrics.headerBarHeight,
		backgroundColor: pdfColors.headerBar,
	},
	dedicationContent: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 44,
	},
	dedicationText: {
		fontSize: 15,
		color: pdfColors.text,
		textAlign: "center",
		lineHeight: 1.7,
	},
	dedicationFooter: {
		alignItems: "center",
		paddingBottom: 32,
	},
	logo: {
		width: 110,
		height: 50,
		objectFit: "contain",
	},
});

export function CoverPage({
	journalName,
	storyType,
}: {
	journalName: string;
	storyType: JournalStoryType;
}) {
	return (
		<Page size="A4" style={styles.coverPage}>
			<View style={styles.whiteBlock}>
				<Text style={styles.coverPrefix}>
					{storyType === "their_story" ? "Their" : "My"}
				</Text>
			</View>
			<Text style={styles.coverTitle}>Story</Text>
			<View style={styles.coverLower}>
				{journalName ? (
					<Text style={styles.coverJournalName}>{journalName}</Text>
				) : null}
			</View>
		</Page>
	);
}

export function DedicationPage({ dedication }: { dedication: string }) {
	return (
		<Page size="A4" style={styles.dedicationPage}>
			<View style={styles.headerBar} />
			<View style={styles.dedicationContent}>
				<Text style={styles.dedicationText}>{dedication}</Text>
			</View>
			<View style={styles.dedicationFooter}>
				<Image src={digLogoDataUrl} style={styles.logo} />
			</View>
		</Page>
	);
}
