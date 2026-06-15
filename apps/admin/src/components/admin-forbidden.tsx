import { SignOutButton } from "@clerk/react";
import { Button } from "@legacy-building/ui/components/button";
import { APP_NAME } from "@legacy-building/ui/lib/brand";
import { cn } from "@legacy-building/ui/lib/utils";
import { LogOut, ShieldAlert } from "lucide-react";

import { ROUTES } from "@/lib/routes";

export function AdminForbidden() {
	return (
		<div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-auto bg-background px-6 py-16">
			<div className="relative mx-auto flex w-full max-w-xl flex-col items-center text-center">
				<div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 font-semibold text-[10px] text-muted-foreground uppercase tracking-[0.2em] shadow-sm backdrop-blur-sm">
					<ShieldAlert
						className="size-3.5 shrink-0"
						strokeWidth={2}
						aria-hidden
					/>
					Access denied
				</div>

				<span className="font-black font-mono text-[clamp(4rem,20vw,8rem)] text-foreground leading-none tracking-tighter">
					403
				</span>

				<h1 className="mt-4 font-heading font-semibold text-2xl tracking-tight sm:text-3xl">
					Unauthorized
				</h1>
				<p className="mt-3 max-w-sm text-muted-foreground text-sm leading-relaxed sm:text-base">
					You do not have permission to access this area. Contact your
					administrator if you believe this is a mistake.
				</p>

				<p className="mt-5 font-mono text-[10px] text-muted-foreground/50 uppercase tracking-[0.18em]">
					{APP_NAME} Admin &middot; 403
				</p>

				<div className="mt-9 flex flex-wrap items-center justify-center gap-3">
					<SignOutButton redirectUrl={ROUTES.signIn}>
						<Button
							type="button"
							size="lg"
							className="h-11 rounded-full px-7 transition-transform active:scale-[0.97]"
						>
							<LogOut className="size-4" aria-hidden />
							Sign out
						</Button>
					</SignOutButton>
					<Button
						type="button"
						variant="outline"
						size="lg"
						className={cn(
							"h-11 rounded-full px-7 transition-transform active:scale-[0.97]",
						)}
						onClick={() => window.history.back()}
					>
						Go back
					</Button>
				</div>
			</div>
		</div>
	);
}
