import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useThemeColor } from "heroui-native/hooks";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
	Alert,
	Image,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";

import {
	BACK_COVER_IMAGE_TYPES,
	BACK_COVER_MESSAGE_MAX,
	BACK_COVER_TITLE_MAX,
	type BackCoverDesign,
	type BackCoverPhoto,
	type BackCoverTextValues,
	backCoverSchema,
} from "@/lib/journal/back-cover";
import { pickEntryImageFromLibrary } from "@/lib/journal/pick-entry-image";

const inputClass =
	"rounded-xl border border-border bg-muted/40 px-3 text-base text-foreground";

/**
 * Figma "Edit Back Cover" popup: photo, title and message for the back of the
 * exported book. Nothing is uploaded here — the photo stays on the device
 * until the user taps "Export Book".
 */
export function BackCoverEditorModal({
	visible,
	design,
	onClose,
	onSave,
}: {
	visible: boolean;
	design: BackCoverDesign;
	onClose: () => void;
	onSave: (design: BackCoverDesign) => void;
}) {
	const [foreground, placeholderColor] = useThemeColor([
		"foreground",
		"field-placeholder",
	]);
	const [photo, setPhoto] = useState<BackCoverPhoto | null>(design.photo);
	const [picking, setPicking] = useState(false);

	const form = useForm<BackCoverTextValues>({
		resolver: zodResolver(backCoverSchema),
		defaultValues: { title: design.title, message: design.message },
	});
	const { errors } = form.formState;
	const messageLength = form.watch("message")?.length ?? 0;

	// Reopening starts from what was last saved, not from abandoned edits.
	useEffect(() => {
		if (!visible) return;
		setPhoto(design.photo);
		form.reset({ title: design.title, message: design.message });
	}, [visible, design, form]);

	const choosePhoto = async () => {
		if (picking) return;
		setPicking(true);
		try {
			const result = await pickEntryImageFromLibrary();
			if (result.kind === "picked") {
				const type = result.image.mimeType.toLowerCase();
				if (
					!BACK_COVER_IMAGE_TYPES.includes(
						type as (typeof BACK_COVER_IMAGE_TYPES)[number],
					)
				) {
					Alert.alert(
						"Choose a different photo",
						"The back cover needs a JPG or PNG photo.",
					);
					return;
				}
				setPhoto({ uri: result.image.uri, mimeType: type });
			} else if (result.kind === "permission-denied") {
				Alert.alert(
					"Photos access needed",
					"Allow access to your photos in Settings to add a back cover photo.",
				);
			} else if (result.kind === "error") {
				Alert.alert("Could not open your photos", result.message);
			}
		} finally {
			setPicking(false);
		}
	};

	const onDone = form.handleSubmit((values) => {
		onSave({ ...values, photo });
		onClose();
	});

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				className="flex-1 justify-center bg-black/50 px-5"
			>
				<Pressable
					onPress={onClose}
					accessibilityRole="button"
					accessibilityLabel="Close"
					hitSlop={8}
					className="mb-3 self-end rounded-full p-1 active:opacity-70"
				>
					<Ionicons name="close" size={28} color="#ffffff" />
				</Pressable>
				<View className="max-h-[85%] rounded-3xl bg-background">
					<ScrollView
						contentContainerClassName="gap-4 p-5"
						keyboardShouldPersistTaps="handled"
					>
						<View className="gap-2">
							<Text className="font-semibold text-foreground text-sm">
								Back Cover Photo
							</Text>
							<View className="rounded-2xl border border-border p-3">
								<Pressable
									onPress={() => void choosePhoto()}
									disabled={picking}
									accessibilityRole="button"
									accessibilityLabel={
										photo ? "Change back cover photo" : "Choose an image"
									}
									className="overflow-hidden rounded-xl bg-muted active:opacity-80"
								>
									{photo ? (
										<View>
											<Image
												source={{ uri: photo.uri }}
												resizeMode="cover"
												className="h-32 w-full"
											/>
											<View className="absolute right-2 bottom-2 rounded-full bg-background px-3 py-1">
												<Text className="font-semibold text-foreground text-xs">
													Change
												</Text>
											</View>
										</View>
									) : (
										<View className="h-20 items-center justify-center gap-1">
											<Ionicons
												name="image-outline"
												size={18}
												color={foreground}
											/>
											<Text className="font-semibold text-foreground text-sm">
												{picking ? "Opening…" : "Choose an Image"}
											</Text>
										</View>
									)}
								</Pressable>
								{photo ? (
									<Pressable
										onPress={() => setPhoto(null)}
										accessibilityRole="button"
										className="mt-2 self-center rounded-full px-3 py-1 active:opacity-70"
									>
										<Text className="text-muted-foreground text-xs">
											Remove photo
										</Text>
									</Pressable>
								) : null}
							</View>
						</View>

						<Controller
							control={form.control}
							name="title"
							render={({ field }) => (
								<View className="gap-2">
									<Text className="font-semibold text-foreground text-sm">
										Back Cover Title
									</Text>
									<TextInput
										value={field.value}
										onChangeText={field.onChange}
										onBlur={field.onBlur}
										placeholder="e.g. A story worth keeping"
										placeholderTextColor={placeholderColor}
										maxLength={BACK_COVER_TITLE_MAX}
										className={`h-12 ${inputClass}`}
										accessibilityLabel="Back cover title"
									/>
									{errors.title?.message ? (
										<Text className="text-danger text-xs">
											{errors.title.message}
										</Text>
									) : null}
								</View>
							)}
						/>

						<Controller
							control={form.control}
							name="message"
							render={({ field }) => (
								<View className="gap-2">
									<Text className="font-semibold text-foreground text-sm">
										Back Cover Message
									</Text>
									<TextInput
										value={field.value}
										onChangeText={field.onChange}
										onBlur={field.onBlur}
										placeholder="Write a short message..."
										placeholderTextColor={placeholderColor}
										multiline
										maxLength={BACK_COVER_MESSAGE_MAX}
										textAlignVertical="top"
										className={`min-h-28 py-2 ${inputClass}`}
										accessibilityLabel="Back cover message"
									/>
									<Text className="self-end text-muted-foreground text-xs">
										{messageLength}/{BACK_COVER_MESSAGE_MAX}
									</Text>
									{errors.message?.message ? (
										<Text className="text-danger text-xs">
											{errors.message.message}
										</Text>
									) : null}
								</View>
							)}
						/>

						<Pressable
							onPress={() => void onDone()}
							accessibilityRole="button"
							accessibilityLabel="Done"
							className="h-12 items-center justify-center rounded-full bg-primary active:scale-[0.98] active:opacity-90"
						>
							<Text className="font-semibold text-base text-primary-foreground">
								Done
							</Text>
						</Pressable>
					</ScrollView>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
}
