import { assets, community } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { ExternalLink, Info, Users } from "lucide-react";

import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/journal/ui/popover";
import {
	COMMUNITY_PRIVACY_NOTE,
	COMMUNITY_SOCIALS,
} from "@/lib/community/content";

const cardClass =
	"rounded-2xl border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]";

/**
 * Community page: the banner, and where to follow along.
 *
 * All content is static (`lib/community/content.ts`), so the skeleton, empty
 * and error states the UX checklist asks for don't apply — nothing is fetched
 * and the list can't be empty.
 */
export function DashboardCommunityPage() {
	return (
		<main
			className="min-h-svh w-full pt-[80px]"
			style={{ backgroundColor: community.pageBackground }}
		>
			<div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8 px-4 py-6 sm:gap-10 sm:py-8 md:px-8">
				{/*
				 * The headline is part of the artwork rather than text over it, so
				 * the phone gets its own crop — scaling the wide one would shrink
				 * the words past reading size.
				 */}
				<picture className="block overflow-hidden rounded-2xl">
					<source
						media="(max-width: 639px)"
						srcSet={assets.communityHeroMobile}
					/>
					<img
						src={assets.communityHero}
						alt="Legacy Community — stories shared, connections that last."
						className="block w-full object-cover"
					/>
				</picture>

				<section className="flex flex-col gap-4 sm:gap-6">
					<div className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-3 sm:gap-4">
							<span
								className="flex size-10 shrink-0 items-center justify-center rounded-full sm:size-11"
								style={{ backgroundColor: community.heading }}
							>
								<Users className="size-5 text-white" strokeWidth={2} />
							</span>
							<div>
								<h1
									className="font-bold text-xl leading-7 sm:text-2xl sm:leading-8"
									style={{ color: community.heading }}
								>
									Join Our Community
								</h1>
								<p
									className="text-sm leading-5 sm:text-[15px]"
									style={{ color: community.bodyMuted }}
								>
									Connect with us on your favorite platforms.
								</p>
							</div>
						</div>

						<Popover>
							<PopoverTrigger asChild>
								<button
									type="button"
									aria-label="Privacy information"
									className="shrink-0 rounded-full p-1 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2"
								>
									<Info
										className="size-6 sm:size-7"
										strokeWidth={1.5}
										style={{ color: community.heading }}
									/>
								</button>
							</PopoverTrigger>
							<PopoverContent
								side="top"
								align="end"
								className="max-w-[340px] text-sm leading-[1.5]"
								style={{ color: community.heading }}
							>
								{COMMUNITY_PRIVACY_NOTE}
							</PopoverContent>
						</Popover>
					</div>

					<div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
						{COMMUNITY_SOCIALS.map((social) => {
							const Icon = social.icon;
							return (
								<a
									key={social.id}
									href={social.url}
									target="_blank"
									rel="noreferrer"
									aria-label={`${social.name} — ${social.caption}`}
									className={cn(
										cardClass,
										"flex flex-col items-center px-4 py-6 text-center sm:px-5 sm:py-8",
										"transition-all hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98]",
									)}
									style={{ borderColor: community.cardBorder }}
								>
									<span
										className="mb-3 flex size-12 items-center justify-center rounded-full sm:mb-4 sm:size-14"
										// The mark draws with `currentColor`, so the brand colour
										// is set here rather than on the svg itself.
										style={{
											backgroundColor: social.tint,
											color: social.color,
										}}
									>
										<Icon className="size-6 sm:size-7" />
									</span>

									<h2
										className="font-bold text-sm leading-6 sm:text-base"
										style={{ color: community.heading }}
									>
										{social.name}
									</h2>

									{/* Held back to sm: at two-up on a phone it pushes the link
									    below the fold for no gain — the platform name carries it. */}
									<p
										className="mt-1 hidden text-[13px] leading-5 sm:block"
										style={{ color: community.bodyMuted }}
									>
										{social.caption}
									</p>

									<span
										className="mt-4 inline-flex items-center gap-1 font-bold text-[13px] sm:mt-6"
										style={{ color: community.headingDeep }}
									>
										{social.linkLabel}
										<ExternalLink className="size-3" strokeWidth={2} />
									</span>
								</a>
							);
						})}
					</div>
				</section>
			</div>
		</main>
	);
}
