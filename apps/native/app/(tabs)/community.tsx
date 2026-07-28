import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useThemeColor } from "heroui-native/hooks";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	COMMUNITY_PRIVACY_NOTE,
	COMMUNITY_SOCIALS,
	COMMUNITY_UPDATES,
} from "@/lib/community/content";

/**
 * Community tab: what's coming to the app, and where to follow along.
 *
 * All content is static (`lib/community/content.ts`), so the loading, empty and
 * error states the UX checklist asks for don't apply here — there is nothing to
 * fetch and the lists are never empty.
 */
export default function CommunityScreen() {
	const insets = useSafeAreaInsets();
	const [accent, foreground] = useThemeColor(["accent", "foreground"]);

	return (
		<View className="flex-1 bg-secondary/30">
			{/* Teal header */}
			<View
				className="bg-primary px-4 pb-4"
				style={{ paddingTop: insets.top + 8 }}
			>
				<View className="h-10 items-center justify-center">
					<Text className="font-semibold text-lg text-primary-foreground">
						Community
					</Text>
				</View>
			</View>

			<ScrollView
				className="flex-1"
				contentContainerClassName="px-4 pt-5 pb-10 gap-6"
				showsVerticalScrollIndicator={false}
			>
				{/* Upcoming updates */}
				<View className="gap-3">
					<Text className="font-bold text-2xl text-foreground">
						Upcoming Updates
					</Text>

					{COMMUNITY_UPDATES.map((update) => (
						<Pressable
							key={update.id}
							onPress={() => {
								if (update.url) void Linking.openURL(update.url);
							}}
							disabled={!update.url}
							accessibilityRole={update.url ? "link" : "text"}
							accessibilityLabel={`${update.title}. ${update.subtitle}`}
							className="flex-row items-center gap-4 rounded-2xl bg-background p-4 active:opacity-90"
						>
							<View
								className="size-14 items-center justify-center rounded-2xl"
								// Per-update wash, so it can't be a static class.
								style={{ backgroundColor: update.tint }}
							>
								<Ionicons name={update.icon} size={26} color={update.color} />
							</View>
							<View className="flex-1">
								<Text className="font-bold text-foreground text-lg">
									{update.title}
								</Text>
								<Text className="mt-0.5 text-base text-muted-foreground">
									{update.subtitle}
								</Text>
							</View>
							<Ionicons name="chevron-forward" size={20} color={foreground} />
						</Pressable>
					))}
				</View>

				{/* Socials */}
				<View className="gap-3">
					<View className="flex-row items-center justify-between">
						<Text className="font-bold text-2xl text-foreground">
							Join Our Community
						</Text>
						<Pressable
							onPress={() =>
								Alert.alert("Your privacy", COMMUNITY_PRIVACY_NOTE, [
									{ text: "Got it" },
								])
							}
							accessibilityRole="button"
							accessibilityLabel="Privacy information"
							className="active:opacity-70"
							hitSlop={8}
						>
							<Ionicons
								name="information-circle-outline"
								size={26}
								color={accent}
							/>
						</Pressable>
					</View>

					{/* Three to a row, matching the design's grid. */}
					<View className="flex-row flex-wrap gap-3">
						{COMMUNITY_SOCIALS.map((social) => (
							<Pressable
								key={social.id}
								onPress={() => void Linking.openURL(social.url)}
								accessibilityRole="link"
								accessibilityLabel={`${social.name} — ${social.caption}`}
								className="w-[31%] items-center gap-1.5 rounded-2xl bg-background px-2 py-5 active:opacity-90"
							>
								<View
									className="size-14 items-center justify-center rounded-full"
									style={{ backgroundColor: social.tint }}
								>
									<Ionicons name={social.icon} size={28} color={social.color} />
								</View>
								<Text className="mt-1 font-bold text-base text-foreground">
									{social.name}
								</Text>
								<Text className="text-center text-muted-foreground text-xs">
									{social.caption}
								</Text>
							</Pressable>
						))}
					</View>
				</View>
			</ScrollView>
		</View>
	);
}
