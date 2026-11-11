import { Text, View } from "react-native";

type Person = { name: string; initials: string; isYou: boolean };

function PersonChip({
	person,
	roleLabel,
}: {
	person: Person;
	roleLabel: string;
}) {
	return (
		<View className="flex-row items-center gap-2">
			<View className="size-9 items-center justify-center rounded-full bg-accent/15">
				<Text className="font-semibold text-primary text-xs">
					{person.initials}
				</Text>
			</View>
			<View>
				<Text className="font-medium text-foreground text-sm" numberOfLines={1}>
					{person.isYou ? "You" : person.name}
				</Text>
				<Text className="text-muted-foreground text-xs">{roleLabel}</Text>
			</View>
		</View>
	);
}

/**
 * Figma shared-journal header: "Shared Journal" pill, then the author and
 * member with initials avatars (spec #30), plus a pending-invite note for the
 * author and a notice when the author's access has lapsed.
 */
export function JournalPeopleRow({
	author,
	member,
	pendingInviteEmail,
	canAddEntries,
}: {
	author: Person;
	member: Person | null;
	pendingInviteEmail: string | null;
	canAddEntries: boolean;
}) {
	if (!member && !pendingInviteEmail) return null;
	return (
		<View className="gap-2">
			{member ? (
				<>
					<View className="self-start rounded-full bg-green-50 px-2.5 py-0.5">
						<Text className="font-medium text-green-800 text-xs">
							Shared Journal
						</Text>
					</View>
					<View className="flex-row flex-wrap gap-x-6 gap-y-2">
						<PersonChip person={author} roleLabel="Author" />
						<PersonChip person={member} roleLabel="Member" />
					</View>
					{!canAddEntries ? (
						<Text className="rounded-xl bg-amber-50 p-2 text-amber-900 text-xs">
							New entries are paused until the journal's author has an active
							subscription.
						</Text>
					) : null}
				</>
			) : null}
			{pendingInviteEmail ? (
				<Text className="text-muted-foreground text-xs">
					Invite pending for{" "}
					<Text className="font-medium text-foreground">
						{pendingInviteEmail}
					</Text>
				</Text>
			) : null}
		</View>
	);
}
