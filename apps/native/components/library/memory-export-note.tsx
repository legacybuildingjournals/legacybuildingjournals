import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native/hooks";
import { Text, View } from "react-native";

type MemoryExportNoteProps = {
	kind: "recording" | "video";
};

const COPY: Record<
	MemoryExportNoteProps["kind"],
	{ noun: string; verb: string }
> = {
	recording: { noun: "Audio recordings", verb: "listen to" },
	video: { noun: "Videos", verb: "watch" },
};

/**
 * Sets expectations before saving: a recorded or filmed entry becomes a
 * scannable QR page in the exported book rather than an embedded clip.
 */
export function MemoryExportNote({ kind }: MemoryExportNoteProps) {
	const [danger, warning] = useThemeColor(["danger", "warning"]);
	const color = kind === "video" ? danger : warning;
	const { noun, verb } = COPY[kind];

	return (
		<View
			className={`flex-row gap-3 rounded-2xl border p-4 ${
				kind === "video"
					? "border-danger bg-danger-soft/40"
					: "border-warning bg-warning-soft/40"
			}`}
		>
			<View className="size-10 items-center justify-center rounded-full bg-background">
				<Ionicons name="qr-code-outline" size={20} color={color} />
			</View>
			<View className="flex-1">
				<Text className="font-semibold text-base text-foreground">
					PDF Export
				</Text>
				<Text className="mt-0.5 text-muted-foreground text-sm leading-5">
					{noun} cannot be embedded in the PDF. A QR code will be generated so
					anyone reading the journal can securely {verb} this memory by scanning
					it.
				</Text>
			</View>
		</View>
	);
}
