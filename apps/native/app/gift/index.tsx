import { Ionicons } from "@expo/vector-icons";
import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Skeleton } from "heroui-native";
import { useThemeColor } from "heroui-native/hooks";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";

import { AccountScreenHeader } from "@/components/account/account-screen-header";
import {
	GiftHero,
	GiftHowItWorks,
	GiftPrimaryButton,
} from "@/components/gift/gift-parts";
import { getGiftProduct } from "@/lib/billing/gift";
import { useMutationToast } from "@/lib/mutation-toast";

const BENEFITS = [
	{
		icon: "book-outline",
		title: "Unlimited storytelling",
		body: "Write, record, and preserve meaningful moments.",
	},
	{
		icon: "library-outline",
		title: "A private personal library",
		body: "Keep memories together in one place.",
	},
	{
		icon: "infinite-outline",
		title: "No recurring payments",
		body: "The recipient won't pay for the gifted access.",
	},
] as const;

const STATUS_LABEL = {
	pending_payment: "Awaiting payment",
	paid: "Not claimed yet",
	redeemed: "Claimed",
	expired: "Expired",
	refunded: "Refunded",
} as const;

function formatUsd(minor: number) {
	return `$${(minor / 100).toFixed(minor % 100 === 0 ? 0 : 2)}`;
}

/** SST-2: "Gift Subscription" (Figma), plus the purchaser's gift history. */
export default function GiftSubscriptionScreen() {
	const accent = useThemeColor("accent");
	const offer = useQuery(api.gifts.queries.getOffer);
	const history = useQuery(api.gifts.queries.listMine);
	const resendEmail = useAction(api.gifts.actions.resendPurchaserEmail);
	const toast = useMutationToast();
	const [resendingId, setResendingId] = useState<Id<"gifts"> | null>(null);
	const [historyOpen, setHistoryOpen] = useState(false);

	const handleResend = async (giftId: Id<"gifts">) => {
		setResendingId(giftId);
		try {
			await resendEmail({ giftId });
			toast.success("Gift email sent to your inbox.");
		} catch (err) {
			toast.error(err, "Could not resend the gift email.");
		} finally {
			setResendingId(null);
		}
	};
	const [storePrice, setStorePrice] = useState<string | null | undefined>(
		undefined,
	);

	useEffect(() => {
		let cancelled = false;
		getGiftProduct()
			.then((product) => {
				if (!cancelled) setStorePrice(product?.priceString ?? null);
			})
			.catch(() => {
				if (!cancelled) setStorePrice(null);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const priceLabel =
		storePrice ?? (offer ? formatUsd(offer.priceMinor) : undefined);

	return (
		<View className="flex-1 bg-background">
			<AccountScreenHeader title="Gift Subscription" />
			<ScrollView
				className="flex-1"
				contentContainerClassName="gap-4 px-4 pt-4 pb-10"
			>
				<GiftHero />

				<View className="rounded-2xl border border-border bg-background p-5">
					<Text className="font-semibold text-[11px] text-primary uppercase tracking-widest">
						Lifetime subscription access
					</Text>
					<View className="mt-3 flex-row items-baseline gap-2 border-border border-b pb-4">
						{priceLabel === undefined || storePrice === undefined ? (
							<Skeleton className="h-10 w-24 rounded-lg" />
						) : (
							<Text className="font-semibold text-4xl text-foreground">
								{priceLabel}
							</Text>
						)}
						<Text className="text-muted-foreground text-sm">
							one-time payment
						</Text>
					</View>
					<View className="mt-4 gap-4">
						{BENEFITS.map((benefit) => (
							<View key={benefit.title} className="flex-row items-start gap-3">
								<View className="size-9 items-center justify-center rounded-full bg-accent/10">
									<Ionicons name={benefit.icon} size={16} color={accent} />
								</View>
								<View className="flex-1">
									<Text className="font-semibold text-foreground text-sm">
										{benefit.title}
									</Text>
									<Text className="text-muted-foreground text-xs">
										{benefit.body}
									</Text>
								</View>
							</View>
						))}
					</View>
				</View>

				<GiftHowItWorks>
					Recipient would get lifetime subscription access when gift is
					redeemed.
				</GiftHowItWorks>

				<GiftPrimaryButton
					label="Enter Recipient Details"
					onPress={() => router.push("/gift/details")}
				/>

				{history && history.length > 0 ? (
					<View className="mt-2 gap-2">
						{/* Collapsed by default (same as the web Account page). */}
						<Pressable
							onPress={() => setHistoryOpen((open) => !open)}
							accessibilityRole="button"
							accessibilityState={{ expanded: historyOpen }}
							className="flex-row items-center justify-between rounded-xl border border-border px-4 py-3 active:opacity-70"
						>
							<Text className="font-semibold text-base text-foreground">
								{historyOpen ? "Hide gift history" : "View gift history"} (
								{history.length})
							</Text>
							<Ionicons
								name={historyOpen ? "chevron-up" : "chevron-down"}
								size={18}
								color={accent}
							/>
						</Pressable>
						{(historyOpen ? history : []).map((gift) => (
							<View
								key={gift._id}
								className="flex-row items-center justify-between gap-3 rounded-xl border border-border p-3"
							>
								<View className="min-w-0 flex-1">
									<Text
										className="font-medium text-foreground text-sm"
										numberOfLines={1}
									>
										{gift.recipientName}
									</Text>
									<Text
										className="text-muted-foreground text-xs"
										numberOfLines={1}
									>
										{gift.recipientEmail} · {STATUS_LABEL[gift.status]}
									</Text>
								</View>
								{gift.status === "paid" ? (
									<Pressable
										onPress={() => void handleResend(gift._id)}
										disabled={resendingId !== null}
										accessibilityRole="button"
										accessibilityLabel={`Resend gift email for ${gift.recipientName}`}
										hitSlop={6}
										className="size-9 items-center justify-center rounded-full bg-accent/10 active:scale-95 active:opacity-70 disabled:opacity-50"
									>
										{resendingId === gift._id ? (
											<ActivityIndicator color={accent} size="small" />
										) : (
											<Ionicons name="mail-outline" size={18} color={accent} />
										)}
									</Pressable>
								) : null}
								{gift.cardUrl && gift.status === "paid" ? (
									<Pressable
										onPress={() => {
											if (gift.cardUrl) {
												void WebBrowser.openBrowserAsync(gift.cardUrl);
											}
										}}
										accessibilityRole="button"
										accessibilityLabel={`Open gift card for ${gift.recipientName}`}
										hitSlop={6}
										className="size-9 items-center justify-center rounded-full bg-accent/10 active:scale-95 active:opacity-70"
									>
										<Ionicons name="qr-code-outline" size={18} color={accent} />
									</Pressable>
								) : null}
							</View>
						))}
					</View>
				) : null}
			</ScrollView>
		</View>
	);
}
