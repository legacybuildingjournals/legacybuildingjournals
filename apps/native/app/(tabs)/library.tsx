import { useUser } from "@clerk/expo";
import { api } from "@legacy-building/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Spinner } from "heroui-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { JournalListItem } from "@/components/library/journal-list-item";
import { LibraryEmptyState } from "@/components/library/library-empty-state";
import { StoryTabs } from "@/components/library/story-tabs";
import { DashboardScreenHeader } from "@/components/navigation/dashboard-screen-header";
import { useNativeCurrentUser } from "@/hooks/use-native-current-user";
import {
	DEFAULT_STORY_TAB,
	STORY_TABS,
	type StoryTab,
} from "@/lib/journal/story-types";

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

	const storyLabel =
		STORY_TABS.find((t) => t.id === storyType)?.label ?? "My Story";

	return (
		<View className="flex-1 bg-secondary/30">
			<DashboardScreenHeader title={`${displayName}'s Library`} />

			<ScrollView
				className="flex-1"
				contentContainerClassName="grow px-4 py-6 gap-4"
				showsVerticalScrollIndicator={false}
			>
				<StoryTabs value={storyType} onChange={setStoryType} />

				<View className="mt-2 flex-1 gap-4">
					{journals === undefined ? (
						<View className="items-center justify-center py-12">
							<Spinner size="lg" />
						</View>
					) : journals.length === 0 ? (
						<LibraryEmptyState
							storyLabel={storyLabel}
							ctaLabel="Create Journal"
							onPressCta={goToCreate}
						/>
					) : (
						journals.map((journal) => (
							<JournalListItem
								key={journal._id}
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
						))
					)}
				</View>

				<View className="pt-2 pb-4">
					<Pressable
						onPress={goToCreate}
						accessibilityRole="button"
						accessibilityLabel="Create journal"
						className="h-14 items-center justify-center rounded-full bg-background active:opacity-90"
						style={{
							shadowColor: "#000",
							shadowOpacity: 0.08,
							shadowRadius: 8,
							shadowOffset: { width: 0, height: 2 },
							elevation: 2,
						}}
					>
						<Text className="font-semibold text-base text-primary">
							Create Journal
						</Text>
					</Pressable>
				</View>
			</ScrollView>
		</View>
	);
}
