import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native/hooks";
import { useRef, useState } from "react";
import {
	Modal,
	Pressable,
	Text,
	useWindowDimensions,
	View,
} from "react-native";

type JournalActionsMenuProps = {
	onEditJournal: () => void;
	onBackgroundImage: () => void;
	onBackgroundColor: () => void;
	/** True while an appearance change is saving — the background rows are unavailable. */
	appearanceBusy?: boolean;
	/** Switches the image row's wording between adding and replacing. */
	hasBackgroundImage: boolean;
};

type MenuItem = {
	id: string;
	label: string;
	icon: keyof typeof Ionicons.glyphMap;
	onPress: () => void;
	disabled: boolean;
};

const MENU_WIDTH = 214;
const SCREEN_EDGE_PADDING = 12;
/** Gap between the trigger and the panel it opens. */
const ANCHOR_GAP = 6;

/**
 * The "⋮" overflow menu on the journal header.
 *
 * Editing and the two appearance actions live here rather than as separate
 * icon buttons: they're infrequent and need labels to be distinguishable,
 * where export and delete stay on the header as one-tap actions.
 */
export function JournalActionsMenu({
	onEditJournal,
	onBackgroundImage,
	onBackgroundColor,
	appearanceBusy = false,
	hasBackgroundImage,
}: JournalActionsMenuProps) {
	const triggerRef = useRef<View>(null);
	const { width: windowWidth } = useWindowDimensions();
	const [accent, foreground] = useThemeColor(["accent", "foreground"]);

	const [open, setOpen] = useState(false);
	// Measured from the trigger so the panel hangs off it wherever the header
	// lands — the title above it wraps, so the position isn't fixed.
	const [anchor, setAnchor] = useState({ top: 0, right: SCREEN_EDGE_PADDING });

	const openMenu = () => {
		triggerRef.current?.measureInWindow((x, y, width, height) => {
			setAnchor({
				top: y + height + ANCHOR_GAP,
				// Right-aligned with the trigger, but never off-screen.
				right: Math.max(SCREEN_EDGE_PADDING, windowWidth - (x + width)),
			});
			setOpen(true);
		});
	};

	/** Close first so the sheet/picker each action opens isn't stacked under us. */
	const runAndClose = (action: () => void) => {
		setOpen(false);
		action();
	};

	const items: MenuItem[] = [
		{
			id: "edit",
			label: "Edit Journal",
			icon: "pencil",
			onPress: () => runAndClose(onEditJournal),
			disabled: false,
		},
		{
			id: "background-image",
			label: hasBackgroundImage ? "Change background" : "Background image",
			icon: "image-outline",
			onPress: () => runAndClose(onBackgroundImage),
			disabled: appearanceBusy,
		},
		{
			id: "background-color",
			label: "Background color",
			icon: "color-palette-outline",
			onPress: () => runAndClose(onBackgroundColor),
			disabled: appearanceBusy,
		},
	];

	return (
		<>
			<Pressable
				ref={triggerRef}
				onPress={openMenu}
				accessibilityRole="button"
				accessibilityLabel="Journal options"
				accessibilityState={{ expanded: open }}
				className="size-10 shrink-0 items-center justify-center rounded-full active:opacity-70"
				hitSlop={6}
			>
				<Ionicons name="ellipsis-vertical" size={20} color={foreground} />
			</Pressable>

			<Modal
				visible={open}
				transparent
				animationType="fade"
				onRequestClose={() => setOpen(false)}
			>
				<Pressable
					className="flex-1"
					onPress={() => setOpen(false)}
					accessibilityRole="button"
					accessibilityLabel="Close menu"
				/>

				<View
					className="absolute overflow-hidden rounded-2xl border border-border bg-background py-1"
					style={{
						top: anchor.top,
						right: anchor.right,
						width: MENU_WIDTH,
						// RN has no shadow utility, so elevation/shadow stay inline.
						shadowColor: foreground,
						shadowOpacity: 0.18,
						shadowRadius: 16,
						shadowOffset: { width: 0, height: 6 },
						elevation: 8,
					}}
				>
					{items.map((item) => (
						<Pressable
							key={item.id}
							onPress={item.onPress}
							disabled={item.disabled}
							accessibilityRole="menuitem"
							accessibilityLabel={item.label}
							className="flex-row items-center gap-3 px-4 py-3.5 active:bg-secondary/60 disabled:opacity-40"
						>
							<Ionicons name={item.icon} size={18} color={accent} />
							<Text className="flex-1 text-base text-foreground">
								{item.label}
							</Text>
						</Pressable>
					))}
				</View>
			</Modal>
		</>
	);
}
