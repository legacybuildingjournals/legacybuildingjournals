import { Ionicons } from "@expo/vector-icons";
import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { router, useLocalSearchParams } from "expo-router";
import { Spinner } from "heroui-native";
import { useThemeColor } from "heroui-native/hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
	monthDayYearToDate,
	parseMonthDayYear,
} from "@/lib/journal/parse-date";
import {
	DEFAULT_STORY_TAB,
	isStoryTab,
	STORY_TABS,
	type StoryTab,
} from "@/lib/journal/story-types";
import {
	pickCoverImage,
	uploadCoverImage,
} from "@/lib/journal/upload-cover-image";

function messageFromError(err: unknown, fallback: string): string {
	if (err instanceof ConvexError) {
		const data = err.data as { message?: string } | string | undefined;
		if (typeof data === "string") return data;
		if (data?.message) return data.message;
	}
	if (err instanceof Error) return err.message;
	return fallback;
}

/** Stored dates use UTC midnight; format with UTC parts for DateField input. */
function dateMsToInput(ms: number): string {
	const date = new Date(ms);
	return `${date.getUTCMonth() + 1}/${String(date.getUTCDate()).padStart(2, "0")}/${date.getUTCFullYear()}`;
}

export default function CreateJournalScreen() {
	const insets = useSafeAreaInsets();
	const params = useLocalSearchParams<{ type?: string; journalId?: string }>();
	const editJournalId = params.journalId as Id<"journals"> | undefined;
	const isEditing = Boolean(editJournalId);
	const initialStoryType: StoryTab = isStoryTab(params.type)
		? params.type
		: DEFAULT_STORY_TAB;

	const journalToEdit = useQuery(
		api.journal.queries.getById,
		editJournalId ? { id: editJournalId } : "skip",
	);
	const createJournal = useMutation(api.journal.mutations.create);
	const updateJournal = useMutation(api.journal.mutations.update);
	const generateUploadUrl = useMutation(
		api.journal.mutations.generateUploadUrl,
	);
	const { guardJournalAction, hasPaidAccess, openPaywall } =
		useJournalPaywall();

	const [title, setTitle] = useState("");
	const [dedication, setDedication] = useState("");
	const [storyType, setStoryType] = useState<StoryTab>(initialStoryType);
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [coverUri, setCoverUri] = useState<string | null>(null);
	const [coverMime, setCoverMime] = useState<string | null>(null);
	const [coverSize, setCoverSize] = useState<number>(0);
	const [showErrors, setShowErrors] = useState(false);
	const [showStoryInfo, setShowStoryInfo] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [hydratedJournalId, setHydratedJournalId] =
		useState<Id<"journals"> | null>(null);

	const primary = useThemeColor("accent");
	const placeholderColor = useThemeColor("field-placeholder");

	const startMs = useMemo(() => parseMonthDayYear(startDate), [startDate]);
	const endMs = useMemo(() => parseMonthDayYear(endDate), [endDate]);

	const titleInvalid = !title.trim();
	const startDateInvalid = startMs === null;
	const endDateInvalid = endDate.length > 0 && endMs === null;
	const endBeforeStart = startMs !== null && endMs !== null && endMs < startMs;
	const coverInvalid = !coverUri;

	const formInvalid =
		titleInvalid ||
		startDateInvalid ||
		endDateInvalid ||
		endBeforeStart ||
		coverInvalid;

	useEffect(() => {
		if (
			!editJournalId ||
			!journalToEdit ||
			hydratedJournalId === editJournalId
		) {
			return;
		}
		setTitle(journalToEdit.title);
		setDedication(journalToEdit.dedication ?? "");
		setStoryType(journalToEdit.type);
		setStartDate(dateMsToInput(journalToEdit.dateMs));
		setEndDate(
			journalToEdit.endDateMs ? dateMsToInput(journalToEdit.endDateMs) : "",
		);
		setCoverUri(journalToEdit.coverImageUrl ?? null);
		setCoverMime(null);
		setCoverSize(0);
		setHydratedJournalId(editJournalId);
	}, [editJournalId, hydratedJournalId, journalToEdit]);

	const handleCancel = useCallback(() => {
		if (submitting) return;
		router.back();
	}, [submitting]);

	const handlePickCover = useCallback(async () => {
		if (submitting) return;
		const picked = await pickCoverImage();
		if (picked.kind === "canceled") return;
		if (picked.kind === "permission-denied") {
			Alert.alert(
				"Photo access needed",
				"Allow photo access in Settings to add a cover image.",
				[
					{ text: "Cancel", style: "cancel" },
					{
						text: "Open Settings",
						onPress: () => void Linking.openSettings(),
					},
				],
			);
			return;
		}
		if (picked.kind === "error") {
			Alert.alert("Could not pick image", picked.message);
			return;
		}
		setCoverUri(picked.image.uri);
		setCoverMime(picked.image.mimeType);
		setCoverSize(picked.image.sizeBytes);
	}, [submitting]);

	const runSubmit = useCallback(async () => {
		if (startMs === null) return;
		setSubmitting(true);
		try {
			let coverImageId:
				| Awaited<ReturnType<typeof uploadCoverImage>>
				| undefined;

			if (coverUri && coverMime) {
				coverImageId = await uploadCoverImage(
					{
						uri: coverUri,
						mimeType: coverMime,
						sizeBytes: coverSize,
					},
					() => generateUploadUrl(),
				);
			}

			if (editJournalId) {
				await updateJournal({
					id: editJournalId,
					title: title.trim(),
					dateMs: startMs,
					type: storyType,
					dedication: dedication.trim() ? dedication.trim() : undefined,
					coverImageId,
					endDateMs: endDate.trim() ? endMs : null,
				});
			} else {
				await createJournal({
					title: title.trim(),
					dateMs: startMs,
					type: storyType,
					dedication: dedication.trim() ? dedication.trim() : undefined,
					coverImageId,
					endDateMs: endMs ?? undefined,
				});
			}

			router.back();
		} catch (err) {
			Alert.alert(
				isEditing ? "Could not update journal" : "Could not create journal",
				messageFromError(err, "Please try again."),
			);
		} finally {
			setSubmitting(false);
		}
	}, [
		coverMime,
		coverSize,
		coverUri,
		createJournal,
		dedication,
		editJournalId,
		endDate,
		endMs,
		generateUploadUrl,
		isEditing,
		startMs,
		storyType,
		title,
		updateJournal,
	]);

	const handleSubmit = useCallback(() => {
		setShowErrors(true);
		if (formInvalid || startMs === null) return;

		// Form is valid — gate here so free users fill out the journal first, then
		// hit the paywall on "Create/Save".
		if (isEditing) {
			guardJournalAction(() => void runSubmit());
			return;
		}
		if (!hasPaidAccess) {
			openPaywall();
			return;
		}
		void runSubmit();
	}, [
		formInvalid,
		guardJournalAction,
		hasPaidAccess,
		isEditing,
		openPaywall,
		runSubmit,
		startMs,
	]);

	if (isEditing && journalToEdit === undefined) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<Spinner size="lg" />
			</View>
		);
	}

	if (isEditing && journalToEdit === null) {
		return (
			<View className="flex-1 items-center justify-center gap-2 bg-background px-6">
				<Text className="font-semibold text-foreground text-lg">
					Journal not found
				</Text>
				<Text className="text-center text-muted-foreground text-sm">
					It may have been deleted.
				</Text>
			</View>
		);
	}

	return (
		<View className="flex-1 bg-background">
			<View
				className="flex-row items-center justify-between border-border border-b bg-background px-4 pb-3"
				style={{ paddingTop: insets.top + 8 }}
			>
				<Pressable
					onPress={handleCancel}
					accessibilityRole="button"
					accessibilityLabel="Back"
					className="flex-row items-center gap-1 active:opacity-70"
					hitSlop={8}
				>
					<Ionicons name="chevron-back" size={22} color={primary} />
					<Text className="font-medium text-base text-primary">Back</Text>
				</Pressable>

				<Text className="font-semibold text-foreground text-lg">
					{isEditing ? "Edit Journal" : "Create Journal"}
				</Text>

				<Pressable
					onPress={handleCancel}
					accessibilityRole="button"
					accessibilityLabel="Cancel"
					className="active:opacity-70"
					hitSlop={8}
				>
					<Text className="text-base text-muted-foreground">Cancel</Text>
				</Pressable>
			</View>

			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				className="flex-1"
			>
				<ScrollView
					className="flex-1"
					contentContainerClassName="px-4 py-5 gap-5 pb-32"
					keyboardShouldPersistTaps="handled"
				>
					{/* Title */}
					<View className="gap-1.5">
						<Text className="font-semibold text-foreground text-sm">Title</Text>
						<TextInput
							value={title}
							onChangeText={setTitle}
							placeholder="Journal title"
							placeholderTextColor={placeholderColor}
							className={`h-12 rounded-2xl border bg-background px-3 text-base text-foreground ${
								showErrors && titleInvalid
									? "border-destructive"
									: "border-border"
							}`}
							aria-invalid={showErrors && titleInvalid}
						/>
					</View>

					{/* Dedication Line */}
					<View className="gap-1.5">
						<Text className="font-semibold text-foreground text-sm">
							Dedication Line
						</Text>
						<TextInput
							value={dedication}
							onChangeText={setDedication}
							placeholder="A short dedication (optional)"
							placeholderTextColor={placeholderColor}
							className="h-12 rounded-2xl border border-border bg-background px-3 text-base text-foreground"
						/>
					</View>

					{/* Journal Type */}
					<View className="gap-2">
						<View className="flex-row items-center gap-1.5">
							<Text className="font-semibold text-foreground text-sm">
								Journal Type
							</Text>
							<Pressable
								onPress={() => setShowStoryInfo((value) => !value)}
								accessibilityRole="button"
								accessibilityLabel={
									showStoryInfo
										? "Hide journal type information"
										: "Show journal type information"
								}
								accessibilityState={{ expanded: showStoryInfo }}
								className="size-5 items-center justify-center active:opacity-70"
								hitSlop={8}
							>
								<Ionicons
									name="information-circle-outline"
									size={18}
									color={primary}
								/>
							</Pressable>
						</View>
						{STORY_TABS.map((tab) => {
							const selected = storyType === tab.id;
							const description =
								tab.id === "my_story"
									? "Select this option to capture your own life and the Legacy you want to preserve."
									: "Select this option to document someone else's life, like your child or loved one, so their journey can be remembered and celebrated.";
							return (
								<Pressable
									key={tab.id}
									onPress={() => setStoryType(tab.id)}
									accessibilityRole="radio"
									accessibilityState={{ selected }}
									accessibilityLabel={tab.label}
									className={`items-start justify-center rounded-2xl border px-4 active:opacity-90 ${
										selected
											? "border-primary bg-primary/15"
											: "border-border bg-background"
									}`}
									style={{
										minHeight: 48,
										paddingTop: showStoryInfo ? 12 : 0,
										paddingBottom: showStoryInfo ? 12 : 0,
									}}
								>
									<Text
										className={`text-base ${
											selected ? "text-foreground" : "text-muted-foreground"
										}`}
									>
										{tab.label}
									</Text>
									{showStoryInfo ? (
										<Text className="mt-1 text-muted-foreground text-sm leading-5">
											{description}
										</Text>
									) : null}
								</Pressable>
							);
						})}
					</View>

					{/* Start Date */}
					<View className="gap-1.5">
						<Text className="font-semibold text-foreground text-sm">
							Start Date
						</Text>
						<DateField
							value={startDate}
							onChange={setStartDate}
							placeholder="Select date"
							invalid={showErrors && startDateInvalid}
						/>
					</View>

					{/* End Date (Optional) */}
					<View className="gap-1.5">
						<Text className="font-semibold text-foreground text-sm">
							End Date (Optional)
						</Text>
						<DateField
							value={endDate}
							onChange={setEndDate}
							placeholder="Select date"
							invalid={showErrors && (endDateInvalid || endBeforeStart)}
							minimumDate={
								startMs !== null
									? (monthDayYearToDate(startDate) ?? undefined)
									: undefined
							}
						/>
						{showErrors && endBeforeStart ? (
							<Text className="text-destructive text-xs">
								End date must be after start date.
							</Text>
						) : null}
					</View>

					{/* Cover image (required) */}
					<View className="gap-1.5">
						<Text className="font-semibold text-foreground text-sm">
							Cover Image
						</Text>
						<Pressable
							onPress={() => void handlePickCover()}
							accessibilityRole="button"
							accessibilityLabel="Pick cover image"
							className={`h-36 items-center justify-center overflow-hidden rounded-2xl border bg-background active:opacity-90 ${
								showErrors && coverInvalid
									? "border-destructive"
									: "border-border"
							}`}
						>
							{coverUri ? (
								<Image
									source={{ uri: coverUri }}
									className="size-full"
									resizeMode="contain"
								/>
							) : (
								<View className="items-center gap-1">
									<Ionicons name="camera" size={22} color={primary} />
									<Text className="text-muted-foreground text-sm">
										Tap to add cover image
									</Text>
								</View>
							)}
						</Pressable>
						{showErrors && coverInvalid ? (
							<Text className="text-destructive text-xs">
								A cover image is required.
							</Text>
						) : null}
					</View>

					{showErrors && formInvalid && !endBeforeStart ? (
						<Text className="text-center text-destructive text-sm">
							Please fix the highlighted fields.
						</Text>
					) : null}
				</ScrollView>

				{/* Footer actions */}
				<View
					className="border-border border-t bg-background px-4 py-3"
					style={{ paddingBottom: insets.bottom + 12 }}
				>
					<Pressable
						onPress={() => void handleSubmit()}
						disabled={submitting}
						accessibilityRole="button"
						accessibilityLabel={isEditing ? "Save journal" : "Create journal"}
						className={`h-12 flex-row items-center justify-center gap-2 rounded-full bg-primary active:opacity-90 ${
							submitting ? "opacity-70" : ""
						}`}
					>
						{submitting ? <ActivityIndicator color="#ffffff" /> : null}
						<Text className="font-semibold text-base text-primary-foreground">
							{submitting
								? isEditing
									? "Saving…"
									: "Creating…"
								: isEditing
									? "Save Changes"
									: "Create Journal"}
						</Text>
					</Pressable>
				</View>
			</KeyboardAvoidingView>
		</View>
	);
}
