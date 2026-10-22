import { Ionicons } from "@expo/vector-icons";
import { imageAssets } from "@legacy-building/assets";
import * as Linking from "expo-linking";
import { useThemeColor } from "heroui-native/hooks";
import type { ImageSourcePropType } from "react-native";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNativeCurrentUser } from "@/hooks/use-native-current-user";
import {
	COMMUNITY_PRIVACY_NOTE,
	COMMUNITY_SOCIALS,
} from "@/lib/community/content";

/**
 * `packages/assets` is typed for the web bundler, where an image import is a
 * URL string. Metro resolves the same import to a numeric asset module, which
 * is what `<Image source>` wants — so the cast reflects the native runtime
 * rather than papering over a mismatch.
 */
const HERO = imageAssets.communityHeroMobile as unknown as ImageSourcePropType;

/** The artwork's own ratio, so it scales without cropping its headline. */
const HERO_ASPECT = 370 / 228;

/**
 * Community tab: the banner, and where to follow along.
 *
 * All content is static (`lib/community/content.ts`), so the loading, empty and
 * error states the UX checklist asks for don't apply here — there is nothing to
 * fetch and the list is never empty.
 */
export default function CommunityScreen() {
	const insets = useSafeAreaInsets();
	const accent = useThemeColor("accent");
	const { convexUser } = useNativeCurrentUser();
	// First name only — the header reads as a possessive ("David's Community"),
	// and a full name makes it wrap on narrow phones.
	const firstName = convexUser?.name?.trim().split(/\s+/)[0] || null;
	const heading = firstName ? `${firstName}'s Community` : "Community";

	return (
		<View className="flex-1 bg-background">
			{/* Teal header */}
			<View
				className="bg-primary px-4 pb-4"
				style={{ paddingTop: insets.top + 8 }}
			>
				{/* Names whose account this is — the tab is otherwise identical for
				    everyone, so it's easy to lose track on a shared device. */}
				<View className="items-center justify-center py-2">
					<Text
						className="font-semibold text-primary-foreground text-xl"
						numberOfLines={1}
					>
						{heading}
					</Text>
				</View>
			</View>

			<ScrollView
				className="flex-1"
				contentContainerClassName="pb-10"
				showsVerticalScrollIndicator={false}
			>
				{/* The headline is part of the artwork and its corners are already
				    rounded, so the image keeps its own ratio and nothing is clipped
				    or cropped on top of it. */}
				<View className="px-3 pt-3">
					<Image
						source={HERO}
						accessibilityLabel="Legacy Community — Your Story. Your Words. Your Voice. Your Legacy."
						className="w-full"
						style={{ aspectRatio: HERO_ASPECT }}
						resizeMode="contain"
					/>
				</View>

				<View className="gap-4 px-4 pt-6">
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

					{/* Two to a row, matching the design's grid. */}
					<View className="flex-row flex-wrap gap-3">
						{COMMUNITY_SOCIALS.map((social) => (
							<Pressable
								key={social.id}
								onPress={() => void Linking.openURL(social.url)}
								accessibilityRole="link"
								accessibilityLabel={`${social.name} — ${social.caption}`}
								className="w-[48%] items-center gap-1 rounded-2xl bg-secondary/40 px-3 py-6 active:opacity-90"
							>
								<View
									className="size-14 items-center justify-center rounded-full"
									style={{ backgroundColor: social.tint }}
								>
									<Ionicons name={social.icon} size={28} color={social.color} />
								</View>
								<Text className="mt-2 font-bold text-base text-foreground">
									{social.name}
								</Text>
								<View className="flex-row items-center gap-1">
									<Text
										className="font-semibold text-xs"
										style={{ color: accent }}
									>
										{social.linkLabel}
									</Text>
									<Ionicons name="open-outline" size={12} color={accent} />
								</View>
							</Pressable>
						))}
					</View>
				</View>
			</ScrollView>
		</View>
	);
}
