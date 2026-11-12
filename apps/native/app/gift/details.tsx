import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useThemeColor } from "heroui-native/hooks";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
	Alert,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";

import { AccountScreenHeader } from "@/components/account/account-screen-header";
import {
	GiftHeroCard,
	GiftHowItWorks,
	GiftPrimaryButton,
} from "@/components/gift/gift-parts";
import { getGiftProduct, purchaseGift } from "@/lib/billing/gift";
import {
	GIFT_MESSAGE_MAX,
	type GiftDetailsValues,
	giftDetailsSchema,
} from "@/lib/gift/schemas";
import { useMutationToast } from "@/lib/mutation-toast";

const inputClass =
	"h-12 rounded-xl border border-border bg-background px-3 text-base text-foreground";

function FieldLabel({ children }: { children: string }) {
	return (
		<Text className="font-medium text-foreground text-sm">{children}</Text>
	);
}

function FieldError({ message }: { message?: string }) {
	if (!message) return null;
	return <Text className="text-danger text-xs">{message}</Text>;
}

/**
 * SST-3 + SST-4 (mobile): "Gift Invite" (Figma). Saves the draft, then pays
 * through the App Store / Google Play (RevenueCat). The server verifies the
 * transaction before the gift becomes real; the receipt and gift card are
 * emailed to the purchaser.
 */
export default function GiftDetailsScreen() {
	const toast = useMutationToast();
	const placeholderColor = useThemeColor("field-placeholder");
	const offer = useQuery(api.gifts.queries.getOffer);
	const saveDraft = useMutation(api.gifts.mutations.saveDraft);
	const startStoreCheckout = useMutation(
		api.gifts.mutations.startStoreCheckout,
	);
	const confirmStorePurchase = useAction(
		api.gifts.actions.confirmStorePurchase,
	);

	// Kept across attempts so a failed or cancelled payment reuses the draft.
	const [giftId, setGiftId] = useState<Id<"gifts"> | null>(null);
	const [busy, setBusy] = useState(false);

	const form = useForm<GiftDetailsValues>({
		resolver: zodResolver(giftDetailsSchema),
		defaultValues: {
			recipientName: "",
			recipientEmail: "",
			title: "",
			message: "",
		},
	});
	const { errors } = form.formState;
	const messageLength = form.watch("message")?.length ?? 0;

	const onSubmit = form.handleSubmit(async (values) => {
		setBusy(true);
		try {
			const savedId = await saveDraft({
				giftId: giftId ?? undefined,
				...values,
			});
			setGiftId(savedId);

			const product = await getGiftProduct();
			if (!product) {
				toast.error(
					new Error("unavailable"),
					"Gift purchases aren't available in this build yet. Your details are saved.",
				);
				return;
			}

			await startStoreCheckout({ giftId: savedId });
			const result = await purchaseGift(product);
			if (result.status === "cancelled") {
				toast.error(
					new Error("cancelled"),
					"Payment cancelled. Your gift details are saved.",
				);
				return;
			}

			const { paid } = await confirmStorePurchase({
				giftId: savedId,
				transactionId: result.transactionId,
			});
			Alert.alert(
				paid ? "Your gift is ready to share" : "Payment received",
				paid
					? `We've emailed your receipt and the gift card for ${values.recipientName} to you. Forward it, share it, or print it whenever you choose.`
					: "We're confirming it with the store. Your receipt and gift card will arrive by email shortly.",
				[{ text: "Done", onPress: () => router.replace("/gift") }],
			);
		} catch (err) {
			toast.error(err, "Could not complete your gift. Please try again.");
		} finally {
			setBusy(false);
		}
	});

	return (
		<View className="flex-1 bg-background">
			<AccountScreenHeader title="Gift Invite" />
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				className="flex-1"
			>
				<ScrollView
					className="flex-1"
					contentContainerClassName="gap-4 px-4 pt-4 pb-10"
					keyboardShouldPersistTaps="handled"
				>
					<GiftHeroCard>
						<View className="gap-4 rounded-2xl border border-border bg-background p-5">
							<Controller
								control={form.control}
								name="recipientName"
								render={({ field }) => (
									<View className="gap-1.5">
										<FieldLabel>Recipient's Name</FieldLabel>
										<TextInput
											value={field.value}
											onChangeText={field.onChange}
											onBlur={field.onBlur}
											placeholder="Enter full name"
											placeholderTextColor={placeholderColor}
											className={inputClass}
											accessibilityLabel="Recipient's name"
										/>
										<FieldError message={errors.recipientName?.message} />
									</View>
								)}
							/>
							<Controller
								control={form.control}
								name="recipientEmail"
								render={({ field }) => (
									<View className="gap-1.5">
										<FieldLabel>Recipient's Email</FieldLabel>
										<TextInput
											value={field.value}
											onChangeText={field.onChange}
											onBlur={field.onBlur}
											placeholder="Enter email address"
											placeholderTextColor={placeholderColor}
											keyboardType="email-address"
											autoCapitalize="none"
											autoCorrect={false}
											className={inputClass}
											accessibilityLabel="Recipient's email"
										/>
										<FieldError message={errors.recipientEmail?.message} />
									</View>
								)}
							/>
							<Controller
								control={form.control}
								name="title"
								render={({ field }) => (
									<View className="gap-1.5">
										<FieldLabel>Heartfelt Title (Email Subject)</FieldLabel>
										<TextInput
											value={field.value}
											onChangeText={field.onChange}
											onBlur={field.onBlur}
											placeholder="e.g. A special gift for you"
											placeholderTextColor={placeholderColor}
											className={inputClass}
											accessibilityLabel="Gift title"
										/>
										<FieldError message={errors.title?.message} />
									</View>
								)}
							/>
							<Controller
								control={form.control}
								name="message"
								render={({ field }) => (
									<View className="gap-1.5">
										<FieldLabel>Personal Message</FieldLabel>
										<TextInput
											value={field.value}
											onChangeText={field.onChange}
											onBlur={field.onBlur}
											placeholder="Write a short message..."
											placeholderTextColor={placeholderColor}
											multiline
											maxLength={GIFT_MESSAGE_MAX}
											textAlignVertical="top"
											className="min-h-28 rounded-xl border border-border bg-background px-3 py-2 text-base text-foreground"
											accessibilityLabel="Personal message"
										/>
										<Text className="self-end text-muted-foreground text-xs">
											{messageLength}/{GIFT_MESSAGE_MAX}
										</Text>
										<FieldError message={errors.message?.message} />
									</View>
								)}
							/>
							{offer?.purchaser ? (
								<Text className="text-muted-foreground text-xs">
									From {offer.purchaser.name} ({offer.purchaser.email}).
								</Text>
							) : null}
						</View>
					</GiftHeroCard>

					<GiftHowItWorks>
						After purchase, you'll receive a gift card via email, ready to share
						with your loved one so they can redeem their access.
					</GiftHowItWorks>

					<GiftPrimaryButton
						label={busy ? "Processing…" : "Send Gift"}
						icon="gift-outline"
						loading={busy}
						onPress={() => void onSubmit()}
					/>
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	);
}
