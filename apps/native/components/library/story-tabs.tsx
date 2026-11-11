import { Pressable, Text, View } from "react-native";

import { LIBRARY_TABS, type LibraryTab } from "@/lib/journal/story-types";

type StoryTabsProps = {
	value: LibraryTab;
	onChange: (next: LibraryTab) => void;
};

export function StoryTabs({ value, onChange }: StoryTabsProps) {
	return (
		<View className="w-full flex-row gap-2">
			{LIBRARY_TABS.map((tab) => {
				const selected = tab.id === value;
				return (
					<Pressable
						key={tab.id}
						onPress={() => onChange(tab.id)}
						accessibilityRole="button"
						accessibilityState={{ selected }}
						accessibilityLabel={tab.label}
						className={`flex-1 items-center justify-center rounded-2xl px-2 py-3 active:opacity-85 ${
							selected ? "bg-primary" : "bg-primary/40"
						}`}
					>
						<Text
							className="font-semibold text-primary-foreground text-sm"
							numberOfLines={1}
						>
							{tab.label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}
