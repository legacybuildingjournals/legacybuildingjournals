import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { cn } from "@legacy-building/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import { Download, Gift, Loader2, Mail } from "lucide-react";
import { useState } from "react";

import {
	accountCardClass,
	accountPrimaryButtonClass,
	accountSectionSubtitleClass,
	accountSectionTitleClass,
} from "@/components/account/accountFormStyles";
import { Skeleton } from "@/components/journal/ui/skeleton";
import { toastMutationError, toastMutationSuccess } from "@/lib/journal/toast";
import { ROUTES } from "@/lib/routes";

const STATUS_LABEL = {
	pending_payment: "Awaiting payment",
	paid: "Not claimed yet",
	redeemed: "Claimed",
	expired: "Expired",
	refunded: "Refunded",
} as const;

const STATUS_CLASS = {
	pending_payment: "bg-muted text-muted-foreground",
	paid: "bg-primary/10 text-primary",
	redeemed: "bg-green-100 text-green-800",
	expired: "bg-muted text-muted-foreground",
	refunded: "bg-destructive/10 text-destructive",
} as const;

function formatDate(ms: number | null) {
	if (!ms) return null;
	return new Date(ms).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

/**
 * Account → Gift & Invite (decision 14): start a gift and see the redeem
 * history of gifts you've bought. Kept in this section rather than its own
 * screen so it's easy to drop if the client rejects it.
 */
export function GiftHistorySection() {
	const gifts = useQuery(api.gifts.queries.listMine);
	const resendEmail = useAction(api.gifts.actions.resendPurchaserEmail);
	const [resendingId, setResendingId] = useState<Id<"gifts"> | null>(null);

	const handleResend = async (giftId: Id<"gifts">) => {
		setResendingId(giftId);
		try {
			await resendEmail({ giftId });
			toastMutationSuccess("Gift email sent to your inbox.");
		} catch (err) {
			toastMutationError(err, "Could not resend the gift email.");
		} finally {
			setResendingId(null);
		}
	};

	return (
		<section className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<h2 className={accountSectionTitleClass}>Gift &amp; Invite</h2>
				<p className={accountSectionSubtitleClass}>
					Gift lifetime access to a loved one and track your gifts.
				</p>
			</div>

			<div className={cn(accountCardClass, "flex flex-col gap-5")}>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-3">
						<span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
							<Gift className="size-5" aria-hidden />
						</span>
						<p className="text-foreground text-sm">
							Give someone a lifetime of stories.
						</p>
					</div>
					<Link to={ROUTES.dashboardGift} className={accountPrimaryButtonClass}>
						Gift Lifetime Access
					</Link>
				</div>

				{gifts === undefined ? (
					<div className="flex flex-col gap-2">
						<Skeleton className="h-14 w-full" />
						<Skeleton className="h-14 w-full" />
					</div>
				) : gifts.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Gifts you send will appear here.
					</p>
				) : (
					<ul className="flex flex-col divide-y divide-border">
						{gifts.map((gift) => (
							<li
								key={gift._id}
								className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="min-w-0">
									<p className="truncate font-medium text-foreground text-sm">
										{gift.recipientName}{" "}
										<span className="font-normal text-muted-foreground">
											({gift.recipientEmail})
										</span>
									</p>
									<p className="text-muted-foreground text-xs">
										{gift.status === "redeemed"
											? `Claimed ${formatDate(gift.redeemedAt)}`
											: gift.status === "paid" && gift.expiresAt
												? `Sent ${formatDate(gift.paidAt)} · claim by ${formatDate(gift.expiresAt)}`
												: `Sent ${formatDate(gift.paidAt) ?? ""}`}
									</p>
								</div>
								<div className="flex items-center gap-2">
									<span
										className={cn(
											"rounded-full px-2.5 py-1 font-medium text-xs",
											STATUS_CLASS[gift.status],
										)}
									>
										{STATUS_LABEL[gift.status]}
									</span>
									{gift.status === "paid" ? (
										<button
											type="button"
											onClick={() => void handleResend(gift._id)}
											disabled={resendingId !== null}
											aria-label={`Resend gift email for ${gift.recipientName}`}
											title="Resend gift email to me"
											className="flex size-8 items-center justify-center rounded-full text-primary transition-transform hover:scale-110 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 disabled:opacity-50"
										>
											{resendingId === gift._id ? (
												<Loader2 className="size-4 animate-spin" aria-hidden />
											) : (
												<Mail className="size-4" aria-hidden />
											)}
										</button>
									) : null}
									{gift.cardUrl && gift.status === "paid" ? (
										<a
											href={gift.cardUrl}
											download="Gift Card.png"
											target="_blank"
											rel="noreferrer"
											aria-label={`Download gift card for ${gift.recipientName}`}
											className="flex size-8 items-center justify-center rounded-full text-primary transition-transform hover:scale-110 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
										>
											<Download className="size-4" aria-hidden />
										</a>
									) : null}
								</div>
							</li>
						))}
					</ul>
				)}
			</div>
		</section>
	);
}
