import { COMPLETION_STATIC } from "@legacy-building/backend/convex/onboarding/results";
import { Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useCSSVariable } from "uniwind";

/** The padlock + one-line reassurance under the call to action. */
export function OnboardingLockNotice({
	message = COMPLETION_STATIC.lockNotice,
}: {
	message?: string;
}) {
	const fill = useCSSVariable("--color-onb-lock-icon");

	return (
		<View className="mt-5 flex-row items-start justify-center gap-2 px-2">
			{/* Path copied from the Figma lock icon export (13x16). */}
			<Svg width={13} height={16} viewBox="0 0 13 16" fill="none">
				<Path
					fillRule="evenodd"
					clipRule="evenodd"
					d="M3.55 7.2V5.6C3.55 3.39234 5.34234 1.6 7.55 1.6C9.75766 1.6 11.55 3.39234 11.55 5.6V7.2C12.4331 7.2 13.15 7.91694 13.15 8.8V12.8C13.15 13.6831 12.4331 14.4 11.55 14.4H3.55C2.66694 14.4 1.95 13.6831 1.95 12.8V8.8C1.95 7.91694 2.66694 7.2 3.55 7.2V7.2M9.95 5.6V7.2H5.15V5.6C5.15 4.2754 6.2254 3.2 7.55 3.2C8.8746 3.2 9.95 4.2754 9.95 5.6V5.6"
					fill={String(fill)}
				/>
			</Svg>
			<Text className="flex-1 text-center font-onb-regular text-[11px] text-onb-lock leading-[13.75px]">
				{message}
			</Text>
		</View>
	);
}
