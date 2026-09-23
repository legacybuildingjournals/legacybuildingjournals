import { useUser } from "@clerk/expo";
import { api } from "@legacy-building/backend/convex/_generated/api";
import {
	type AnswerState,
	applyAnswer,
	EMPTY_ANSWER_STATE,
	isRecipient,
	journalTypeForRecipient,
	questionsFor,
	RECIPIENT_QUESTION,
	type Recipient,
} from "@legacy-building/backend/convex/onboarding/questions";
import { resultFor } from "@legacy-building/backend/convex/onboarding/results";
import { isValidInviteCodeFormat } from "@legacy-building/backend/convex/referrals/codes";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { AuthField } from "@/components/auth/auth-field";
import { AuthPrimaryButton } from "@/components/auth/auth-primary-button";
import { OnboardingBackground } from "@/components/welcome/onboarding-background";
import { OnboardingQuestionStep } from "@/components/welcome/onboarding-question-step";
import { OnboardingResultStep } from "@/components/welcome/onboarding-result-step";
import { WelcomeVideo } from "@/components/welcome/welcome-video";
import { useNativeCurrentUser } from "@/hooks/use-native-current-user";
import { useMutationToast } from "@/lib/mutation-toast";
import {
	clearPendingInviteCode,
	readPendingInviteCode,
} from "@/lib/referrals/pending-invite";

type Step = "username" | "video" | "questions" | "result";

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
	const claimInvite = useMutation(api.referrals.mutations.claimInvite);
	const updateProfile = useMutation(api.user.mutations.updateProfile);
	const completeWelcome = useMutation(api.user.mutations.completeWelcome);
	const claimOnboarding = useMutation(api.onboarding.mutations.claimOnboarding);
	const submitOnboarding = useMutation(api.onboarding.mutations.submitInApp);
	// Non-null when this person already answered the questionnaire through the
	// external form; their answers are linked by email during sign-up.
	const existingResponse = useQuery(
		api.onboarding.queries.myResponse,
		isAuthenticated ? {} : "skip",
	);
	const toast = useMutationToast();

	const [step, setStep] = useState<Step>("username");
	const [answerState, setAnswerState] =
		useState<AnswerState>(EMPTY_ANSWER_STATE);
	const [questionIndex, setQuestionIndex] = useState(0);
	const [username, setUsername] = useState("");
	const [usernameTouched, setUsernameTouched] = useState(false);
	const [videoCompleted, setVideoCompleted] = useState(false);
	const [saving, setSaving] = useState(false);
	// Prefilled when the user arrived through a universal link; otherwise they
	// type the code they saw on the invite page.
	const [inviteCode, setInviteCode] = useState(
		() => readPendingInviteCode() ?? "",
	);
	const [inviteNote, setInviteNote] = useState<string | null>(null);

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

			const code = inviteCode.trim();
			if (code) {
				try {
					const result = await claimInvite({ code, via: "ios" });
					if (result.status === "not_found") {
						setInviteNote("That invite code wasn't found.");
						setSaving(false);
						return;
					}
					if (result.status === "own_code") {
						setInviteNote("You can't use your own invite code.");
						setSaving(false);
						return;
					}
					if (result.status === "claimed") clearPendingInviteCode();
				} catch {
					// An invite is a bonus, never a blocker — carry on regardless.
				}
			}

			try {
				// Links answers from the external form, matched on this account's
				// email. Like the invite claim above, a miss is normal and must
				// never block sign-up — it just means they answer the questions here.
				await claimOnboarding({});
			} catch {
				// Ignored for the same reason.
			}

			setStep("video");
		} catch (err) {
			toast.error(err, "Could not save your username. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	/**
	 * Marks onboarding done and leaves the flow, landing on the library shelf
	 * that matches who they said the journal is for — My Story for "myself",
	 * Their Story for everyone else.
	 */
	const finishWelcome = async (recipient?: Recipient) => {
		setSaving(true);
		try {
			await completeWelcome({});
			if (recipient) {
				router.replace({
					pathname: "/(tabs)/library",
					params: { type: journalTypeForRecipient(recipient) },
				});
				return;
			}
			router.replace("/(tabs)");
		} catch (err) {
			toast.error(err, "Could not continue. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	/** After the video: skip the questions if they already answered externally. */
	const handleVideoContinue = () => {
		if (existingResponse) {
			// Their recipient came from the external form, so honour it here too.
			void finishWelcome(
				isRecipient(existingResponse.recipient)
					? existingResponse.recipient
					: undefined,
			);
			return;
		}
		setStep("questions");
	};

	const questions = answerState.recipient
		? questionsFor(answerState.recipient)
		: [RECIPIENT_QUESTION];
	const currentQuestion = questions[questionIndex] ?? RECIPIENT_QUESTION;

	const handleSelectOption = async (optionId: string) => {
		const next = applyAnswer(answerState, currentQuestion.id, optionId);
		setAnswerState(next);

		// Changing Q1 rebuilds the question set, so re-read it here rather than
		// trusting the list rendered for the previous recipient.
		const nextQuestions = next.recipient
			? questionsFor(next.recipient)
			: [RECIPIENT_QUESTION];

		if (questionIndex < nextQuestions.length - 1) {
			setQuestionIndex(questionIndex + 1);
			return;
		}

		if (!next.recipient) return;
		setSaving(true);
		try {
			await submitOnboarding({
				recipient: next.recipient,
				answers: Object.entries(next.answers).map(([questionId, id]) => ({
					questionId,
					optionId: id,
				})),
				source: "ios",
			});
			setStep("result");
		} catch (err) {
			toast.error(err, "Could not save your answers. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	const handleBack = () => {
		if (questionIndex === 0) {
			setStep("video");
			return;
		}
		setQuestionIndex(questionIndex - 1);
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

					<View className="mt-5">
						<AuthField
							label="Invite code (optional)"
							value={inviteCode}
							onChangeText={(text) => {
								setInviteNote(null);
								setInviteCode(text.toUpperCase());
							}}
							autoCapitalize="characters"
							autoCorrect={false}
							returnKeyType="done"
							placeholder="ABCD1234"
							error={inviteNote ?? undefined}
							helper={
								inviteNote === null &&
								inviteCode.trim() !== "" &&
								!isValidInviteCodeFormat(inviteCode) ? (
									<Text className="text-primary-foreground/70 text-sm">
										Invite codes are 8 characters.
									</Text>
								) : null
							}
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

	if (step === "questions") {
		return (
			<OnboardingQuestionStep
				question={currentQuestion}
				index={questionIndex + 1}
				selectedOptionId={answerState.answers[currentQuestion.id]}
				busy={saving}
				onSelect={(optionId) => void handleSelectOption(optionId)}
				onBack={handleBack}
			/>
		);
	}

	if (step === "result" && answerState.recipient) {
		return (
			<OnboardingResultStep
				result={resultFor(answerState.recipient, answerState.answers)}
				saving={saving}
				onContinue={() => void finishWelcome(answerState.recipient)}
			/>
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
					onPress={handleVideoContinue}
					disabled={!videoCompleted}
					loading={saving}
				/>
			</View>
		</OnboardingBackground>
	);
}
