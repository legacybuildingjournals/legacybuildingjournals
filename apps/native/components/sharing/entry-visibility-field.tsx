import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native/hooks";
import { Pressable, Text, View } from "react-native";

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
 * Figma "Entry Permissions" (shared journals only). "Not viewable" hides the
 * entry from the other person, who sees only its title with a lock.
 */
export function EntryVisibilityField({
	value,
	onChange,
}: {
	value: EntryVisibility;
	onChange: (value: EntryVisibility) => void;
}) {
	const accent = useThemeColor("accent");
	return (
		<View className="gap-3 rounded-2xl border border-border bg-background p-4">
			<View>
				<Text className="font-semibold text-foreground text-sm">
					Entry Permissions
				</Text>
				<Text className="text-muted-foreground text-xs">
					Control what other journal member can do with this entry.
				</Text>
			</View>
			<View accessibilityRole="radiogroup" className="gap-2">
				{OPTIONS.map((option) => {
					const selected = option.value === value;
					return (
						<Pressable
							key={option.value}
							onPress={() => onChange(option.value)}
							accessibilityRole="radio"
							accessibilityState={{ checked: selected }}
							accessibilityLabel={option.title}
							className={`flex-row items-start gap-3 rounded-xl border p-3 active:opacity-80 ${
								selected ? "border-primary" : "border-border"
							}`}
						>
							<Ionicons
								name={selected ? "radio-button-on" : "radio-button-off"}
								size={20}
								color={accent}
							/>
							<View className="flex-1">
								<Text className="font-medium text-foreground text-sm">
									{option.title}
								</Text>
								<Text className="text-muted-foreground text-xs leading-4">
									{option.body}
								</Text>
							</View>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}
