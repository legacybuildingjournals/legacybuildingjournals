import {
	Defs,
	Image,
	LinearGradient,
	Rect,
	Stop,
	StyleSheet,
	Svg,
	Text,
	View,
} from "@react-pdf/renderer";

import { pdfColors, pdfMetrics } from "../theme";
import type { JournalMemory, MemoryKind } from "../types";
import { MemoryIcon } from "./icons";

const LABELS: Record<MemoryKind, string> = {
	voice: "VOICE MEMORY",
	video: "VIDEO MEMORY",
};

const CAPTIONS: Record<MemoryKind, string> = {
	voice: "Scan to hear this audio memory",
	video: "Scan to watch this video memory",
};

const styles = StyleSheet.create({
	card: {
		width: pdfMetrics.card.width,
		height: pdfMetrics.card.height,
		marginTop: pdfMetrics.card.marginTop,
		alignSelf: "center",
		alignItems: "center",
		paddingTop: pdfMetrics.card.paddingTop,
		paddingBottom: pdfMetrics.card.paddingBottom,
	},
	backdrop: {
		position: "absolute",
		top: 0,
		left: 0,
		width: pdfMetrics.card.width,
		height: pdfMetrics.card.height,
	},
	labelRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
	},
	label: {
		fontSize: pdfMetrics.cardLabel.size,
		fontWeight: 700,
		color: pdfColors.accent,
		letterSpacing: pdfMetrics.cardLabel.letterSpacing,
		marginLeft: pdfMetrics.cardLabel.iconGap,
	},
	qrPlate: {
		width: pdfMetrics.qrPlate.size,
		height: pdfMetrics.qrPlate.size,
		marginTop: pdfMetrics.qrPlate.marginTop,
		padding: pdfMetrics.qrPlate.padding,
		borderRadius: pdfMetrics.qrPlate.radius,
		borderWidth: pdfMetrics.qrPlate.border,
		borderColor: pdfColors.qrPlateBorder,
		backgroundColor: pdfColors.white,
	},
	qrImage: {
		width: "100%",
		height: "100%",
		objectFit: "contain",
	},
	caption: {
		fontSize: pdfMetrics.cardCaption.size,
		color: pdfColors.text,
		textAlign: "center",
		marginTop: pdfMetrics.cardCaption.marginTop,
	},
});

/**
 * The scannable-memory card: a mint-washed panel holding the QR that opens the
 * entry's recording. The wash is drawn as SVG because react-pdf has no
 * gradient support on plain views.
 */
export function MemoryCard({ memory }: { memory: JournalMemory }) {
	return (
		<View style={styles.card}>
			<Svg
				style={styles.backdrop}
				viewBox={`0 0 ${pdfMetrics.card.width} ${pdfMetrics.card.height}`}
			>
				<Defs>
					{/* Mint pools in the bottom-left and top-right corners. */}
					<LinearGradient id="memoryCardWash" x1="0" y1="1" x2="1" y2="0">
						<Stop offset="0" stopColor={pdfColors.cardTint} />
						<Stop offset="0.45" stopColor={pdfColors.white} />
						<Stop offset="0.55" stopColor={pdfColors.white} />
						<Stop offset="1" stopColor={pdfColors.cardTint} />
					</LinearGradient>
				</Defs>
				<Rect
					x={pdfMetrics.card.border / 2}
					y={pdfMetrics.card.border / 2}
					width={pdfMetrics.card.width - pdfMetrics.card.border}
					height={pdfMetrics.card.height - pdfMetrics.card.border}
					rx={pdfMetrics.card.radius}
					ry={pdfMetrics.card.radius}
					fill="url(#memoryCardWash)"
					stroke={pdfColors.cardBorder}
					strokeWidth={pdfMetrics.card.border}
				/>
			</Svg>
			<View style={styles.labelRow}>
				<MemoryIcon
					kind={memory.kind}
					size={pdfMetrics.cardLabel.iconSize}
					color={pdfColors.accent}
				/>
				<Text style={styles.label}>{LABELS[memory.kind]}</Text>
			</View>
			<View style={styles.qrPlate}>
				<Image src={memory.qrDataUrl} style={styles.qrImage} />
			</View>
			<Text style={styles.caption}>{CAPTIONS[memory.kind]}</Text>
		</View>
	);
}
