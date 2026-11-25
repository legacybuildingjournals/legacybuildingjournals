import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { Link } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import { CheckCircle2, Loader2, Mail, XCircle } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import {
	GiftPageChrome,
	giftCardClass,
	giftPrimaryButtonClass,
} from "@/components/gift/GiftPageChrome";
import { ROUTES } from "@/lib/routes";

/**
 * Return page after Stripe checkout. Asks the server to verify the session
 * (a fallback for a slow or missing webhook), then watches the gift until it
 * is marked paid. The receipt + gift card go to the purchaser's inbox.
 */
export function GiftSuccessPage({
	giftId,
	sessionId,
}: {
	giftId?: string;
	sessionId?: string;
}) {
	const confirmCheckout = useAction(api.gifts.actions.confirmCheckout);
	const draft = useQuery(
		api.gifts.queries.getDraft,
		giftId ? { giftId: giftId as Id<"gifts"> } : "skip",
	);
	const history = useQuery(api.gifts.queries.listMine);
	const [confirmFailed, setConfirmFailed] = useState(false);
	const confirmedRef = useRef(false);

	useEffect(() => {
		if (!sessionId || confirmedRef.current) return;
		confirmedRef.current = true;
		confirmCheckout({ sessionId }).catch(() => setConfirmFailed(true));
	}, [confirmCheckout, sessionId]);

	const status = draft?.status;
	const paid = status !== undefined && status !== "pending_payment";
	const giftRow = history?.find((row) => row._id === giftId);

	return (
		<GiftPageChrome title="Gift Sent" backTo={ROUTES.dashboardDesk}>
			<motion.section
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2, ease: "easeOut" }}
				className={`${giftCardClass} flex flex-col items-center gap-4 text-center`}
			>
				{paid ? (
					<>
						<CheckCircle2 className="size-12 text-primary" aria-hidden />
						<h2 className="font-semibold text-foreground text-xl">
							Your gift is ready to share
						</h2>
						<p className="max-w-sm text-muted-foreground text-sm leading-relaxed">
							We&apos;ve emailed your receipt and the gift card for{" "}
							<span className="font-medium text-foreground">
								{draft?.recipientName}
							</span>{" "}
							to you. Nothing has been sent to them. Forward the email, share
							the card, or print it whenever you choose.
						</p>
						<div className="flex w-full flex-col gap-2 sm:flex-row">
							{giftRow?.cardUrl ? (
								<a
									href={giftRow.cardUrl}
									download="Gift Card.png"
									target="_blank"
									rel="noreferrer"
									className={giftPrimaryButtonClass}
								>
									Download gift card
								</a>
							) : null}
							<Link
								to={ROUTES.dashboardAccount}
								className="flex h-12 w-full items-center justify-center rounded-full border border-border bg-background px-6 font-semibold text-foreground text-sm transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]"
							>
								View my gifts
							</Link>
						</div>
						<p className="inline-flex items-center gap-1.5 text-muted-foreground text-xs">
							<Mail className="size-3.5" aria-hidden />
							Check your inbox (and spam folder) in a minute.
						</p>
					</>
				) : confirmFailed && !sessionId ? (
					<>
						<XCircle className="size-12 text-destructive" aria-hidden />
						<p className="text-foreground text-sm">
							We couldn&apos;t confirm this payment.
						</p>
					</>
				) : (
					<>
						<Loader2
							className="size-10 animate-spin text-primary"
							aria-hidden
						/>
						<h2 className="font-semibold text-foreground text-lg">
							Confirming your payment…
						</h2>
						<p className="max-w-sm text-muted-foreground text-sm">
							This usually takes a few seconds. You can leave this page; your
							gift card will still arrive by email.
						</p>
						{confirmFailed ? (
							<Link
								to={ROUTES.dashboardGiftDetails}
								search={{ giftId }}
								className="text-primary text-sm underline-offset-2 hover:underline"
							>
								Payment didn&apos;t go through? Back to your gift
							</Link>
						) : null}
					</>
				)}
			</motion.section>
		</GiftPageChrome>
	);
}
