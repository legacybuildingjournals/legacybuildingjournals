import { Ionicons } from "@expo/vector-icons";
import { imageAssets } from "@legacy-building/assets";
import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { useThemeColor } from "heroui-native/hooks";
import { useMemo, useState } from "react";
import {
	ActivityIndicator,
	Image,
	type ImageSourcePropType,
	Pressable,
	ScrollView,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AccountScreenHeader } from "@/components/account/account-screen-header";
import { BackCoverEditorModal } from "@/components/library/back-cover-editor-modal";
import { BackCoverPreview } from "@/components/library/back-cover-preview";
import {
	type BackCoverDesign,
	EMPTY_BACK_COVER,
	isBackCoverEmpty,
} from "@/lib/journal/back-cover";
import { uploadBinaryToConvex } from "@/lib/journal/upload-binary";
import { useMutationToast } from "@/lib/mutation-toast";

const SAMPLE = imageAssets.exportBookSample as unknown as ImageSourcePropType;

const STEPS = [
	"Add back cover details",
	"Preview your book",
	"Export as pdf",
] as const;

/**
 * Figma "Journal Export Feature Flows": after picking entries, the user is
 * introduced to the book, designs its back cover, then exports. The PDF is
 * the same as before with the back cover added as its last page.
 *
 * Entry ids arrive as a comma-separated route param from the journal screen.
 */
export default function ExportBookScreen() {
	const insets = useSafeAreaInsets();
	const { width: screenWidth, height: screenHeight } = useWindowDimensions();
	// Explicit size: a percentage width let the bundled image fall back to its
	// full 683x884 size, so only half of it fit on screen. Capped by height
	// too, so the title and checklist stay visible on short phones.
	const sampleWidth = Math.min(screenWidth * 0.5, screenHeight * 0.28, 220);
	const params = useLocalSearchParams<{
		journalId?: string;
		entryIds?: string;
	}>();
	const journalId = params.journalId as Id<"journals"> | undefined;
	const entryIds = useMemo(
		() =>
			(params.entryIds ?? "")
				.split(",")
				.filter(Boolean) as Id<"journalEntries">[],
		[params.entryIds],
	);

	const [accent, accentForeground] = useThemeColor([
		"accent",
		"accent-foreground",
	]);
	const toast = useMutationToast();
	const exportJournal = useAction(api.journal.actions.exportJournal);
	const generateUploadUrl = useMutation(
		api.journal.mutations.generateUploadUrl,
	);

	const [step, setStep] = useState<"intro" | "design">("intro");
	const [design, setDesign] = useState<BackCoverDesign>(EMPTY_BACK_COVER);
	const [editorOpen, setEditorOpen] = useState(false);
	const [exporting, setExporting] = useState(false);

	const designed = !isBackCoverEmpty(design);

	const runExport = async () => {
		if (!journalId || exporting) return;
		setExporting(true);
		try {
			const imageStorageId = design.photo
				? await uploadBinaryToConvex({
						uri: design.photo.uri,
						mimeType: design.photo.mimeType,
						generateUploadUrl: () => generateUploadUrl(),
					})
				: undefined;
			const { url } = await exportJournal({
				journalId,
				entryIds: entryIds.length > 0 ? entryIds : undefined,
				backCover: {
					imageStorageId,
					title: design.title.trim() || undefined,
					message: design.message.trim() || undefined,
				},
			});
			if (!/^https:\/\//i.test(url) || /localhost|127\.0\.0\.1/i.test(url)) {
				throw new Error("Export returned an invalid PDF link.");
			}
			toast.success("Export ready.");
			await Linking.openURL(url);
			router.back();
		} catch (err) {
			toast.error(err, "Could not export. Please try again.");
		} finally {
			setExporting(false);
		}
	};

	const primary =
		step === "intro"
			? { label: "Get Started", onPress: () => setStep("design") }
			: designed
				? {
						label: exporting ? "Exporting…" : "Export Book",
						onPress: () => void runExport(),
					}
				: { label: "Design Back Cover", onPress: () => setEditorOpen(true) };

	return (
		<View className="flex-1 bg-secondary">
			<AccountScreenHeader
				title={step === "intro" ? "Export Book" : "Design Back Cover"}
			/>

			{step === "intro" ? (
				<ScrollView contentContainerClassName="items-center px-6 pt-6 pb-32">
					<View className="-rotate-3">
						<Image
							source={SAMPLE}
							resizeMode="contain"
							className="rounded-md"
							style={{ width: sampleWidth, height: (sampleWidth * 884) / 683 }}
							accessibilityLabel="Example back cover with a family photo"
						/>
					</View>
					<Text className="mt-8 text-center font-bold text-2xl text-foreground">
						Turn Your Journal{"\n"}into a Book
					</Text>
					<Text className="mt-3 text-center text-muted-foreground text-sm leading-5">
						Create a beautiful journal book of your stories, memories, and
						moments.
					</Text>
					<View className="mt-6 w-full gap-4">
						{STEPS.map((label) => (
							<View key={label} className="flex-row items-center gap-3">
								<View className="size-7 items-center justify-center rounded-md bg-accent/15">
									<Ionicons name="checkbox-outline" size={16} color={accent} />
								</View>
								<Text className="font-semibold text-foreground text-sm">
									{label}
								</Text>
							</View>
						))}
					</View>
				</ScrollView>
			) : (
				<ScrollView contentContainerClassName="px-5 pt-6 pb-32">
					<Text className="font-bold text-foreground text-xl">
						Design Your Back Cover
					</Text>
					<Text className="mt-1 text-muted-foreground text-sm leading-5">
						Add a photo, title, and a short message for the back of your book.
					</Text>
					<View className="mt-6">
						<BackCoverPreview
							design={design}
							onEdit={() => setEditorOpen(true)}
						/>
					</View>
					{designed ? null : (
						<Pressable
							onPress={() => void runExport()}
							disabled={exporting}
							accessibilityRole="button"
							className="mt-5 self-center rounded-full px-4 py-2 active:opacity-70"
						>
							<Text className="text-muted-foreground text-sm underline">
								Skip and export without a back cover design
							</Text>
						</Pressable>
					)}
				</ScrollView>
			)}

			<View
				className="absolute right-5 left-5"
				style={{ bottom: insets.bottom + 16 }}
			>
				<Pressable
					onPress={primary.onPress}
					disabled={exporting || !journalId}
					accessibilityRole="button"
					accessibilityLabel={primary.label}
					className="h-14 flex-row items-center justify-center gap-2 rounded-full bg-primary active:scale-[0.98] active:opacity-90 disabled:opacity-60"
				>
					{exporting ? <ActivityIndicator color={accentForeground} /> : null}
					<Text className="font-semibold text-lg text-primary-foreground">
						{primary.label}
					</Text>
				</Pressable>
			</View>

			<BackCoverEditorModal
				visible={editorOpen}
				design={design}
				onClose={() => setEditorOpen(false)}
				onSave={setDesign}
			/>
		</View>
	);
}
