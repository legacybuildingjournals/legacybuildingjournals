import { brand } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/journal/ui/button";
import { Calendar } from "@/components/journal/ui/calendar";
import { CalendarFooter } from "@/components/journal/ui/calendar-footer";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/journal/ui/popover";
import { formatDate } from "@/lib/journal/formatDate";

type DateFieldProps = {
	value: Date | undefined;
	onChange: (date: Date | undefined) => void;
	invalid?: boolean;
	className?: string;
	popoverClassName?: string;
};

function toDisplayDate(date: Date): string {
	return formatDate(date.getTime());
}

export function DateField({
	value,
	onChange,
	invalid,
	className,
	popoverClassName,
}: DateFieldProps) {
	const [open, setOpen] = useState(false);

	const display = value !== undefined ? toDisplayDate(value) : "";
	const emptyLabel = "Select date";

	const handleSelect = (date: Date | undefined) => {
		onChange(date);
		if (date !== undefined) {
			setOpen(false);
		}
	};

	return (
		<Popover open={open} onOpenChange={setOpen} modal>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					aria-expanded={open}
					aria-haspopup="dialog"
					className={cn(
						"h-11 max-h-11 w-full min-w-0 justify-start rounded-[12px] border bg-white px-3 text-left font-normal text-sm shadow-none hover:bg-white focus-visible:ring-0",
						!display && "text-[#8a8a8a]",
						display && "text-[#1a1a1a]",
						className,
					)}
					style={{
						borderColor: invalid ? brand.destructive : brand.border,
					}}
				>
					<span className="min-w-0 flex-1 truncate">
						{display || emptyLabel}
					</span>
					<CalendarIcon className="size-4 shrink-0 opacity-0" aria-hidden />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				side="bottom"
				sideOffset={4}
				collisionPadding={12}
				className={cn(
					"z-[2100] w-auto min-w-0 max-w-[calc(100vw-2rem)] overflow-hidden border border-[#e6e6e6] bg-white p-0 text-[#1a1a1a] shadow-lg ring-0 sm:min-w-[296px] sm:max-w-[320px]",
					popoverClassName,
				)}
				onOpenAutoFocus={(e) => e.preventDefault()}
			>
				<Calendar
					mode="single"
					selected={value}
					onSelect={handleSelect}
					defaultMonth={value ?? new Date()}
					className="w-full min-w-0 sm:min-w-[296px]"
				/>
				<CalendarFooter
					onToday={() => {
						onChange(new Date());
						setOpen(false);
					}}
					onClear={() => onChange(undefined)}
					onClose={() => setOpen(false)}
				/>
			</PopoverContent>
		</Popover>
	);
}
