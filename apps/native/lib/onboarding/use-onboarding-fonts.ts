import {
	Nunito_400Regular,
	Nunito_500Medium,
	Nunito_700Bold,
	Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";
import {
	PlusJakartaSans_600SemiBold,
	PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { useFonts } from "expo-font";

/**
 * Loads the onboarding typefaces. Family names here must match the `--font-onb-*`
 * tokens in `global.css`. Returns false until they are ready, so the screens can
 * hold their first paint rather than flash in the system font.
 */
export function useOnboardingFonts(): boolean {
	const [loaded, error] = useFonts({
		Nunito_400Regular,
		Nunito_500Medium,
		Nunito_700Bold,
		Nunito_800ExtraBold,
		PlusJakartaSans_600SemiBold,
		PlusJakartaSans_700Bold,
	});
	// A failed load shouldn't strand the user on a spinner: fall back to system type.
	return loaded || error != null;
}
