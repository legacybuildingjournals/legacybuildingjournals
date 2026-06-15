import { useUser } from "@clerk/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCurrentUser } from "@legacy-building/ui/hooks/use-current-user";
import { brand } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import {
	PaymentElement,
	useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import { Link } from "@tanstack/react-router";
import { Loader2, Lock, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { defaultUsername, isGoogleOAuthProvider } from "@/lib/account/username";
import { ROUTES } from "@/lib/routes";

const checkoutPaymentFormSchema = z.object({
	fullName: z.string().trim().min(1, "Enter your full name."),
});

type CheckoutPaymentFormValues = z.infer<typeof checkoutPaymentFormSchema>;

type CheckoutPaymentFormProps = {
	amountLabel: string;
};

const DEFAULT_BILLING_COUNTRY = "US";

/** Stripe requires billing `address.country` when name is collected outside Payment Element. */
function checkoutBillingAddress(name: string) {
	return {
		name,
		address: { country: DEFAULT_BILLING_COUNTRY },
	};
}

export function CheckoutPaymentForm({ amountLabel }: CheckoutPaymentFormProps) {
	const checkoutState = useCheckoutElements();
	const { user } = useUser();
	const { convexUser, isLoading: userLoading } = useCurrentUser();
	const email = user?.primaryEmailAddress?.emailAddress ?? "";

	const isGoogle = Boolean(
		user?.externalAccounts?.some((account) =>
			isGoogleOAuthProvider(account.provider),
		),
	);
	const defaultFullName = useMemo(
		() => defaultUsername(convexUser?.name, user?.fullName ?? null, isGoogle),
		[convexUser?.name, user?.fullName, isGoogle],
	);

	const [promotionCode, setPromotionCode] = useState("");
	const [appliedPromotionCode, setAppliedPromotionCode] = useState<
		string | null
	>(null);
	const [applyingPromotion, setApplyingPromotion] = useState(false);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<CheckoutPaymentFormValues>({
		resolver: zodResolver(checkoutPaymentFormSchema),
		defaultValues: { fullName: "" },
	});

	useEffect(() => {
		if (userLoading) return;
		reset({ fullName: defaultFullName });
	}, [userLoading, defaultFullName, reset]);

	const onSubmit = handleSubmit(async (values) => {
		if (checkoutState.type !== "success") return;

		const trimmedEmail = email.trim();
		const trimmedName = values.fullName.trim();
		if (!trimmedEmail) {
			toast.error(
				"Add an email address to your account before completing checkout.",
			);
			return;
		}

		try {
			const confirmResult = await checkoutState.checkout.confirm({
				billingAddress: checkoutBillingAddress(trimmedName),
			});

			if (confirmResult.type === "error") {
				toast.error(
					confirmResult.error.message ?? "Payment failed. Please try again.",
				);
			}
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Payment failed. Please try again.";
			toast.error(message);
		}
	});

	const handleApplyPromotionCode = async () => {
		if (checkoutState.type !== "success") return;

		const code = promotionCode.trim();
		if (!code) {
			toast.error("Enter a promotion code.");
			return;
		}

		setApplyingPromotion(true);
		try {
			const result = await checkoutState.checkout.applyPromotionCode(code);
			if (result.type === "error") {
				toast.error(
					result.error.message ?? "That promotion code is not valid.",
				);
				return;
			}
			setAppliedPromotionCode(code);
			toast.success("Promotion code applied.");
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Could not apply promotion code.";
			toast.error(message);
		} finally {
			setApplyingPromotion(false);
		}
	};

	const handleRemovePromotionCode = async () => {
		if (checkoutState.type !== "success") return;

		setApplyingPromotion(true);
		try {
			const result = await checkoutState.checkout.removePromotionCode();
			if (result.type === "error") {
				toast.error(result.error.message ?? "Could not remove promotion code.");
				return;
			}
			setAppliedPromotionCode(null);
			setPromotionCode("");
			toast.success("Promotion code removed.");
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Could not remove promotion code.";
			toast.error(message);
		} finally {
			setApplyingPromotion(false);
		}
	};

	const inputClass =
		"h-11 w-full rounded-xl border border-[#e6e6e6] bg-white px-3 text-[#1a1a1a] text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#008080]/30";
	const readOnlyInputClass =
		"h-11 w-full cursor-not-allowed rounded-xl border border-[#e6e6e6] bg-[#f5f5f5] px-3 text-[#525252] text-sm outline-none";

	if (checkoutState.type === "loading") {
		return (
			<div className="flex min-h-[240px] items-center justify-center">
				<Loader2 className="size-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (checkoutState.type === "error") {
		return (
			<p className="text-destructive text-sm">{checkoutState.error.message}</p>
		);
	}

	const paymentDisabled = isSubmitting || applyingPromotion;

	return (
		<form onSubmit={onSubmit} className="flex flex-col gap-6">
			<h2 className="font-semibold text-[#1a1a1a] text-xl">
				Payment Information
			</h2>

			<div className="flex flex-col gap-4">
				<p className="font-medium text-[#525252] text-sm">
					Contact Information
				</p>
				<label className="flex flex-col gap-1.5">
					<span className="text-[#525252] text-xs">Full Name</span>
					<input
						type="text"
						{...register("fullName")}
						placeholder="John Doe"
						className={cn(
							inputClass,
							errors.fullName &&
								"border-destructive focus-visible:ring-destructive/30",
						)}
						autoComplete="name"
						aria-invalid={Boolean(errors.fullName)}
						aria-describedby={
							errors.fullName ? "checkout-full-name-error" : undefined
						}
					/>
					{errors.fullName ? (
						<p
							id="checkout-full-name-error"
							className="text-destructive text-xs"
						>
							{errors.fullName.message}
						</p>
					) : null}
				</label>
				<label className="flex flex-col gap-1.5">
					<span className="text-[#525252] text-xs">Email Address</span>
					<input
						type="email"
						value={email}
						readOnly
						disabled
						className={readOnlyInputClass}
						autoComplete="email"
						aria-label="Email address (read only)"
					/>
					{!email.trim() ? (
						<p className="text-destructive text-xs">
							Add an email to your account before paying.
						</p>
					) : null}
				</label>
			</div>

			<div className="flex flex-col gap-3">
				<p className="font-medium text-[#525252] text-sm">Promotion Code</p>
				{appliedPromotionCode ? (
					<div className="flex items-center justify-between gap-3 rounded-xl border border-[#e6e6e6] bg-[#f0faf9] px-4 py-3">
						<p className="inline-flex items-center gap-2 text-[#1a1a1a] text-sm">
							<Tag className="size-4 text-[#008080]" aria-hidden />
							<span>
								<code className="font-medium">{appliedPromotionCode}</code>{" "}
								applied
							</span>
						</p>
						<button
							type="button"
							onClick={() => void handleRemovePromotionCode()}
							disabled={paymentDisabled}
							className="shrink-0 font-medium text-[#008080] text-sm underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
						>
							Remove
						</button>
					</div>
				) : (
					<div className="flex flex-col gap-2 sm:flex-row">
						<label className="sr-only" htmlFor="checkout-promotion-code">
							Promotion code
						</label>
						<input
							id="checkout-promotion-code"
							type="text"
							value={promotionCode}
							onChange={(event) => setPromotionCode(event.target.value)}
							placeholder="Enter code"
							autoComplete="off"
							disabled={paymentDisabled}
							className={cn(inputClass, "sm:flex-1")}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									event.preventDefault();
									void handleApplyPromotionCode();
								}
							}}
						/>
						<button
							type="button"
							onClick={() => void handleApplyPromotionCode()}
							disabled={paymentDisabled || !promotionCode.trim()}
							className={cn(
								"h-11 shrink-0 rounded-xl border border-[#e6e6e6] bg-white px-5 font-medium text-[#1a1a1a] text-sm",
								"transition-colors hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-60",
							)}
						>
							{applyingPromotion ? (
								<Loader2 className="size-4 animate-spin" aria-hidden />
							) : (
								"Apply"
							)}
						</button>
					</div>
				)}
			</div>

			<div className="flex flex-col gap-3">
				<p className="font-medium text-[#525252] text-sm">Payment Method</p>
				<div className="rounded-xl border border-[#e6e6e6] bg-[#fafafa] p-4">
					<PaymentElement
						options={{
							layout: "tabs",
							paymentMethodOrder: ["card", "us_bank_account"],
							wallets: {
								applePay: "never",
								googlePay: "never",
							},
							fields: {
								billingDetails: {
									email: "never",
									name: "never",
									address: {
										country: "never",
									},
								},
							},
						}}
					/>
				</div>
			</div>

			<button
				type="submit"
				disabled={paymentDisabled || !email.trim()}
				className={cn(
					"flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 font-semibold text-sm text-white",
					"whitespace-nowrap transition-colors hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60",
				)}
				style={{ backgroundColor: brand.primary }}
			>
				{isSubmitting ? (
					<>
						<Loader2 className="size-4 animate-spin" aria-hidden />
						Processing…
					</>
				) : (
					amountLabel
				)}
			</button>

			<div className="flex flex-col items-center gap-2 text-center">
				<p className="inline-flex items-center gap-1.5 text-[#8a8a8a] text-xs">
					<Lock className="size-3.5" aria-hidden />
					Secure payments powered by Stripe
				</p>
				<p className="text-[#8a8a8a] text-xs leading-relaxed">
					By clicking &quot;Complete Payment&quot;, you agree to our{" "}
					<Link
						to={ROUTES.terms}
						className="text-[#008080] underline-offset-2 hover:underline"
					>
						Terms of Service
					</Link>{" "}
					and{" "}
					<Link
						to={ROUTES.privacy}
						className="text-[#008080] underline-offset-2 hover:underline"
					>
						Privacy Policy
					</Link>
					.
				</p>
			</div>
		</form>
	);
}
