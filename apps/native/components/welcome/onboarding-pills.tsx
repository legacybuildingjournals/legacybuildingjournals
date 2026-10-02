import { MaterialIcons } from "@expo/vector-icons";
import { COMPLETION_STATIC } from "@legacy-building/backend/convex/onboarding/results";
import { Text, View } from "react-native";
import { useCSSVariable } from "uniwind";

/** Write / Voice / Video — filled Material glyphs in tinted circles, as in the designs. */
export function OnboardingPills({ labels }: { labels: readonly string[] }) {
	const write = useCSSVariable("--color-onb-pill-write-fg");
	const voice = useCSSVariable("--color-onb-pill-voice-fg");
	const video = useCSSVariable("--color-onb-pill-video-fg");

	const pills = [
		{
			label: labels[0] ?? COMPLETION_STATIC.pills[0],
			bg: "bg-onb-pill-write",
			icon: "description" as const,
			color: write,
		},
		{
			label: labels[1] ?? COMPLETION_STATIC.pills[1],
			bg: "bg-onb-pill-voice",
			icon: "mic" as const,
			color: voice,
		},
		{
			label: labels[2] ?? COMPLETION_STATIC.pills[2],
			bg: "bg-onb-pill-video",
			icon: "videocam" as const,
			color: video,
		},
	];

	return (
		<View className="w-full flex-row justify-between px-2">
			{pills.map((pill) => (
				<View key={pill.label} className="flex-1 items-center gap-2">
					<View
						className={`size-14 items-center justify-center rounded-full shadow-sm ${pill.bg}`}
					>
						<MaterialIcons
							name={pill.icon}
							size={24}
							color={String(pill.color)}
						/>
					</View>
					<Text className="font-onb-cta text-[12px] text-onb-pill-label leading-4">
						{pill.label}
					</Text>
				</View>
			))}
		</View>
	);
}
