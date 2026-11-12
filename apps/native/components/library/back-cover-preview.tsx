import { Ionicons } from "@expo/vector-icons";
import { imageAssets } from "@legacy-building/assets";
import { useThemeColor } from "heroui-native/hooks";
import {
	Image,
	type ImageSourcePropType,
	Pressable,
	Text,
	View,
} from "react-native";
import { useCSSVariable } from "uniwind";

import {
	type BackCoverDesign,
	isBackCoverEmpty,
} from "@/lib/journal/back-cover";

/** Metro resolves the shared images to asset modules (see gift-parts.tsx). */
const TEMPLATE =
	imageAssets.backCoverTemplate as unknown as ImageSourcePropType;
const BLANK = imageAssets.backCoverBlank as unknown as ImageSourcePropType;

/**
 * On-screen version of the PDF's back cover page: the empty template until
 * something is filled in, then the blank leather with the photo, title and
 * message laid over it in the same arrangement as the exported page.
 */
export function BackCoverPreview({
	design,
	onEdit,
}: {
	design: BackCoverDesign;
	onEdit: () => void;
}) {
	const foreground = useThemeColor("foreground");
	const gold = useCSSVariable("--color-cover-gold");
	const empty = isBackCoverEmpty(design);
	const title = design.title.trim();
	const message = design.message.trim();

	return (
		<View className="w-full max-w-[300px] self-center">
			<View
				className="w-full overflow-hidden rounded-lg"
				style={{ aspectRatio: 800 / 1000 }}
			>
				<Image
					source={empty ? TEMPLATE : BLANK}
					resizeMode="cover"
					className="absolute inset-0 size-full"
					accessibilityLabel="Back cover preview"
				/>
				{empty ? null : (
					<View
						className={`absolute inset-x-0 items-center px-8 ${
							design.photo ? "top-[16%]" : "top-[34%]"
						}`}
					>
						{design.photo ? (
							<View
								className="w-[60%] bg-cover-cream p-1"
								style={{
									aspectRatio: 3 / 2,
									transform: [{ rotate: "-1.2deg" }],
								}}
							>
								<Image
									source={{ uri: design.photo.uri }}
									resizeMode="cover"
									className="size-full"
									accessibilityLabel="Back cover photo"
								/>
							</View>
						) : null}
						{title ? (
							<Text
								className="mt-4 text-center text-cover-gold text-sm uppercase tracking-[2px]"
								numberOfLines={2}
							>
								{title}
							</Text>
						) : null}
						<View className="mt-2 w-[70%] flex-row items-center gap-1.5">
							<View className="h-px flex-1 bg-cover-gold" />
							<Ionicons
								name="heart-outline"
								size={9}
								color={typeof gold === "string" ? gold : foreground}
							/>
							<View className="h-px flex-1 bg-cover-gold" />
						</View>
						{message ? (
							<Text
								className="mt-2 text-center text-[8px] text-cover-cream leading-[12px]"
								numberOfLines={7}
							>
								{message}
							</Text>
						) : null}
					</View>
				)}
				<Pressable
					onPress={onEdit}
					accessibilityRole="button"
					accessibilityLabel="Edit back cover design"
					className="absolute right-3 bottom-4 flex-row items-center gap-1.5 rounded-full bg-background px-3 py-1.5 active:scale-95 active:opacity-80"
				>
					<Ionicons name="pencil-outline" size={13} color={foreground} />
					<Text className="font-semibold text-foreground text-xs">
						Edit Design
					</Text>
				</Pressable>
			</View>
		</View>
	);
}
