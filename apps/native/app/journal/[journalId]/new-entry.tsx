import { Ionicons } from "@expo/vector-icons";
import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useThemeColor } from "heroui-native/hooks";
import { useCallback, useMemo, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Image,
	KeyboardAvoidingView,
	Linking,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useJournalPaywall } from "@/components/billing/journal-paywall-provider";
import { AudioRecorderField } from "@/components/library/audio-recorder-field";
import { DateField } from "@/components/library/date-field";
import {
	type EntryMode,
	EntryModeTabs,
} from "@/components/library/entry-mode-tabs";
import { MemoryExportNote } from "@/components/library/memory-export-note";
import { VideoEntryField } from "@/components/library/video-entry-field";
import { parseMonthDayYear } from "@/lib/journal/parse-date";
import {
	type PickedEntryImage,
	pickEntryImageFromCamera,
	pickEntryImageFromLibrary,
} from "@/lib/journal/pick-entry-image";
import type { PickedEntryVideo } from "@/lib/journal/pick-entry-video";
import { uploadBinaryToConvex } from "@/lib/journal/upload-binary";
import { generateVideoThumbnail } from "@/lib/journal/video-thumbnail";
import { useMutationToast } from "@/lib/mutation-toast";
import {
	ensureNotificationPermission,
	scheduleFirstEntryCelebration,
} from "@/lib/notifications/scheduler";

