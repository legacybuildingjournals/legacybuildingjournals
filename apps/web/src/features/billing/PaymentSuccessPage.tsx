import { api } from "@legacy-building/backend/convex/_generated/api";
import { PageLoader } from "@legacy-building/ui/components/page-loader";
import { brand } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAction } from "convex/react";
import { Check } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
	billingPageTitleClass,
	billingSubscribeShellClass,
} from "@/components/billing/billingLayoutStyles";
import { PaymentMethodDisplay } from "@/components/billing/PaymentMethodDisplay";
import { ROUTES } from "@/lib/routes";

type SuccessSummary = {
	planName: string;
	billingCycle: string;
	paymentMethodLabel: string;
	paymentMethodKind: "card" | "google_pay" | "apple_pay" | "other";
	nextBillingDateMs: number;
	hostedInvoiceUrl: string | null;
};

const REDIRECT_SECONDS = 8;

function formatBillingDate(ms: number) {
	return new Date(ms).toLocaleDateString(undefined, {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

function SummaryField({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-[#8a8a8a] text-sm">{label}</span>
			<div className="text-base">{children}</div>
		</div>
	);
}

export function PaymentSuccessPage() {
	const navigate = useNavigate();
	const getSummary = useAction(api.stripe.actions.getPaymentSuccessSummary);

	const [summary, setSummary] = useState<SuccessSummary | null>(null);
	const [loading, setLoading] = useState(true);
	const [summaryError, setSummaryError] = useState<string | null>(null);
	const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);

	const goToBilling = useCallback(() => {
		void navigate({
			to: ROUTES.dashboardBilling,
			search: { checkout: "success" },
		});
	}, [navigate]);

	const loadSummary = useCallback(async () => {
		setLoading(true);
		setSummaryError(null);
		let attempts = 0;

		while (attempts < 12) {
			try {
				const result = await getSummary({});
				if (result) {
					setSummary(result);
					if (result.hostedInvoiceUrl || attempts >= 11) {
						setLoading(false);
						return;
					}
				}
			} catch {
				setSummaryError("We couldn't confirm your payment yet. Please retry.");
				setLoading(false);
				return;
			}
			attempts += 1;
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		setSummaryError("Payment confirmation is taking longer than expected.");
		setLoading(false);
	}, [getSummary]);

	useEffect(() => {
		void loadSummary();
	}, [loadSummary]);

	useEffect(() => {
		if (loading || summaryError || !summary) return;
		const timer = window.setInterval(() => {
			setSecondsLeft((current) => {
				if (current <= 1) {
					window.clearInterval(timer);
					goToBilling();
					return 0;
				}
				return current - 1;
			});
		}, 1000);
		return () => window.clearInterval(timer);
	}, [loading, summaryError, summary, goToBilling]);

	const handleViewInvoice = () => {
		if (!summary?.hostedInvoiceUrl) {
			toast.error(
				"Your invoice is not ready yet. Please try again in a moment.",
			);
			return;
		}
		window.open(summary.hostedInvoiceUrl, "_blank", "noopener,noreferrer");
	};

	return (
		<div className="relative flex min-h-svh w-full flex-col bg-[#f5f5f5]">
			<div
				className={cn(
					billingSubscribeShellClass,
					"max-w-[640px] items-start justify-start sm:items-center sm:justify-center",
				)}
			>
				<div className="flex w-full min-w-0 flex-col items-center gap-5 sm:gap-6">
					<div
						className="flex size-16 shrink-0 items-center justify-center rounded-full border-2"
						style={{ borderColor: brand.primary, color: brand.primary }}
					>
						<Check className="size-8 stroke-[2.5]" aria-hidden />
					</div>

					<div className="flex w-full min-w-0 flex-col items-center gap-2 px-1 text-center">
						<h1
							className={cn(
								billingPageTitleClass,
								"text-[#1a1a1a] sm:text-4xl",
							)}
						>
							Payment Successful
						</h1>
						<p className="max-w-md text-[#525252] text-sm sm:text-base">
							{summaryError
								? "We're still confirming your subscription details."
								: summary
									? `Your plan is now active. Redirecting you to billing${
											secondsLeft > 0 ? ` in ${secondsLeft}s` : "…"
										}`
									: "Confirming your payment…"}
						</p>
					</div>

					{loading ? (
						<div className="flex min-h-[220px] w-full items-center justify-center rounded-2xl border border-[#e6e6e6] bg-white">
							<PageLoader overlay={false} />
						</div>
					) : summaryError ? (
						<div className="flex w-full flex-col items-center gap-4 rounded-2xl border border-[#e6e6e6] bg-white px-6 py-8 text-center shadow-sm">
							<p className="max-w-md text-[#525252] text-sm leading-relaxed">
								{summaryError}
							</p>
							<button
								type="button"
								onClick={() => void loadSummary()}
								className="inline-flex h-11 items-center justify-center rounded-xl px-6 font-semibold text-sm text-white hover:opacity-95"
								style={{ backgroundColor: brand.primary }}
							>
								Retry
							</button>
						</div>
					) : summary ? (
						<div className="w-full overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-sm">
							<div className="bg-[#ebf6f6] px-5 py-4 text-center sm:px-6">
								<p
									className="font-medium text-sm sm:text-base"
									style={{ color: brand.primary }}
								>
									You have now access to all Legacy Building features
								</p>
							</div>

							<div className="grid gap-5 px-4 py-5 text-left sm:grid-cols-2 sm:gap-6 sm:px-6 sm:py-8">
								<SummaryField label="Plan Name">
									<span className="font-semibold text-[#1a1a1a]">
										{summary?.planName ?? "—"}
									</span>
								</SummaryField>
								<SummaryField label="Billing Cycle">
									<span className="font-semibold text-[#1a1a1a]">
										{summary?.billingCycle ?? "—"}
									</span>
								</SummaryField>
								<SummaryField label="Payment Method">
									{summary ? (
										<PaymentMethodDisplay
											label={summary.paymentMethodLabel}
											kind={summary.paymentMethodKind}
										/>
									) : (
										<span className="font-semibold text-[#1a1a1a]">—</span>
									)}
								</SummaryField>
								<SummaryField label="Next Billing Date">
									<span className="font-semibold text-[#1a1a1a]">
										{summary
											? formatBillingDate(summary.nextBillingDateMs)
											: "—"}
									</span>
								</SummaryField>
							</div>
						</div>
					) : null}

					<div className="flex w-full flex-col items-center gap-3 pt-2">
						<button
							type="button"
							onClick={goToBilling}
							className="inline-flex h-11 w-full max-w-[280px] items-center justify-center rounded-xl px-6 font-semibold text-sm text-white hover:opacity-95"
							style={{ backgroundColor: brand.primary }}
						>
							Go to Billing
						</button>
						<button
							type="button"
							onClick={handleViewInvoice}
							disabled={!summary?.hostedInvoiceUrl}
							className="font-medium text-[#525252] text-sm hover:text-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-60"
						>
							View Invoice
						</button>
						<Link
							to={ROUTES.dashboardBilling}
							className="text-[#8a8a8a] text-xs hover:underline"
						>
							Manage subscription
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
