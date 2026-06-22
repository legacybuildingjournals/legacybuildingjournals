import { Ionicons } from "@expo/vector-icons";
import {
	setAudioModeAsync,
	useAudioPlayer,
	useAudioPlayerStatus,
} from "expo-audio";
import { useThemeColor } from "heroui-native/hooks";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";

function formatClock(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
	const total = Math.floor(seconds);
	const mins = Math.floor(total / 60);
	const secs = total % 60;
	return `${mins}:${String(secs).padStart(2, "0")}`;
}

type EntryAudioPlayerProps = {
	uri: string;
	/** Duration captured at record time (ms); used until the player reports its
	 * own, so the total time shows immediately and even if the player can't read
	 * the remote file's metadata. */
	durationMs?: number;
};

/** Playback row for a recording entry: play/pause, progress bar, timecodes. */
export function EntryAudioPlayer({ uri, durationMs }: EntryAudioPlayerProps) {
	const player = useAudioPlayer({ uri });
	const status = useAudioPlayerStatus(player);
	const warningForeground = useThemeColor("warning-foreground");

	// Ensure playback routes to the main speaker, not the quiet earpiece.
	useEffect(() => {
		void setAudioModeAsync({
			allowsRecording: false,
			playsInSilentMode: true,
		}).catch(() => {});
	}, []);

	const isPlaying = status.playing;
	const fallbackDuration = durationMs && durationMs > 0 ? durationMs / 1000 : 0;
	// Prefer the player's reported duration once it loads; otherwise fall back to
	// the value persisted at record time.
	const reportedDuration = status.duration ?? 0;
	const duration = reportedDuration > 0 ? reportedDuration : fallbackDuration;
	const current = Math.min(
		status.currentTime ?? 0,
		duration > 0 ? duration : Number.POSITIVE_INFINITY,
	);
	const progress = duration > 0 ? Math.min(current / duration, 1) : 0;

	const handleToggle = () => {
		if (isPlaying) {
			player.pause();
			return;
		}
		if (status.didJustFinish || current >= duration) {
			player.seekTo(0);
		}
		player.play();
	};

	return (
		<View className="gap-3 rounded-2xl bg-warning-soft px-4 py-4">
			<View className="flex-row items-center gap-3">
				<Pressable
					onPress={handleToggle}
					accessibilityRole="button"
					accessibilityLabel={isPlaying ? "Pause" : "Play"}
					className="size-12 items-center justify-center rounded-full bg-warning active:opacity-85"
				>
					<Ionicons
						name={isPlaying ? "pause" : "play"}
						size={22}
						color={warningForeground}
					/>
				</Pressable>

				<View className="flex-1 gap-1.5">
					<View className="h-1.5 overflow-hidden rounded-full bg-black/10">
						<View
							className="h-full rounded-full bg-warning"
							style={{ width: `${Math.round(progress * 100)}%` }}
						/>
					</View>
					<View className="flex-row justify-between">
						<Text className="text-muted-foreground text-xs">
							{formatClock(current)}
						</Text>
						<Text className="text-muted-foreground text-xs">
							{formatClock(duration)}
						</Text>
					</View>
				</View>
			</View>
		</View>
	);
}