export default function NewEntryScreen() {
	const insets = useSafeAreaInsets();
	const params = useLocalSearchParams<{ journalId?: string }>();
	const journalId = params.journalId as Id<"journals"> | undefined;

	const createEntry = useMutation(api.journal.entries.mutations.create);
	const generateUploadUrl = useMutation(
		api.journal.mutations.generateUploadUrl,
	);

	const mutationToast = useMutationToast();
	const { hasPaidAccess, openPaywall } = useJournalPaywall();
	const [
		accentForeground,
		foreground,
		placeholderColor,
		dangerColor,
		warningColor,
	] = useThemeColor([
		"accent-foreground",
		"foreground",
		"field-placeholder",
		"danger",
		"warning",
	]);

	const [mode, setMode] = useState<EntryMode>("writing");
	const [title, setTitle] = useState("");
	const [dateInput, setDateInput] = useState("");
	const [body, setBody] = useState("");
	const [image, setImage] = useState<PickedEntryImage | null>(null);
	const [audio, setAudio] = useState<{
		uri: string;
		mimeType: string;
		durationMs: number;
	} | null>(null);
	const [video, setVideo] = useState<PickedEntryVideo | null>(null);
	// True while the cover is the auto-grabbed first frame, so replacing the
	// video refreshes it — but a cover the user chose themselves is kept.
	const [coverIsAutoFrame, setCoverIsAutoFrame] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [showErrors, setShowErrors] = useState(false);

	const dateMs = useMemo(() => parseMonthDayYear(dateInput), [dateInput]);

	const handleCancel = () => {
		if (submitting) return;
		router.back();
	};

	const handlePickFromLibrary = useCallback(async (): Promise<boolean> => {
		const picked = await pickEntryImageFromLibrary();
		if (picked.kind === "canceled") return false;
		if (picked.kind === "permission-denied") {
			if (picked.previouslyDenied) {
				Alert.alert(
					"Photo access needed",
					"Enable photo access in Settings to attach a photo.",
					[
						{ text: "Cancel", style: "cancel" },
						{
							text: "Open Settings",
							onPress: () => void Linking.openSettings(),
						},
					],
				);
			}
			return false;
		}
		if (picked.kind === "error") {
			Alert.alert("Could not add photo", picked.message);
			return false;
		}
		setImage(picked.image);
		return true;
	}, []);

	const handleTakePhoto = useCallback(async (): Promise<boolean> => {
		const picked = await pickEntryImageFromCamera();
		if (picked.kind === "canceled") return false;
		if (picked.kind === "permission-denied") {
			if (picked.previouslyDenied) {
				Alert.alert(
					"Camera access needed",
					"Enable camera access in Settings to take a photo.",
					[
						{ text: "Cancel", style: "cancel" },
						{
							text: "Open Settings",
							onPress: () => void Linking.openSettings(),
						},
					],
				);
			}
			return false;
		}
		if (picked.kind === "error") {
			Alert.alert("Could not take photo", picked.message);
			return false;
		}
		setImage(picked.image);
		return true;
	}, []);

	const handleVideoChange = useCallback(
		async (next: PickedEntryVideo | null) => {
			setVideo(next);

			if (!next) {
				if (coverIsAutoFrame) {
					setImage(null);
					setCoverIsAutoFrame(false);
				}
				return;
			}

			// Default cover is the very first frame; only overwrite a cover the
			// user picked themselves if there isn't one yet.
			if (image && !coverIsAutoFrame) return;

			const frame = await generateVideoThumbnail(next.uri, 0);
			if (frame) {
				setImage(frame);
				setCoverIsAutoFrame(true);
			}
		},
		[coverIsAutoFrame, image],
	);

	const submit = useCallback(async () => {
		if (!journalId) return;
		setShowErrors(true);

		if (mode === "writing") {
			if (!title.trim() || dateMs === null || !body.trim()) return;
		} else if (mode === "video") {
			if (!video) {
				Alert.alert("No video yet", "Record or choose a video before saving.");
				return;
			}
			if (!title.trim() || dateMs === null) return;
		} else if (!audio) {
			Alert.alert("No audio yet", "Tap the mic to record before saving.");
			return;
		} else if (!title.trim() || dateMs === null) {
			return;
		}

		// Form is valid — gate here so free users fill out the entry first, then hit
		// the paywall on "Create" (covers both writing and voice entries).
		if (!hasPaidAccess) {
			openPaywall();
			return;
		}
		setSubmitting(true);
		try {
			let imageId: Id<"_storage"> | undefined;
			if (image) {
				imageId = await uploadBinaryToConvex({
					uri: image.uri,
					mimeType: image.mimeType,
					generateUploadUrl: () => generateUploadUrl(),
				});
			}
			let videoId: Id<"_storage"> | undefined;
			if (mode === "video" && video) {
				videoId = await uploadBinaryToConvex({
					uri: video.uri,
					mimeType: video.mimeType,
					generateUploadUrl: () => generateUploadUrl(),
				});
			}
			let audioId: Id<"_storage"> | undefined;
			if (mode === "recording" && audio) {
				audioId = await uploadBinaryToConvex({
					uri: audio.uri,
					mimeType: audio.mimeType,
					generateUploadUrl: () => generateUploadUrl(),
				});
			}

			const entryTitle = title.trim();
			const entryDateMs = dateMs as number;

			const result = await createEntry({
				journalId,
				title: entryTitle,
				dateMs: entryDateMs,
				body: mode === "writing" ? body.trim() : undefined,
				mode,
				imageId,
				audioId,
				audioDurationMs:
					mode === "recording" ? (audio?.durationMs ?? undefined) : undefined,
				videoId,
				videoDurationMs:
					mode === "video" ? (video?.durationMs ?? undefined) : undefined,
			});

			mutationToast.success("Entry saved!");

			// Celebrate the very first entry with a local push right after saving.
			if (result?.isFirstEntry) {
				void (async () => {
					if (await ensureNotificationPermission()) {
						await scheduleFirstEntryCelebration();
					}
				})();
			}

			router.back();
		} catch (err) {
			mutationToast.error(err, "Could not save entry. Please try again.");
		} finally {
			setSubmitting(false);
		}
	}, [
		audio,
		body,
		createEntry,
		dateMs,
		generateUploadUrl,
		hasPaidAccess,
		image,
		journalId,
		mode,
		mutationToast,
		openPaywall,
		title,
		video,
	]);

	const isRecordingMode = mode === "recording";
	const isVideoMode = mode === "video";

	// Both recorded kinds sit on a tinted surface; writing stays on mint. Voice
	// keeps the amber wash, video gets the red one.
	const usesWarmSurface = isRecordingMode || isVideoMode;
	const recordingSurfaceClass = isVideoMode
		? "bg-danger-soft/40"
		: "bg-warning-soft/40";
	/** Accent of whichever recording medium is active — amber voice, red video. */
	const recordingAccent = isVideoMode ? dangerColor : warningColor;

	// Picking a cover by hand marks it as the user's, so replacing the video
	// won't overwrite it. Only counts if something was actually chosen.
	const chooseCoverManually = useCallback(
		async (action: () => Promise<boolean>) => {
			if (await action()) setCoverIsAutoFrame(false);
		},
		[],
	);

	const handleEditThumbnail = useCallback(() => {
		const options: Array<{
			text: string;
			style?: "cancel" | "destructive";
			onPress?: () => void;
		}> = [
			{
				text: "Choose from Library",
				onPress: () => void chooseCoverManually(handlePickFromLibrary),
			},
			{
				text: "Take Photo",
				onPress: () => void chooseCoverManually(handleTakePhoto),
			},
		];

		if (video) {
			options.push({
				text: "Use first frame",
				onPress: () => {
					void generateVideoThumbnail(video.uri, 0).then((frame) => {
						if (frame) {
							setImage(frame);
							setCoverIsAutoFrame(true);
						}
					});
				},
			});
		}
		options.push({ text: "Cancel", style: "cancel" });

		Alert.alert("Edit thumbnail", undefined, options);
	}, [chooseCoverManually, handlePickFromLibrary, handleTakePhoto, video]);

	const renderCoverImageSection = (color: string, promptText: string) => (
		<View className="gap-1.5">
			<Text className="font-semibold text-base text-foreground">
				Cover Image{" "}
				<Text className="font-normal text-sm" style={{ color }}>
					(optional)
				</Text>
			</Text>
			{image ? (
				<View className="overflow-hidden rounded-2xl bg-secondary/40">
					<Image
						source={{ uri: image.uri }}
						className="h-48 w-full"
						resizeMode="cover"
					/>
					<Pressable
						onPress={handleEditThumbnail}
						accessibilityRole="button"
						accessibilityLabel="Edit thumbnail"
						className="absolute top-3 right-3 flex-row items-center gap-1.5 rounded-full bg-background px-3 py-2 active:opacity-80"
					>
						<Ionicons name="pencil" size={14} color={foreground} />
						<Text className="font-semibold text-foreground text-sm">
							Edit Thumbnail
						</Text>
					</Pressable>
				</View>
			) : (
				<View
					className="items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-6"
					style={{ borderColor: color }}
				>
					<Text className="text-center text-base text-muted-foreground">
						{promptText}
					</Text>

					<Pressable
						onPress={() => void chooseCoverManually(handleTakePhoto)}
						accessibilityRole="button"
						accessibilityLabel="Add image"
						className="w-full flex-row items-center justify-center gap-2 rounded-xl py-3.5 active:opacity-90"
						style={{ backgroundColor: color }}
					>
						<Ionicons name="camera" size={19} color={accentForeground} />
						<Text
							className="font-semibold text-base"
							style={{ color: accentForeground }}
						>
							Add Image
						</Text>
					</Pressable>

					<View className="w-full flex-row items-center gap-3">
						<View className="h-px flex-1 bg-border" />
						<Text className="text-muted-foreground text-xs">OR</Text>
						<View className="h-px flex-1 bg-border" />
					</View>

					<Pressable
						onPress={() => void chooseCoverManually(handlePickFromLibrary)}
						accessibilityRole="button"
						accessibilityLabel="Choose from gallery"
						className="w-full flex-row items-center justify-center gap-2 rounded-xl border bg-background py-3.5 active:opacity-90"
						style={{ borderColor: color }}
					>
						<Ionicons name="images-outline" size={19} color={color} />
						<Text className="font-semibold text-base" style={{ color }}>
							Choose From Gallery
						</Text>
					</Pressable>
				</View>
			)}
			<Text className="text-muted-foreground text-sm">
				The image will be used as the cover of your journal entry.
			</Text>
		</View>
	);

	const imagePickerSection = (
		<View className="gap-3 rounded-2xl border border-border/60 bg-secondary/20 p-3">
			{image ? (
				<View className="overflow-hidden rounded-xl">
					<Image
						source={{ uri: image.uri }}
						className="h-44 w-full"
						resizeMode="contain"
					/>
					<Pressable
						onPress={() => setImage(null)}
						accessibilityRole="button"
						accessibilityLabel="Remove photo"
						className="absolute top-2 right-2 size-9 items-center justify-center rounded-full bg-overlay active:opacity-80"
					>
						<Ionicons name="close" size={20} color={accentForeground} />
					</Pressable>
				</View>
			) : (
				<>
					<Pressable
						onPress={() => void handleTakePhoto()}
						accessibilityRole="button"
						accessibilityLabel="Take a photo"
						className="items-center gap-1.5 rounded-xl bg-background py-5 active:opacity-90"
					>
						<Ionicons name="camera-outline" size={26} color={foreground} />
						<Text className="font-semibold text-base text-foreground">
							Take Photo
						</Text>
					</Pressable>

					<Pressable
						onPress={() => void handlePickFromLibrary()}
						accessibilityRole="button"
						accessibilityLabel="Choose from library"
						className="items-center gap-1.5 rounded-xl bg-background py-5 active:opacity-90"
					>
						<Ionicons name="images-outline" size={26} color={foreground} />
						<Text className="font-semibold text-base text-foreground">
							Choose from Library
						</Text>
					</Pressable>
				</>
			)}
		</View>
	);

	return (
		<View
			className={`flex-1 ${usesWarmSurface ? recordingSurfaceClass : "bg-secondary/30"}`}
		>
			{/* Teal header */}
			<View
				className="bg-primary px-4 pb-4"
				style={{ paddingTop: insets.top + 8 }}
			>
				<View className="h-10 flex-row items-center justify-between">
					<Pressable
						onPress={handleCancel}
						accessibilityRole="button"
						accessibilityLabel="Cancel"
						className="flex-row items-center gap-1 active:opacity-70"
						hitSlop={8}
					>
						<Ionicons name="chevron-back" size={22} color={accentForeground} />
						<Text className="font-medium text-base text-primary-foreground">
							Cancel
						</Text>
					</Pressable>

					<Text className="font-semibold text-base text-primary-foreground">
						{isVideoMode
							? "Video Entry"
							: isRecordingMode
								? "Recording Entry"
								: "Writing Entry"}
					</Text>

					<Pressable
						onPress={() => void submit()}
						disabled={submitting}
						accessibilityRole="button"
						accessibilityLabel="Create entry"
						className="active:opacity-70"
						hitSlop={8}
					>
						{submitting ? (
							<ActivityIndicator color={accentForeground} />
						) : (
							<Text className="font-semibold text-base text-primary-foreground">
								Create
							</Text>
						)}
					</Pressable>
				</View>
			</View>

			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				className="flex-1"
			>
				<ScrollView
					className="flex-1"
					contentContainerClassName="px-4 pt-6 pb-12 gap-5"
					keyboardShouldPersistTaps="handled"
				>
					<EntryModeTabs value={mode} onChange={setMode} />

					{isVideoMode ? (
						<>
							{renderCoverImageSection(
								dangerColor,
								"Attach a video thumbnail of your choice",
							)}

							<View className="gap-1.5">
								<Text className="font-semibold text-base text-foreground">
									Title
								</Text>
								<TextInput
									value={title}
									onChangeText={setTitle}
									placeholder="Give your journal a title"
									placeholderTextColor={placeholderColor}
									className={`h-14 rounded-2xl border bg-background px-4 text-base text-foreground ${
										showErrors && !title.trim()
											? "border-destructive"
											: "border-border"
									}`}
								/>
							</View>

							<View className="gap-1.5">
								<Text className="font-semibold text-base text-foreground">
									Date
								</Text>
								<DateField
									value={dateInput}
									onChange={setDateInput}
									placeholder="Select Date"
									invalid={showErrors && dateMs === null}
								/>
							</View>

							<View className="gap-1.5">
								<Text className="font-semibold text-base text-foreground">
									Your Video
								</Text>
								<VideoEntryField
									value={video}
									onChange={(next) => void handleVideoChange(next)}
									disabled={submitting}
								/>
							</View>

							<MemoryExportNote kind="video" />

							{showErrors && video && (!title.trim() || dateMs === null) ? (
								<Text className="text-center text-destructive text-sm">
									Please add a title and date for this video.
								</Text>
							) : null}
						</>
					) : mode === "writing" ? (
						<>
							<View className="gap-1.5">
								<Text className="font-semibold text-base text-foreground">
									Title
								</Text>
								<TextInput
									value={title}
									onChangeText={setTitle}
									placeholder=""
									placeholderTextColor={placeholderColor}
									className={`h-14 rounded-2xl border bg-background px-4 text-base text-foreground ${
										showErrors && !title.trim()
											? "border-destructive"
											: "border-border"
									}`}
								/>
							</View>

							<View className="gap-1.5">
								<Text className="font-semibold text-base text-foreground">
									Start Date
								</Text>
								<DateField
									value={dateInput}
									onChange={setDateInput}
									placeholder="Select date"
									invalid={showErrors && dateMs === null}
								/>
							</View>

							<View className="gap-1.5">
								<Text className="font-semibold text-base text-foreground">
									Entry Log
								</Text>
								<TextInput
									value={body}
									onChangeText={setBody}
									placeholder="Type here..."
									placeholderTextColor={placeholderColor}
									multiline
									numberOfLines={8}
									textAlignVertical="top"
									className={`min-h-40 rounded-2xl border bg-background px-4 py-3 text-base text-foreground ${
										showErrors && !body.trim()
											? "border-destructive"
											: "border-border"
									}`}
								/>
							</View>

							{/* Photo (optional) */}
							<View className="gap-1.5">
								<Text className="font-semibold text-base text-foreground">
									Photo{" "}
									<Text className="font-normal text-muted-foreground text-sm">
										(optional)
									</Text>
								</Text>
								{imagePickerSection}
							</View>
						</>
					) : (
						<>
							{renderCoverImageSection(
								recordingAccent,
								"Attach a photo of your choice",
							)}

							<View className="gap-1.5">
								<Text className="font-semibold text-base text-foreground">
									Title
								</Text>
								<TextInput
									value={title}
									onChangeText={setTitle}
									placeholder="Give your journal a title"
									placeholderTextColor={placeholderColor}
									className={`h-14 rounded-2xl border bg-background px-4 text-base text-foreground ${
										showErrors && !title.trim()
											? "border-destructive"
											: "border-border"
									}`}
								/>
							</View>

							<View className="gap-1.5">
								<Text className="font-semibold text-base text-foreground">
									Date
								</Text>
								<DateField
									value={dateInput}
									onChange={setDateInput}
									placeholder="Select Date"
									invalid={showErrors && dateMs === null}
								/>
							</View>

							<View className="gap-1.5">
								<Text className="font-semibold text-base text-foreground">
									Your Recording
								</Text>
								<AudioRecorderField
									value={audio}
									onChange={setAudio}
									disabled={submitting}
								/>
								{!audio ? (
									<Text
										className="text-center text-sm"
										style={{ color: recordingAccent }}
									>
										Tap the microphone to start. Tap again to stop.
									</Text>
								) : null}
							</View>

							<MemoryExportNote kind="recording" />

							{showErrors && audio && (!title.trim() || dateMs === null) ? (
								<Text className="text-center text-destructive text-sm">
									Please add a title and date for this recording.
								</Text>
							) : null}
						</>
					)}

					{showErrors &&
					mode === "writing" &&
					(!title.trim() || dateMs === null || !body.trim()) ? (
						<Text className="text-center text-destructive text-sm">
							Please fill in the title, start date, and entry log.
						</Text>
					) : null}
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	);
}
