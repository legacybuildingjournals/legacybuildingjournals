import { Ionicons } from "@expo/vector-icons";
import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { Spinner } from "heroui-native";
import { useThemeColor } from "heroui-native/hooks";
import { useState } from "react";
import {
	Alert,
	type AlertButton,
	Image,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useJournalPaywall } from "@/components/billing/journal-paywall-provider";
import { EntryAudioPlayer } from "@/components/library/entry-audio-player";
import { EntryVideoPlayer } from "@/components/library/entry-video-player";
import { formatDateLong } from "@/lib/journal/formatDate";
import { useMutationToast } from "@/lib/mutation-toast";

export default function JournalEntryDetailScreen() {
	const insets = useSafeAreaInsets();
	const params = useLocalSearchParams<{ entryId?: string }>();
	const entryId = params.entryId as Id<"journalEntries"> | undefined;

	const accent = useThemeColor("accent");
	const accentForeground = useThemeColor("accent-foreground");
	const mutationToast = useMutationToast();

	const entry = useQuery(
		api.journal.entries.queries.getById,
		entryId ? { id: entryId } : "skip",
	);
	const removeEntry = useMutation(api.journal.entries.mutations.remove);
	const exportJournal = useAction(api.journal.actions.exportJournal);
	const { guardJournalAction } = useJournalPaywall();
	const [exporting, setExporting] = useState(false);

	const handleMenu = () => {
		if (!entry) return;
		const options: AlertButton[] = [
			{
				text: "Edit",
				onPress: () =>
					router.push({
						pathname: "/journal/entry/edit/[entryId]",
						params: { entryId: entry._id },
					}),
			},
		];
		// Recordings export too: the template gives their audio a scannable
		// memory page instead of prose.
		options.push({ text: "Export to PDF", onPress: () => handleExport() });
		options.push({
			text: "Delete entry",
			style: "destructive",
			onPress: () => confirmDelete(),
		});
		options.push({ text: "Cancel", style: "cancel" });
		Alert.alert(entry.title, undefined, options);
	};

	const openExportedUrl = async (url: string) => {
		if (!/^https:\/\//i.test(url) || /localhost|127\.0\.0\.1/i.test(url)) {
			throw new Error("Export returned an invalid PDF link.");
		}
		await Linking.openURL(url);
	};

	const handleExport = () => {
		if (!entry || exporting) return;
		// PDF export is a paid feature — gate before generating the download.
		guardJournalAction(() => void runExport());
	};

	const runExport = async () => {
		if (!entry || exporting) return;
		setExporting(true);
		try {
			const { url } = await exportJournal({
				journalId: entry.journalId,
				entryIds: [entry._id],
			});
			mutationToast.success("Export ready.");
			await openExportedUrl(url);
		} catch (err) {
			mutationToast.error(err, "Could not export. Please try again.");
		} finally {
			setExporting(false);
		}
	};

	const confirmDelete = () => {
		Alert.alert("Delete entry?", "This can't be undone.", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: () => void doDelete(),
			},
		]);
	};

	const doDelete = async () => {
		if (!entryId) return;
		try {
			await removeEntry({ id: entryId });
			mutationToast.success("Entry deleted.");
			router.back();
		} catch (err) {
			mutationToast.error(err, "Could not delete entry. Please try again.");
		}
	};

	const isRecording = entry?.mode === "recording";
	const isVideo = entry?.mode === "video";

	return (
		<View className="flex-1 bg-background">
			{/* Teal header with circular back + menu buttons */}
			<View
				className="bg-primary px-3 pb-3"
				style={{ paddingTop: insets.top + 6 }}
			>
				<View className="h-12 flex-row items-center justify-between">
					<Pressable
						onPress={() => router.back()}
						accessibilityRole="button"
						accessibilityLabel="Back"
						className="size-11 items-center justify-center rounded-full bg-white/15 active:opacity-70"
						hitSlop={6}
					>
						<Ionicons name="chevron-back" size={24} color={accentForeground} />
					</Pressable>

					<Pressable
						onPress={handleMenu}
						disabled={!entry}
						accessibilityRole="button"
						accessibilityLabel="Entry options"
						accessibilityState={{ disabled: !entry }}
						className="size-11 items-center justify-center rounded-full bg-white/15 active:opacity-70 disabled:opacity-40"
						hitSlop={6}
					>
						<Ionicons name="menu" size={24} color={accentForeground} />
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
				<ScrollView
					className="flex-1"
					contentContainerClassName="px-5 pt-5 pb-12 gap-3"
					showsVerticalScrollIndicator={false}
				>
					<Text className="font-semibold text-3xl text-foreground leading-tight">
						{entry.title}
					</Text>

					<View className="flex-row items-center gap-2">
						<Ionicons name="calendar-outline" size={18} color={accent} />
						<Text className="text-base text-foreground">
							{formatDateLong(entry.dateMs)}
						</Text>
					</View>

					{entry.imageUrl && !isVideo ? (
						<View className="mt-2 overflow-hidden rounded-2xl">
							<Image
								source={{ uri: entry.imageUrl }}
								className="h-60 w-full"
								resizeMode="contain"
								accessibilityLabel="Entry photo"
							/>
						</View>
					) : null}

					{isVideo && entry.videoUrl ? (
						<View className="mt-2">
							<EntryVideoPlayer
								uri={entry.videoUrl}
								posterUri={entry.imageUrl}
							/>
						</View>
					) : null}

					{isRecording && entry.audioUrl ? (
						<View className="mt-2">
							<EntryAudioPlayer
								uri={entry.audioUrl}
								durationMs={entry.audioDurationMs}
							/>
						</View>
					) : null}

					{entry.mode === "writing" ? (
						<View className="mt-2">
							{entry.body ? (
								<Text className="text-base text-foreground leading-relaxed">
									{entry.body}
								</Text>
							) : (
								<Text className="text-muted-foreground text-sm">
									No entry text.
								</Text>
							)}
						</View>
					) : null}
				</ScrollView>
			)}
		</View>
	);
}
