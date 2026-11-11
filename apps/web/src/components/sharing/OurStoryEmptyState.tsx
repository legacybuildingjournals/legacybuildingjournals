import { Users } from "lucide-react";

/** Empty "Our Story" tab: journals only get here by being shared (spec #2). */
export function OurStoryEmptyState({
	onGoToMyStory,
}: {
	onGoToMyStory: () => void;
}) {
	return (
		<div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-[20px] bg-background/85 px-6 py-10 text-center shadow-sm">
			<span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
				<Users className="size-6" aria-hidden />
			</span>
			<h2 className="font-semibold text-foreground text-xl">
				No shared journals yet
			</h2>
			<p className="max-w-sm text-muted-foreground text-sm leading-relaxed">
				Share one of your journals with a loved one to write it together, or
				accept an invite. Shared journals appear here for both of you.
			</p>
			<button
				type="button"
				onClick={onGoToMyStory}
				className="mt-2 h-11 rounded-full bg-primary px-6 font-semibold text-primary-foreground text-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
			>
				Go to My Story
			</button>
		</div>
	);
}
