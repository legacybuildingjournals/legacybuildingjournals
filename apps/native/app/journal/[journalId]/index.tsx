import { Ionicons } from "@expo/vector-icons";
import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { needsLightForeground } from "@legacy-building/ui/lib/color";
import { useAction, useMutation, useQuery } from "convex/react";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { Spinner } from "heroui-native";
import { useThemeColor } from "heroui-native/hooks";
import { useMemo, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Image,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useJournalPaywall } from "@/components/billing/journal-paywall-provider";
import { JournalActionsMenu } from "@/components/library/journal-actions-menu";
import { JournalColorSheet } from "@/components/library/journal-color-sheet";
import { JournalEntryRow } from "@/components/library/journal-entry-row";
import { formatDateLong } from "@/lib/journal/formatDate";
import {
	pickBackgroundImage,
	uploadCoverImage,
} from "@/lib/journal/upload-cover-image";
import { useMutationToast } from "@/lib/mutation-toast";

/** Peecho requires at least this many entries to print/order a book. */
const MIN_ORDER_ENTRIES = 22;

export default function JournalDetailScreen() {
	const insets = useSafeAreaInsets();
	const params = useLocalSearchParams<{ journalId?: string }>();
	const journalId = params.journalId as Id<"journals"> | undefined;

	const [accent, accentForeground, fieldForeground] = useThemeColor([
		"accent",
		"accent-foreground",
		"field-foreground",
	]);
	const mutationToast = useMutationToast();
	const { guardJournalAction } = useJournalPaywall();

	const journal = useQuery(
		api.journal.queries.getById,
		journalId ? { id: journalId } : "skip",
	);
	const entries = useQuery(
		api.journal.entries.queries.listByJournal,
		journalId ? { journalId } : "skip",
	);
	const removeJournal = useMutation(api.journal.mutations.remove);
	const setAppearance = useMutation(api.journal.mutations.setAppearance);
	const generateUploadUrl = useMutation(
		api.journal.mutations.generateUploadUrl,
	);
	const exportJournal = useAction(api.journal.actions.exportJournal);
	const orderBook = useAction(api.journal.actions.orderBook);
	const [selectionMode, setSelectionMode] = useState(false);
	const [selectedIds, setSelectedIds] = useState<Set<Id<"journalEntries">>>(
		new Set(),
	);
	const [exporting, setExporting] = useState(false);
	const [ordering, setOrdering] = useState(false);
	const [colorSheetOpen, setColorSheetOpen] = useState(false);
	// Set while dragging in the picker so the screen repaints live, before
	// anything is written to the server.
	const [previewColor, setPreviewColor] = useState<string | null>(null);
	const [savingAppearance, setSavingAppearance] = useState(false);

	const isLoading = journal === undefined || entries === undefined;
	const backgroundColor = previewColor ?? journal?.backgroundColor ?? null;
	const backgroundImageUrl = journal?.backgroundImageUrl ?? null;
	// A picked colour can be anything, so the header text has to follow it
	// rather than assume the app's usual dark-on-light.
	const onDarkBackground = Boolean(
		backgroundColor && needsLightForeground(backgroundColor),
	);
	const headingColor = onDarkBackground ? "#ffffff" : undefined;
	// Only written entries can be printed — recorded audio has no page in the
	// PDF, so it never appears in the export/order picker.
	const exportableEntries = useMemo(
		() => (entries ?? []).filter((e) => e.mode === "writing"),
		[entries],
	);
	const exportableCount = exportableEntries.length;
	const resolvedSelectedIds = useMemo(() => {
		const valid = new Set(exportableEntries.map((e) => e._id));
		return Array.from(selectedIds).filter((id) => valid.has(id));
	}, [exportableEntries, selectedIds]);
	const selectedCount = resolvedSelectedIds.length;
	const allSelected = exportableCount > 0 && selectedCount === exportableCount;

	const showMinimumOrderAlert = (count: number) => {
		const remaining = MIN_ORDER_ENTRIES - count;
		Alert.alert(
			"A few more entries needed",
			`A printed book needs at least ${MIN_ORDER_ENTRIES} entries. Your journal has ${count}, so add ${remaining} more ${
				remaining === 1 ? "entry" : "entries"
			} to place an order.`,
			[{ text: "Got it", style: "default" }],
			{ cancelable: true },
		);
	};

	const openExportedUrl = async (url: string) => {
		if (!/^https:\/\//i.test(url) || /localhost|127\.0\.0\.1/i.test(url)) {
			throw new Error("Export returned an invalid PDF link.");
		}
		// Use the system browser — WebBrowser reuses the OAuth/legal tab (often localhost:3001).
		await Linking.openURL(url);
	};

	const runExport = async (entryIds?: Id<"journalEntries">[]) => {
		if (!journalId || exporting) return;
		setExporting(true);
		try {
			const { url } = await exportJournal({ journalId, entryIds });
			mutationToast.success("Export ready.");
			await openExportedUrl(url);
		} catch (err) {
			mutationToast.error(err, "Could not export. Please try again.");
		} finally {
			setExporting(false);
		}
	};

	const applyAppearance = async (
		patch: Parameters<typeof setAppearance>[0],
		successMessage: string,
	) => {
		if (savingAppearance) return;
		setSavingAppearance(true);
		try {
			await setAppearance(patch);
			mutationToast.success(successMessage);
		} catch (err) {
			mutationToast.error(
				err,
				"Could not update the journal. Please try again.",
			);
		} finally {
			setSavingAppearance(false);
		}
	};

	const handleCommitColor = (color: string | null) => {
		setColorSheetOpen(false);
		setPreviewColor(null);
		if (!journalId) return;
		void applyAppearance(
			{ id: journalId, backgroundColor: color },
			color ? "Journal color updated." : "Journal color reset.",
		);
	};

	const pickAndUploadBackground = async () => {
		if (!journalId) return;
		const picked = await pickBackgroundImage();

		if (picked.kind === "permission-denied") {
			Alert.alert(
				"Photo access needed",
				"Allow photo access in Settings to choose a background image.",
				picked.previouslyDenied
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
		if (picked.kind === "error") {
			mutationToast.error(new Error(picked.message), picked.message);
			return;
		}
		if (picked.kind === "canceled") return;

		setSavingAppearance(true);
		try {
			const backgroundImageId = await uploadCoverImage(picked.image, () =>
				generateUploadUrl(),
			);
			await setAppearance({ id: journalId, backgroundImageId });
			mutationToast.success("Background image updated.");
		} catch (err) {
			mutationToast.error(err, "Could not set the background image.");
		} finally {
			setSavingAppearance(false);
		}
	};

	const handleBackgroundImage = () => {
		if (!journalId || savingAppearance) return;

		guardJournalAction(() => {
			if (!backgroundImageUrl) {
				void pickAndUploadBackground();
				return;
			}
			Alert.alert("Background image", undefined, [
				{ text: "Replace", onPress: () => void pickAndUploadBackground() },
				{
					text: "Remove",
					style: "destructive",
					onPress: () =>
						void applyAppearance(
							{ id: journalId, backgroundImageId: null },
							"Background image removed.",
						),
				},
				{ text: "Cancel", style: "cancel" },
			]);
		});
	};

	const goToEditJournal = () => {
		if (!journalId) return;
		router.push({
			pathname: "/journal/create",
			params: { journalId },
		});
	};

	const startExportSelection = () => {
		if (!journal) return;
		// Pre-select all entries so "export all" is one tap; user can deselect.
		setSelectedIds(new Set(exportableEntries.map((e) => e._id)));
		setSelectionMode(true);
	};

	const confirmDelete = () => {
		Alert.alert(
			"Delete journal?",
			"This will permanently delete the journal and all its entries.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: () => void doDelete(),
				},
			],
		);
	};

	const doDelete = async () => {
		if (!journalId) return;
		try {
			await removeJournal({ id: journalId });
			mutationToast.success("Journal deleted.");
			router.back();
		} catch (err) {
			mutationToast.error(err, "Could not delete journal. Please try again.");
		}
	};

	const toggleSelected = (id: Id<"journalEntries">) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const exitSelection = () => {
		setSelectionMode(false);
		setSelectedIds(new Set());
	};

	const toggleSelectAll = () => {
		setSelectedIds(
			allSelected ? new Set() : new Set(exportableEntries.map((e) => e._id)),
		);
	};

	const handleExportSelected = () => {
		if (resolvedSelectedIds.length === 0) return;
		// PDF export is a paid feature — gate before generating the download.
		guardJournalAction(() => {
			void runExport(resolvedSelectedIds).then(exitSelection);
		});
	};

	const handleOrderBook = () => {
		if (!journalId || ordering) return;

		// Ordering a printed book is a paid feature — gate before validating entries.
		guardJournalAction(() => {
			if (resolvedSelectedIds.length === 0) {
				Alert.alert(
					"Select entries",
					"Choose at least one entry to include in your printed book.",
					[{ text: "OK" }],
				);
				return;
			}

			if (resolvedSelectedIds.length < MIN_ORDER_ENTRIES) {
				showMinimumOrderAlert(resolvedSelectedIds.length);
				return;
			}

			void runOrderBook(resolvedSelectedIds);
		});
	};

	const runOrderBook = async (orderEntryIds: Id<"journalEntries">[]) => {
		if (!journalId || ordering) return;
		setOrdering(true);
		try {
			const { url } = await orderBook({
				journalId,
				entryIds: orderEntryIds,
			});
			mutationToast.success("Opening checkout…");
			await openExportedUrl(url);
			exitSelection();
		} catch (err) {
			mutationToast.error(err, "Could not start the order. Please try again.");
		} finally {
			setOrdering(false);
		}
	};

	const goToCreateEntry = () => {
		if (!journalId) return;
		// Open the entry form freely; the paywall gates on the final "Create" press.
		router.push({
			pathname: "/journal/[journalId]/new-entry",
			params: { journalId },
		});
	};

	return (
		<View
			className="flex-1 bg-secondary/30"
			// The journal's colour is user data, so it can't come from a token.
			style={backgroundColor ? { backgroundColor } : undefined}
		>
			{backgroundImageUrl ? (
				<Image
					source={{ uri: backgroundImageUrl }}
					// Sits behind everything: later siblings paint on top, so the
					// header and content stay legible above it.
					className="absolute inset-0 h-full w-full"
					resizeMode="cover"
					accessibilityIgnoresInvertColors
				/>
			) : null}

			{/* Teal header */}
			<View
				className="bg-primary px-4 pb-4"
				style={{ paddingTop: insets.top + 8 }}
			>
				<View className="h-10 flex-row items-center justify-between">
					{selectionMode ? (
						<>
							<Pressable
								onPress={exitSelection}
								accessibilityRole="button"
								accessibilityLabel="Cancel selection"
								className="active:opacity-70"
								hitSlop={8}
							>
								<Text className="font-medium text-base text-primary-foreground">
									Cancel
								</Text>
							</Pressable>
							<Text className="font-semibold text-base text-primary-foreground">
								{selectedCount} selected
							</Text>
							<Pressable
								onPress={toggleSelectAll}
								disabled={exportableCount === 0}
								accessibilityRole="button"
								accessibilityLabel={allSelected ? "Deselect all" : "Select all"}
								className="active:opacity-70 disabled:opacity-40"
								hitSlop={8}
							>
								<Text className="font-semibold text-base text-primary-foreground">
									{allSelected ? "Deselect all" : "Select all"}
								</Text>
							</Pressable>
						</>
					) : (
						<Pressable
							onPress={() => router.back()}
							accessibilityRole="button"
							accessibilityLabel="Back"
							className="flex-row items-center gap-1 active:opacity-70"
							hitSlop={8}
						>
							<Ionicons
								name="chevron-back"
								size={22}
								color={accentForeground}
							/>
							<Text className="font-medium text-base text-primary-foreground">
								Back
							</Text>
						</Pressable>
					)}
				</View>
			</View>

			<ScrollView
				className="flex-1"
				contentContainerClassName="px-4 pt-6 pb-28 gap-4"
				showsVerticalScrollIndicator={false}
			>
				{isLoading ? (
					<View className="items-center justify-center py-12">
						<Spinner size="lg" />
					</View>
				) : journal === null ? (
					<View className="items-center py-12">
						<Text className="font-semibold text-foreground text-lg">
							Journal not found
						</Text>
						<Text className="mt-1 text-center text-muted-foreground text-sm">
							It may have been deleted.
						</Text>
					</View>
				) : (
					<>
						<View className="gap-2 pb-2">
							<View className="flex-row items-center gap-2">
								<Text
									className="flex-1 font-semibold text-3xl text-foreground leading-tight"
									style={headingColor ? { color: headingColor } : undefined}
								>
									{journal.title}
								</Text>
								{!selectionMode ? (
									<View className="flex-row items-center gap-2">
										<JournalActionsMenu
											onEditJournal={goToEditJournal}
											onBackgroundImage={handleBackgroundImage}
											onBackgroundColor={() =>
												guardJournalAction(() => setColorSheetOpen(true))
											}
											appearanceBusy={savingAppearance}
											hasBackgroundImage={backgroundImageUrl !== null}
										/>
										<Pressable
											onPress={startExportSelection}
											disabled={exportableCount === 0}
											accessibilityRole="button"
											accessibilityLabel="Export journal"
											className="size-10 items-center justify-center rounded-full bg-primary/10 active:opacity-70 disabled:opacity-40"
											hitSlop={6}
										>
											<Ionicons name="share-outline" size={18} color={accent} />
										</Pressable>
										<Pressable
											onPress={confirmDelete}
											accessibilityRole="button"
											accessibilityLabel="Delete journal"
											className="size-10 items-center justify-center rounded-full bg-destructive/10 active:opacity-70"
											hitSlop={6}
										>
											<Ionicons
												name="trash-outline"
												size={18}
												color={fieldForeground}
											/>
										</Pressable>
									</View>
								) : null}
							</View>

							<View className="flex-row items-center gap-2">
								<Ionicons
									name="calendar-outline"
									size={18}
									color={headingColor ?? accent}
								/>
								<Text
									className="text-base text-foreground"
									style={headingColor ? { color: headingColor } : undefined}
								>
									{formatDateLong(journal.dateMs)}
									{journal.endDateMs
										? ` – ${formatDateLong(journal.endDateMs)}`
										: ""}
								</Text>
							</View>
							{selectionMode ? (
								<Text className="text-muted-foreground text-sm">
									Use “Select all” above, or tap entries to choose which to
									export.
								</Text>
							) : null}
						</View>

						{entries && entries.length > 0 ? (
							<View className="gap-3">
								{(selectionMode ? exportableEntries : entries).map((entry) => (
									<JournalEntryRow
										key={entry._id}
										title={entry.title}
										dateMs={entry.dateMs}
										mode={entry.mode}
										selectable={selectionMode}
										selected={selectedIds.has(entry._id)}
										onPress={() =>
											selectionMode
												? toggleSelected(entry._id)
												: router.push({
														pathname: "/journal/entry/[entryId]",
														params: { entryId: entry._id },
													})
										}
									/>
								))}
							</View>
						) : (
							<View className="items-center gap-2 rounded-2xl border border-border border-dashed bg-background px-6 py-10">
								<Ionicons name="book-outline" size={32} color={accent} />
								<Text className="font-semibold text-base text-foreground">
									No entries yet
								</Text>
								<Text className="text-center text-muted-foreground text-sm">
									Tap Create Journal Entry below to add your first.
								</Text>
							</View>
						)}
					</>
				)}
			</ScrollView>

			{/* Bottom action bar */}
			<View
				className="absolute right-4 left-4 items-center"
				style={{ bottom: insets.bottom + 16 }}
				pointerEvents="box-none"
			>
				{selectionMode ? (
					<View className="w-full max-w-sm gap-3">
						<Pressable
							onPress={() => void handleExportSelected()}
							disabled={selectedCount === 0 || exporting || ordering}
							accessibilityRole="button"
							accessibilityLabel="Export selected entries"
							className="h-14 w-full flex-row items-center justify-center gap-2 rounded-full bg-primary active:opacity-90 disabled:opacity-50"
							style={shadow}
						>
							{exporting ? (
								<ActivityIndicator color={accentForeground} />
							) : (
								<Ionicons
									name="download-outline"
									size={20}
									color={accentForeground}
								/>
							)}
							<Text className="font-semibold text-base text-primary-foreground">
								{exporting
									? "Exporting…"
									: `Export ${selectedCount} ${selectedCount === 1 ? "entry" : "entries"}`}
							</Text>
						</Pressable>

						<Pressable
							onPress={handleOrderBook}
							disabled={selectedCount === 0 || ordering || exporting}
							accessibilityRole="button"
							accessibilityLabel="Order printed book"
							className="h-14 w-full flex-row items-center justify-center gap-2 rounded-full border border-primary bg-background active:opacity-90 disabled:opacity-50"
							style={shadow}
						>
							{ordering ? (
								<ActivityIndicator color={accent} />
							) : (
								<Ionicons name="book-outline" size={20} color={accent} />
							)}
							<Text className="font-semibold text-base text-primary">
								{ordering ? "Starting order…" : "Order Book"}
							</Text>
						</Pressable>
					</View>
				) : (
					<Pressable
						onPress={goToCreateEntry}
						disabled={!journalId || journal === null || exporting}
						accessibilityRole="button"
						accessibilityLabel="Create journal entry"
						className="h-14 w-full max-w-sm flex-row items-center justify-center gap-2 rounded-full bg-primary active:opacity-90 disabled:opacity-50"
						style={shadow}
					>
						{exporting ? (
							<ActivityIndicator color={accentForeground} />
						) : (
							<Ionicons
								name="create-outline"
								size={20}
								color={accentForeground}
							/>
						)}
						<Text className="font-semibold text-base text-primary-foreground">
							{exporting ? "Exporting…" : "Create Journal Entry"}
						</Text>
					</Pressable>
				)}
			</View>

			<JournalColorSheet
				visible={colorSheetOpen}
				selected={journal?.backgroundColor ?? null}
				onPreview={setPreviewColor}
				onCommit={handleCommitColor}
				onClose={() => {
					setColorSheetOpen(false);
					setPreviewColor(null);
				}}
			/>
		</View>
	);
}

const shadow = {
	shadowColor: "#000",
	shadowOpacity: 0.15,
	shadowRadius: 10,
	shadowOffset: { width: 0, height: 4 },
	elevation: 4,
} as const;
