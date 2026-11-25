import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@legacy-building/ui/components/dialog";
import { ExternalLink, Infinity as InfinityIcon } from "lucide-react";

import { giftPrimaryButtonClass } from "@/components/gift/GiftPageChrome";

const STORE = {
	app_store: {
		name: "App Store",
		url: "https://apps.apple.com/account/subscriptions",
	},
	play_store: {
		name: "Google Play",
		url: "https://play.google.com/store/account/subscriptions",
	},
} as const;

/**
 * Shown after redeeming lifetime access when the user still has an App Store
 * or Google Play subscription. Apple and Google don't let us cancel it for
 * them, so we explain how to do it themselves (decision 8).
 */
export function StoreSubscriptionSplash({
	store,
	open,
	onClose,
}: {
	store: "app_store" | "play_store" | null;
	open: boolean;
	onClose: () => void;
}) {
	if (!store) return null;
	const target = STORE[store];
	return (
		<Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
			<DialogContent className="max-w-sm rounded-2xl">
				<DialogHeader className="items-center text-center">
					<span className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
						<InfinityIcon className="size-6" aria-hidden />
					</span>
					<DialogTitle>You now have lifetime access</DialogTitle>
					<DialogDescription className="leading-relaxed">
						You still have a subscription through {target.name}, and it will
						keep renewing until you cancel it. We can&apos;t cancel it for you:
						open your {target.name} subscriptions and cancel Legacy Building to
						stop being charged.
					</DialogDescription>
				</DialogHeader>
				<div className="mt-2 flex flex-col gap-2">
					<a
						href={target.url}
						target="_blank"
						rel="noreferrer"
						className={giftPrimaryButtonClass}
					>
						Manage {target.name} subscriptions
						<ExternalLink className="size-4" aria-hidden />
					</a>
					<button
						type="button"
						onClick={onClose}
						className="h-11 rounded-full text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]"
					>
						I&apos;ll do it later
					</button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
