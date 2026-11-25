import { useAuth } from "@clerk/expo";
import { api } from "@legacy-building/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Spinner } from "heroui-native";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { AccountScreenHeader } from "@/components/account/account-screen-header";
import { GiftPrimaryButton } from "@/components/gift/gift-parts";
import { ShareInviteCard } from "@/components/sharing/share-invite-card";
import { useMutationToast } from "@/lib/mutation-toast";

/**
 * Opened by an invite link (`/share/<token>`) when the app is installed
 * (spec #12). Signed in with the invited email: Accept Invite. Otherwise it
 * explains what to do; new accounts are created on the web claim page.
 */
export default function ShareClaimScreen() {
	const { token } = useLocalSearchParams<{ token: string }>();
	const { isLoaded, isSignedIn } = useAuth();
	const info = useQuery(
		api.sharing.queries.getInviteByToken,
		token ? { token } : "skip",
	);
	const acceptInvite = useMutation(api.sharing.mutations.acceptInvite);
	const toast = useMutationToast();
	const [accepting, setAccepting] = useState(false);

	const handleAccept = async () => {
		if (!token) return;
		setAccepting(true);
		try {
			const { journalId } = await acceptInvite({ token });
			toast.success("You joined the journal.");
			router.replace({
				pathname: "/journal/[journalId]",
				params: { journalId },
			});
		} catch (err) {
			toast.error(err, "Could not accept the invite. Please try again.");
		} finally {
			setAccepting(false);
		}
	};

	let body: React.ReactNode;
	if (!isLoaded || info === undefined) {
		body = (
			<View className="items-center py-12">
				<Spinner size="lg" />
			</View>
		);
	} else if (info === null) {
		body = <Message title="This invite link isn't valid" />;
	} else if (info.status === "accepted") {
		body = info.viewer?.isMember ? (
			<View className="gap-4">
				<Message title="You're already in this journal" />
				<GiftPrimaryButton
					label={`Open ${info.journalTitle}`}
					onPress={() =>
						router.replace({
							pathname: "/journal/[journalId]",
							params: { journalId: info.journalId },
						})
					}
				/>
			</View>
		) : (
			<Message title="This invite has already been accepted" />
		);
	} else if (info.status === "expired") {
		body = (
			<Message
				title="This invite has expired"
				detail={`Ask ${info.authorName} to send a new one.`}
			/>
		);
	} else if (!isSignedIn) {
		body = (
			<View className="gap-4">
				<ShareInviteCard
					authorName={info.authorName}
					journalTitle={info.journalTitle}
				/>
				<Message
					title={`Sign in as ${info.inviteEmail} to accept`}
					detail="Then open this link again, or accept the invite when it appears in the app."
				/>
				<GiftPrimaryButton
					label="Sign in"
					onPress={() => router.replace("/(auth)")}
				/>
			</View>
		);
	} else if (info.viewer && !info.viewer.emailMatches) {
		body = (
			<Message
				title="This invite is for a different account"
				detail={`It was sent to ${info.maskedInviteEmail}. Sign in with that email to accept it.`}
			/>
		);
	} else {
		body = (
			<View className="gap-5">
				<ShareInviteCard
					authorName={info.authorName}
					journalTitle={info.journalTitle}
				/>
				<GiftPrimaryButton
					label={accepting ? "Accepting…" : "Accept Invite"}
					loading={accepting}
					onPress={() => void handleAccept()}
				/>
			</View>
		);
	}

	return (
		<View className="flex-1 bg-background">
			<AccountScreenHeader title="Share Journal Invite" />
			<ScrollView contentContainerClassName="gap-4 px-4 pt-4 pb-10">
				{body}
			</ScrollView>
		</View>
	);
}

function Message({ title, detail }: { title: string; detail?: string }) {
	return (
		<View className="items-center gap-2 rounded-2xl border border-border p-5">
			<Text className="text-center font-semibold text-foreground text-lg">
				{title}
			</Text>
			{detail ? (
				<Text className="text-center text-muted-foreground text-sm">
					{detail}
				</Text>
			) : null}
		</View>
	);
}
