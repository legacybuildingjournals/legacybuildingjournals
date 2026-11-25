import { cn } from "@legacy-building/ui/lib/utils";

import {
	RadioGroup,
	RadioGroupItem,
} from "@/components/journal/ui/radio-group";

export type EntryVisibility = "visible" | "hidden";

const OPTIONS: { value: EntryVisibility; title: string; body: string }[] = [
	{
		value: "visible",
		title: "View only",
		body: "Members can view only, but can not make changes, except the author",
	},
	{
		value: "hidden",
		title: "Not viewable",
		body: "Only author can manage and view this type of entry no other member can view it.",
	},
];

/**
 * Figma "Entry Permissions" (shared journals only). The copy is the client's;
 * behaviour: "Not viewable" hides the entry from the other person, who sees
 * only its title with a lock.
 */
export function EntryVisibilityField({
	value,
	onChange,
	idPrefix,
}: {
	value: EntryVisibility;
	onChange: (value: EntryVisibility) => void;
	idPrefix: string;
}) {
	return (
		<fieldset className="flex flex-col gap-3 rounded-2xl border border-border bg-background/70 p-4">
			<legend className="sr-only">Entry Permissions</legend>
			<div>
				<p className="font-semibold text-foreground text-sm">
					Entry Permissions
				</p>
				<p className="text-muted-foreground text-xs">
					Control what other journal member can do with this entry.
				</p>
			</div>
			<RadioGroup
				value={value}
				onValueChange={(next) => onChange(next as EntryVisibility)}
				className="gap-2"
			>
				{OPTIONS.map((option) => {
					const id = `${idPrefix}-visibility-${option.value}`;
					return (
						<label
							key={option.value}
							htmlFor={id}
							className={cn(
								"flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:bg-accent/5",
								value === option.value && "border-primary",
							)}
						>
							<RadioGroupItem id={id} value={option.value} className="mt-0.5" />
							<span className="flex flex-col gap-0.5">
								<span className="font-medium text-foreground text-sm">
									{option.title}
								</span>
								<span className="text-muted-foreground text-xs leading-snug">
									{option.body}
								</span>
							</span>
						</label>
					);
				})}
			</RadioGroup>
		</fieldset>
	);
}
