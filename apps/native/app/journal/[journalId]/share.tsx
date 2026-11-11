import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { useAction } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useThemeColor } from "heroui-native/hooks";
import { Controller, useForm } from "react-hook-form";
import {
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { z } from "zod";

import { AccountScreenHeader } from "@/components/account/account-screen-header";
import { GiftPrimaryButton } from "@/components/gift/gift-parts";
import { useMutationToast } from "@/lib/mutation-toast";

const shareSchema = z.object({
	email: z
		.string()
		.trim()
		.min(1, "Enter their email address.")
		.email("Enter a valid email address."),
});
type ShareValues = z.infer<typeof shareSchema>;

/** Figma "Share Journal": invite one loved one to this journal by email. */
export default function ShareJournalScreen() {
	const { journalId } = useLocalSearchParams<{ journalId: string }>();
	const toast = useMutationToast();
	const [accent, placeholder] = useThemeColor(["accent", "field-placeholder"]);
	const sendInvite = useAction(api.sharing.actions.sendInvite);
	const form = useForm<ShareValues>({
		resolver: zodResolver(shareSchema),
		defaultValues: { email: "" },
	});
	const { errors, isSubmitting } = form.formState;

	const onSubmit = form.handleSubmit(async ({ email }) => {
		try {
			const result = await sendInvite({
				journalId: journalId as Id<"journals">,
				email,
			});
			toast.success(
				result.hasAccount
					? "Invite sent. They'll see it next time they open the app."
					: "Invite sent by email.",
			);
			router.back();
		} catch (err) {
			toast.error(err, "Could not send the invite. Please try again.");
		}
	});

	return (
		<View className="flex-1 bg-background">
			<AccountScreenHeader title="Share Journal" />
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				className="flex-1"
			>
				<ScrollView
					className="flex-1"
					contentContainerClassName="gap-4 px-4 pt-4 pb-10"
					keyboardShouldPersistTaps="handled"
				>
					<View className="items-center gap-2 rounded-2xl bg-accent/10 px-5 py-8">
						<Ionicons name="people" size={36} color={accent} />
						<Text className="font-semibold text-3xl text-primary italic">
							Share This Journal
						</Text>
					</View>

					<View className="gap-4 rounded-2xl border border-border p-4">
						<View className="flex-row items-start gap-3">
							<View className="size-9 items-center justify-center rounded-full bg-accent/10">
								<Ionicons name="person-outline" size={16} color={accent} />
							</View>
							<View className="flex-1">
								<Text className="font-semibold text-foreground text-sm">
									Invite a Loved One
								</Text>
								<Text className="text-muted-foreground text-xs">
									Invite someone to contribute to this journal. They'll use
									their own account.
								</Text>
							</View>
						</View>
						<Controller
							control={form.control}
							name="email"
							render={({ field }) => (
								<View className="gap-1.5">
									<Text className="font-medium text-foreground text-sm">
										Email Address
									</Text>
									<TextInput
										value={field.value}
										onChangeText={field.onChange}
										onBlur={field.onBlur}
										placeholder="Enter email address"
										placeholderTextColor={placeholder}
										keyboardType="email-address"
										autoCapitalize="none"
										autoCorrect={false}
										accessibilityLabel="Email address"
										className="h-12 rounded-xl border border-border bg-background px-3 text-base text-foreground"
									/>
									{errors.email?.message ? (
										<Text className="text-danger text-xs">
											{errors.email.message}
										</Text>
									) : null}
								</View>
							)}
						/>
						<View className="flex-row items-start gap-3 rounded-xl bg-accent/10 p-3">
							<Ionicons
								name="information-circle-outline"
								size={18}
								color={accent}
							/>
							<View className="flex-1">
								<Text className="font-semibold text-foreground text-xs">
									What they'll have access to
								</Text>
								<Text className="text-muted-foreground text-xs leading-4">
									The invited member will be able to view and add entries to
									this journal. Your other journals will remain private.
								</Text>
							</View>
						</View>
					</View>

					<GiftPrimaryButton
						label={isSubmitting ? "Sending…" : "Send Share Invite"}
						loading={isSubmitting}
						onPress={() => void onSubmit()}
					/>
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	);
}
