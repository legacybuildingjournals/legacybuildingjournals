import { useUser } from "@clerk/expo";
import { api } from "@legacy-building/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Spinner } from "heroui-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { JournalListItem } from "@/components/library/journal-list-item";
import { LibraryEmptyState } from "@/components/library/library-empty-state";
import { ShelfLedge } from "@/components/library/shelf-ledge";
import { StoryTabs } from "@/components/library/story-tabs";
import { DashboardScreenHeader } from "@/components/navigation/dashboard-screen-header";
import { useNativeCurrentUser } from "@/hooks/use-native-current-user";
import { DEFAULT_STORY_TAB, type StoryTab } from "@/lib/journal/story-types";

export default function LibraryScreen() {
	const router = useRouter();
	const { user } = useUser();
	const { convexUser } = useNativeCurrentUser();

	const [storyType, setStoryType] = useState<StoryTab>(DEFAULT_STORY_TAB);
	const journals = useQuery(api.journal.queries.listByType, {
		type: storyType,
	});

	const displayName =
		convexUser?.name?.split(" ")[0] ??
		user?.firstName ??
		user?.fullName ??
		user?.username ??
		"Your";

	const goToCreate = () => {
		router.push({
			pathname: "/journal/create",
			params: { type: storyType },
		});
	};

	const hasJournals = journals !== undefined && journals.length > 0;

	return (
		<View className="flex-1 bg-library-canvas">
			<DashboardScreenHeader title={`${displayName}'s Library`} />

			{/* Plain warm-cream ground: shelves now render per-card (ShelfLedge)
			    rather than being baked into a background photo, matching web. */}
			<ScrollView
				className="flex-1"
				contentContainerClassName="grow px-4 py-6 gap-4"
				showsVerticalScrollIndicator={false}
			>
				<StoryTabs value={storyType} onChange={setStoryType} />

				<View className="mt-2 flex-1 gap-6">
					{journals === undefined ? (
						<View className="items-center justify-center py-12">
							<Spinner size="lg" />
						</View>
					) : journals.length === 0 ? (
						<LibraryEmptyState
							ctaLabel="Begin Your Legacy"
							onPressCta={goToCreate}
						/>
					) : (
						journals.map((journal) => (
							<View key={journal._id}>
								<JournalListItem
									title={journal.title}
									dateMs={journal.dateMs}
									coverImageUrl={journal.coverImageUrl}
									onPress={() =>
										router.push({
											pathname: "/journal/[journalId]",
											params: { journalId: journal._id },
										})
									}
									onAddEntry={() =>
										router.push({
											pathname: "/journal/[journalId]/new-entry",
											params: { journalId: journal._id },
										})
									}
								/>
								<ShelfLedge />
							</View>
						))
					)}
				</View>

				{hasJournals ? (
					<View className="pt-2 pb-4">
						<Pressable
							onPress={goToCreate}
							accessibilityRole="button"
							accessibilityLabel="Create journal"
							className="h-14 items-center justify-center rounded-full border border-border/50 bg-background active:opacity-90"
							style={{
								shadowColor: "#000",
								shadowOpacity: 0.2,
								shadowRadius: 12,
								shadowOffset: { width: 0, height: 4 },
								elevation: 6,
							}}
						>
							<Text className="font-semibold text-base text-primary">
								Create Journal
							</Text>
						</Pressable>
					</View>
				) : null}
			</ScrollView>
		</View>
	);
}
