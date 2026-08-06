import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

export type RecordingMedium = "recording" | "video";

type RecordingMediumSelectProps = {
	value: RecordingMedium;
	onChange: (next: RecordingMedium) => void;
	/** Colour of the current medium — border, icon and label all follow it. */
	accent: string;
	disabled?: boolean;
};

const OPTIONS: Array<{
	id: RecordingMedium;
	label: string;
	icon: keyof typeof Ionicons.glyphMap;
}> = [
	{ id: "recording", label: "Voice Recording", icon: "mic" },
	{ id: "video", label: "Video Recording", icon: "videocam" },
];

/**
 * Picks which kind of recording this entry is, once the Recording tab is
 * active. Styled as a field rather than a tab because the two media have very
 * different forms below it — swapping is a deliberate choice, not a toggle.
 */
export function RecordingMediumSelect({
	value,
	onChange,
	accent,
	disabled = false,
}: RecordingMediumSelectProps) {
	const [open, setOpen] = useState(false);
	const selected = OPTIONS.find((option) => option.id === value) ?? OPTIONS[0];

	return (
		<>
			<Pressable
				onPress={() => setOpen(true)}
				disabled={disabled}
				accessibilityRole="button"
				accessibilityLabel={`Recording type: ${selected.label}`}
				accessibilityState={{ expanded: open, disabled }}
				className="w-full flex-row items-center gap-3 rounded-2xl border bg-background px-4 py-4 active:opacity-85 disabled:opacity-50"
				style={{ borderColor: accent }}
			>
				<Ionicons name={selected.icon} size={22} color={accent} />
				<Text
					className="flex-1 font-semibold text-lg"
					style={{ color: accent }}
				>
					{selected.label}
				</Text>
				<Ionicons name="chevron-down" size={20} color={accent} />
			</Pressable>

			<Modal
				visible={open}
				transparent
				animationType="fade"
				onRequestClose={() => setOpen(false)}
			>
				<Pressable
					className="flex-1 justify-center bg-black/40 px-8"
					onPress={() => setOpen(false)}
					accessibilityRole="button"
					accessibilityLabel="Close recording type options"
				>
					<View className="overflow-hidden rounded-2xl bg-background py-1">
						{OPTIONS.map((option) => {
							const active = option.id === value;
							return (
								<Pressable
									key={option.id}
									onPress={() => {
										onChange(option.id);
										setOpen(false);
									}}
									accessibilityRole="menuitem"
									accessibilityState={{ selected: active }}
									accessibilityLabel={option.label}
									className="flex-row items-center gap-3 px-5 py-4 active:bg-secondary/60"
								>
									<Ionicons
										name={option.icon}
										size={22}
										color={active ? accent : undefined}
									/>
									<Text
										className="flex-1 text-foreground text-lg"
										style={active ? { color: accent } : undefined}
									>
										{option.label}
									</Text>
									{active ? (
										<Ionicons name="checkmark" size={20} color={accent} />
									) : null}
								</Pressable>
							);
						})}
					</View>
				</Pressable>
			</Modal>
		</>
	);
}
