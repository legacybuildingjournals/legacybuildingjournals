import { Ionicons } from "@expo/vector-icons";
import {
	getRecordingPermissionsAsync,
	RecordingPresets,
	requestRecordingPermissionsAsync,
	setAudioModeAsync,
	useAudioPlayer,
	useAudioPlayerStatus,
	useAudioRecorder,
	useAudioRecorderState,
} from "expo-audio";
import { useThemeColor } from "heroui-native/hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, Pressable, Text, View } from "react-native";

function formatDuration(ms: number): string {
	if (!Number.isFinite(ms) || ms < 0) return "0:00";
	const totalSeconds = Math.floor(ms / 1000);
	const mins = Math.floor(totalSeconds / 60);
	const secs = totalSeconds % 60;
	return `${mins}:${String(secs).padStart(2, "0")}`;
}

type AudioRecorderFieldProps = {
	value: {
		uri: string;
		mimeType: string;
		durationMs: number;
	} | null;
	onChange: (next: AudioRecorderFieldProps["value"]) => void;
	disabled?: boolean;
};

/**
 * Big circular record button with a yellow ring (matches the screenshot).
 * After recording, exposes a play/stop control and a Re-record affordance.
 *
 * Audio is held locally as `{ uri, mimeType, durationMs }` and uploaded by
 * the parent screen at submit time via `uploadBinaryToConvex`.
 */
