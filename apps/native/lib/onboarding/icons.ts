import type { Ionicons } from "@expo/vector-icons";
import type { OptionIcon } from "@legacy-building/backend/convex/onboarding/questions";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

/**
 * Shared icon keys mapped to Ionicons glyphs. Typed as a full Record, so adding
 * a key to `OPTION_ICONS` fails the build here until it has a glyph.
 */
export const ONBOARDING_ICONS: Record<OptionIcon, IoniconName> = {
	album: "albums-outline",
	book: "book-outline",
	camera: "camera-outline",
	chat: "chatbubble-ellipses-outline",
	chats: "chatbubbles-outline",
	clock: "time-outline",
	compass: "compass-outline",
	everything: "infinite-outline",
	eye: "eye-outline",
	family: "people-circle-outline",
	footsteps: "footsteps-outline",
	gift: "gift-outline",
	globe: "earth-outline",
	growth: "trending-up-outline",
	heart: "heart-outline",
	heartCircle: "heart-circle-outline",
	home: "home-outline",
	hourglass: "hourglass-outline",
	idea: "bulb-outline",
	leaf: "leaf-outline",
	lineage: "git-branch-outline",
	mic: "mic-outline",
	mix: "layers-outline",
	people: "people-outline",
	person: "person-outline",
	personAdd: "person-add-outline",
	question: "help-circle-outline",
	ribbon: "ribbon-outline",
	school: "school-outline",
	smile: "happy-outline",
	sparkle: "sparkles-outline",
	trophy: "trophy-outline",
	video: "videocam-outline",
	write: "create-outline",
};
