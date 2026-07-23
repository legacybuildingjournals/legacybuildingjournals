import { StyleSheet, Text, View } from "@react-pdf/renderer";

import { PDF_FONT_FAMILY } from "../fonts";
import { PDF_CONTENT_BOTTOM_PADDING, pdfColors, pdfMetrics } from "../theme";

const styles = StyleSheet.create({
	page: {
		fontFamily: PDF_FONT_FAMILY,
		backgroundColor: pdfColors.white,
		paddingTop: 0,
		paddingHorizontal: pdfMetrics.paddingX,
		paddingBottom: PDF_CONTENT_BOTTOM_PADDING,
	},
	headerBar: {
		// Negative side margins bleed the bar past the page's content padding.
		marginLeft: -pdfMetrics.paddingX,
		marginRight: -pdfMetrics.paddingX,
		marginBottom: pdfMetrics.headerGap,
		height: pdfMetrics.headerBarHeight,
		backgroundColor: pdfColors.headerBar,
	},
	footer: {
		position: "absolute",
		// Absolute children are positioned against the page box, not the padded
		// content box, so the page padding has to be reapplied here.
		left: pdfMetrics.paddingX,
		right: pdfMetrics.paddingX,
		bottom: pdfMetrics.footer.ruleOffset - pdfMetrics.footer.textOffset,
	},
	footerRule: {
		height: pdfMetrics.footer.thickness,
		backgroundColor: pdfColors.footerRule,
	},
	footerRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: pdfMetrics.footer.textOffset - 14,
	},
	footerJournal: {
		fontSize: pdfMetrics.footer.size,
		fontWeight: 700,
		color: pdfColors.accent,
	},
	footerPage: {
		fontSize: pdfMetrics.footer.size,
		fontWeight: 400,
		color: pdfColors.textMuted,
	},
});

export const contentPageStyle = styles.page;

/** Full-bleed teal bar repeated at the top of every content page. */
export function HeaderBar() {
	return <View fixed style={styles.headerBar} />;
}

/**
 * Journal name and page number pinned to the bottom of every content page.
 *
 * `frontMatterPages` is subtracted so numbering starts at 1 on the first
 * entry page rather than counting the cover and dedication.
 */
export function PageFooter({
	journalName,
	frontMatterPages,
}: {
	journalName: string;
	frontMatterPages: number;
}) {
	return (
		<View fixed style={styles.footer}>
			<View style={styles.footerRule} />
			<View style={styles.footerRow}>
				<Text style={styles.footerJournal}>{journalName}</Text>
				<Text
					style={styles.footerPage}
					render={({ pageNumber }) => `Page ${pageNumber - frontMatterPages}`}
				/>
			</View>
		</View>
	);
}
