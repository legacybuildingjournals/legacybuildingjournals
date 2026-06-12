import { useClerk } from "@clerk/expo";
import { brand } from "@legacy-building/ui/lib/brand-journal";
import { type Href, usePathname, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert, Image, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { nativeBillingUrl } from "@/lib/native-legal-url";

const NAV_ITEMS = [
	{ id: "desk", label: "Desk", href: "/(tabs)" },
	{ id: "library", label: "Library", href: "/(tabs)/library" },
	{ id: "account", label: "Account", href: "/(tabs)/account" },
	{ id: "billing", label: "Billing", external: true },
] as const;

type MobileNavMenuProps = {
	avatarUrl: string;
};

function isActiveRoute(pathname: string, href: string): boolean {
	if (href === "/(tabs)") {
		return (
			pathname === "/" || pathname === "/(tabs)" || pathname === "/(tabs)/index"
		);
	}
	return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNavMenu({ avatarUrl }: MobileNavMenuProps) {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const pathname = usePathname();
	const { signOut } = useClerk();
	const [open, setOpen] = useState(false);

	const close = () => setOpen(false);

	const navigateTo = (href: string) => {
		close();
		router.push(href as Href);
	};

	const openBilling = () => {
		close();
		void WebBrowser.openBrowserAsync(nativeBillingUrl());
	};

	const handleLogout = () => {
		close();
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
		<>
			<Pressable
				onPress={() => setOpen(true)}
				accessibilityRole="button"
				accessibilityLabel="Open navigation menu"
				className="size-11 overflow-hidden rounded-full border border-[#e6e6e6] active:opacity-80"
			>
				<Image
					source={{ uri: avatarUrl }}
					className="size-full"
					resizeMode="cover"
				/>
			</Pressable>

			<Modal
				visible={open}
				transparent
				animationType="fade"
				onRequestClose={close}
			>
				<View className="flex-1">
					<Pressable className="absolute inset-0" onPress={close} />
					<View
						className="absolute right-4 min-w-[140px] overflow-hidden border border-[#c7c7c7] bg-white"
						style={{
							top: insets.top + 56,
							borderRadius: 12,
						}}
					>
						{NAV_ITEMS.map((item) => {
							const isExternal = "external" in item && item.external;
							const active =
								!isExternal &&
								"href" in item &&
								isActiveRoute(pathname, item.href);
							return (
								<Pressable
									key={item.id}
									onPress={() => {
										if (isExternal) {
											openBilling();
											return;
										}
										if ("href" in item) {
											navigateTo(item.href);
										}
									}}
									accessibilityRole="button"
									accessibilityState={{ selected: active }}
									className="min-h-11 justify-center bg-white px-4 active:opacity-70"
									style={{
										borderBottomWidth: 1,
										borderBottomColor: brand.border,
									}}
								>
									<Text
										className="font-medium text-sm leading-[1.4]"
										style={{
											color: active ? brand.primary : brand.text,
										}}
									>
										{item.label}
									</Text>
								</Pressable>
							);
						})}

						<Pressable
							onPress={handleLogout}
							accessibilityRole="button"
							accessibilityLabel="Logout"
							className="min-h-11 justify-center bg-white px-4 active:opacity-70"
							style={{
								borderBottomLeftRadius: 12,
								borderBottomRightRadius: 12,
							}}
						>
							<Text
								className="font-medium text-sm leading-[1.4]"
								style={{ color: brand.text }}
							>
								Logout
							</Text>
						</Pressable>
					</View>
				</View>
			</Modal>
		</>
	);
}
