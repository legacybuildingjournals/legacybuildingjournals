import { Ionicons } from "@expo/vector-icons";
import { api } from "@legacy-building/backend/convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { useThemeColor } from "heroui-native/hooks";
import { useMemo, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Modal,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBilling } from "@/hooks/use-billing";
import { useNativeSubscription } from "@/hooks/use-native-subscription";
import {
	type BillingProvider,
	formatAmount,
	PAYWALL_FEATURES,
	type PlanInterval,
} from "@/lib/billing/plans";
import { useMutationToast } from "@/lib/mutation-toast";

function formatRenewDate(seconds: number): string {
	return new Date(seconds * 1000).toLocaleDateString(undefined, {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

/** Human label for the store that owns a subscription. */
function providerStoreLabel(provider: BillingProvider): string {
	if (provider === "apple") return "App Store";
	if (provider === "google") return "Google Play";
	return "Stripe";
}

type PaywallModalProps = {
	visible: boolean;
	onClose: () => void;
	currentInterval?: PlanInterval | null;
};

type ProductRow = {
	interval: "monthly" | "annual";
	amountCents: number;
	currency: string;
	trialDays: number;
};

export function PaywallModal({
	visible,
	onClose,
	currentInterval = null,
}: PaywallModalProps) {
	const insets = useSafeAreaInsets();
	const [selected, setSelected] = useState<PlanInterval>("monthly");
	const [opening, setOpening] = useState(false);
	const [restoring, setRestoring] = useState(false);
	const [busy, setBusy] = useState(false);
	const primaryFg = useThemeColor("accent-foreground");
	const toast = useMutationToast();

	const { provider, isTrialing, cancelAtPeriodEnd, currentPeriodEnd } =
		useNativeSubscription();
	const billing = useBilling();
	const cancelSubscription = useAction(api.stripe.actions.cancelSubscription);
	const reactivateSubscription = useAction(
		api.stripe.actions.reactivateSubscription,
	);

	const isActive = currentInterval !== null;
	const isStripe = provider === "stripe";

	// ── Pricing: prefer RevenueCat packages (localized), fall back to Convex/Stripe products ──
	const products = useQuery(api.stripe.products.queries.listActive) as
		| ProductRow[]
		| undefined;

	const convexMonthly = products?.find((p) => p.interval === "monthly");
	const convexAnnual = products?.find((p) => p.interval === "annual");

	// RevenueCat packages contain localized pricing from the store.
	const rcMonthlyPrice = billing.monthlyPkg?.product.priceString;
	const rcAnnualPrice = billing.annualPkg?.product.priceString;

	const monthlyPrice =
		rcMonthlyPrice ??
		(convexMonthly
			? formatAmount(convexMonthly.amountCents, convexMonthly.currency)
			: "$3.99");
	const annualPrice =
		rcAnnualPrice ??
		(convexAnnual
			? formatAmount(convexAnnual.amountCents, convexAnnual.currency)
			: "$29.99");

	// Compute annual-per-month equivalent.
	const annualMonthlyEquivalent = billing.annualPkg
		? `${billing.annualPkg.product.currencyCode} ${(billing.annualPkg.product.price / 12).toFixed(2)}`
		: convexAnnual
			? formatAmount(
					Math.round(convexAnnual.amountCents / 12),
					convexAnnual.currency,
				)
			: "$2.51";

	const trialDays =
		billing.monthlyPkg?.product.introPrice?.periodNumberOfUnits ??
		convexMonthly?.trialDays ??
		7;

	const subscriptionSummary = useMemo(() => {
		if (selected === "annual") {
			return `Billed ${annualPrice} per year (~ ${annualMonthlyEquivalent}/mo). Cancel anytime.`;
		}
		if (isActive) {
			return `Billed ${monthlyPrice}/month. Cancel anytime.`;
		}
		return `Free for ${trialDays} days, then ${monthlyPrice}/month. Cancel anytime before day ${trialDays} to avoid charges.`;
	}, [
		annualMonthlyEquivalent,
		annualPrice,
		isActive,
		monthlyPrice,
		selected,
		trialDays,
	]);

	const ctaLabel = (() => {
		if (isActive && !isStripe) {
			return `Manage in ${providerStoreLabel(provider)}`;
		}
		if (currentInterval && currentInterval === selected) return "Current plan";
		if (currentInterval) {
			return selected === "annual" ? "Switch to annual" : "Switch to monthly";
		}
		return selected === "annual"
			? "Continue with annual"
			: `Start my free ${trialDays}-day trial`;
	})();

	// Stripe lets you switch to the other interval in-app; store-managed subs can
	// only be changed in their store, so the CTA there just opens management.
	const ctaDisabled = isActive && isStripe && currentInterval === selected;

	const handleSubscribe = async () => {
		if (opening || ctaDisabled) return;
		setOpening(true);
		try {
			if (!isActive) {
				// New subscriber → purchase via RevenueCat native IAP.
				const result = await billing.purchase(selected);
				if (result.cancelled) {
					// User tapped cancel — not an error, just close.
					return;
				}
				if (result.success) {
					toast.success("Welcome to Legacy Building Pro!");
					onClose();
				}
				return;
			}
			// Active subscriber → manage where it's owned.
			await billing.manage(provider);
		} catch (err) {
			toast.error(err, "Purchase failed. Please try again.");
		} finally {
			setOpening(false);
		}
	};

	const handleRestore = async () => {
		if (restoring) return;
		setRestoring(true);
		try {
			const restored = await billing.restore();
			if (restored) {
				toast.success("Purchases restored! Welcome back.");
				onClose();
			} else {
				toast.error(null, "No active subscription found to restore.");
			}
		} catch (err) {
			toast.error(err, "Could not restore purchases. Please try again.");
		} finally {
			setRestoring(false);
		}
	};

	const confirmCancel = () => {
		if (busy) return;
		const endLabel = currentPeriodEnd
			? `You'll keep access until ${formatRenewDate(currentPeriodEnd)}.`
			: "You'll keep access until the end of your current period.";
		Alert.alert(
			"Cancel subscription?",
			`${endLabel} After that, journal features lock until you resubscribe.`,
			[
				{ text: "Keep plan", style: "cancel" },
				{
					text: "Cancel subscription",
					style: "destructive",
					onPress: () => void runCancel(),
				},
			],
		);
	};

	const runCancel = async () => {
		if (busy) return;
		setBusy(true);
		try {
			await cancelSubscription({ atPeriodEnd: true });
			toast.success("Your subscription will end at the period close.");
		} catch (err) {
			toast.error(err, "Could not cancel. Please try again.");
		} finally {
			setBusy(false);
		}
	};

	const runReactivate = async () => {
		if (busy) return;
		setBusy(true);
		try {
			await reactivateSubscription({});
			toast.success("Your subscription will keep renewing.");
		} catch (err) {
			toast.error(err, "Could not reactivate. Please try again.");
		} finally {
			setBusy(false);
		}
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent
			onRequestClose={onClose}
		>
			<View className="flex-1 bg-primary">
				<View
					className="flex-row items-center justify-end px-4"
					style={{ paddingTop: insets.top + 8, paddingBottom: 8 }}
				>
					<Pressable
						onPress={onClose}
						accessibilityRole="button"
						accessibilityLabel="Close paywall"
						className="size-9 items-center justify-center rounded-full bg-primary-foreground/10 active:opacity-70"
						hitSlop={8}
					>
						<Ionicons name="close" size={20} color={primaryFg} />
					</Pressable>
				</View>

				<ScrollView
					className="flex-1"
					contentContainerClassName="px-5 pb-8"
					showsVerticalScrollIndicator={false}
				>
					<View className="items-center gap-3 pb-6">
						<View className="size-20 items-center justify-center rounded-2xl bg-primary-foreground/10">
							<Ionicons name="library" size={36} color={primaryFg} />
						</View>
						<Text className="px-2 text-center font-bold text-3xl text-primary-foreground leading-tight">
							Unlock Your Full{"\n"}Legacy Experience
						</Text>
						<Text className="px-4 text-center text-primary-foreground/70 text-sm leading-relaxed">
							Start free today. Write, record, and preserve your story – No
							commitment required
						</Text>
					</View>

					<View className="gap-3">
						<PlanCard
							label={`${trialDays} days free`}
							sublabel={`Then ${monthlyPrice}/mo`}
							price={`${monthlyPrice}/mo`}
							selected={selected === "monthly"}
							isCurrent={currentInterval === "monthly"}
							onPress={() => setSelected("monthly")}
						/>
						<PlanCard
							label="Annual"
							sublabel={`Save ~37% – ${annualMonthlyEquivalent}/mo`}
							price={`${annualPrice}/yr`}
							selected={selected === "annual"}
							isCurrent={currentInterval === "annual"}
							badge="Best value"
							onPress={() => setSelected("annual")}
						/>
					</View>

					<View className="my-6 h-px bg-primary-foreground/15" />

					<Text className="mb-4 font-semibold text-primary-foreground text-xl">
						Everything Included
					</Text>
					<View className="gap-4">
						{PAYWALL_FEATURES.map((feature) => (
							<View key={feature.title} className="flex-row items-start gap-3">
								<View className="mt-0.5">
									<Ionicons
										name="checkmark-circle"
										size={22}
										color={primaryFg}
									/>
								</View>
								<View className="min-w-0 flex-1">
									<Text className="font-semibold text-base text-primary-foreground">
										{feature.title}
									</Text>
									<Text className="mt-0.5 text-primary-foreground/70 text-sm leading-relaxed">
										{feature.description}
									</Text>
								</View>
							</View>
						))}
					</View>

					<View className="my-6 h-px bg-primary-foreground/15" />

					<View className="rounded-2xl bg-primary-foreground/10 px-4 py-4">
						<Text className="mb-2 font-semibold text-base text-primary-foreground">
							Subscription Details
						</Text>
						<Text className="text-primary-foreground/75 text-sm leading-relaxed">
							{subscriptionSummary}
						</Text>
					</View>

					{isActive ? (
						<View className="mt-4 rounded-2xl bg-primary-foreground/10 px-4 py-4">
							<Text className="mb-1 font-semibold text-base text-primary-foreground">
								Manage Subscription
							</Text>
							<Text className="mb-4 text-primary-foreground/75 text-sm leading-relaxed">
								{!isStripe
									? `This subscription is managed through ${providerStoreLabel(
											provider,
										)}. ${
											cancelAtPeriodEnd
												? `It's set to end${
														currentPeriodEnd
															? ` on ${formatRenewDate(currentPeriodEnd)}`
															: ""
													}.`
												: `Renews${
														currentPeriodEnd
															? ` on ${formatRenewDate(currentPeriodEnd)}`
															: " automatically"
													}. Manage or cancel it in ${providerStoreLabel(provider)}.`
										}`
									: cancelAtPeriodEnd
										? `Your plan is set to end${
												currentPeriodEnd
													? ` on ${formatRenewDate(currentPeriodEnd)}`
													: ""
											}. Reactivate to keep your access.`
										: isTrialing
											? `Your trial ${
													currentPeriodEnd
														? `ends on ${formatRenewDate(currentPeriodEnd)}`
														: "is active"
												}.`
											: `Renews${
													currentPeriodEnd
														? ` on ${formatRenewDate(currentPeriodEnd)}`
														: " automatically"
												}.`}
							</Text>
							{!isStripe ? (
								<Pressable
									onPress={() => void billing.manage(provider)}
									accessibilityRole="button"
									accessibilityLabel={`Manage in ${providerStoreLabel(provider)}`}
									className="h-12 flex-row items-center justify-center gap-2 rounded-full bg-primary-foreground active:opacity-90"
								>
									<Text className="font-semibold text-base text-primary">
										Manage in {providerStoreLabel(provider)}
									</Text>
								</Pressable>
							) : cancelAtPeriodEnd ? (
								<Pressable
									onPress={() => void runReactivate()}
									disabled={busy}
									accessibilityRole="button"
									accessibilityLabel="Reactivate subscription"
									className="h-12 flex-row items-center justify-center gap-2 rounded-full bg-primary-foreground active:opacity-90 disabled:opacity-60"
								>
									{busy ? (
										<ActivityIndicator color="#000000" size="small" />
									) : null}
									<Text className="font-semibold text-base text-primary">
										Reactivate Subscription
									</Text>
								</Pressable>
							) : (
								<Pressable
									onPress={confirmCancel}
									disabled={busy}
									accessibilityRole="button"
									accessibilityLabel="Cancel subscription"
									className="h-12 flex-row items-center justify-center gap-2 rounded-full border border-primary-foreground/40 active:opacity-70 disabled:opacity-60"
								>
									{busy ? (
										<ActivityIndicator color={primaryFg} size="small" />
									) : null}
									<Text className="font-semibold text-base text-primary-foreground">
										Cancel Subscription
									</Text>
								</Pressable>
							)}
						</View>
					) : null}
				</ScrollView>

				<View
					className="border-primary-foreground/10 border-t bg-primary px-5 pt-3"
					style={{ paddingBottom: insets.bottom + 12 }}
				>
					<Pressable
						onPress={() => void handleSubscribe()}
						disabled={opening || ctaDisabled}
						accessibilityRole="button"
						accessibilityLabel={ctaLabel}
						className="h-14 items-center justify-center rounded-full bg-primary-foreground active:opacity-90 disabled:opacity-60"
					>
						<Text className="font-semibold text-base text-primary">
							{opening ? "Processing..." : ctaLabel}
						</Text>
					</Pressable>

					{/* Restore Purchases — required by Apple for subscription apps */}
					{!isActive ? (
						<Pressable
							onPress={() => void handleRestore()}
							disabled={restoring}
							accessibilityRole="button"
							accessibilityLabel="Restore purchases"
							className="mt-3 h-10 items-center justify-center active:opacity-70"
						>
							<Text className="text-primary-foreground/60 text-sm">
								{restoring ? "Restoring..." : "Restore purchases"}
							</Text>
						</Pressable>
					) : null}
				</View>
			</View>
		</Modal>
	);
}

type PlanCardProps = {
	label: string;
	sublabel: string;
	price: string;
	selected: boolean;
	isCurrent: boolean;
	badge?: string;
	onPress: () => void;
};

function PlanCard({
	label,
	sublabel,
	price,
	selected,
	isCurrent,
	badge,
	onPress,
}: PlanCardProps) {
	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="radio"
			accessibilityState={{ selected }}
			accessibilityLabel={`${label}, ${price}`}
			className={`rounded-2xl border-2 px-4 py-4 active:opacity-90 ${
				selected
					? "border-primary-foreground bg-primary-foreground/15"
					: "border-primary-foreground/25 bg-primary-foreground/5"
			}`}
		>
			<View className="flex-row items-center justify-between">
				<View className="min-w-0 flex-1 pr-3">
					<View className="flex-row items-center gap-2">
						<Text className="font-semibold text-base text-primary-foreground">
							{label}
						</Text>
						{badge ? (
							<View className="rounded-full bg-primary-foreground px-2 py-0.5">
								<Text className="font-semibold text-[10px] text-primary uppercase">
									{badge}
								</Text>
							</View>
						) : null}
					</View>
					<Text className="mt-1 text-primary-foreground/70 text-sm">
						{sublabel}
					</Text>
					{isCurrent ? (
						<Text className="mt-1 text-primary-foreground/80 text-xs">
							Current plan
						</Text>
					) : null}
				</View>
				<Text className="font-semibold text-base text-primary-foreground">
					{price}
				</Text>
			</View>
		</Pressable>
	);
}
