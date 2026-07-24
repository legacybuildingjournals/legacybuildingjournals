import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { useThemeColor } from "heroui-native/hooks";
import { useEffect, useState } from "react";
import {
	Modal,
	Platform,
	Pressable,
	ScrollView,
	Share,
	Text,
	View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	APP_STORE_URL,
	inviteShareMessage,
	PLAY_STORE_URL,
} from "@/lib/community/content";

type InviteShareSheetProps = {
	visible: boolean;
	code: string | null;
	link: string | null;
	onClose: () => void;
};

type Target = {
	id: string;
	label: string;
	icon: keyof typeof Ionicons.glyphMap;
	color: string;
	/** Handlers return whatever the underlying API does; the caller ignores it. */
	onPress: () => unknown;
};

/** Opens `url`, falling back to the OS share sheet when the app isn't installed. */
async function openOrShare(url: string, message: string) {
	try {
		if (await Linking.canOpenURL(url)) {
			await Linking.openURL(url);
			return;
		}
	} catch {
		// Fall through to the share sheet.
	}
	await Share.share({ message });
}

export function InviteShareSheet({
	visible,
	code,
	link,
	onClose,
}: InviteShareSheetProps) {
	const insets = useSafeAreaInsets();
	const [accent, foreground] = useThemeColor(["accent", "foreground"]);
	const [copiedField, setCopiedField] = useState<"code" | "link" | null>(null);
	const [showQr, setShowQr] = useState(false);

	const message = link ? inviteShareMessage(link) : "";

	// Reset transient UI each time the sheet opens.
	useEffect(() => {
		if (!visible) {
			setShowQr(false);
			setCopiedField(null);
		}
	}, [visible]);

	async function copy(value: string, field: "code" | "link"): Promise<void> {
		await Clipboard.setStringAsync(value);
		setCopiedField(field);
		setTimeout(() => setCopiedField(null), 2000);
	}

	const targets: Target[] = [
		{
			id: "whatsapp",
			label: "WhatsApp",
			icon: "logo-whatsapp",
			color: "#25d366",
			onPress: () =>
				openOrShare(
					`whatsapp://send?text=${encodeURIComponent(message)}`,
					message,
				),
		},
		{
			id: "messages",
			label: "Messages",
			icon: "chatbubble",
			color: "#34c759",
			onPress: () =>
				openOrShare(
					// iOS and Android disagree on the separator before `body`.
					Platform.OS === "ios"
						? `sms:&body=${encodeURIComponent(message)}`
						: `sms:?body=${encodeURIComponent(message)}`,
					message,
				),
		},
		{
			id: "email",
			label: "Email",
			icon: "mail",
			color: "#1877f2",
			onPress: () =>
				openOrShare(
					`mailto:?subject=${encodeURIComponent(
						"Join me on Legacy Building",
					)}&body=${encodeURIComponent(message)}`,
					message,
				),
		},
		{
			id: "instagram",
			label: "Instagram",
			icon: "logo-instagram",
			color: "#e1306c",
			// Instagram has no URL scheme that accepts prefilled text, so the best
			// we can do is put the link on the clipboard ready to paste.
			onPress: async () => {
				if (link) await copy(link, "link");
				await openOrShare("instagram://app", message);
			},
		},
		{
			id: "store",
			label: Platform.OS === "ios" ? "App Store" : "Playstore",
			icon:
				Platform.OS === "ios" ? "logo-apple-appstore" : "logo-google-playstore",
			color: accent,
			onPress: () =>
				Linking.openURL(Platform.OS === "ios" ? APP_STORE_URL : PLAY_STORE_URL),
		},
		{
			id: "copy",
			label: "Copy Link",
			icon: copiedField === "link" ? "checkmark" : "copy-outline",
			color: foreground,
			onPress: () => (link ? copy(link, "link") : undefined),
		},
		{
			id: "qr",
			label: "QR Code",
			icon: "qr-code-outline",
			color: foreground,
			onPress: () => setShowQr((prev) => !prev),
		},
	];

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={onClose}
		>
			<Pressable
				className="flex-1 bg-black/40"
				onPress={onClose}
				accessibilityRole="button"
				accessibilityLabel="Close share options"
			/>

			<View
				className="rounded-t-3xl bg-secondary/40 px-4 pt-3"
				style={{ paddingBottom: insets.bottom + 16 }}
			>
				<View className="mb-4 h-1.5 w-24 self-center rounded-full bg-muted-foreground/40" />

				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerClassName="gap-3 pb-2"
				>
					{/* Referral code */}
					<View className="gap-3 rounded-2xl bg-background p-4">
						<Text className="font-medium text-foreground text-sm">
							Your Referral Code
						</Text>

						<Pressable
							onPress={() => (code ? void copy(code, "code") : undefined)}
							disabled={!code}
							accessibilityRole="button"
							accessibilityLabel={`Copy referral code ${code ?? ""}`}
							className="flex-row items-center justify-between rounded-xl bg-secondary/60 px-4 py-4 active:opacity-80"
						>
							<Text
								className="font-bold text-xl tracking-[3px]"
								style={{ color: accent }}
							>
								{code ?? "…"}
							</Text>
							<Ionicons
								name={copiedField === "code" ? "checkmark" : "copy-outline"}
								size={20}
								color={accent}
							/>
						</Pressable>

						<Pressable
							onPress={() => void Share.share({ message })}
							disabled={!link}
							accessibilityRole="button"
							accessibilityLabel="Share invite link"
							className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-primary active:opacity-90 disabled:opacity-60"
						>
							<Ionicons name="share-outline" size={20} color="#ffffff" />
							<Text className="font-semibold text-base text-primary-foreground">
								Share Invite Link
							</Text>
						</Pressable>
					</View>

					{/* Share targets */}
					<View className="gap-4 rounded-2xl bg-background p-5">
						<View className="items-center gap-1">
							<Text className="font-semibold text-foreground text-lg">
								Share your invite link
							</Text>
							<Text className="text-muted-foreground text-sm">
								Invite friends to preserve more stories together
							</Text>
						</View>

						<View className="flex-row flex-wrap justify-center gap-x-4 gap-y-5">
							{targets.map((target) => (
								<Pressable
									key={target.id}
									onPress={() => void target.onPress()}
									disabled={!link}
									accessibilityRole="button"
									accessibilityLabel={target.label}
									className="w-[70px] items-center gap-1.5 active:opacity-70 disabled:opacity-40"
								>
									<View className="size-14 items-center justify-center rounded-full bg-secondary/70">
										<Ionicons
											name={target.icon}
											size={26}
											color={target.color}
										/>
									</View>
									<Text className="text-center text-foreground text-xs">
										{target.label}
									</Text>
								</Pressable>
							))}
						</View>

						{showQr && link ? (
							<View className="items-center gap-2 pt-1">
								<View className="rounded-2xl bg-white p-3">
									<QRCode value={link} size={200} />
								</View>
								<Text className="text-center text-muted-foreground text-xs">
									Have them scan this to open your invite.
								</Text>
							</View>
						) : null}
					</View>

					<Pressable
						onPress={onClose}
						accessibilityRole="button"
						accessibilityLabel="Cancel"
						className="h-14 items-center justify-center rounded-2xl bg-secondary active:opacity-80"
					>
						<Text className="font-semibold text-base" style={{ color: accent }}>
							Cancel
						</Text>
					</Pressable>
				</ScrollView>
			</View>
		</Modal>
	);
}
