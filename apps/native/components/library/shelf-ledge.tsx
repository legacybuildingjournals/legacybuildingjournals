import { View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

/** Height of the painted-cream shelf drawn under each library card. */
const LEDGE_HEIGHT = 52;

/**
 * Painted-cream shelf ledge that sits flush under a library card so every
 * journal reads as resting on a bookshelf.
 *
 * Mirrors the web `SHELF_LEDGE` gradient in `LibraryJournalGrid.tsx`: a bright
 * top lip, a cream -> tan shelf surface, then a soft brown contact shadow that
 * fades out. Hex values are hardcoded (no theme token equivalent) to match the
 * photographed library backdrop, same as the web implementation.
 */
export function ShelfLedge() {
	return (
		<View
			pointerEvents="none"
			className="w-full"
			style={{ height: LEDGE_HEIGHT }}
		>
			<Svg width="100%" height={LEDGE_HEIGHT} preserveAspectRatio="none">
				<Defs>
					<LinearGradient id="shelfLedge" x1="0" y1="0" x2="0" y2="1">
						<Stop offset="0" stopColor="#f4ede4" stopOpacity="0" />
						<Stop offset="0.02" stopColor="#ffffff" stopOpacity="0.75" />
						<Stop offset="0.04" stopColor="#f4ede4" stopOpacity="1" />
						<Stop offset="0.17" stopColor="#ede2d4" stopOpacity="1" />
						<Stop offset="0.23" stopColor="#dfccb8" stopOpacity="1" />
						<Stop offset="0.38" stopColor="#cdb79f" stopOpacity="1" />
						<Stop offset="0.44" stopColor="#786044" stopOpacity="0.28" />
						<Stop offset="0.65" stopColor="#786044" stopOpacity="0.12" />
						<Stop offset="1" stopColor="#786044" stopOpacity="0" />
					</LinearGradient>
				</Defs>
				<Rect
					x="0"
					y="0"
					width="100%"
					height={LEDGE_HEIGHT}
					fill="url(#shelfLedge)"
				/>
			</Svg>
		</View>
	);
}
