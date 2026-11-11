import { Ionicons } from "@expo/vector-icons";
import { api } from "@legacy-building/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useThemeColor } from "heroui-native/hooks";
import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GiftPrimaryButton } from "@/components/gift/gift-parts";
import { ShareInviteCard } from "@/components/sharing/share-invite-card";
import { useMutationToast } from "@/lib/mutation-toast";

/**
 * "Share Journal Invite" popup for people who already have an account (no
 * email for them, spec #8/#10). Accept only (spec #11); closing it hides it
 * until the app is opened again.
 */
export function ShareInvitePopup() {
	const invites = useQuery(api.sharing.queries.myPendingInvites);
	const acceptInvite = useMutation(api.sharing.mutations.acceptInvite);
	const toast = useMutationToast();
	const insets = useSafeAreaInsets();
	const foreground = useThemeColor("foreground");
	const [dismissed, setDismissed] = useState<Set<string>>(new Set());
	const [accepting, setAccepting] = useState(false);

	const invite = invites?.find((item) => !dismissed.has(item.token));
	if (!invite) return null;

	const close = () => setDismissed((prev) => new Set(prev).add(invite.token));

	const handleAccept = async () => {
		setAccepting(true);
		try {
			const { journalId } = await acceptInvite({ token: invite.token });
			toast.success(`You joined "${invite.journalTitle}".`);
			router.push({ pathname: "/journal/[journalId]", params: { journalId } });
		} catch (err) {
			toast.error(err, "Could not accept the invite. Please try again.");
		} finally {
			setAccepting(false);
		}
	};

	return (
		<Modal visible animationType="slide" onRequestClose={close}>
			<View
				className="flex-1 bg-background"
				style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
			>
				<View className="flex-row justify-end px-3 py-2">
					<Pressable
						onPress={close}
						accessibilityRole="button"
						accessibilityLabel="Close invite"
						hitSlop={8}
						className="size-10 items-center justify-center rounded-full active:opacity-70"
					>
						<Ionicons name="close" size={24} color={foreground} />
					</Pressable>
				</View>
				<ScrollView contentContainerClassName="gap-5 px-4 pb-6">
					<ShareInviteCard
						authorName={invite.authorName}
						journalTitle={invite.journalTitle}
					/>
					<GiftPrimaryButton
						label={accepting ? "Accepting…" : "Accept Invite"}
						loading={accepting}
						onPress={() => void handleAccept()}
					/>
				</ScrollView>
			</View>
		</Modal>
	);
}
