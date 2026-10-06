import { assets, brand, youtube } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";

import { Button } from "@/components/journal/ui/button";
import { InviteCodeField } from "@/features/welcome/InviteCodeField";

/**
 * A plain embed, deliberately. Nothing here reads player state — the continue
 * button is never gated on playback — so the IFrame Player API bought nothing
 * and cost two sequential script downloads (iframe_api, then www-widgetapi.js)
 * before the video could even start loading, which is what made it so slow to
 * appear. A bare iframe is fetched during the initial render instead.
 */
const WELCOME_VIDEO_SRC = `https://www.youtube-nocookie.com/embed/${youtube.welcomeVideoId}?rel=0&playsinline=1&modestbranding=1`;

type WelcomePageProps = {
	userName: string;
	/** Moves past the video — into the questions, or straight out if already answered. */
	onContinue: () => void;
	loading?: boolean;
};

export function WelcomePage({
	userName,
	onContinue,
	loading = false,
}: WelcomePageProps) {
	return (
		<main
			className={cn(
				"relative flex min-h-svh w-full flex-col items-center justify-center",
				"bg-center bg-cover bg-no-repeat px-4 py-10",
			)}
			style={{ backgroundImage: `url("${assets.heroBackground}")` }}
		>
			<div className="flex w-full max-w-[1400px] flex-col items-center justify-center gap-6 sm:gap-10">
				<h1
					className="text-center font-semibold text-[clamp(2rem,5vw,44px)] text-white leading-[1.4]"
					style={{
						fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
					}}
				>
					Welcome {userName}
				</h1>

				<div className="flex w-full flex-col items-center gap-6">
					{/* No padding on a phone: 24px a side cost the video an eighth of
					    its width, and `min-h` is held back to sm because below that
					    it beat `aspect-video` and squared the frame off — a 16:9
					    video then sat in the middle under 134px of black bars. */}
					<div className="w-full max-w-[800px] rounded-[20px] bg-transparent p-0 sm:p-10">
						<div className="relative aspect-video w-full overflow-hidden rounded-[20px] sm:min-h-[300px]">
							{/* Sits behind the iframe so the gap is never bare while
							    YouTube connects; the iframe paints over it. */}
							<div
								className="absolute inset-0 animate-pulse bg-black/20"
								aria-hidden="true"
							/>
							<iframe
								src={WELCOME_VIDEO_SRC}
								title="Legacy Building welcome video"
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
								referrerPolicy="strict-origin-when-cross-origin"
								allowFullScreen
								className="absolute inset-0 size-full border-0"
							/>
						</div>
					</div>

					<InviteCodeField />

					<Button
						type="button"
						onClick={onContinue}
						disabled={loading}
						className="min-h-11 min-w-[200px] rounded-full px-8 font-bold text-sm leading-none shadow-[2px_2px_4px_0px_rgb(170,170,170)] hover:opacity-95 disabled:opacity-70 sm:px-20"
						style={{
							backgroundColor: brand.white,
							color: brand.primary,
						}}
					>
						{loading ? "Loading…" : "Skip the video"}
					</Button>
				</div>
			</div>
		</main>
	);
}
