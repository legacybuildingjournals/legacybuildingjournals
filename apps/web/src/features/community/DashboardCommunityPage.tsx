import { community } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Bell, ExternalLink, Info, Users } from "lucide-react";

import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/journal/ui/popover";
import {
	COMMUNITY_PRIVACY_NOTE,
	COMMUNITY_SOCIALS,
	COMMUNITY_UPDATES,
	type CommunityUpdate,
} from "@/lib/community/content";

const cardClass =
	"rounded-[32px] border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]";

function SectionHeading({
	icon: Icon,
	title,
	subtitle,
	action,
}: {
	icon: LucideIcon;
	title: string;
	subtitle: string;
	action?: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-4">
			<div className="flex items-center gap-3 sm:gap-4">
				<span
					className="flex size-10 shrink-0 items-center justify-center rounded-full sm:size-12"
					style={{ backgroundColor: community.heading }}
				>
					<Icon className="size-5 text-white sm:size-6" strokeWidth={2} />
				</span>
				<div>
					<h2
						className="font-bold text-xl leading-7 sm:text-2xl sm:leading-8"
						style={{ color: community.heading }}
					>
						{title}
					</h2>
					<p
						className="font-medium text-sm leading-5 sm:text-base sm:leading-6"
						style={{ color: community.bodyMuted }}
					>
						{subtitle}
					</p>
				</div>
			</div>
			{action}
		</div>
	);
}

function UpdateCard({ update }: { update: CommunityUpdate }) {
	const MetaIcon = update.metaIcon;

	const body = (
		<>
			{/* Artwork, or the teal wash that stands in until the image lands. */}
			<div
				className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl sm:aspect-square sm:size-[255px] sm:w-auto sm:rounded-3xl"
				style={{
					backgroundColor: update.imageUrl
						? undefined
						: `${community.heading}99`,
				}}
			>
				{update.imageUrl ? (
					<img
						src={update.imageUrl}
						alt=""
						className="size-full object-cover"
						loading="lazy"
					/>
				) : (
					<MetaIcon
						className="size-6 text-white/80 sm:size-16"
						strokeWidth={1.5}
					/>
				)}
			</div>

			<div className="flex flex-1 flex-col items-start gap-1 sm:gap-2">
				<span
					className="hidden rounded-full px-3 py-1 font-bold text-[10px] uppercase leading-[15px] tracking-[0.5px] sm:inline-flex"
					style={{
						backgroundColor: community.badgeBg,
						color: community.headingDeep,
					}}
				>
					{update.badge}
				</span>

				<h3
					className="font-bold text-base leading-6 sm:text-2xl sm:leading-8"
					style={{ color: community.heading }}
				>
					{update.title}
				</h3>

				<p
					className="hidden pb-2 text-base leading-[26px] sm:block"
					style={{ color: community.bodyMuted }}
				>
					{update.description}
				</p>

				<span
					className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold text-xs sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
					style={{
						backgroundColor: community.metaBg,
						color: community.metaText,
					}}
				>
					<MetaIcon className="size-3.5 sm:size-4" strokeWidth={1.5} />
					{update.meta}
				</span>
			</div>
		</>
	);

	const layout =
		"flex flex-row items-center gap-4 p-4 sm:items-center sm:gap-8 sm:p-6";

	if (!update.url) {
		return (
			<article
				className={cn(cardClass, layout)}
				style={{ borderColor: community.cardBorder }}
			>
				{body}
			</article>
		);
	}

	return (
		<a
			href={update.url}
			target="_blank"
			rel="noreferrer"
			className={cn(
				cardClass,
				layout,
				"transition-all hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.995]",
			)}
			style={{ borderColor: community.cardBorder }}
		>
			{body}
		</a>
	);
}

/**
 * Community page: what's shipping next, and where to follow along.
 *
 * All content is static (`lib/community/content.ts`), so the skeleton, empty
 * and error states the UX checklist asks for don't apply — nothing is fetched
 * and neither list can be empty.
 */
export function DashboardCommunityPage() {
	return (
		<main
			className="min-h-svh w-full pt-[80px]"
			style={{ backgroundColor: community.pageBackground }}
		>
			<div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8 px-4 py-8 sm:gap-12 sm:py-12 md:px-8">
				<section className="flex flex-col gap-4 sm:gap-8">
					<SectionHeading
						icon={Bell}
						title="Upcoming Updates"
						subtitle="Stay informed about the latest from Legacy Building."
					/>

					<div className="grid gap-4 sm:gap-6 lg:grid-cols-2 lg:gap-8">
						{COMMUNITY_UPDATES.map((update) => (
							<UpdateCard key={update.id} update={update} />
						))}
					</div>
				</section>

				<section className="flex flex-col gap-4 sm:gap-8">
					<SectionHeading
						icon={Users}
						title="Join Our Community"
						subtitle="Connect with us on your favorite platforms."
						action={
							<Popover>
								<PopoverTrigger asChild>
									<button
										type="button"
										aria-label="Privacy information"
										className="rounded-full p-1 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2"
									>
										<Info
											className="size-7"
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
						}
					/>

					<div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
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
										"flex flex-col items-center p-4 text-center sm:p-8",
										"transition-all hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98]",
									)}
									style={{ borderColor: community.cardBorder }}
								>
									<span
										className="mb-3 flex size-12 items-center justify-center rounded-full sm:mb-6 sm:size-16"
										// The mark draws with `currentColor`, so the brand colour
										// is set here rather than on the svg itself.
										style={{
											backgroundColor: social.tint,
											color: social.color,
										}}
									>
										<Icon className="size-6 sm:size-10" />
									</span>

									<h3
										className="mb-1 font-bold text-sm leading-6 sm:mb-2 sm:text-lg sm:leading-7"
										style={{ color: community.heading }}
									>
										{social.name}
									</h3>

									<p
										className="mb-0 text-xs leading-4 sm:mb-6 sm:text-sm sm:leading-5"
										style={{ color: community.bodyMuted }}
									>
										{social.caption}
									</p>

									<span
										className="mt-auto hidden items-center gap-1 font-bold text-sm sm:inline-flex"
										style={{ color: community.headingDeep }}
									>
										{social.linkLabel}
										<ExternalLink className="size-3" strokeWidth={1.5} />
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
