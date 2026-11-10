import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { GiftLegacyCard } from "@/components/gift/GiftLegacyCard";
import { Button } from "@/components/journal/ui/button";
import {
	Dialog,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/journal/ui/dialog";
import { DialogContentWithOverlay } from "@/components/journal/ui/dialog-content-with-overlay";
import { ROUTES } from "@/lib/routes";

type JournalPaywallDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function JournalPaywallDialog({
	open,
	onOpenChange,
}: JournalPaywallDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContentWithOverlay
				showCloseButton
				overlayBlur={false}
				overlayClassName="bg-transparent"
				className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg"
			>
				<DialogHeader className="items-center gap-3 text-center">
					<div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
						<Lock className="size-5 text-primary" aria-hidden />
					</div>
					<DialogTitle className="font-semibold text-foreground text-xl">
						Subscribe to unlock journals
					</DialogTitle>
					<DialogDescription className="text-muted-foreground text-sm leading-relaxed">
						Complete payment to create journals, add entries, and preserve your
						legacy. You can browse the app freely until you&apos;re ready.
					</DialogDescription>
				</DialogHeader>
				<GiftLegacyCard
					className="mt-2"
					onNavigate={() => onOpenChange(false)}
				/>
				<DialogFooter className="mt-2 flex-col gap-2 sm:flex-col">
					<Button
						asChild
						className="h-11 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
					>
						<Link
							to={ROUTES.dashboardBilling}
							onClick={() => onOpenChange(false)}
						>
							View plans
						</Link>
					</Button>
					<Button
						type="button"
						variant="ghost"
						className="h-11 w-full rounded-xl text-muted-foreground"
						onClick={() => onOpenChange(false)}
					>
						Not now
					</Button>
				</DialogFooter>
			</DialogContentWithOverlay>
		</Dialog>
	);
}
