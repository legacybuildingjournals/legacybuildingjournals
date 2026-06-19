import { useUser } from "@clerk/expo";
import { api } from "@legacy-building/backend/convex/_generated/api";
import { useConvexAuth, useMutation } from "convex/react";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { AuthField } from "@/components/auth/auth-field";
import { AuthPrimaryButton } from "@/components/auth/auth-primary-button";
import { OnboardingBackground } from "@/components/welcome/onboarding-background";
import { WelcomeVideo } from "@/components/welcome/welcome-video";
import { useNativeCurrentUser } from "@/hooks/use-native-current-user";
import { useMutationToast } from "@/lib/mutation-toast";

type Step = "username" | "video";

/** Prefer the stored Convex name; fall back to the Clerk display name. */
function defaultUsername(
	convexName: string | undefined,
	clerkFullName: string | null | undefined,
): string {
	if (convexName?.trim()) return convexName.trim();
	if (clerkFullName?.trim()) return clerkFullName.trim().replace(/\s+/g, " ");
	return "";
}

/**
 * First-run onboarding shown right after sign-up (email or Google), gated by
 * `users.welcomeCompletedAt` — the same flag the web app uses. Step 1 captures a
 * username; step 2 requires watching the explainer video before continuing.
 */
export default function WelcomeScreen() {
	const { user: clerkUser } = useUser();
	const { convexUser, isLoading } = useNativeCurrentUser();
	// Right after sign-up the Clerk session is active but the Convex auth token
	// can lag a moment. Wait for it before allowing mutations, otherwise
	// `ensureCurrentUser` throws UNAUTHENTICATED ("You must be signed in").
	const { isAuthenticated } = useConvexAuth();
	const ensureCurrentUser = useMutation(api.user.mutations.ensureCurrentUser);
	const updateProfile = useMutation(api.user.mutations.updateProfile);
	const completeWelcome = useMutation(api.user.mutations.completeWelcome);
	const toast = useMutationToast();

	const [step, setStep] = useState<Step>("username");
	const [username, setUsername] = useState("");
	const [usernameTouched, setUsernameTouched] = useState(false);
	const [videoCompleted, setVideoCompleted] = useState(false);
	const [saving, setSaving] = useState(false);

	const suggestedUsername = useMemo(
		() => defaultUsername(convexUser?.name, clerkUser?.fullName),
		[convexUser?.name, clerkUser?.fullName],
	);

	// Seed the field with the suggested username once, without clobbering edits.
	useEffect(() => {
		if (usernameTouched || !suggestedUsername) return;
		setUsername((prev) => (prev === "" ? suggestedUsername : prev));
	}, [suggestedUsername, usernameTouched]);

	// If the user already finished onboarding, never trap them here.
	useEffect(() => {
		if (convexUser?.welcomeCompletedAt) {
			router.replace("/(tabs)");
		}
	}, [convexUser?.welcomeCompletedAt]);

	const handleUsernameContinue = async () => {
		const trimmed = username.trim();
		if (trimmed.length < 2) {
			toast.error(
				new Error("too short"),
				"Username must be at least 2 characters.",
			);
			return;
		}
		if (!isAuthenticated) {
			toast.error(
				new Error("auth not ready"),
				"Still finishing sign-in — please try again in a moment.",
			);
			return;
		}
		setSaving(true);
		try {
			// Create the Convex row if the Clerk webhook hasn't synced yet, then
			// persist the chosen username.
			await ensureCurrentUser({ preferredName: trimmed });
			await updateProfile({ name: trimmed });
			setStep("video");
		} catch (err) {
			toast.error(err, "Could not save your username. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	const handleFinish = async () => {
		setSaving(true);
		try {
			await completeWelcome({});
			router.replace("/(tabs)");
		} catch (err) {
			toast.error(err, "Could not continue. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	// Wait for both the Convex user query and the Convex auth token. Showing the
	// form before auth is ready lets the user tap "Let's Go!" before the token
	// propagates, which fails the mutation with UNAUTHENTICATED.
	if (isLoading || !isAuthenticated) {
		return (
			<OnboardingBackground>
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator color="#ffffff" />
				</View>
			</OnboardingBackground>
		);
	}

	if (step === "username") {
		return (
			<OnboardingBackground>
				<View className="flex-1">
					<Text className="font-bold text-4xl text-primary-foreground leading-tight">
						One more step…
					</Text>

					<View className="mt-10">
						<AuthField
							label="Create a Username"
							value={username}
							onChangeText={(text) => {
								setUsernameTouched(true);
								setUsername(text);
							}}
							autoCapitalize="none"
							autoCorrect={false}
							returnKeyType="done"
							onSubmitEditing={() => void handleUsernameContinue()}
						/>
					</View>

					<View className="flex-1" />

					<AuthPrimaryButton
						label="Let's Go!"
						onPress={() => void handleUsernameContinue()}
						loading={saving}
					/>
				</View>
			</OnboardingBackground>
		);
	}

	return (
		<OnboardingBackground>
			<View className="flex-1 justify-center gap-8">
				<Text className="text-center font-bold text-3xl text-primary-foreground leading-tight">
					Welcome {username.trim()}
				</Text>

				<WelcomeVideo onEnded={() => setVideoCompleted(true)} />

				<AuthPrimaryButton
					label={videoCompleted ? "Let's Go!" : "Watch video to continue"}
					onPress={() => void handleFinish()}
					disabled={!videoCompleted}
					loading={saving}
				/>
			</View>
		</OnboardingBackground>
	);
}
