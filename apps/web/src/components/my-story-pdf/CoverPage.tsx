import { Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { JournalStoryType } from "@/lib/journal/journalTypes";

const TEAL = "#007A7A";

function coverPrefixForStoryType(storyType: JournalStoryType): string {
	return storyType === "their_story" ? "Their" : "My";
}

const styles = StyleSheet.create({
	page: {
		backgroundColor: TEAL,
		padding: 0,
	},
	whiteBlock: {
		width: "55%",
		height: "44%",
		backgroundColor: "#ffffff",
		alignSelf: "center",
		alignItems: "center",
		justifyContent: "flex-end",
		paddingBottom: 12,
		paddingLeft: 20,
		paddingRight: 16,
	},
	coverPrefix: {
		fontFamily: "Helvetica-Bold",
		fontSize: 42,
		color: TEAL,
		textAlign: "center",
		width: "100%",
	},
	title: {
		fontFamily: "Helvetica-Bold",
		fontSize: 52,
		color: "#ffffff",
		textAlign: "center",
		marginTop: 8,
	},
	lowerSection: {
		flex: 1,
		justifyContent: "flex-end",
		alignItems: "center",
		paddingBottom: 72,
	},
	journalName: {
		fontFamily: "Helvetica",
		fontSize: 14,
		color: "#ffffff",
		textAlign: "center",
		letterSpacing: 1,
		marginBottom: 24,
	},
});

type CoverPageProps = {
	title?: string;
	journalName: string;
	storyType?: JournalStoryType;
};

export function CoverPage({
	title = "Story",
	journalName,
	storyType = "my_story",
}: CoverPageProps) {
	const coverPrefix = coverPrefixForStoryType(storyType);

	return (
		<Page size="A4" style={styles.page}>
			<View style={styles.whiteBlock}>
				<Text style={styles.coverPrefix}>{coverPrefix}</Text>
			</View>
			<Text style={styles.title}>{title}</Text>
			<View style={styles.lowerSection}>
				{journalName.trim() ? (
					<Text style={styles.journalName}>{journalName.trim()}</Text>
				) : null}
			</View>
		</Page>
	);
}
