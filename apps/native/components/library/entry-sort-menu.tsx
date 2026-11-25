import { Ionicons } from "@expo/vector-icons";
import {
	ENTRY_SORT_KEYS,
	ENTRY_SORTS,
	type EntrySortKey,
} from "@legacy-building/backend/convex/journal/sort";
import { useThemeColor } from "heroui-native/hooks";
import { Fragment, useRef, useState } from "react";
import {
	Modal,
	Pressable,
	Text,
	useWindowDimensions,
	View,
} from "react-native";

const MENU_WIDTH = 220;
const SCREEN_EDGE_PADDING = 12;
/** Gap between the trigger and the panel it opens. */
const ANCHOR_GAP = 6;

type EntrySortMenuProps = {
	value: EntrySortKey;
	onChange: (value: EntrySortKey) => void;
	disabled?: boolean;
};

/**
 * Picks the order of the entry list.
 *
 * Only the list: the export and the printed book are always bound oldest
 * journal date first, whatever is selected here.
 *
 * Anchored the same way as `JournalActionsMenu` — measured off the trigger,
 * because the header above it wraps, so the position isn't fixed.
 */
export function EntrySortMenu({
	value,
	onChange,
	disabled = false,
}: EntrySortMenuProps) {
	const triggerRef = useRef<View>(null);
	const { width: windowWidth } = useWindowDimensions();
	const [accent, foreground] = useThemeColor(["accent", "foreground"]);

	const [open, setOpen] = useState(false);
	const [anchor, setAnchor] = useState({ top: 0, right: SCREEN_EDGE_PADDING });

	const openMenu = () => {
		triggerRef.current?.measureInWindow((x, y, width, height) => {
			setAnchor({
				top: y + height + ANCHOR_GAP,
				right: Math.max(SCREEN_EDGE_PADDING, windowWidth - (x + width)),
			});
			setOpen(true);
		});
	};

	const select = (key: EntrySortKey) => {
		setOpen(false);
		onChange(key);
	};

	const current = ENTRY_SORTS[value];

	return (
		<>
			<Pressable
				ref={triggerRef}
				onPress={openMenu}
				disabled={disabled}
				accessibilityRole="button"
				accessibilityLabel={`Sort entries. Currently ${current.group}, ${current.label}`}
				accessibilityState={{ expanded: open, disabled }}
				className="size-9 shrink-0 items-center justify-center rounded-full active:opacity-70 disabled:opacity-40"
				hitSlop={6}
			>
				<Ionicons name="funnel-outline" size={17} color={foreground} />
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
					{ENTRY_SORT_KEYS.map((key, index) => {
						const option = ENTRY_SORTS[key];
						const previous = index > 0 ? ENTRY_SORT_KEYS[index - 1] : undefined;
						const startsGroup =
							previous === undefined ||
							ENTRY_SORTS[previous].group !== option.group;

						return (
							<Fragment key={key}>
								{startsGroup ? (
									<Text
										className={`px-4 pb-1 font-semibold text-muted-foreground text-xs uppercase ${
											index > 0 ? "mt-1 border-border border-t pt-3" : "pt-2"
										}`}
									>
										{option.group}
									</Text>
								) : null}
								<Pressable
									onPress={() => select(key)}
									accessibilityRole="menuitem"
									accessibilityLabel={`${option.group}, ${option.label}`}
									accessibilityState={{ selected: value === key }}
									className="flex-row items-center gap-3 px-4 py-3 active:bg-secondary/60"
								>
									<Text className="flex-1 text-base text-foreground">
										{option.label}
									</Text>
									{value === key ? (
										<Ionicons name="checkmark" size={18} color={accent} />
									) : null}
								</Pressable>
							</Fragment>
						);
					})}
				</View>
			</Modal>
		</>
	);
}