export function AudioRecorderField({
	value,
	onChange,
	disabled = false,
}: AudioRecorderFieldProps) {
	const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
	const recorderState = useAudioRecorderState(recorder);

	const audioUri = value?.uri;
	const playerSource = useMemo(
		() => (audioUri ? { uri: audioUri } : null),
		[audioUri],
	);
	const player = useAudioPlayer(playerSource);
	const playerStatus = useAudioPlayerStatus(player);

	const [warningForeground, foreground] = useThemeColor([
		"warning-foreground",
		"foreground",
	]);

	const [preparing, setPreparing] = useState(false);
	// Wall-clock start time of the active recording. expo-audio's recorder status
	// reports `durationMillis: 0` once stopped, so we measure elapsed time
	// ourselves as the source of truth.
	const recordStartRef = useRef<number | null>(null);

	// Default to a playback-friendly session so recorded audio plays out the
	// main speaker. We only flip to record mode for the duration of recording.
	useEffect(() => {
		void setAudioModeAsync({
			allowsRecording: false,
			playsInSilentMode: true,
		}).catch((err) => {
			console.warn("[AudioRecorderField] setAudioModeAsync failed:", err);
		});
	}, []);

	const isRecording = recorderState.isRecording;
	const isPlaying = playerStatus.playing;

	const handleStartRecording = async () => {
		if (disabled || preparing) return;
		setPreparing(true);
		let recordingStarted = false;
		try {
			const existing = await getRecordingPermissionsAsync();
			const previouslyDenied = existing.status === "denied";
			const permission = await requestRecordingPermissionsAsync();
			if (!permission.granted) {
				if (previouslyDenied) {
					Alert.alert(
						"Microphone access needed",
						"Enable microphone access in Settings to record audio entries.",
						[
							{ text: "Cancel", style: "cancel" },
							{
								text: "Open Settings",
								onPress: () => void Linking.openSettings(),
							},
						],
					);
				}
				return;
			}
			// Switch to record mode for capture.
			await setAudioModeAsync({
				allowsRecording: true,
				playsInSilentMode: true,
			});
			await recorder.prepareToRecordAsync();
			recorder.record();
			recordStartRef.current = Date.now();
			recordingStarted = true;
		} catch (err) {
			Alert.alert(
				"Could not start recording",
				err instanceof Error ? err.message : "Please try again.",
			);
		} finally {
			if (!recordingStarted) {
				await setAudioModeAsync({
					allowsRecording: false,
					playsInSilentMode: true,
				}).catch(() => {});
			}
			setPreparing(false);
		}
	};

	const handleStopRecording = async () => {
		try {
			await recorder.stop();
			// Back to playback mode so the just-recorded clip plays out the speaker.
			await setAudioModeAsync({
				allowsRecording: false,
				playsInSilentMode: true,
			}).catch(() => {});
			// `getStatus().durationMillis` is 0 after stop and `recorderState` may be
			// stale, so take the largest of: measured elapsed time, the recorder
			// status, and the last polled state value.
			const elapsedMs = recordStartRef.current
				? Date.now() - recordStartRef.current
				: 0;
			recordStartRef.current = null;
			const durationMs = Math.max(
				elapsedMs,
				recorder.getStatus().durationMillis ?? 0,
				recorderState.durationMillis ?? 0,
			);

			// `recorder.uri` points at the finalized recording. We hand it off as-is;
			// the modern File API in `uploadBinaryToConvex` reads it natively at
			// upload time (no scoped-cache restriction like the legacy FS APIs).
			const uri = recorder.uri;
			if (!uri) {
				Alert.alert(
					"Could not save recording",
					"No recording file was produced. Please try again.",
				);
				return;
			}

			// `audio/mp4` is the standard MIME for the AAC/.m4a clip expo-audio
			// produces. Convex serves the uploaded file with this Content-Type, and
			// because the storage URL has no file extension, iOS AVPlayer relies on
			// it to recognise the format — the non-standard `audio/m4a` failed to
			// load remotely (local previews worked because the file:// uri kept its
			// .m4a extension).
			onChange({ uri, mimeType: "audio/mp4", durationMs });
		} catch (err) {
			Alert.alert(
				"Could not save recording",
				err instanceof Error ? err.message : "Please try again.",
			);
		}
	};

	const handleTogglePlay = () => {
		if (!value) return;
		if (isPlaying) {
			player.pause();
		} else {
			if (playerStatus.didJustFinish || playerStatus.currentTime === 0) {
				player.seekTo(0);
			}
			player.play();
		}
	};

	const handleReRecord = () => {
		if (isPlaying) player.pause();
		onChange(null);
	};

	if (!value) {
		const showStop = isRecording;
		return (
			<View className="items-center gap-3 py-4">
				<Pressable
					onPress={() =>
						showStop ? void handleStopRecording() : void handleStartRecording()
					}
					disabled={disabled || preparing}
					accessibilityRole="button"
					accessibilityLabel={showStop ? "Stop recording" : "Start recording"}
					className="size-44 items-center justify-center rounded-full border-[5px] border-warning bg-muted active:opacity-90"
					style={{
						shadowColor: foreground,
						shadowOpacity: 0.12,
						shadowRadius: 10,
						shadowOffset: { width: 0, height: 4 },
						elevation: 4,
					}}
				>
					<Ionicons
						name={showStop ? "stop" : "mic"}
						size={64}
						color={foreground}
					/>
				</Pressable>

				<Text className="font-semibold text-warning text-xl">
					{showStop
						? formatDuration(recorderState.durationMillis ?? 0)
						: "Record"}
				</Text>
				{showStop ? (
					<Text className="text-muted-foreground text-sm">Tap to stop</Text>
				) : null}
			</View>
		);
	}

	return (
		<View className="gap-3 py-4">
			<View className="flex-row items-center gap-3 rounded-2xl bg-warning-soft px-4 py-4">
				<Pressable
					onPress={handleTogglePlay}
					disabled={disabled}
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

				<View className="flex-1">
					<Text className="font-semibold text-base text-foreground">
						Audio recording
					</Text>
					<Text className="text-muted-foreground text-sm">
						{formatDuration(value.durationMs)}
					</Text>
				</View>

				<Pressable
					onPress={handleReRecord}
					disabled={disabled}
					accessibilityRole="button"
					accessibilityLabel="Re-record"
					className="rounded-full px-3 py-2 active:opacity-70"
				>
					<Text className="font-semibold text-sm text-warning">Re-record</Text>
				</Pressable>
			</View>
		</View>
	);
}
