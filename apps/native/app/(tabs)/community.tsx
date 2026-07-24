import { Ionicons } from "@expo/vector-icons";
import { api } from "@legacy-building/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import * as Linking from "expo-linking";
import { useThemeColor } from "heroui-native/hooks";
import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InviteShareSheet } from "@/components/library/invite-share-sheet";
import {
	COMMUNITY_PRIVACY_NOTE,
	COMMUNITY_SOCIALS,
	COMMUNITY_UPDATES,
} from "@/lib/community/content";
import { nativeWebAppUrl } from "@/lib/native-legal-url";

export default function CommunityScreen() {
	const insets = useSafeAreaInsets();
	const [accent, accentForeground, foreground] = useThemeColor([
		"accent",
		"accent-foreground",
		"foreground",
	]);

	const summary = useQuery(api.referrals.queries.getMyInviteSummary, {});
	const ensureInviteCode = useMutation(
		api.referrals.mutations.ensureInviteCode,
	);
	const [sharing, setSharing] = useState(false);
	const [shareOpen, setShareOpen] = useState(false);
	const [shareCode, setShareCode] = useState<string | null>(null);

	// The code is created on first visit rather than at signup, so accounts that
	// never open Community don't accumulate unused codes.
	useEffect(() => {
		if (summary && summary.inviteCode === null) {
			void ensureInviteCode({}).catch(() => {
				// Non-fatal: the share button reports it if the code is still missing.
			});
		}
	}, [summary, ensureInviteCode]);

	const handleShare = useCallback(async () => {
		if (sharing) return;
		setSharing(true);
		try {
			const code = summary?.inviteCode ?? (await ensureInviteCode({}));
			setShareCode(code);
			setShareOpen(true);
		} catch {
			Alert.alert(
				"Couldn't share right now",
				"Please check your connection and try again.",
			);
		} finally {
			setSharing(false);
		}
	}, [sharing, summary?.inviteCode, ensureInviteCode]);

	const invitedCount = summary?.invitedCount ?? 0;
	const isLoading = summary === undefined;

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
				contentContainerClassName="px-4 pt-4 pb-10 gap-6"
				showsVerticalScrollIndicator={false}
			>
				{/* Your progress */}
				<View className="gap-4 rounded-2xl bg-primary p-5">
					<View>
						<Text className="text-primary-foreground/80 text-sm">
							Your Progress
						</Text>
						{isLoading ? (
							<View className="h-9 justify-center">
								<ActivityIndicator color={accentForeground} />
							</View>
						) : (
							<Text className="font-bold text-3xl text-primary-foreground">
								{invitedCount} {invitedCount === 1 ? "Friend" : "Friends"}{" "}
								Invited
							</Text>
						)}
					</View>

					<Pressable
						onPress={() => void handleShare()}
						disabled={sharing}
						accessibilityRole="button"
						accessibilityLabel="Share invite link"
						className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-background active:opacity-90 disabled:opacity-60"
					>
						{sharing ? (
							<ActivityIndicator color={accent} />
						) : (
							<Ionicons name="share-social-outline" size={20} color={accent} />
						)}
						<Text className="font-semibold text-base" style={{ color: accent }}>
							Share Invite Link
						</Text>
					</Pressable>
				</View>

				{/* Upcoming updates */}
				<View className="gap-3">
					<Text className="font-semibold text-foreground text-lg">
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
							className="flex-row items-center gap-3 rounded-2xl bg-background p-4 active:opacity-90"
						>
							<View className="size-11 items-center justify-center rounded-xl bg-secondary">
								<Ionicons name={update.icon} size={20} color={accent} />
							</View>
							<View className="flex-1">
								<Text className="font-semibold text-base text-foreground">
									{update.title}
								</Text>
								<Text className="text-muted-foreground text-sm">
									{update.subtitle}
								</Text>
							</View>
							{update.url ? (
								<Ionicons name="chevron-forward" size={18} color={foreground} />
							) : null}
						</Pressable>
					))}
				</View>

				{/* Socials */}
				<View className="gap-3">
					<View className="flex-row items-center justify-between">
						<Text className="font-semibold text-foreground text-lg">
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
								size={22}
								color={accent}
							/>
						</Pressable>
					</View>

					<View className="flex-row flex-wrap gap-3">
						{COMMUNITY_SOCIALS.map((social) => (
							<Pressable
								key={social.id}
								onPress={() => void Linking.openURL(social.url)}
								accessibilityRole="link"
								accessibilityLabel={`${social.name} — ${social.caption}`}
								className="min-w-[30%] flex-1 items-center gap-1.5 rounded-2xl bg-background px-2 py-4 active:opacity-90"
							>
								<View className="size-11 items-center justify-center rounded-full bg-secondary">
									<Ionicons name={social.icon} size={22} color={social.color} />
								</View>
								<Text className="font-semibold text-foreground text-sm">
									{social.name}
								</Text>
								<Text className="text-center text-muted-foreground text-xs">
									{social.caption}
								</Text>
							</Pressable>
						))}
					</View>
				</View>

				{/* Grow our community */}
				<View className="gap-3 rounded-2xl bg-secondary/60 p-5">
					<Text className="font-semibold text-foreground text-lg">
						Grow Our Community
					</Text>
					<Text className="text-muted-foreground text-sm leading-5">
						Invite family and friends to preserve more stories together.
					</Text>
					<Pressable
						onPress={() => void handleShare()}
						disabled={sharing}
						accessibilityRole="button"
						accessibilityLabel="Invite friends"
						className="h-12 w-40 items-center justify-center rounded-2xl bg-primary active:opacity-90 disabled:opacity-60"
					>
						<Text className="font-semibold text-base text-primary-foreground">
							Invite Friends
						</Text>
					</Pressable>
				</View>
			</ScrollView>

			<InviteShareSheet
				visible={shareOpen}
				code={shareCode}
				link={
					shareCode ? nativeWebAppUrl(`/invite/${shareCode}?src=ios`) : null
				}
				onClose={() => setShareOpen(false)}
			/>
		</View>
	);
}
