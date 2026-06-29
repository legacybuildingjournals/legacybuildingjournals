import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { useState } from "react";
import {
	Pressable,
	Text,
	TextInput,
	type TextInputProps,
	View,
} from "react-native";

type AuthFieldProps = TextInputProps & {
	label?: string;
	hideLabel?: boolean;
	error?: string;
	helper?: ReactNode;
};

export function AuthField({
	label,
	hideLabel,
	error,
	helper,
	className,
	value,
	secureTextEntry,
	...inputProps
}: AuthFieldProps) {
	const [visible, setVisible] = useState(false);

	return (
		<View className="gap-2">
			{hideLabel || !label ? null : (
				<Text className="font-medium text-base text-primary-foreground">
					{label}
				</Text>
			)}
			<View className="relative">
				<TextInput
					{...inputProps}
					value={value ?? ""}
					secureTextEntry={secureTextEntry && !visible}
					className={`h-12 rounded-xl bg-background px-4 text-base text-foreground ${secureTextEntry ? "pr-12" : ""} ${className ?? ""}`}
					placeholderTextColor="#9ca3af"
				/>
				{secureTextEntry ? (
					<Pressable
						onPress={() => setVisible((v) => !v)}
						className="absolute top-0 right-0 h-12 w-12 items-center justify-center active:opacity-60"
						accessibilityLabel={visible ? "Hide password" : "Show password"}
						accessibilityRole="button"
					>
						<Ionicons
							name={visible ? "eye-off-outline" : "eye-outline"}
							size={20}
							color="#9ca3af"
						/>
					</Pressable>
				) : null}
			</View>
			{helper}
			{error ? <Text className="text-red-300 text-xs">{error}</Text> : null}
		</View>
	);
}
