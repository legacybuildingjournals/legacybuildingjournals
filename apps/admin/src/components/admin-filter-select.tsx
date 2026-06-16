import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@legacy-building/ui/components/select";
import { cn } from "@legacy-building/ui/lib/utils";

export type AdminFilterSelectItem<T extends string> = {
	label: string;
	value: T;
};

type AdminFilterSelectProps<T extends string> = {
	items: readonly AdminFilterSelectItem<T>[];
	value: T;
	onValueChange: (value: T) => void;
	ariaLabel: string;
	className?: string;
};

export function AdminFilterSelect<T extends string>({
	items,
	value,
	onValueChange,
	ariaLabel,
	className,
}: AdminFilterSelectProps<T>) {
	return (
		<Select items={items} value={value} onValueChange={onValueChange}>
			<SelectTrigger
				aria-label={ariaLabel}
				className={cn(
					"h-11 min-w-[180px] rounded-xl border-border bg-card px-3 text-sm shadow-sm",
					className,
				)}
			>
				<SelectValue />
			</SelectTrigger>
			<SelectContent alignItemWithTrigger={false} className="rounded-xl">
				<SelectGroup>
					{items.map((item) => (
						<SelectItem
							key={item.value}
							value={item.value}
							className="rounded-lg py-2.5 text-sm"
						>
							{item.label}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
