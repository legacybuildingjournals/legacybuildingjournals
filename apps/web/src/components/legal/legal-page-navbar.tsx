import { useAuth } from "@clerk/react";
import { assets, brand } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { ROUTES } from "@/lib/routes";

const actionButtonClass = cn(
	"inline-flex h-10 min-w-[5.5rem] items-center justify-center gap-1.5",
	"rounded-full px-5 font-semibold text-base text-white leading-[1.4]",
	"transition-opacity hover:opacity-90",
);

export function LegalPageNavbar() {
	const { isSignedIn, isLoaded } = useAuth();
	const navigate = useNavigate();

	const logoHref = isSignedIn ? ROUTES.dashboardDesk : ROUTES.login;

	const handleBack = () => {
		if (typeof window !== "undefined" && window.history.length > 1) {
			window.history.back();
			return;
		}
		void navigate({
			to: isSignedIn ? ROUTES.dashboardDesk : ROUTES.login,
		});
	};

	return (
		<header
			className={cn(
				"fixed inset-x-0 top-0 z-[1504] flex min-h-[80px] items-center justify-center",
				"bg-nav-bar shadow-[0_2px_2px_0_#f7f7f7]",
				"px-4 md:pr-10 md:pl-[29px]",
			)}
		>
			<div className="flex min-h-[80px] w-full max-w-[1200px] items-center justify-between gap-4">
				<Link
					to={logoHref}
					className="relative h-[30px] w-[120px] shrink-0 md:h-[50px] md:w-[200px]"
					aria-label="Legacy Building home"
				>
					<img
						src={assets.whiteLogo}
						alt="Legacy Building"
						className="absolute inset-0 size-full object-contain object-left"
					/>
				</Link>

				<div className="flex shrink-0 items-center">
					{!isLoaded ? (
						<div
							className="h-10 w-[5.5rem] animate-pulse rounded-full bg-white/20"
							aria-hidden
						/>
					) : isSignedIn ? (
						<button
							type="button"
							onClick={handleBack}
							className={actionButtonClass}
							style={{ backgroundColor: brand.primary }}
						>
							<ChevronLeft className="size-4" aria-hidden />
							Back
						</button>
					) : (
						<Link
							to={ROUTES.login}
							className={actionButtonClass}
							style={{ backgroundColor: brand.primary }}
						>
							Log In
						</Link>
					)}
				</div>
			</div>
		</header>
	);
}
