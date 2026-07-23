import { DEFAULT_JOURNAL_BACKGROUND } from "@legacy-building/backend/convex/journal/appearance";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ColorPicker } from "@/components/library/color-picker";

type JournalColorSheetProps = {
	visible: boolean;
	/** Currently saved colour, or null when the journal uses the default. */
	selected: string | null;
	/** Fires on every drag so the screen behind can preview the colour live. */
	onPreview: (color: string | null) => void;
	/** Fires once, when the user keeps the colour. */
	onCommit: (color: string | null) => void;
	onClose: () => void;
};

export function JournalColorSheet({
	visible,
	selected,
	onPreview,
	onCommit,
	onClose,
}: JournalColorSheetProps) {
	const insets = useSafeAreaInsets();
	const [draft, setDraft] = useState(selected ?? DEFAULT_JOURNAL_BACKGROUND);

	// Re-seed each time the sheet opens so it always starts from what's saved.
	useEffect(() => {
		if (visible) setDraft(selected ?? DEFAULT_JOURNAL_BACKGROUND);
	}, [visible, selected]);

	const cancel = () => {
		onPreview(selected);
		onClose();
	};

	const handleChange = (hex: string) => {
		setDraft(hex);
		onPreview(hex);
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={cancel}
		>
			<Pressable
				className="flex-1 bg-black/40"
				onPress={cancel}
				accessibilityRole="button"
				accessibilityLabel="Close colour picker"
			/>
			<View
				className="rounded-t-3xl bg-background px-5 pt-3"
				style={{ paddingBottom: insets.bottom + 20 }}
			>
				<View className="mb-4 h-1.5 w-24 self-center rounded-full bg-muted-foreground/40" />

				<View className="mb-4 flex-row items-center justify-between">
					<Pressable
						onPress={cancel}
						accessibilityRole="button"
						className="active:opacity-70"
						hitSlop={8}
					>
						<Text className="text-base text-muted-foreground">Cancel</Text>
					</Pressable>
					<Text className="font-semibold text-base text-foreground">
						Journal color
					</Text>
					<Pressable
						onPress={() => onCommit(draft)}
						accessibilityRole="button"
						className="active:opacity-70"
						hitSlop={8}
					>
						<Text className="font-semibold text-base text-primary">Done</Text>
					</Pressable>
				</View>

				<ColorPicker value={draft} onChange={handleChange} />

				<Pressable
					onPress={() => onCommit(null)}
					accessibilityRole="button"
					accessibilityLabel="Reset to default background"
					className="mt-4 items-center py-2 active:opacity-70"
					hitSlop={6}
				>
					<Text className="text-muted-foreground text-sm">
						Reset to default
					</Text>
				</Pressable>
			</View>
		</Modal>
	);
}
