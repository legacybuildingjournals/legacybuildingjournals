import { assets } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { Check, Loader2 } from "lucide-react";

import { useBillingCheckout } from "@/hooks/useBillingCheckout";
import {
	BILLING_FEATURES,
	BILLING_SUBSCRIBE_COPY,
	buildTrialSteps,
} from "@/lib/billing/billingContent";
import { formatAmount } from "@/lib/billing/plans";
import { ROUTES } from "@/lib/routes";

function PlanRadio({ selected }: { selected: boolean }) {
	return (
		<span
			className={cn(
				"flex size-5 shrink-0 items-center justify-center rounded-full border-2",
				selected
					? "border-white bg-white/10"
					: "border-white/50 bg-transparent",
			)}
			aria-hidden
		>
			{selected ? <span className="size-2.5 rounded-full bg-white" /> : null}
		</span>
	);
}

type PlanCardProps = {
	selected: boolean;
	onSelect: () => void;
	isCurrent: boolean;
	children: React.ReactNode;
	badge?: string;
};

function PlanCard({
	selected,
	onSelect,
	isCurrent,
	children,
	badge,
}: PlanCardProps) {
	return (
		<button
			type="button"
			onClick={onSelect}
			className={cn(
				"relative flex w-full cursor-pointer flex-col gap-1 rounded-xl border px-4 py-3.5 text-left transition-all",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
				selected
					? "border-white bg-white/15"
					: "border-white/25 bg-white/5 hover:border-white/40 hover:bg-white/10",
			)}
			aria-pressed={selected}
		>
			{badge ? (
				<span className="absolute top-3 right-3 rounded-full bg-[#f97316] px-2.5 py-0.5 font-semibold text-[10px] text-white uppercase tracking-wide">
					{badge}
				</span>
			) : null}
			<div className="flex items-start gap-3 pr-14 sm:pr-20">
				<PlanRadio selected={selected} />
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">{children}</div>
			</div>
			{isCurrent ? (
				<span className="mt-1 pl-8 text-white/60 text-xs">Current plan</span>
			) : null}
		</button>
	);
}

