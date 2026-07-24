import { assets, brand, youtube } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/journal/ui/button";
import { InviteCodeField } from "@/features/welcome/InviteCodeField";
import { loadYouTubeIframeApi } from "@/features/welcome/loadYouTubeIframeApi";

type WelcomePageProps = {
	userName: string;
	onHomepage: () => void;
	loading?: boolean;
};

export function WelcomePage({
	userName,
	onHomepage,
	loading = false,
}: WelcomePageProps) {
	const videoContainerRef = useRef<HTMLElement>(null);
	const playerRef = useRef<YT.Player | null>(null);
	const [videoCompleted, setVideoCompleted] = useState(false);

	useEffect(() => {
		let cancelled = false;
		const container = videoContainerRef.current;
		if (!container) return;

		void loadYouTubeIframeApi().then((YT) => {
			if (cancelled) return;

			playerRef.current = new YT.Player(container, {
				width: "100%",
				height: "100%",
				videoId: youtube.welcomeVideoId,
				playerVars: {
					rel: 0,
					enablejsapi: 1,
					playsinline: 1,
					modestbranding: 1,
				},
				events: {
					onStateChange: (event) => {
						if (event.data === YT.PlayerState.ENDED) {
							setVideoCompleted(true);
						}
					},
				},
			});
		});

		return () => {
			cancelled = true;
			playerRef.current?.destroy();
			playerRef.current = null;
		};
	}, []);

	return (
		<main
			className={cn(
				"relative flex min-h-svh w-full flex-col items-center justify-center",
				"bg-center bg-cover bg-no-repeat px-4 py-10",
			)}
			style={{ backgroundImage: `url("${assets.heroBackground}")` }}
		>
			<div className="flex w-full max-w-[1400px] flex-col items-center justify-center gap-10">
				<h1
					className="text-center font-semibold text-[clamp(2rem,5vw,44px)] text-white leading-[1.4]"
					style={{
						fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
					}}
				>
					Welcome {userName}
				</h1>

				<div className="flex w-full flex-col items-center gap-6">
					<div className="w-full max-w-[800px] rounded-[20px] bg-transparent p-6 sm:p-10">
						<div className="relative aspect-video min-h-[300px] w-full overflow-hidden rounded-[20px]">
							<section
								ref={videoContainerRef}
								aria-label="Legacy Building welcome video"
								className="absolute inset-0 size-full [&_iframe]:size-full"
							/>
						</div>
					</div>

					<InviteCodeField />

					<Button
						type="button"
						onClick={onHomepage}
						disabled={!videoCompleted || loading}
						className={cn(
							"min-h-11 min-w-[200px] rounded-full px-20 font-bold text-sm leading-none shadow-[2px_2px_4px_0px_rgb(170,170,170)]",
							videoCompleted
								? "fade-in animate-in duration-300 hover:opacity-95 disabled:opacity-70"
								: "cursor-not-allowed bg-[#9ca3af] text-white opacity-100 hover:opacity-100",
						)}
						style={
							videoCompleted
								? {
										backgroundColor: brand.white,
										color: brand.primary,
									}
								: undefined
						}
					>
						{loading
							? "Loading…"
							: videoCompleted
								? "Homepage"
								: "Watch video to continue"}
					</Button>
				</div>
			</div>
		</main>
	);
}
