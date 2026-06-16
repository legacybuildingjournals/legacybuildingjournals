import { useUser } from "@clerk/react";
import { Loader2 } from "lucide-react";

import { AccountEmailSection } from "@/components/account/account-email-section";
import { AccountPasswordSection } from "@/components/account/account-password-section";
import {
	accountInputClass,
	accountLabelClass,
	accountPersonalInfoCardClass,
	accountPersonalInfoDividerClass,
	accountPrimaryButtonClass,
} from "@/components/account/accountFormStyles";
import { Button } from "@/components/journal/ui/button";
import { Input } from "@/components/journal/ui/input";

type PersonalInfoCardProps = {
	username: string;
	onUsernameChange: (value: string) => void;
	onUsernameUpdate: () => void;
	savingUsername: boolean;
	email: string;
};

export function PersonalInfoCard({
	username,
	onUsernameChange,
	onUsernameUpdate,
	savingUsername,
	email,
}: PersonalInfoCardProps) {
	const { user, isLoaded } = useUser();
	const showPasswordSection = isLoaded && Boolean(user?.passwordEnabled);

	return (
		<div className={accountPersonalInfoCardClass}>
			<div className="flex flex-col gap-1.5">
				<label htmlFor="account-username" className={accountLabelClass}>
					Username
				</label>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
					<Input
						id="account-username"
						value={username}
						onChange={(event) => onUsernameChange(event.target.value)}
						className={accountInputClass}
						autoComplete="username"
					/>
					<Button
						type="button"
						disabled={savingUsername}
						onClick={onUsernameUpdate}
						className={accountPrimaryButtonClass}
					>
						{savingUsername ? (
							<>
								<Loader2 className="size-4 animate-spin" aria-hidden />
								Updating…
							</>
						) : (
							"Update"
						)}
					</Button>
				</div>
			</div>

			<hr className={`${accountPersonalInfoDividerClass} my-5`} />

			<AccountEmailSection currentEmail={email} />

			{showPasswordSection ? (
				<>
					<hr className={`${accountPersonalInfoDividerClass} my-5`} />
					<AccountPasswordSection />
				</>
			) : null}
		</div>
	);
}
