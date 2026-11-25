import { Button } from "@/components/journal/ui/button";

type JournalExportFooterProps = {
	onExport: () => void;
	onOrderBook?: () => void;
	exporting?: boolean;
	ordering?: boolean;
	disabled?: boolean;
};

export function JournalExportFooter({
	onExport,
	onOrderBook,
	exporting = false,
	ordering = false,
	disabled = false,
}: JournalExportFooterProps) {
	const busy = exporting || ordering;

	return (
		<div className="flex shrink-0 flex-col gap-2.5 border-border border-t bg-muted px-5 py-4">
			<Button
				type="button"
				disabled={disabled || busy}
				onClick={onExport}
				className="min-h-11 w-full rounded-xl px-5 font-medium text-sm leading-[1.4] hover:opacity-95"
			>
				{exporting ? "Exporting…" : "Export selected entries"}
			</Button>
			{onOrderBook ? (
				<Button
					type="button"
					disabled={disabled || busy}
					onClick={onOrderBook}
					className="min-h-11 w-full rounded-xl px-5 font-medium text-sm leading-[1.4] hover:opacity-95"
				>
					{ordering ? "Preparing checkout…" : "Order book"}
				</Button>
			) : null}
		</div>
	);
}
