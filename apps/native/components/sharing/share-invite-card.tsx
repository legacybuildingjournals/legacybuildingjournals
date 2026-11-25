import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native/hooks";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

function Row({
	icon,
	label,
	value,
}: {
	icon: ReactNode;
	label: string;
	value: string;
}) {
	return (
		<View className="flex-row items-center gap-3 border-border border-b py-3">
			<View className="size-9 items-center justify-center rounded-full bg-accent/10">
				{icon}
			</View>
			<View className="flex-1">
				<Text className="text-muted-foreground text-xs">{label}</Text>
				<Text
					className="font-medium text-base text-foreground"
					numberOfLines={1}
				>
					{value}
				</Text>
			</View>
		</View>
	);
}

/**
 * Figma "Share Journal Invite" body: You're Invited, invited-by / journal
 * rows and what a shared journal lets you do. Used by the popup and the
 * `/share/<token>` screen.
 */
export function ShareInviteCard({
	authorName,
	journalTitle,
}: {
	authorName: string;
	journalTitle: string;
}) {
	const accent = useThemeColor("accent");
	return (
		<View className="gap-4">
			<View className="items-center gap-2 rounded-2xl bg-accent/10 px-5 py-6">
				<Ionicons name="people" size={32} color={accent} />
				<Text className="font-semibold text-3xl text-primary italic">
					You're Invited
				</Text>
			</View>
			<View className="rounded-2xl border border-border px-3">
				<Row
					icon={<Ionicons name="person-outline" size={16} color={accent} />}
					label="Invited by"
					value={authorName}
				/>
				<Row
					icon={<Ionicons name="book-outline" size={16} color={accent} />}
					label="Journal"
					value={journalTitle}
				/>
				<View className="gap-2 py-3">
					<Text className="font-medium text-foreground text-sm">
						In a shared journal, you can
					</Text>
					{[
						["create-outline", "Add your own journal entries"],
						["reader-outline", "View all shared entries"],
						["people-outline", "Contribute together to build memories"],
					].map(([icon, label]) => (
						<View key={label} className="flex-row items-center gap-2">
							<Ionicons
								name={icon as keyof typeof Ionicons.glyphMap}
								size={16}
								color={accent}
							/>
							<Text className="text-foreground text-sm">{label}</Text>
						</View>
					))}
				</View>
			</View>
		</View>
	);
}
