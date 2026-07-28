import { assets } from "@legacy-building/ui/lib/brand-journal";
import { Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const TEAL = "#007A7A";

const HEADER_HEIGHT = 32;

const styles = StyleSheet.create({
	page: {
		paddingTop: HEADER_HEIGHT,
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
	content: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 24,
	},
	dedication: {
		fontFamily: "Times-Italic",
		fontSize: 14,
		color: "#111111",
		textAlign: "center",
		lineHeight: 1.5,
	},
	footer: {
		alignItems: "center",
		paddingBottom: 32,
	},
	logo: {
		width: 110,
		height: 50,
		objectFit: "contain",
	},
});

type DedicationPageProps = {
	dedication: string;
};

export function DedicationPage({ dedication }: DedicationPageProps) {
	return (
		<Page size="A4" style={styles.page}>
			<View fixed style={styles.headerBar} />
			<View style={styles.content}>
				<Text style={styles.dedication}>{dedication.trim()}</Text>
			</View>
			<View style={styles.footer}>
				<Image src={assets.digLogo} style={styles.logo} />
			</View>
		</Page>
	);
}
