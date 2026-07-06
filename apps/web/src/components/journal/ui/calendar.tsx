"use client";

import { cn } from "@legacy-building/ui/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import * as React from "react";
import {
	type DayButton,
	DayPicker,
	getDefaultClassNames,
	type Locale,
} from "react-day-picker";
import { Button, buttonVariants } from "@/components/journal/ui/button";

function CalendarCaptionLabel({
	calendarMonth,
}: {
	calendarMonth: { date: Date };
}) {
	const month = calendarMonth.date.toLocaleString("en-US", { month: "long" });
	const year = calendarMonth.date.getFullYear();

	return (
		<span className="inline-flex items-baseline gap-1.5">
			<span className="font-semibold text-[#1a1a1a] text-sm">{month}</span>
			<span className="font-normal text-[#b5b5b5] text-sm">{year}</span>
		</span>
	);
}

function Calendar({
	className,
	classNames,
	showOutsideDays = true,
	captionLayout = "label",
	buttonVariant = "ghost",
	locale,
	formatters,
	components,
	...props
}: React.ComponentProps<typeof DayPicker> & {
	buttonVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
	const defaultClassNames = getDefaultClassNames();
	const hasSelection = "selected" in props && props.selected != null;

	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			className={cn(
				"group/calendar w-full min-w-0 bg-white px-4 pt-3 pb-2 [--cell-radius:2px] sm:min-w-[296px]",
				String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
				String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
				className,
			)}
			captionLayout={captionLayout}
			locale={locale}
			formatters={{
				formatMonthDropdown: (date) =>
					date.toLocaleString(locale?.code, { month: "short" }),
				...formatters,
			}}
			classNames={{
				root: cn("w-full", defaultClassNames.root),
				months: cn("relative flex w-full flex-col", defaultClassNames.months),
				month: cn("flex w-full flex-col gap-2", defaultClassNames.month),
				nav: cn(
					"absolute inset-x-0 top-0 flex w-full items-center justify-between",
					defaultClassNames.nav,
				),
				button_previous: cn(
					buttonVariants({ variant: buttonVariant }),
					"size-8 shrink-0 select-none p-0 text-[#1a1a1a] hover:bg-transparent hover:opacity-70 aria-disabled:opacity-40",
					defaultClassNames.button_previous,
				),
				button_next: cn(
					buttonVariants({ variant: buttonVariant }),
					"size-8 shrink-0 select-none p-0 text-[#1a1a1a] hover:bg-transparent hover:opacity-70 aria-disabled:opacity-40",
					defaultClassNames.button_next,
				),
				month_caption: cn(
					"mb-1 flex h-9 w-full items-center justify-center px-10",
					defaultClassNames.month_caption,
				),
				dropdowns: cn(
					"flex h-9 w-full items-center justify-center gap-1.5 font-medium text-sm",
					defaultClassNames.dropdowns,
				),
				dropdown_root: cn(
					"relative rounded-(--cell-radius)",
					defaultClassNames.dropdown_root,
				),
				dropdown: cn(
					"absolute inset-0 bg-popover opacity-0",
					defaultClassNames.dropdown,
				),
				caption_label: cn("select-none", defaultClassNames.caption_label),
				weekdays: cn(
					"grid w-full grid-cols-7 gap-0",
					defaultClassNames.weekdays,
				),
				weekday: cn(
					"flex h-8 w-full min-w-8 select-none items-center justify-center font-medium text-[#9a9a9a] text-xs",
					defaultClassNames.weekday,
				),
				week: cn("grid w-full grid-cols-7 gap-0", defaultClassNames.week),
				week_number_header: cn(
					"w-(--cell-size) select-none",
					defaultClassNames.week_number_header,
				),
				week_number: cn(
					"select-none text-[0.8rem] text-muted-foreground",
					defaultClassNames.week_number,
				),
				day: cn(
					"group/day relative flex h-9 w-full min-w-9 select-none items-center justify-center p-0.5",
					defaultClassNames.day,
				),
				range_start: cn(
					"relative isolate z-0 rounded-l-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-muted",
					defaultClassNames.range_start,
				),
				range_middle: cn("rounded-none", defaultClassNames.range_middle),
				range_end: cn(
					"relative isolate z-0 rounded-r-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-muted",
					defaultClassNames.range_end,
				),
				today: cn("font-medium text-[#1a1a1a]", defaultClassNames.today),
				outside: cn(
					"text-[#d0d0d0] aria-selected:text-[#1a1a1a]",
					defaultClassNames.outside,
				),
				disabled: cn("text-[#d0d0d0] opacity-50", defaultClassNames.disabled),
				hidden: cn("invisible", defaultClassNames.hidden),
				...classNames,
			}}
			components={{
				Root: ({ className, rootRef, ...rootProps }) => {
					return (
						<div
							data-slot="calendar"
							ref={rootRef}
							className={cn(className)}
							{...rootProps}
						/>
					);
				},
				Chevron: ({ className, orientation, ...chevronProps }) => {
					if (orientation === "left") {
						return (
							<ChevronLeftIcon
								className={cn("size-3.5 stroke-[2.5]", className)}
								{...chevronProps}
							/>
						);
					}

					return (
						<ChevronRightIcon
							className={cn("size-3.5 stroke-[2.5]", className)}
							{...chevronProps}
						/>
					);
				},
				MonthCaption: ({ calendarMonth, className, ...captionProps }) => (
					<div
						className={cn(
							"mb-1 flex h-9 w-full items-center justify-center px-10",
							className,
						)}
						{...captionProps}
					>
						<CalendarCaptionLabel calendarMonth={calendarMonth} />
					</div>
				),
				DayButton: ({ ...dayButtonProps }) => (
					<CalendarDayButton
						locale={locale}
						hasSelection={hasSelection}
						{...dayButtonProps}
					/>
				),
				WeekNumber: ({ children, ...weekProps }) => {
					return (
						<td {...weekProps}>
							<div className="flex size-9 items-center justify-center text-center">
								{children}
							</div>
						</td>
					);
				},
				...components,
			}}
			{...props}
		/>
	);
}

