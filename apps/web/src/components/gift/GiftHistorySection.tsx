import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { cn } from "@legacy-building/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import { ChevronDown, Download, Gift, Loader2, Mail } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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
 * screen so it's easy to drop if the client rejects it. The history list is
 * collapsed behind a "View gift history" toggle to keep the Account page tidy.
 */
export function GiftHistorySection() {
	const gifts = useQuery(api.gifts.queries.listMine);
	const resendEmail = useAction(api.gifts.actions.resendPurchaserEmail);
	const [resendingId, setResendingId] = useState<Id<"gifts"> | null>(null);
	const [historyOpen, setHistoryOpen] = useState(false);

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
					<Skeleton className="h-9 w-48" />
				) : gifts.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Gifts you send will appear here.
					</p>
				) : (
					<div className="flex flex-col">
						<button
							type="button"
							onClick={() => setHistoryOpen((open) => !open)}
							aria-expanded={historyOpen}
							aria-controls="gift-history-list"
							className="-mx-2 flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-left font-medium text-primary text-sm transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]"
						>
							<span>
								{historyOpen ? "Hide gift history" : "View gift history"} (
								{gifts.length})
							</span>
							<ChevronDown
								aria-hidden
								className={cn(
									"size-4 transition-transform duration-200",
									historyOpen && "rotate-180",
								)}
							/>
						</button>
						<AnimatePresence initial={false}>
							{historyOpen ? (
								<motion.div
									id="gift-history-list"
									key="gift-history"
									initial={{ height: 0, opacity: 0 }}
									animate={{ height: "auto", opacity: 1 }}
									exit={{ height: 0, opacity: 0 }}
									transition={{ duration: 0.2, ease: "easeOut" }}
									className="overflow-hidden"
								>
									<ul className="mt-1 flex flex-col divide-y divide-border border-border border-t">
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
																<Loader2
																	className="size-4 animate-spin"
																	aria-hidden
																/>
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
								</motion.div>
							) : null}
						</AnimatePresence>
					</div>
				)}
			</div>
		</section>
	);
}
