import { useUser } from "@clerk/react";
import { useCurrentUser } from "@legacy-building/ui/hooks/use-current-user";
import {
	assets,
	brand,
	dashboardLayout,
} from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { Link, type RouterState, useRouterState } from "@tanstack/react-router";

import { DashboardHeaderProfileMenu } from "@/components/journal/dashboard/DashboardHeaderProfileMenu";
import { ROUTES } from "@/lib/routes";

const navLinks = [
	{ id: "desk", label: "Desk", to: ROUTES.dashboardDesk },
	{ id: "library", label: "Library", to: ROUTES.dashboardLibrary },
	{ id: "account", label: "Account", to: ROUTES.dashboardAccount },
	{ id: "billing", label: "Billing", to: ROUTES.dashboardBilling },
] as const;

const navLinkClass =
	"mx-3 text-base leading-[1.4] transition-colors duration-200";

export function DashboardHeader() {
	const pathname = useRouterState({
		select: (s: RouterState) => s.location.pathname,
	});
	const { user } = useUser();
	const { convexUser } = useCurrentUser();
	const avatarUrl =
		convexUser?.profilePictureUrl ?? user?.imageUrl ?? assets.defaultAvatar;

	return (
		<header
			className={cn(
				"fixed inset-x-0 top-0 z-[1504] flex min-h-[80px] items-center justify-center",
				"bg-center bg-cover bg-no-repeat shadow-[0_2px_2px_0_#f7f7f7]",
				"px-4 md:pr-10 md:pl-[29px]",
			)}
			style={{
				backgroundImage: `url("${assets.headerBackground}")`,
			}}
		>
			<div
				className="flex w-full max-w-[1200px] items-center justify-between gap-2 md:gap-1.5"
				style={{ minHeight: dashboardLayout.headerMinHeight }}
			>
				<Link
					to={ROUTES.dashboardDesk}
					className="relative h-[30px] w-[120px] shrink-0 md:h-[50px] md:w-[200px]"
				>
					<img
						src={assets.whiteLogo}
						alt="Legacy Building"
						width={256}
						height={59}
						className="absolute inset-0 size-full object-contain object-left"
					/>
				</Link>

				<nav className="hidden items-center md:flex" aria-label="Main">
					{navLinks.map((item) => {
						const isActive = pathname === item.to;
						return (
							<Link
								key={item.id}
								to={item.to}
								className={cn(
									navLinkClass,
									isActive
										? "font-semibold text-white"
										: "font-normal hover:text-white/90",
								)}
								style={{
									color: isActive ? brand.white : brand.navInactive,
								}}
							>
								{item.label}
							</Link>
						);
					})}
				</nav>

				<div className="flex shrink-0 items-center justify-end md:min-w-[200px]">
					<div className="md:hidden">
						<DashboardHeaderProfileMenu avatarUrl={avatarUrl} mode="mobile" />
					</div>
					<div className="hidden md:block">
						<DashboardHeaderProfileMenu avatarUrl={avatarUrl} mode="desktop" />
					</div>
				</div>
			</div>
		</header>
	);
}
