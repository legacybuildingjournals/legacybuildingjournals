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
			<View className="w-full max-w-sm px-3">
				<View
					className="items-center rounded-lg bg-background px-6 py-7"
					style={{
						shadowColor: "#000",
						shadowOpacity: 0.12,
						shadowRadius: 10,
						shadowOffset: { width: 0, height: 3 },
						elevation: 4,
					}}
				>
					<Text className="mb-4 text-center font-semibold text-base text-foreground">
						Create your first journal!
					</Text>
					<Pressable
						onPress={() => router.push("/journal/create")}
						accessibilityRole="button"
						accessibilityLabel="Create your first journal"
						className="h-12 w-full items-center justify-center rounded-full bg-primary active:opacity-90"
						style={{
							shadowColor: "#000",
							shadowOpacity: 0.18,
							shadowRadius: 6,
							shadowOffset: { width: 0, height: 2 },
							elevation: 3,
						}}
					>
						<Text className="font-semibold text-base text-primary-foreground">
							Let&apos;s go!
						</Text>
					</Pressable>
				</View>
			</View>
		);
	}
	const { journal, slideImageUrls, postedAtMs } = recent;
	const previewImage = slideImageUrls[0] ?? null;
	const openJournal = () =>
		router.push({
			pathname: "/journal/[journalId]",
			params: { journalId: journal._id },
		});

	return (
		<View className="w-full max-w-sm gap-2">
			<Text className="font-semibold text-base text-foreground">
				Most Recent...
			</Text>
			{/* The "open journal" and "add entry" taps are siblings, never nested.
			    A Pressable inside a Pressable renders a <button> inside a <button>
			    on react-native-web, which React rejects as invalid DOM nesting. */}
			<View className="overflow-hidden rounded-xl bg-card">
				{previewImage ? (
					<Pressable
						onPress={openJournal}
						className="active:opacity-95"
						accessibilityElementsHidden
						importantForAccessibility="no"
					>
						<Image
							source={{ uri: previewImage }}
							className="h-36 w-full"
							resizeMode="cover"
							accessibilityLabel=""
						/>
					</Pressable>
				) : null}

				<View className="flex-row items-center gap-3 bg-primary px-5 py-3">
					<Pressable
						onPress={openJournal}
						className="min-w-0 flex-1 active:opacity-80"
						accessibilityRole="button"
						accessibilityLabel={`Open journal ${journal.title}`}
					>
						<Text
							className="font-semibold text-lg text-primary-foreground"
							numberOfLines={1}
						>
							{journal.title}
						</Text>
						<Text className="mt-0.5 text-primary-foreground/85 text-sm">
							{formatDate(postedAtMs)}
						</Text>
					</Pressable>

					<Pressable
						className="size-10 shrink-0 items-center justify-center rounded-full bg-background active:opacity-80"
						accessibilityRole="button"
						accessibilityLabel="Add journal entry"
						onPress={() =>
							router.push({
								pathname: "/journal/[journalId]/new-entry",
								params: { journalId: journal._id },
							})
						}
					>
						<Ionicons name="add" size={22} color={primary} />
					</Pressable>
				</View>
			</View>
		</View>
	);
}
