import { useAuth, useUser } from "@clerk/react";
import { api } from "@legacy-building/backend/convex/_generated/api";
import {
	isRecipient,
	journalTypeForRecipient,
	type Recipient,
} from "@legacy-building/backend/convex/onboarding/questions";
import { useCurrentUser } from "@legacy-building/ui/hooks/use-current-user";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";

import Loader from "@/components/loader";
import { WelcomePage } from "@/features/welcome/WelcomePage";
import { WelcomeOnboarding } from "@/features/welcome/welcome-onboarding";
import {
	messageFromUnknownError,
	toastMutationError,
} from "@/lib/journal/toast";
import {
	clearOnboardingToken,
	readOnboardingToken,
} from "@/lib/onboarding/pending-token";
import { ROUTES } from "@/lib/routes";

export const Route = createFileRoute("/welcome")({
	component: WelcomeRoute,
});

function WelcomeRoute() {
	const { isLoaded, isSignedIn } = useAuth();
	const { user: clerkUser } = useUser();
	const { convexUser, isLoading } = useCurrentUser();
	const navigate = useNavigate();
	const { isAuthenticated } = useConvexAuth();
	const completeWelcome = useMutation(api.user.mutations.completeWelcome);
	const claimOnboarding = useMutation(api.onboarding.mutations.claimOnboarding);
	const existingResponse = useQuery(
		api.onboarding.queries.myResponse,
		isAuthenticated ? {} : "skip",
	);
	const [submitting, setSubmitting] = useState(false);
	const [showQuestions, setShowQuestions] = useState(false);
	const claimed = useRef(false);

	// Links answers from the external form. The token wins when present — the
	// person may have signed up with a different address than they typed into
	// the form — and the email is the fallback. A miss is normal: it just means
	// they answer the questions here instead.
	useEffect(() => {
		if (!isAuthenticated || claimed.current) return;
		claimed.current = true;
		void claimOnboarding({ token: readOnboardingToken() ?? undefined })
			.then((result) => {
				if (result.status === "claimed") clearOnboardingToken();
			})
			.catch(() => {
				// Never block onboarding on a stale or mistyped token.
			});
	}, [isAuthenticated, claimOnboarding]);

	if (!isLoaded || isLoading) {
		return <Loader />;
	}

	if (!isSignedIn) {
		return <Navigate to={ROUTES.login} replace />;
	}

	if (convexUser?.welcomeCompletedAt) {
		return <Navigate to={ROUTES.dashboardDesk} replace />;
	}

	const userName =
		convexUser?.name?.trim() ||
		clerkUser?.fullName?.trim() ||
		clerkUser?.firstName?.trim() ||
		convexUser?.email?.split("@")[0] ||
		"there";

	/**
	 * Marks welcome done and opens the library on the shelf matching who they
	 * said the journal is for — My Story for "myself", Their Story otherwise.
	 */
	const finishWelcome = async (recipient?: Recipient) => {
		setSubmitting(true);
		try {
			await completeWelcome({});
			void navigate({
				to: ROUTES.dashboardLibrary,
				replace: true,
				state: {
					skeleton: true,
					...(recipient
						? { storyTab: journalTypeForRecipient(recipient) }
						: {}),
				},
			});
		} catch (err) {
			toastMutationError(
				err,
				messageFromUnknownError(err, "Could not continue. Please try again."),
			);
		} finally {
			setSubmitting(false);
		}
	};

	/** Skip the questions for anyone who already answered them externally. */
	const handleHomepage = () => {
		if (existingResponse) {
			// Their recipient came from the external form, so honour it here too.
			void finishWelcome(
				isRecipient(existingResponse.recipient)
					? existingResponse.recipient
					: undefined,
			);
			return;
		}
		setShowQuestions(true);
	};

	if (showQuestions) {
		return (
			<WelcomeOnboarding
				onFinish={(recipient) => void finishWelcome(recipient)}
				finishing={submitting}
			/>
		);
	}

	return (
		<WelcomePage
			userName={userName}
			onHomepage={handleHomepage}
			loading={submitting}
		/>
	);
}