function CalendarDayButton({
	className,
	day,
	modifiers,
	locale,
	hasSelection = false,
	children,
	...props
}: React.ComponentProps<typeof DayButton> & {
	locale?: Partial<Locale>;
	hasSelection?: boolean;
}) {
	const defaultClassNames = getDefaultClassNames();
	const isSelected =
		modifiers.selected &&
		!modifiers.range_start &&
		!modifiers.range_end &&
		!modifiers.range_middle;
	// When nothing is selected yet, today gets the filled circle; once the user
	// picks a date, the circle moves to that date and today falls back to teal text.
	const isToday = modifiers.today && !isSelected;
	const todayFilled = isToday && !hasSelection;

	const ref = React.useRef<HTMLButtonElement>(null);
	React.useEffect(() => {
		if (modifiers.focused) ref.current?.focus();
	}, [modifiers.focused]);

	return (
		<Button
			ref={ref}
			variant="ghost"
			size="icon"
			data-day={day.date.toLocaleDateString(locale?.code)}
			data-selected-single={isSelected}
			data-range-start={modifiers.range_start}
			data-range-end={modifiers.range_end}
			data-range-middle={modifiers.range_middle}
			className={cn(
				"relative size-full min-h-8 min-w-8 rounded-[2px] border border-transparent font-normal text-[#1a1a1a] text-sm leading-none hover:bg-[#f3f9fd] hover:text-[#1a1a1a]",
				modifiers.outside && "text-[#d0d0d0] hover:text-[#d0d0d0]",
				isSelected &&
					"rounded-full border-[#008080] bg-[#008080] font-medium text-white hover:bg-[#008080] hover:text-white",
				isToday &&
					!todayFilled &&
					"font-medium text-[#008080] hover:text-[#008080]",
				todayFilled &&
					"rounded-full border-[#008080] bg-[#008080] font-medium text-white hover:bg-[#008080] hover:text-white",
				"group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-2 group-data-[focused=true]/day:ring-[#6eb5e0]/35",
				defaultClassNames.day,
				className,
			)}
			{...props}
		>
			{children}
		</Button>
	);
}

export { Calendar, CalendarDayButton };
