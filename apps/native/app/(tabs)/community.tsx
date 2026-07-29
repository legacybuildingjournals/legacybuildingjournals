import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useThemeColor } from "heroui-native/hooks";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	COMMUNITY_PRIVACY_NOTE,
	COMMUNITY_SOCIALS,
	COMMUNITY_UPDATES,
} from "@/lib/community/content";

/** Status pill colours — amber, matching the web community cards. */
const BADGE_BG = "#fff7ed";
const BADGE_TEXT = "#9a3412";

/**
 * Community tab: what's coming to the app, and where to follow along.
 *
 * All content is static (`lib/community/content.ts`), so the loading, empty and
 * error states the UX checklist asks for don't apply here — there is nothing to
 * fetch and the lists are never empty.
 */
export default function CommunityScreen() {
	const insets = useSafeAreaInsets();
	const [accent, foreground, mutedForeground] = useThemeColor([
		"accent",
		"foreground",
		"muted",
	]);

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
					<Text className="font-bold text-foreground text-xl">
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
							accessibilityLabel={`${update.title}. ${update.badge}`}
							className="flex-row items-center gap-3 rounded-2xl bg-background p-3 active:opacity-90"
						>
							<Image
								source={update.image}
								className="size-16 rounded-xl"
								resizeMode="cover"
							/>
							<View className="flex-1 gap-1.5">
								<Text className="font-bold text-base text-foreground">
									{update.title}
								</Text>
								<View
									className="self-start rounded-full px-2.5 py-1"
									style={{ backgroundColor: BADGE_BG }}
								>
									<Text
										className="font-semibold text-xs"
										style={{ color: BADGE_TEXT }}
									>
										{update.badge}
									</Text>
								</View>
							</View>
							{update.url ? (
								<Ionicons
									name="chevron-forward"
									size={20}
									color={mutedForeground}
								/>
							) : null}
						</Pressable>
					))}
				</View>

				{/* Socials */}
				<View className="gap-3">
					<View className="flex-row items-center justify-between">
						<Text className="font-bold text-foreground text-xl">
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
								size={24}
								color={accent}
							/>
						</Pressable>
					</View>

					{/* Two to a row, matching the design's grid. */}
					<View className="flex-row flex-wrap gap-3">
						{COMMUNITY_SOCIALS.map((social) => (
							<Pressable
								key={social.id}
								onPress={() => void Linking.openURL(social.url)}
								accessibilityRole="link"
								accessibilityLabel={`${social.name} — ${social.caption}`}
								className="w-[48%] items-center gap-1.5 rounded-2xl bg-background px-3 py-5 active:opacity-90"
							>
								<View
									className="size-12 items-center justify-center rounded-full"
									style={{ backgroundColor: social.tint }}
								>
									<Ionicons name={social.icon} size={26} color={social.color} />
								</View>
								<Text className="mt-1 font-bold text-base text-foreground">
									{social.name}
								</Text>
								<Text
									className="font-semibold text-xs"
									style={{ color: accent }}
								>
									{social.linkLabel}
								</Text>
							</Pressable>
						))}
					</View>
				</View>
			</ScrollView>
		</View>
	);
}
