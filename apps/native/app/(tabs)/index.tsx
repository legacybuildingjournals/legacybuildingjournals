import { useUser } from "@clerk/expo";
import { api } from "@legacy-building/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { Spinner } from "heroui-native";
import { useCallback, useEffect, useState } from "react";
import {
	Alert,
	ImageBackground,
	Linking,
	ScrollView,
	View,
} from "react-native";
import { DeskProfileAvatar } from "@/components/desk/desk-profile-avatar";
import { DeskRecentJournal } from "@/components/desk/desk-recent-journal";
import { DashboardScreenHeader } from "@/components/navigation/dashboard-screen-header";
import { useNativeCurrentUser } from "@/hooks/use-native-current-user";
import {
	pickProfileImage,
	uploadProfileImage,
} from "@/lib/account/upload-profile-picture";
import { nativeAssets } from "@/lib/assets";

export default function DeskScreen() {
	const { user } = useUser();
	const { convexUser, isLoading } = useNativeCurrentUser();
	const ensureCurrentUser = useMutation(api.user.mutations.ensureCurrentUser);
	const generateUploadUrl = useMutation(
		api.user.mutations.generateProfilePictureUploadUrl,
	);
	const setProfilePicture = useMutation(api.user.mutations.setProfilePicture);

	const [uploadingAvatar, setUploadingAvatar] = useState(false);

	useEffect(() => {
		if (isLoading || convexUser) return;
		void ensureCurrentUser({}).catch(() => {
			// Clerk webhook may still be syncing the Convex user row.
		});
	}, [convexUser, ensureCurrentUser, isLoading]);

	const userName =
		convexUser?.name ??
		user?.fullName ??
		user?.firstName ??
		user?.username ??
		"there";

	const avatarUrl =
		convexUser?.profilePictureUrl ??
		user?.imageUrl ??
		nativeAssets.defaultAvatar;

	const handleAvatarPress = useCallback(async () => {
		if (uploadingAvatar) return;

		const picked = await pickProfileImage();
		if (picked.kind === "canceled") return;
		if (picked.kind === "permission-denied") {
			Alert.alert(
				"Photo access needed",
				"Allow photo access in Settings to change your profile picture.",
				[
					{ text: "Cancel", style: "cancel" },
					{ text: "Open Settings", onPress: () => void Linking.openSettings() },
				],
			);
			return;
		}
		if (picked.kind === "error") {
			Alert.alert("Could not pick photo", picked.message);
			return;
		}

		setUploadingAvatar(true);
		try {
			const storageId = await uploadProfileImage(picked.image, () =>
				generateUploadUrl(),
			);
			await setProfilePicture({ storageId });
		} catch (err) {
			const message =
				err instanceof ConvexError
					? typeof err.data === "object" &&
						err.data !== null &&
						"message" in err.data
						? String((err.data as { message: unknown }).message)
						: "Could not update your profile picture."
					: err instanceof Error
						? err.message
						: "Could not update your profile picture.";
			Alert.alert("Upload failed", message);
		} finally {
			setUploadingAvatar(false);
		}
	}, [generateUploadUrl, setProfilePicture, uploadingAvatar]);

	return (
		<View className="flex-1 bg-background">
			<DashboardScreenHeader title={`${userName}'s Desk`} />

			<ImageBackground
				source={{ uri: nativeAssets.deskHeroBackground }}
				className="flex-1"
				resizeMode="cover"
			>
				{isLoading ? (
					<View className="flex-1 items-center justify-center">
						<Spinner size="lg" />
					</View>
				) : (
					<ScrollView
						className="flex-1"
						contentContainerClassName="grow items-center px-4 py-10"
						showsVerticalScrollIndicator={false}
					>
						<View className="w-full max-w-sm items-center gap-8">
							<DeskProfileAvatar
								src={avatarUrl}
								onPress={() => void handleAvatarPress()}
								busy={uploadingAvatar}
							/>

							<DeskRecentJournal />
						</View>
					</ScrollView>
				)}
			</ImageBackground>
		</View>
	);
}
