import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { useClerk } from "@clerk/react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@legacy-building/ui/components/dropdown-menu";
import { dashboardLayout } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { CreditCard, LogOut } from "lucide-react";

import { ROUTES } from "@/lib/routes";

type DashboardHeaderProfileMenuProps = {
	avatarUrl: string;
	mode: "mobile" | "desktop";
};

export function DashboardHeaderProfileMenu({
	avatarUrl,
	mode,
}: DashboardHeaderProfileMenuProps) {
	const { signOut } = useClerk();
	const navigate = useNavigate();
	const size = mode === "mobile" ? 44 : dashboardLayout.headerAvatarSize;

	const handleSignOut = () => {
		void signOut({ redirectUrl: ROUTES.login });
	};

	const desktopItemClass = cn(
		"flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2",
		"font-medium text-[#1a1a1a] text-sm outline-none",
		"bg-white hover:bg-[#e8e8e8]",
		"data-[highlighted]:bg-[#e8e8e8] data-[highlighted]:text-[#1a1a1a]",
		"focus-visible:bg-[#e8e8e8] focus-visible:text-[#1a1a1a]",
	);

	const mobileItemClass = cn(
		"flex min-h-11 w-full min-w-[140px] cursor-pointer items-center px-4",
		"font-medium text-[#1a1a1a] text-sm leading-[1.4] outline-none",
		"rounded-xl bg-white",
		"hover:bg-[#f5f5f5] data-[highlighted]:bg-[#f5f5f5] data-[highlighted]:text-[#1a1a1a]",
		"focus-visible:bg-[#f5f5f5] focus-visible:text-[#1a1a1a]",
	);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<button
						type="button"
						className={cn(
							"shrink-0 cursor-pointer rounded-full border border-[#e6e6e6]",
							"bg-center bg-cover bg-no-repeat",
						)}
						style={{
							width: size,
							height: size,
							backgroundImage: `url("${avatarUrl}")`,
						}}
						aria-label="Open menu"
					/>
				}
			/>
			{mode === "mobile" ? (
				<DropdownMenuContent
					align="end"
					sideOffset={8}
					className="z-[1605] min-w-[140px] overflow-hidden rounded-xl border border-[#c7c7c7] bg-white p-0 shadow-md ring-0"
				>
					<MenuPrimitive.Item
						className={mobileItemClass}
						onClick={handleSignOut}
					>
						Logout
					</MenuPrimitive.Item>
				</DropdownMenuContent>
			) : (
				<DropdownMenuContent
					align="end"
					sideOffset={8}
					className="z-[1605] min-w-[12rem] rounded-xl border border-[#e6e6e6] bg-white p-1 shadow-lg ring-0"
				>
					<MenuPrimitive.Item
						className={desktopItemClass}
						onClick={() => void navigate({ to: ROUTES.dashboardBilling })}
					>
						<CreditCard
							className="size-4 shrink-0 text-[#525252]"
							aria-hidden
						/>
						Billing
					</MenuPrimitive.Item>
					<div className="my-1 h-px bg-[#e6e6e6]" aria-hidden />
					<MenuPrimitive.Item
						className={desktopItemClass}
						onClick={handleSignOut}
					>
						<LogOut className="size-4 shrink-0 text-[#525252]" aria-hidden />
						Sign out
					</MenuPrimitive.Item>
				</DropdownMenuContent>
			)}
		</DropdownMenu>
	);
}
