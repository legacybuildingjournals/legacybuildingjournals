import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native/hooks";
import { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Linking,
	Pressable,
	Text,
	View,
} from "react-native";

import {
	type PickEntryVideoResult,
	type PickedEntryVideo,
	pickEntryVideoFromLibrary,
	recordEntryVideo,
} from "@/lib/journal/pick-entry-video";

type VideoEntryFieldProps = {
	value: PickedEntryVideo | null;
	onChange: (video: PickedEntryVideo | null) => void;
	disabled?: boolean;
};

function formatDuration(ms: number): string {
	const total = Math.round(ms / 1000);
	const minutes = Math.floor(total / 60);
	const seconds = total % 60;
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatSize(bytes: number): string {
	if (bytes <= 0) return "";
	const mb = bytes / (1024 * 1024);
	return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/**
 * Capture card for a video entry: the empty prompt from the design, or a
 * summary of the chosen clip with replace/remove once one exists.
 */
export function VideoEntryField({
	value,
	onChange,
	disabled = false,
}: VideoEntryFieldProps) {
	const [danger, dangerForeground, foreground] = useThemeColor([
		"danger",
		"danger-foreground",
		"foreground",
	]);
	const [busy, setBusy] = useState(false);

	async function run(pick: () => Promise<PickEntryVideoResult>) {
		if (disabled || busy) return;
		setBusy(true);
		try {
			const result = await pick();

			if (result.kind === "canceled") return;
			if (result.kind === "permission-denied") {
				const what = result.reason === "camera" ? "Camera" : "Photo";
				Alert.alert(
					`${what} access needed`,
					`Enable ${what.toLowerCase()} access in Settings to add a video.`,
					result.previouslyDenied
						? [
								{ text: "Cancel", style: "cancel" },
								{
									text: "Open Settings",
									onPress: () => void Linking.openSettings(),
								},
							]
						: [{ text: "OK" }],
				);
				return;
			}
			if (result.kind === "error") {
				Alert.alert("Could not add video", result.message);
				return;
			}

			onChange(result.video);
		} finally {
			setBusy(false);
		}
	}

	function confirmRemove() {
		Alert.alert("Remove video?", "You can record or choose another one.", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Remove",
				style: "destructive",
				onPress: () => onChange(null),
			},
		]);
	}

	if (value) {
		return (
			<View className="gap-3 rounded-2xl border border-danger bg-danger-soft/40 p-4">
				<View className="flex-row items-center gap-3">
					<View className="size-11 items-center justify-center rounded-full bg-danger/20">
						<Ionicons name="videocam" size={22} color={danger} />
					</View>
					<View className="flex-1">
						<Text className="font-semibold text-base text-foreground">
							Video ready
						</Text>
						<Text className="text-muted-foreground text-sm">
							{value.durationMs > 0 ? formatDuration(value.durationMs) : "Clip"}
							{formatSize(value.sizeBytes)
								? ` · ${formatSize(value.sizeBytes)}`
								: ""}
						</Text>
					</View>
				</View>

				<View className="flex-row gap-2">
					<Pressable
						onPress={() => void run(recordEntryVideo)}
						disabled={disabled || busy}
						accessibilityRole="button"
						accessibilityLabel="Record a different video"
						className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-background py-3 active:opacity-85 disabled:opacity-50"
					>
						<Ionicons name="camera-outline" size={18} color={foreground} />
						<Text className="font-semibold text-foreground text-sm">
							Re-record
						</Text>
					</Pressable>
					<Pressable
						onPress={() => void run(pickEntryVideoFromLibrary)}
						disabled={disabled || busy}
						accessibilityRole="button"
						accessibilityLabel="Choose a different video"
						className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-background py-3 active:opacity-85 disabled:opacity-50"
					>
						<Ionicons name="images-outline" size={18} color={foreground} />
						<Text className="font-semibold text-foreground text-sm">
							Replace
						</Text>
					</Pressable>
					<Pressable
						onPress={confirmRemove}
						disabled={disabled || busy}
						accessibilityRole="button"
						accessibilityLabel="Remove video"
						className="size-11 items-center justify-center rounded-xl bg-background active:opacity-85 disabled:opacity-50"
					>
						<Ionicons name="trash-outline" size={18} color={foreground} />
					</Pressable>
				</View>
			</View>
		);
	}

	return (
		<View className="items-center gap-3 rounded-2xl border border-danger bg-danger-soft/40 px-4 py-6">
			<View className="size-12 items-center justify-center rounded-full bg-danger/20">
				<Ionicons name="videocam" size={24} color={danger} />
			</View>
			<Text className="font-semibold text-foreground text-lg">
				Capture Your Memory
			</Text>
			<Text className="text-center text-muted-foreground text-sm">
				Record a new video or choose one from your gallery.
			</Text>

			<Pressable
				onPress={() => void run(recordEntryVideo)}
				disabled={disabled || busy}
				accessibilityRole="button"
				accessibilityLabel="Record video"
				className="w-full flex-row items-center justify-center gap-2 rounded-xl py-4 active:opacity-90 disabled:opacity-50"
				style={{ backgroundColor: danger }}
			>
				{busy ? (
					<ActivityIndicator color={dangerForeground} />
				) : (
					<Ionicons name="camera" size={19} color={dangerForeground} />
				)}
				<Text
					className="font-semibold text-base"
					style={{ color: dangerForeground }}
				>
					Record Video
				</Text>
			</Pressable>

			<Text className="text-muted-foreground text-xs">OR</Text>

			<Pressable
				onPress={() => void run(pickEntryVideoFromLibrary)}
				disabled={disabled || busy}
				accessibilityRole="button"
				accessibilityLabel="Choose from gallery"
				className="w-full flex-row items-center justify-center gap-2 rounded-xl border border-danger bg-background py-4 active:opacity-90 disabled:opacity-50"
			>
				<Ionicons name="images-outline" size={19} color={danger} />
				<Text className="font-semibold text-base" style={{ color: danger }}>
					Choose From Gallery
				</Text>
			</Pressable>
		</View>
	);
}
