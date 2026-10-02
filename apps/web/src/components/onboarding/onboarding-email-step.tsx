import { onboardingAssets } from "@legacy-building/assets";
import { EMAIL_COPY } from "@legacy-building/backend/convex/onboarding/copy";
import { cn } from "@legacy-building/ui/lib/utils";
import { ChevronLeft } from "lucide-react";
import { motion } from "motion/react";
import type { BaseSyntheticEvent } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";

import type { OnboardingEmailValues } from "@/lib/onboarding/schemas";

import { HeadingLines } from "./onboarding-card";
import { OnboardingShell, OnboardingTopBar } from "./onboarding-shell";

type OnboardingEmailStepProps = {
	form: UseFormReturn<OnboardingEmailValues>;
	/** The react-hook-form `handleSubmit(...)` result; it calls preventDefault itself. */
	onSubmit: (event?: BaseSyntheticEvent) => Promise<void>;
	onBack: () => void;
};

/** "Where should we send your results?" — the external form's account-free capture step. */
export function OnboardingEmailStep({
	form,
	onSubmit,
	onBack,
}: OnboardingEmailStepProps) {
	const submitting = form.formState.isSubmitting;

	return (
		<OnboardingShell>
			<OnboardingTopBar />
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.22, ease: "easeOut" }}
				className="mx-auto w-full max-w-[1128px] px-4 py-6 sm:px-12"
			>
				<button
					type="button"
					onClick={onBack}
					disabled={submitting}
					className="mt-5 -ml-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 font-onb-cta font-semibold text-[14px] text-onb-ink-strong/80 leading-5 tracking-[-0.35px] transition-colors hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-onb-teal active:scale-[0.98] disabled:opacity-40"
				>
					<ChevronLeft size={16} strokeWidth={2.5} aria-hidden="true" />
					{EMAIL_COPY.back}
				</button>

				<div className="grid items-center gap-8 pt-6 lg:grid-cols-[minmax(0,436px)_minmax(0,1fr)] lg:gap-x-12 lg:pt-10">
					<form onSubmit={onSubmit} className="flex flex-col" noValidate>
						<h1 className="font-extrabold text-[30px] text-onb-ink-strong leading-[36px] tracking-[-0.95px] sm:whitespace-nowrap sm:text-[38px] sm:leading-[44.84px]">
							<HeadingLines text={EMAIL_COPY.heading} />
						</h1>
						<p className="max-w-[420px] pt-4 pb-6 text-[15px] text-onb-subtitle leading-[24.38px]">
							{EMAIL_COPY.subtitle}
						</p>

						<div className="flex flex-col gap-4">
							<Controller
								name="email"
								control={form.control}
								render={({ field, fieldState }) => (
									<div className="flex flex-col gap-1.5">
										<label
											htmlFor={field.name}
											className="font-bold text-[13px] text-onb-ink-strong leading-[19.5px]"
										>
											{EMAIL_COPY.label}
										</label>
										<input
											{...field}
											id={field.name}
											type="email"
											autoComplete="email"
											placeholder={EMAIL_COPY.placeholder}
											aria-invalid={fieldState.invalid}
											className={cn(
												"h-[46px] w-full rounded-[12px] border bg-onb-input-bg px-[19px] text-[14px] text-onb-ink-strong outline-none transition-colors placeholder:text-onb-placeholder",
												"focus-visible:border-onb-teal focus-visible:ring-2 focus-visible:ring-onb-teal/30",
												fieldState.invalid
													? "border-destructive"
													: "border-onb-input-border",
											)}
										/>
										{fieldState.invalid ? (
											<p role="alert" className="text-[12px] text-destructive">
												{fieldState.error?.message}
											</p>
										) : null}
									</div>
								)}
							/>

							<div className="flex items-start gap-[14px] rounded-2xl border border-onb-callout-border bg-onb-callout-bg p-[17px]">
								<span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-onb-callout-icon">
									<img
										src={onboardingAssets.shieldIcon}
										alt=""
										aria-hidden="true"
										className="size-5"
									/>
								</span>
								<div className="flex flex-col">
									<p className="font-bold text-[13px] text-onb-callout-title leading-[21.13px]">
										{EMAIL_COPY.calloutTitle}
									</p>
									<p className="text-[12px] text-onb-callout-body leading-[19.5px]">
										{EMAIL_COPY.calloutBody}
									</p>
								</div>
							</div>

							{form.formState.errors.root ? (
								<p role="alert" className="text-[13px] text-destructive">
									{form.formState.errors.root.message}
								</p>
							) : null}

							<button
								type="submit"
								disabled={submitting}
								className="flex w-full items-center justify-center gap-2 rounded-full bg-onb-teal px-6 py-3.5 font-onb-cta font-semibold text-[14px] text-white leading-5 tracking-[-0.35px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-onb-teal focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
							>
								{submitting ? "Saving..." : EMAIL_COPY.submit}
								{submitting ? null : (
									<img
										src={onboardingAssets.arrowRightIcon}
										alt=""
										aria-hidden="true"
										className="size-4"
									/>
								)}
							</button>
						</div>
					</form>

					<img
						src={onboardingAssets.journalReadyIllustration}
						alt=""
						aria-hidden="true"
						className="mx-auto hidden lg:block lg:w-full lg:max-w-[559px]"
					/>
				</div>
			</motion.div>
		</OnboardingShell>
	);
}
