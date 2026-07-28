import { Ionicons } from "@expo/vector-icons";
import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Spinner } from "heroui-native";
import { useThemeColor } from "heroui-native/hooks";
import { useEffect, useState } from "react";
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
import { DateField } from "@/components/library/date-field";
import { EntryAudioPlayer } from "@/components/library/entry-audio-player";
import { parseMonthDayYear } from "@/lib/journal/parse-date";
import {
	type PickedEntryImage,
	pickEntryImageFromCamera,
	pickEntryImageFromLibrary,
} from "@/lib/journal/pick-entry-image";
import { uploadBinaryToConvex } from "@/lib/journal/upload-binary";
import { useMutationToast } from "@/lib/mutation-toast";

/** Stored entry dates are UTC midnight (see parse-date) — format back to the
 * `M/DD/YYYY` string the DateField expects using UTC parts. */
function dateMsToInput(ms: number): string {
	const d = new Date(ms);
	return `${d.getUTCMonth() + 1}/${String(d.getUTCDate()).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export default function EditEntryScreen() {
	const insets = useSafeAreaInsets();
	const params = useLocalSearchParams<{ entryId?: string }>();
	const entryId = params.entryId as Id<"journalEntries"> | undefined;

	const entry = useQuery(
		api.journal.entries.queries.getById,
		entryId ? { id: entryId } : "skip",
	);
	const updateEntry = useMutation(api.journal.entries.mutations.update);
	const generateUploadUrl = useMutation(
		api.journal.mutations.generateUploadUrl,
	);
	const toast = useMutationToast();
	const { guardJournalAction } = useJournalPaywall();

	const [accentForeground, foreground, placeholderColor] = useThemeColor([
		"accent-foreground",
		"foreground",
		"field-placeholder",
	]);

	const [title, setTitle] = useState("");
	const [dateInput, setDateInput] = useState("");
	const [body, setBody] = useState("");
	// New image the user picked this session (uploaded on save).
	const [image, setImage] = useState<PickedEntryImage | null>(null);
	// The entry's current image (kept if no new one is picked).
	const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
	const [hydrated, setHydrated] = useState(false);
	const [showErrors, setShowErrors] = useState(false);
	const [saving, setSaving] = useState(false);

	const isRecording = entry?.mode === "recording";

	// Pre-fill the form once the entry loads.
	useEffect(() => {
		if (!entry || hydrated) return;
		setTitle(entry.title);
		setDateInput(dateMsToInput(entry.dateMs));
		setBody(entry.body ?? "");
		setExistingImageUrl(entry.imageUrl ?? null);
		setHydrated(true);
	}, [entry, hydrated]);

	const dateMs = parseMonthDayYear(dateInput);
	const previewUri = image?.uri ?? existingImageUrl;
	const titleInvalid = !title.trim();
	const dateInvalid = dateMs === null;
	const bodyInvalid = !isRecording && !body.trim();
	const imageInvalid = !previewUri;

	const handlePickFromLibrary = async () => {
		const picked = await pickEntryImageFromLibrary();
		if (picked.kind === "canceled") return;
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
			return;
		}
		if (picked.kind === "error") {
			Alert.alert("Could not add photo", picked.message);
			return;
		}
		setImage(picked.image);
	};

	const handleTakePhoto = async () => {
		const picked = await pickEntryImageFromCamera();
		if (picked.kind === "canceled") return;
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
			return;
		}
		if (picked.kind === "error") {
			Alert.alert("Could not take photo", picked.message);
			return;
		}
		setImage(picked.image);
	};

	const runSave = async () => {
		if (!entryId || saving) return;
		setSaving(true);
		try {
			// Only upload (and swap) the image when the user picked a new one;
			// otherwise the update keeps the existing image. Audio is left untouched.
			let imageId: Id<"_storage"> | undefined;
			if (image) {
				imageId = await uploadBinaryToConvex({
					uri: image.uri,
					mimeType: image.mimeType,
					generateUploadUrl: () => generateUploadUrl(),
				});
			}

			await updateEntry({
				id: entryId,
				title: title.trim(),
				dateMs: dateMs as number,
				body: isRecording ? undefined : body.trim(),
				imageId,
			});

			toast.success("Entry updated.");
			router.back();
		} catch (err) {
			toast.error(err, "Could not update entry. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	const handleSave = () => {
		setShowErrors(true);
		if (titleInvalid || dateInvalid || bodyInvalid || imageInvalid) return;
		// Editing is a paid journal feature (the server enforces it too).
		guardJournalAction(() => void runSave());
	};

	return (
		<View className="flex-1 bg-secondary/30">
			{/* Teal header */}
			<View
				className="bg-primary px-4 pb-4"
				style={{ paddingTop: insets.top + 8 }}
			>
				<View className="h-10 flex-row items-center justify-between">
					<Pressable
						onPress={() => router.back()}
						disabled={saving}
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
						Edit Entry
					</Text>

					<Pressable
						onPress={handleSave}
						disabled={saving || entry === undefined || entry === null}
						accessibilityRole="button"
						accessibilityLabel="Save entry"
						className="active:opacity-70"
						hitSlop={8}
					>
						{saving ? (
							<ActivityIndicator color={accentForeground} />
						) : (
							<Text className="font-semibold text-base text-primary-foreground">
								Save
							</Text>
						)}
					</Pressable>
				</View>
			</View>

			{entry === undefined ? (
				<View className="flex-1 items-center justify-center">
					<Spinner size="lg" />
				</View>
			) : entry === null ? (
				<View className="flex-1 items-center justify-center gap-2 px-6">
					<Text className="font-semibold text-foreground text-lg">
						Entry not found
					</Text>
					<Text className="text-center text-muted-foreground text-sm">
						It may have been deleted.
					</Text>
				</View>
			) : (
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : undefined}
					className="flex-1"
				>
					<ScrollView
						className="flex-1"
						contentContainerClassName="px-4 pt-6 pb-12 gap-5"
						keyboardShouldPersistTaps="handled"
					>
						{/* Title */}
						<View className="gap-1.5">
							<Text className="font-semibold text-base text-foreground">
								Title
							</Text>
							<TextInput
								value={title}
								onChangeText={setTitle}
								placeholderTextColor={placeholderColor}
								className={`h-14 rounded-2xl border bg-background px-4 text-base text-foreground ${
									showErrors && titleInvalid
										? "border-destructive"
										: "border-border"
								}`}
							/>
						</View>

						{/* Start Date */}
						<View className="gap-1.5">
							<Text className="font-semibold text-base text-foreground">
								Start Date
							</Text>
							<DateField
								value={dateInput}
								onChange={setDateInput}
								placeholder="Select date"
								invalid={showErrors && dateInvalid}
							/>
						</View>

						{/* Body (writing) or audio (recording, read-only) */}
						{isRecording ? (
							entry.audioUrl ? (
								<View className="gap-1.5">
									<Text className="font-semibold text-base text-foreground">
										Recording
									</Text>
									<EntryAudioPlayer
										uri={entry.audioUrl}
										durationMs={entry.audioDurationMs}
									/>
								</View>
							) : null
						) : (
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
										showErrors && bodyInvalid
											? "border-destructive"
											: "border-border"
									}`}
								/>
							</View>
						)}

						{/* Photo (required) */}
						<View className="gap-1.5">
							<Text className="font-semibold text-base text-foreground">
								Photo
							</Text>
							<View
								className={`gap-3 rounded-2xl border bg-secondary/20 p-3 ${
									showErrors && imageInvalid
										? "border-destructive"
										: "border-border/60"
								}`}
							>
								{previewUri ? (
									<View className="overflow-hidden rounded-xl">
										<Image
											source={{ uri: previewUri }}
											className="h-44 w-full"
											resizeMode="contain"
										/>
									</View>
								) : null}

								<Pressable
									onPress={() => void handleTakePhoto()}
									accessibilityRole="button"
									accessibilityLabel="Take a photo"
									className="items-center gap-1.5 rounded-xl bg-background py-5 active:opacity-90"
								>
									<Ionicons
										name="camera-outline"
										size={26}
										color={foreground}
									/>
									<Text className="font-semibold text-base text-foreground">
										{previewUri ? "Replace with Photo" : "Take Photo"}
									</Text>
								</Pressable>

								<Pressable
									onPress={() => void handlePickFromLibrary()}
									accessibilityRole="button"
									accessibilityLabel="Choose from library"
									className="items-center gap-1.5 rounded-xl bg-background py-5 active:opacity-90"
								>
									<Ionicons
										name="images-outline"
										size={26}
										color={foreground}
									/>
									<Text className="font-semibold text-base text-foreground">
										Choose from Library
									</Text>
								</Pressable>
							</View>
							{showErrors && imageInvalid ? (
								<Text className="text-destructive text-xs">
									A photo is required.
								</Text>
							) : null}
						</View>
					</ScrollView>
				</KeyboardAvoidingView>
			)}
		</View>
	);
}
