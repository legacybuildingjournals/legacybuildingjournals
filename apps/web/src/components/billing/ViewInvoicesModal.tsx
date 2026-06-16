import { cn } from "@legacy-building/ui/lib/utils";
import { Download, Loader2, X } from "lucide-react";

import { Dialog, DialogTitle } from "@/components/journal/ui/dialog";
import { DialogContentWithOverlay } from "@/components/journal/ui/dialog-content-with-overlay";

export type BillingInvoice = {
	stripeInvoiceId: string;
	created: number;
	amountDue: number;
	amountPaid: number;
	status: string;
	hostedInvoiceUrl: string | null;
};

function formatDate(seconds: number) {
	return new Date(seconds * 1000).toLocaleDateString(undefined, {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

function formatMoney(amountInCents: number) {
	return `$${(amountInCents / 100).toFixed(2)}`;
}

function formatInvoiceId(invoice: BillingInvoice, sequence: number) {
	const year = new Date(invoice.created * 1000).getFullYear();
	return `Invoice #${year}-${String(sequence).padStart(3, "0")}`;
}

function statusLabel(status: string) {
	if (status === "paid") return "Paid";
	if (status === "open") return "Open";
	if (status === "draft") return "Draft";
	if (status === "void") return "Void";
	if (status === "uncollectible") return "Uncollectible";
	return status.replace(/_/g, " ");
}

const modalIconButtonClass =
	"inline-flex items-center justify-center rounded-lg text-muted-foreground transition-[color,background-color,transform] hover:bg-muted active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40";

type ViewInvoicesModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	invoices: BillingInvoice[];
	loading?: boolean;
};

export function ViewInvoicesModal({
	open,
	onOpenChange,
	invoices,
	loading = false,
}: ViewInvoicesModalProps) {
	const handleDownload = (invoice: BillingInvoice) => {
		if (invoice.hostedInvoiceUrl) {
			window.open(invoice.hostedInvoiceUrl, "_blank", "noopener,noreferrer");
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContentWithOverlay
				showCloseButton={false}
				overlayClassName="bg-foreground/60"
				className="z-[2002] max-h-[min(90vh,720px)] w-[calc(100%-1rem)] max-w-[720px] gap-0 overflow-hidden rounded-2xl border border-border bg-popover p-0 text-popover-foreground shadow-xl sm:w-[calc(100%-2rem)] sm:max-w-[720px]"
			>
				<div className="flex items-center justify-between border-border border-b px-4 py-4 sm:px-6 sm:py-5">
					<DialogTitle className="font-semibold text-foreground text-lg sm:text-xl">
						View Invoices
					</DialogTitle>
					<button
						type="button"
						onClick={() => onOpenChange(false)}
						className={cn(modalIconButtonClass, "size-9")}
						aria-label="Close"
					>
						<X className="size-5" aria-hidden />
					</button>
				</div>

				<div className="overflow-y-auto px-4 py-4 sm:px-6">
					{loading ? (
						<div className="flex min-h-[200px] items-center justify-center">
							<Loader2
								className="size-6 animate-spin text-primary"
								aria-hidden
							/>
						</div>
					) : invoices.length === 0 ? (
						<p className="py-10 text-center text-muted-foreground text-sm">
							No invoices yet. Invoices appear here after your first charge.
						</p>
					) : (
						<>
							<ul className="flex flex-col gap-3 sm:hidden">
								{invoices.map((invoice, index) => {
									const amount =
										invoice.status === "paid"
											? invoice.amountPaid
											: invoice.amountDue;
									const sequence = invoices.length - index;
									return (
										<li
											key={invoice.stripeInvoiceId}
											className="rounded-xl border border-border bg-muted/30 p-4"
										>
											<div className="mb-3 flex items-start justify-between gap-3">
												<div className="min-w-0">
													<p className="font-medium text-foreground text-sm">
														{formatInvoiceId(invoice, sequence)}
													</p>
													<p className="text-muted-foreground text-xs">
														{formatDate(invoice.created)}
													</p>
												</div>
												<span
													className={cn(
														"inline-flex shrink-0 rounded-full px-2.5 py-0.5 font-medium text-xs capitalize",
														invoice.status === "paid"
															? "bg-primary/10 text-primary"
															: "bg-muted text-muted-foreground",
													)}
												>
													{statusLabel(invoice.status)}
												</span>
											</div>
											<div className="flex items-center justify-between gap-3">
												<span className="font-semibold text-foreground text-sm">
													{formatMoney(amount)}
												</span>
												<button
													type="button"
													onClick={() => handleDownload(invoice)}
													disabled={!invoice.hostedInvoiceUrl}
													className={cn(
														modalIconButtonClass,
														"size-9 border border-border bg-card",
													)}
													aria-label={`Download ${formatInvoiceId(invoice, sequence)}`}
												>
													<Download className="size-4" aria-hidden />
												</button>
											</div>
										</li>
									);
								})}
							</ul>
							<div className="hidden overflow-x-auto sm:block">
								<table className="w-full min-w-[560px] border-collapse text-left">
									<thead>
										<tr className="border-border border-b">
											<th className="pb-3 font-semibold text-foreground text-sm">
												Invoice ID
											</th>
											<th className="pb-3 font-semibold text-foreground text-sm">
												Amount
											</th>
											<th className="pb-3 font-semibold text-foreground text-sm">
												Date Paid
											</th>
											<th className="pb-3 font-semibold text-foreground text-sm">
												Status
											</th>
											<th className="pb-3 text-right font-semibold text-foreground text-sm">
												<span className="sr-only">Download</span>
											</th>
										</tr>
									</thead>
									<tbody>
										{invoices.map((invoice, index) => {
											const amount =
												invoice.status === "paid"
													? invoice.amountPaid
													: invoice.amountDue;
											const sequence = invoices.length - index;
											return (
												<tr
													key={invoice.stripeInvoiceId}
													className="border-border border-b last:border-b-0"
												>
													<td className="py-4 font-medium text-foreground text-sm">
														{formatInvoiceId(invoice, sequence)}
													</td>
													<td className="py-4 text-foreground text-sm">
														{formatMoney(amount)}
													</td>
													<td className="py-4 text-foreground text-sm">
														{formatDate(invoice.created)}
													</td>
													<td className="py-4">
														<span
															className={cn(
																"inline-flex rounded-full px-2.5 py-0.5 font-medium text-xs capitalize",
																invoice.status === "paid"
																	? "bg-primary/10 text-primary"
																	: "bg-muted text-muted-foreground",
															)}
														>
															{statusLabel(invoice.status)}
														</span>
													</td>
													<td className="py-4 text-right">
														<button
															type="button"
															onClick={() => handleDownload(invoice)}
															disabled={!invoice.hostedInvoiceUrl}
															className={cn(modalIconButtonClass, "size-8")}
															aria-label={`Download ${formatInvoiceId(invoice, sequence)}`}
														>
															<Download className="size-4" aria-hidden />
														</button>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</>
					)}
				</div>
			</DialogContentWithOverlay>
		</Dialog>
	);
}
