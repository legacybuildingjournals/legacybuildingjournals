import { api } from "@legacy-building/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import * as Notifications from "expo-notifications";
import { useThemeColor } from "heroui-native/hooks";
import { useCallback, useEffect, useState } from "react";
import {
	Alert,
	Linking,
	Pressable,
	ScrollView,
	Switch,
	Text,
	View,
} from "react-native";

import { AccountScreenHeader } from "@/components/account/account-screen-header";
import {
	ensureNotificationPermission,
	sendTestNotification,
} from "@/lib/notifications/scheduler";

type PrefKey = "dailyPrompts" | "inactivity" | "exportReminders";

function formatTime(hour: number, minute: number): string {
	const period = hour < 12 ? "AM" : "PM";
	const h12 = hour % 12 === 0 ? 12 : hour % 12;
	const mm = minute.toString().padStart(2, "0");
	return `${h12}:${mm} ${period}`;
}

type ToggleRowProps = {
	title: string;
	subtitle: string;
	value: boolean;
	onValueChange: (next: boolean) => void;
	accent: string;
};

function ToggleRow({
	title,
	subtitle,
	value,
	onValueChange,
	accent,
}: ToggleRowProps) {
	return (
		<View className="flex-row items-center justify-between gap-4 border-border border-b bg-background px-5 py-4">
			<View className="min-w-0 flex-1 gap-1">
				<Text className="font-medium text-foreground text-lg">{title}</Text>
				<Text className="text-muted-foreground text-sm">{subtitle}</Text>
			</View>
			<Switch
				value={value}
				onValueChange={onValueChange}
				trackColor={{ true: accent }}
				accessibilityLabel={title}
			/>
		</View>
	);
}

export default function NotificationsScreen() {
	const preferences = useQuery(api.notifications.queries.getMyPreferences, {});
	const setPreferences = useMutation(
		api.notifications.mutations.setNotificationPreferences,
	);
	const [accent] = useThemeColor(["accent"]);

	const [permissionGranted, setPermissionGranted] = useState(true);

	const refreshPermission = useCallback(async () => {
		const status = await Notifications.getPermissionsAsync();
		setPermissionGranted(status.granted);
	}, []);

	useEffect(() => {
		void refreshPermission();
	}, [refreshPermission]);

	const hour = preferences?.dailyPromptHour ?? 9;
	const minute = preferences?.dailyPromptMinute ?? 0;

	const updatePref = useCallback(
		async (key: PrefKey, next: boolean) => {
			// Turning a reminder on is meaningless without OS permission — ask now.
			if (next && !permissionGranted) {
				const granted = await ensureNotificationPermission();
				setPermissionGranted(granted);
				if (!granted) {
					Alert.alert(
						"Notifications are off",
						"Enable notifications for Legacy Building in your device Settings to receive reminders.",
						[
							{ text: "Not now", style: "cancel" },
							{
								text: "Open Settings",
								onPress: () => void Linking.openSettings(),
							},
						],
					);
					return;
				}
			}
			try {
				await setPreferences({ [key]: next });
			} catch {
				Alert.alert("Could not update", "Please try again.");
			}
		},
		[permissionGranted, setPreferences],
	);

	const handleSendTest = useCallback(async () => {
		const sent = await sendTestNotification();
		await refreshPermission();
		if (sent) {
			Alert.alert(
				"Test sent",
				"A test notification will appear in about 2 seconds. Background the app to see it on the lock screen.",
			);
		} else {
			Alert.alert(
				"Notifications are off",
				"Enable notifications for Legacy Building in Settings, then try again.",
				[
					{ text: "Not now", style: "cancel" },
					{ text: "Open Settings", onPress: () => void Linking.openSettings() },
				],
			);
		}
	}, [refreshPermission]);

	return (
		<View className="flex-1 bg-background">
			<AccountScreenHeader title="Notifications" />

			<ScrollView
				className="flex-1"
				contentContainerClassName="pt-2 pb-12"
				showsVerticalScrollIndicator={false}
			>
				{!preferences ? (
					<Text className="px-5 py-6 text-muted-foreground">Loading…</Text>
				) : (
					<>
						{!permissionGranted ? (
							<Pressable
								onPress={() => void Linking.openSettings()}
								className="mx-5 mt-3 mb-1 rounded-xl border border-border bg-secondary/30 px-4 py-3 active:opacity-70"
							>
								<Text className="font-medium text-foreground text-sm">
									Notifications are turned off for Legacy Building.
								</Text>
								<Text className="mt-0.5 text-muted-foreground text-xs">
									Tap to open Settings and enable them.
								</Text>
							</Pressable>
						) : null}

						<View className="mt-2">
							<ToggleRow
								title="Daily journaling prompt"
								subtitle={`A gentle daily reminder at ${formatTime(hour, minute)}.`}
								value={preferences.dailyPrompts}
								onValueChange={(next) => void updatePref("dailyPrompts", next)}
								accent={accent}
							/>

							<ToggleRow
								title="Inactivity reminders"
								subtitle="A nudge when it's been a few days since your last entry."
								value={preferences.inactivity}
								onValueChange={(next) => void updatePref("inactivity", next)}
								accent={accent}
							/>

							<ToggleRow
								title="Export reminders"
								subtitle="Occasional reminders to back up and preserve your entries."
								value={preferences.exportReminders}
								onValueChange={(next) =>
									void updatePref("exportReminders", next)
								}
								accent={accent}
							/>
						</View>

						<Text className="px-5 pt-6 text-muted-foreground text-xs leading-5">
							Daily prompts are scheduled on this device. Inactivity and export
							reminders are sent from the server, so they work across all your
							devices.
						</Text>

						{__DEV__ ? (
							<Pressable
								onPress={() => void handleSendTest()}
								accessibilityRole="button"
								accessibilityLabel="Send a test notification"
								className="mx-5 mt-6 rounded-lg border border-border px-4 py-3 active:opacity-70"
							>
								<Text className="text-center font-medium text-base text-foreground">
									Send a test notification
								</Text>
							</Pressable>
						) : null}
					</>
				)}
			</ScrollView>
		</View>
	);
}
