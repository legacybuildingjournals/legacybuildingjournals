import { brand, dashboardLayout } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { Link, type RouterState, useRouterState } from "@tanstack/react-router";

import {
	dashboardNavItems,
	isDashboardNavActive,
} from "@/components/journal/dashboard/dashboardNavLinks";

export function DashboardBottomNav() {
	const pathname = useRouterState({
		select: (s: RouterState) => s.location.pathname,
	});

	return (
		<nav
			className={cn(
				"fixed inset-x-0 bottom-0 z-[1503] md:hidden",
				"border-[#e6e6e6] border-t bg-white/95 backdrop-blur-md",
				"shadow-[0_-1px_0_0_#f2f2f2,0_-8px_24px_rgba(26,26,26,0.08)]",
				"pb-[max(0px,env(safe-area-inset-bottom))]",
			)}
			aria-label="Main"
			style={{ minHeight: dashboardLayout.bottomNavHeight }}
		>
			<div className="mx-auto flex h-16 max-w-[1200px] items-stretch justify-around px-1">
				{dashboardNavItems.map((item) => {
					const isActive = isDashboardNavActive(pathname, item.to);
					const Icon = item.icon;

					return (
						<Link
							key={item.id}
							to={item.to}
							className={cn(
								"relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2",
								"font-medium text-[11px] leading-none transition-all duration-200",
								isActive
									? "font-semibold"
									: "hover:bg-[#f7f7f7]/80 active:bg-[#f2f2f2]",
							)}
							style={{
								color: isActive ? brand.primary : brand.textMuted,
							}}
							aria-current={isActive ? "page" : undefined}
						>
							{isActive ? (
								<span
									className="absolute inset-x-3 top-0 h-0.5 rounded-full"
									style={{ backgroundColor: brand.primary }}
									aria-hidden
								/>
							) : null}
							<span
								className={cn(
									"flex size-8 items-center justify-center rounded-full transition-colors duration-200",
									isActive && "bg-[rgba(0,128,128,0.1)]",
								)}
							>
								<Icon
									className="size-[18px] shrink-0"
									strokeWidth={isActive ? 2.25 : 1.75}
									aria-hidden
								/>
							</span>
							<span className="truncate">{item.label}</span>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
