import { useClerk, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@legacy-building/backend/convex/_generated/api";
import { useAction } from "convex/react";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useThemeColor } from "heroui-native/hooks";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useJournalPaywall } from "@/components/billing/journal-paywall-provider";
import { DashboardScreenHeader } from "@/components/navigation/dashboard-screen-header";
import { useBilling } from "@/hooks/use-billing";
import { useNativeCurrentUser } from "@/hooks/use-native-current-user";
import { useNativeSubscription } from "@/hooks/use-native-subscription";
import { planStatusLabel } from "@/lib/billing/plans";
import { messageFromError } from "@/lib/error-utils";
import { nativeLegalRoutes } from "@/lib/legal-routes";
import { nativeLegalUrl } from "@/lib/native-legal-url";

type AccountRowProps = {
	title: string;
	subtitle?: string;
	onPress: () => void;
	chevronColor: string;
};

function AccountRow({
	title,
	subtitle,
	onPress,
	chevronColor,
}: AccountRowProps) {
	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={title}
			className="flex-row items-center justify-between border-border border-b bg-background px-5 py-4 active:opacity-70"
		>
			<View className="min-w-0 flex-1 gap-1">
				<Text className="font-medium text-foreground text-lg">{title}</Text>
				{subtitle ? (
					<Text className="text-muted-foreground text-sm" numberOfLines={1}>
						{subtitle}
					</Text>
				) : null}
			</View>
			<Ionicons name="chevron-forward" size={22} color={chevronColor} />
		</Pressable>
	);
}

export default function AccountScreen() {
	const router = useRouter();
	const { user } = useUser();
	const { signOut } = useClerk();
	const { convexUser } = useNativeCurrentUser();
	const { plan, isLoading: planLoading, openPaywall } = useJournalPaywall();
	const { provider, hasPaidAccess } = useNativeSubscription();
	const { manage } = useBilling();
	const accent = useThemeColor("accent");
	const deleteMyAccount = useAction(api.user.deleteAccount.deleteMyAccount);

	const [busy, setBusy] = useState(false);

	const name = convexUser?.name ?? user?.username ?? user?.fullName ?? "Your";
	const email =
		user?.primaryEmailAddress?.emailAddress ?? convexUser?.email ?? "";
	const canChangePassword = user?.passwordEnabled ?? false;

	const handleDeleteAccount = async () => {
		if (busy) return;
		setBusy(true);
		try {
			// Server action removes Convex data, Stripe billing, and the Clerk user.
			await deleteMyAccount({});
			await signOut().catch(() => {});
			router.replace("/(auth)");
		} catch (err) {
			setBusy(false);
			Alert.alert(
				"Could not delete account",
				messageFromError(err, "Please try again."),
			);
		}
	};

	const confirmDeleteAccount = () => {
		if (busy) return;

		Alert.alert(
			"Delete account?",
			"Are you sure you want to permanently delete your account? All journals, entries, and uploaded media will be removed. This cannot be undone.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete account",
					style: "destructive",
					onPress: () => void handleDeleteAccount(),
				},
			],
			{ cancelable: true },
		);
	};

	const openLegal = (
		path: (typeof nativeLegalRoutes)[keyof typeof nativeLegalRoutes],
	) => {
		void WebBrowser.openBrowserAsync(nativeLegalUrl(path));
	};

	// Route subscription management to the right place for the provider:
	// Apple → App Store, Google → Play Store, Stripe (web-originated) → web billing.
	const openBilling = () => {
		void manage(provider);
	};

	const billingSubtitle = !hasPaidAccess
		? "Manage subscription and payment"
		: provider === "apple"
			? "Managed in the App Store"
			: provider === "google"
				? "Managed in Google Play"
				: "Managed on the web";

	const confirmLogout = () => {
		Alert.alert("Log out?", "You'll need to sign in again.", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Logout",
				style: "destructive",
				onPress: () => {
					void signOut().then(() => router.replace("/(auth)"));
				},
			},
		]);
	};

	return (
		<View className="flex-1 bg-background">
			<DashboardScreenHeader title={`${name}'s Account`} />

			<ScrollView
				className="flex-1"
				contentContainerClassName="pt-2 pb-12"
				showsVerticalScrollIndicator={false}
			>
				<AccountRow
					title="Personal Details"
					subtitle={convexUser?.name ?? user?.username ?? undefined}
					onPress={() => router.push("/account/personal-details")}
					chevronColor={accent}
				/>
				<AccountRow
					title="Subscription"
					subtitle={
						planLoading
							? "Loading…"
							: plan === "free"
								? "Free plan — tap to upgrade"
								: `${planStatusLabel(plan)} plan`
					}
					onPress={openPaywall}
					chevronColor={accent}
				/>
				<AccountRow
					title="Billing"
					subtitle={billingSubtitle}
					onPress={openBilling}
					chevronColor={accent}
				/>
				<AccountRow
					title="Change Email"
					subtitle={email}
					onPress={() => router.push("/account/change-email")}
					chevronColor={accent}
				/>
				{canChangePassword ? (
					<AccountRow
						title="Change Password"
						subtitle="•••••••••••"
						onPress={() => router.push("/account/change-password")}
						chevronColor={accent}
					/>
				) : null}

				<View className="h-6 bg-secondary/20" />

				<Pressable
					onPress={confirmLogout}
					accessibilityRole="button"
					accessibilityLabel="Logout"
					className="mx-5 mt-2 rounded-lg border border-border px-4 py-3 active:opacity-70"
				>
					<Text className="text-center font-medium text-base text-foreground">
						Logout
					</Text>
				</Pressable>

				<View className="items-center gap-6 px-6 pt-8">
					<Text className="text-center text-base text-foreground">
						<Text
							onPress={() => openLegal(nativeLegalRoutes.terms)}
							className="font-semibold underline"
						>
							Terms of Service
						</Text>
						<Text> and </Text>
						<Text
							onPress={() => openLegal(nativeLegalRoutes.privacy)}
							className="font-semibold underline"
						>
							Privacy Policy
						</Text>
					</Text>

					<Pressable
						onPress={() => confirmDeleteAccount()}
						disabled={busy}
						accessibilityRole="button"
						accessibilityLabel="Delete account"
						className="rounded-lg px-4 py-3 active:opacity-70 disabled:opacity-40"
						hitSlop={12}
					>
						<Text className="text-base text-muted-foreground">
							Delete Account
						</Text>
					</Pressable>
				</View>
			</ScrollView>
		</View>
	);
}