export function BillingSubscribePanel() {
	const {
		monthlyProduct,
		annualProduct,
		selected,
		setSelected,
		pending,
		isCurrentChoice,
		checkout,
		ctaLabel,
		isLoading,
		hasActiveSub,
	} = useBillingCheckout();

	const ctaDisabled =
		!selected || pending || (hasActiveSub && isCurrentChoice(selected));

	const monthlyPrice = monthlyProduct
		? formatAmount(monthlyProduct.amountCents, monthlyProduct.currency)
		: "$3.99";
	const annualPrice = annualProduct
		? formatAmount(annualProduct.amountCents, annualProduct.currency)
		: "$29.99";
	const trialDays = monthlyProduct?.trialDays ?? 7;
	const annualMonthly =
		annualProduct != null
			? formatAmount(
					Math.round(annualProduct.amountCents / 12),
					annualProduct.currency,
				)
			: "$2.50";
	const trialSteps = buildTrialSteps(monthlyPrice);

	const ctaButtonClass = cn(
		"flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-white font-semibold text-base text-gray-900",
		"whitespace-nowrap px-4",
		"transition-colors hover:bg-white/90",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
	);

	return (
		<div className="flex w-full min-w-0 flex-col items-center gap-6 sm:gap-8">
			<div className="flex w-full min-w-0 flex-col items-center gap-4 sm:gap-6">
				<img
					src={assets.whiteLogo}
					alt="Legacy Building"
					width={256}
					height={59}
					className="h-9 w-auto max-w-[min(100%,200px)] object-contain sm:h-12"
				/>
				<div className="flex w-full min-w-0 flex-col gap-2 px-1 text-center">
					<h1 className="font-semibold text-[clamp(1.375rem,5vw,2.125rem)] text-white leading-tight tracking-tight">
						Unlock your full legacy experience
					</h1>
					<p className="text-[clamp(0.875rem,3.5vw,1rem)] text-white/85 leading-relaxed">
						Start free today — write, record, and preserve your story
					</p>
				</div>
			</div>

			<div className="grid w-full min-w-0 gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
				<div className="flex flex-col gap-2.5">
					{isLoading ? (
						<>
							<div className="h-[76px] animate-pulse rounded-xl bg-white/10" />
							<div className="h-[64px] animate-pulse rounded-xl bg-white/10" />
							<div className="h-[64px] animate-pulse rounded-xl bg-white/10" />
						</>
					) : (
						<>
							<PlanCard
								selected={selected === "trial"}
								onSelect={() => setSelected("trial")}
								isCurrent={isCurrentChoice("trial")}
								badge="Most popular"
							>
								<p className="font-semibold text-base text-white">
									{trialDays} days free
								</p>
								<p className="text-white/70 text-xs leading-relaxed">
									Then {monthlyPrice}/mo, cancel anytime before day {trialDays}
								</p>
							</PlanCard>

							<PlanCard
								selected={selected === "monthly"}
								onSelect={() => setSelected("monthly")}
								isCurrent={isCurrentChoice("monthly")}
							>
								<div className="flex items-baseline justify-between gap-2">
									<p className="font-semibold text-base text-white">Monthly</p>
									<p className="font-semibold text-base text-white">
										{monthlyPrice}/mo
									</p>
								</div>
								<p className="text-white/70 text-xs">
									Full access from day one — no trial
								</p>
							</PlanCard>

							<PlanCard
								selected={selected === "annual"}
								onSelect={() => setSelected("annual")}
								isCurrent={isCurrentChoice("annual")}
							>
								<div className="flex items-baseline justify-between gap-2">
									<p className="font-semibold text-base text-white">Annual</p>
									<p className="font-semibold text-base text-white">
										{annualPrice}/yr
									</p>
								</div>
								<p className="text-white/70 text-xs">
									Save 37% — just {annualMonthly}/month
								</p>
							</PlanCard>
						</>
					)}
				</div>

				<div className="flex flex-col gap-5 lg:pt-1">
					<p className="font-medium text-[11px] text-white/70 uppercase tracking-[0.14em]">
						Everything included
					</p>
					<ul className="flex flex-col gap-4">
						{BILLING_FEATURES.map((feature) => (
							<li key={feature.title} className="flex gap-3">
								<span
									className="mt-0.5 flex size-8 shrink-0 items-center justify-center"
									aria-hidden
								>
									<feature.icon
										className="size-5 text-white"
										strokeWidth={1.75}
										aria-hidden
									/>
								</span>
								<div className="flex flex-col gap-0.5">
									<span className="font-medium text-sm text-white">
										{feature.title}
									</span>
									<span className="text-white/70 text-xs leading-relaxed">
										{feature.description}
									</span>
								</div>
							</li>
						))}
					</ul>
				</div>
			</div>

			<div className="w-full min-w-0 rounded-2xl bg-white/10 px-3 py-5 sm:px-5 sm:py-6 md:px-8 md:py-8">
				<p className="mb-5 text-center font-medium text-[11px] text-white/70 uppercase tracking-[0.14em] sm:mb-6">
					How your trial works
				</p>
				<div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
					<div
						className="absolute top-[11px] right-[10%] left-[10%] hidden h-px bg-white/30 sm:block"
						aria-hidden
					/>
					{trialSteps.map((step) => (
						<div
							key={step.label}
							className="relative z-10 flex flex-1 gap-3 sm:flex-col sm:items-center sm:gap-1.5 sm:text-center"
						>
							<span
								className={cn(
									"flex size-6 shrink-0 items-center justify-center rounded-full border-2",
									step.done
										? "border-white bg-white text-[#008080]"
										: "border-white/50 bg-transparent",
								)}
							>
								{step.done ? (
									<Check className="size-3.5" strokeWidth={3} aria-hidden />
								) : null}
							</span>
							<div className="flex min-w-0 flex-col gap-0.5 pt-0.5 sm:items-center">
								<span className="font-semibold text-white text-xs">
									{step.label}
								</span>
								<span className="text-[11px] text-white/70 leading-snug sm:max-w-[130px] sm:text-xs">
									{step.description}
									{"subdescription" in step && step.subdescription ? (
										<>
											<br />
											{step.subdescription}
										</>
									) : null}
								</span>
							</div>
						</div>
					))}
				</div>
				<div className="mt-5 flex flex-col gap-3 text-center text-[11px] text-white/70 leading-relaxed sm:mt-6 sm:text-xs">
					<p>
						Free for {trialDays} days, then {monthlyPrice}/month. Payment will
						be charged to your account at the end of the free trial. Your
						subscription automatically renews unless cancelled at least 24 hours
						before the end of the trial or current period.
					</p>
					<p>{BILLING_SUBSCRIBE_COPY.printedBooksNote}</p>
				</div>
			</div>

			<div className="flex w-full flex-col items-center gap-3">
				{!hasActiveSub ? (
					selected ? (
						<Link
							to={ROUTES.dashboardBillingCheckout}
							search={{ plan: selected, flow: "subscribe" }}
							className={cn(ctaButtonClass, "cursor-pointer")}
						>
							{ctaLabel}
						</Link>
					) : (
						<button
							type="button"
							disabled
							className={cn(ctaButtonClass, "cursor-not-allowed opacity-60")}
						>
							{ctaLabel}
						</button>
					)
				) : (
					<button
						type="button"
						onClick={() => void checkout()}
						disabled={ctaDisabled}
						className={cn(
							ctaButtonClass,
							!ctaDisabled && "cursor-pointer",
							"disabled:cursor-not-allowed disabled:opacity-60",
						)}
					>
						{pending ? (
							<>
								<Loader2 className="size-4 animate-spin" aria-hidden />
								Redirecting…
							</>
						) : (
							ctaLabel
						)}
					</button>
				)}
				{!hasActiveSub && selected === "trial" ? (
					<p className="text-center text-white/70 text-xs">
						No charge today — cancel anytime before day {trialDays}
					</p>
				) : null}
				<Link
					to={ROUTES.terms}
					className="text-white/60 text-xs underline-offset-2 hover:text-white hover:underline"
				>
					Terms of subscription
				</Link>
			</div>
		</div>
	);
}
