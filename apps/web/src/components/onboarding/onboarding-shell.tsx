import { assets, brand } from "@legacy-building/ui/lib/brand-journal";
import type { ReactNode } from "react";

type OnboardingShellProps = {
	children: ReactNode;
};

/**
 * Page frame for the onboarding surfaces.
 *
 * Plain white read as dull and left the content stranded at the top of a
 * desktop viewport, so this puts the questionnaire on the same mint ground the
 * auth screens use, with the brand panel image as faint texture, and centres
 * the column vertically so it fills the height instead of hugging the top.
 */
export function OnboardingShell({ children }: OnboardingShellProps) {
	return (
		<div
			className="relative flex min-h-svh w-full flex-col"
			style={{ backgroundColor: brand.pageBackground }}
		>
			<div
				className="pointer-events-none absolute inset-0 bg-center bg-cover opacity-[0.07]"
				style={{ backgroundImage: `url("${assets.authPanelBackground}")` }}
				aria-hidden
			/>
			{/* Softens the texture towards the bottom so long option lists stay legible. */}
			<div
				className="pointer-events-none absolute inset-0"
				style={{
					background: `linear-gradient(180deg, transparent 0%, ${brand.pageBackground}cc 70%, ${brand.pageBackground} 100%)`,
				}}
				aria-hidden
			/>

			{/* A centred column with a generous max-width, the same shape as
			    `AuthLayout`. Pinning the content to the left edge left the right
			    half of a desktop window dead and read as broken rather than roomy. */}
			<div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:[@media(min-height:900px)]:py-10">
				{children}

				{/* Anchors the bottom of a tall window with the brand line from the
				    designs, so the leftover height reads as deliberate space rather
				    than the content having run out. Height-gated, not width-gated:
				    on a short laptop the six-option questions need every pixel, and
				    pushing an option below the fold is a real bug when tapping one
				    advances the step. */}
				<p
					className="mt-auto hidden pt-10 text-center font-serif text-lg italic lg:[@media(min-height:900px)]:block"
					style={{ color: `${brand.primary}99` }}
				>
					Stories live on.
				</p>
			</div>
		</div>
	);
}
