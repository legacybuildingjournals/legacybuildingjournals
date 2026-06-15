import { Ionicons } from "@expo/vector-icons";
import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { Spinner } from "heroui-native";
import { useThemeColor } from "heroui-native/hooks";
import { useMemo, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useJournalPaywall } from "@/components/billing/journal-paywall-provider";
import { JournalEntryRow } from "@/components/library/journal-entry-row";
import { formatDateLong } from "@/lib/journal/formatDate";
import { useMutationToast } from "@/lib/mutation-toast";

/** Peecho requires at least this many entries to print/order a book. */
const MIN_ORDER_ENTRIES = 22;

export default function JournalDetailScreen() {
	const insets = useSafeAreaInsets();
	const params = useLocalSearchParams<{ journalId?: string }>();
	const journalId = params.journalId as Id<"journals"> | undefined;

	const [accent, accentForeground, fieldForeground, placeholderColor] =
		useThemeColor([
			"accent",
			"accent-foreground",
			"field-foreground",
			"field-placeholder",
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
	const renameJournal = useMutation(api.journal.mutations.rename);
	const exportJournal = useAction(api.journal.actions.exportJournal);
	const orderBook = useAction(api.journal.actions.orderBook);
	const [renameOpen, setRenameOpen] = useState(false);
	const [renameValue, setRenameValue] = useState("");
	const [renaming, setRenaming] = useState(false);
	const [selectionMode, setSelectionMode] = useState(false);
	const [selectedIds, setSelectedIds] = useState<Set<Id<"journalEntries">>>(
		new Set(),
	);
	const [exporting, setExporting] = useState(false);
	const [ordering, setOrdering] = useState(false);

	const isLoading = journal === undefined || entries === undefined;
	const entryCount = entries?.length ?? 0;
	const resolvedSelectedIds = useMemo(() => {
		if (!entries) return [] as Id<"journalEntries">[];
		const valid = new Set(entries.map((e) => e._id));
		return Array.from(selectedIds).filter((id) => valid.has(id));
	}, [entries, selectedIds]);
	const selectedCount = resolvedSelectedIds.length;
	const allSelected = entryCount > 0 && selectedCount === entryCount;

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

	const openRename = () => {
		if (!journal) return;
		setRenameValue(journal.title);
		setRenameOpen(true);
	};

	const startExportSelection = () => {
		if (!journal) return;
		// Pre-select everything so "export all" is one tap; user can deselect.
		setSelectedIds(new Set((entries ?? []).map((e) => e._id)));
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

	const handleRename = async () => {
		if (!journalId || renaming) return;
		const trimmed = renameValue.trim();
		if (trimmed.length < 1) {
			mutationToast.error(new Error("empty"), "Journal name can't be empty.");
			return;
		}
		setRenaming(true);
		try {
			await renameJournal({ id: journalId, title: trimmed });
			mutationToast.success("Journal renamed.");
			setRenameOpen(false);
		} catch (err) {
			mutationToast.error(err, "Could not rename journal. Please try again.");
		} finally {
			setRenaming(false);
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
			allSelected ? new Set() : new Set((entries ?? []).map((e) => e._id)),
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
		<View className="flex-1 bg-secondary/30">
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
								disabled={entryCount === 0}
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
								<Text className="flex-1 font-semibold text-3xl text-foreground leading-tight">
									{journal.title}
								</Text>
								{!selectionMode ? (
									<View className="flex-row items-center gap-2">
										<Pressable
											onPress={openRename}
											accessibilityRole="button"
											accessibilityLabel="Edit journal name"
											className="size-10 items-center justify-center rounded-full bg-primary/10 active:opacity-70"
											hitSlop={6}
										>
											<Ionicons name="pencil" size={18} color={accent} />
										</Pressable>
										<Pressable
											onPress={startExportSelection}
											disabled={entryCount === 0}
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
								<Ionicons name="calendar-outline" size={18} color={accent} />
								<Text className="text-base text-foreground">
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
								{entries.map((entry) => (
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

			{/* Rename modal */}
			<Modal
				visible={renameOpen}
				transparent
				animationType="fade"
				statusBarTranslucent
				onRequestClose={() => setRenameOpen(false)}
			>
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : undefined}
					className="flex-1"
				>
					<Pressable
						className="flex-1 items-center justify-center bg-overlay px-6"
						onPress={() => !renaming && setRenameOpen(false)}
					>
						<Pressable
							className="w-full max-w-[360px] gap-4 rounded-2xl bg-background p-5"
							onPress={(e) => e.stopPropagation()}
						>
							<Text className="font-semibold text-foreground text-lg">
								Rename journal
							</Text>
							<TextInput
								value={renameValue}
								onChangeText={setRenameValue}
								placeholder="Journal name"
								placeholderTextColor={placeholderColor}
								autoFocus
								className="h-12 rounded-xl border border-border bg-background px-3 text-base text-foreground"
							/>
							<View className="flex-row justify-end gap-2">
								<Pressable
									onPress={() => setRenameOpen(false)}
									disabled={renaming}
									className="rounded-full px-5 py-3 active:opacity-70"
								>
									<Text className="font-semibold text-base text-muted-foreground">
										Cancel
									</Text>
								</Pressable>
								<Pressable
									onPress={() => void handleRename()}
									disabled={renaming}
									className="flex-row items-center gap-2 rounded-full bg-primary px-5 py-3 active:opacity-90 disabled:opacity-70"
								>
									{renaming ? (
										<ActivityIndicator color={accentForeground} size="small" />
									) : null}
									<Text className="font-semibold text-base text-primary-foreground">
										{renaming ? "Saving…" : "Save"}
									</Text>
								</Pressable>
							</View>
						</Pressable>
					</Pressable>
				</KeyboardAvoidingView>
			</Modal>
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
