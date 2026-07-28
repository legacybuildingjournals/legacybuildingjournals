import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native/hooks";
import { Text, View } from "react-native";

/**
 * Sets expectations before saving: a video entry becomes a scannable QR page in
 * the exported book rather than an embedded clip.
 */
export function VideoExportNote() {
	const danger = useThemeColor("danger");

	return (
		<View className="flex-row gap-3 rounded-2xl border border-danger bg-danger-soft p-4">
			<View className="size-10 items-center justify-center rounded-full bg-background">
				<Ionicons name="qr-code-outline" size={20} color={danger} />
			</View>
			<View className="flex-1">
				<Text className="font-semibold text-base text-foreground">
					PDF Export
				</Text>
				<Text className="mt-0.5 text-muted-foreground text-sm leading-5">
					Videos cannot be embedded in the PDF. A QR code will be generated so
					anyone reading the journal can securely watch this memory by scanning
					it.
				</Text>
			</View>
		</View>
	);
}
