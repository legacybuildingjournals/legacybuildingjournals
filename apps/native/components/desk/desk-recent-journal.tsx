import { Ionicons } from "@expo/vector-icons";
import { api } from "@legacy-building/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useThemeColor } from "heroui-native";
import { Image, Pressable, Text, View } from "react-native";

import { formatDate } from "@/lib/journal/formatDate";

export function DeskRecentJournal() {
	const router = useRouter();
	const recent = useQuery(api.journal.queries.getRecentForDesk);
	const primary = useThemeColor("accent");

	if (recent === undefined) {
		return (
			<View className="w-full max-w-sm gap-2">
				<Text className="font-semibold text-base text-foreground">
					Most Recent...
				</Text>
				<View className="h-24 animate-pulse rounded-xl bg-muted/30" />
			</View>
		);
	}

	if (recent === null) {
		return (
			<View className="w-full max-w-sm gap-2">
				<Text className="font-semibold text-base text-foreground">
					Most Recent...
				</Text>
				<View className="rounded-xl bg-card/90 px-5 py-6">
					<Text className="text-center text-muted-foreground text-sm">
						You haven&apos;t created anything yet.
					</Text>
				</View>
			</View>
		);
	}
	const { journal, slideImageUrls, postedAtMs } = recent;
	const previewImage = slideImageUrls[0] ?? null;
	return (
		<View className="w-full max-w-sm gap-2">
			<Text className="font-semibold text-base text-foreground">
				Most Recent...
			</Text>
			<Pressable
				onPress={() =>
					router.push({
						pathname: "/journal/[journalId]",
						params: { journalId: journal._id },
					})
				}
				className="overflow-hidden rounded-xl bg-card active:opacity-95"
				accessibilityRole="button"
				accessibilityLabel={`Open journal ${journal.title}`}
			>
				{previewImage ? (
					<Image
						source={{ uri: previewImage }}
						className="h-36 w-full"
						resizeMode="cover"
						accessibilityLabel=""
					/>
				) : null}

				<View className="flex-row items-center gap-3 bg-primary px-5 py-3">
					<View className="min-w-0 flex-1">
						<Text
							className="font-semibold text-lg text-primary-foreground"
							numberOfLines={1}
						>
							{journal.title}
						</Text>
						<Text className="mt-0.5 text-primary-foreground/85 text-sm">
							{formatDate(postedAtMs)}
						</Text>
					</View>

					<Pressable
						className="size-10 shrink-0 items-center justify-center rounded-full bg-background active:opacity-80"
						accessibilityRole="button"
						accessibilityLabel="Add journal entry"
						onPress={(e) => {
							e.stopPropagation();
							router.push({
								pathname: "/journal/[journalId]/new-entry",
								params: { journalId: journal._id },
							});
						}}
					>
						<Ionicons name="add" size={22} color={primary} />
					</Pressable>
				</View>
			</Pressable>
		</View>
	);
}
