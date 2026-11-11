import { brand, dashboardLayout } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";

import { LegalPageNavbar } from "@/components/legal/legal-page-navbar";
import { TermlyEmbed } from "@/components/legal/termly-embed";

type LegalDocumentPageProps = {
	title: string;
	description: string;
	paragraphs?: readonly string[];
	termlyId?: string;
};

export function LegalDocumentPage({
	title,
	description,
	paragraphs,
	termlyId,
}: LegalDocumentPageProps) {
	const bodyClassName = cn(
		"text-[#595959] text-sm leading-relaxed",
		termlyId ? null : "mt-6",
		termlyId ? "legal-termly-content" : "space-y-4",
	);

	return (
		<div
			className="flex min-h-svh flex-col"
			style={{ backgroundColor: brand.pageBackground }}
		>
			<LegalPageNavbar />

			<div
				className="flex flex-1 flex-col items-center px-4 pb-8 sm:px-6"
				style={{
					paddingTop: dashboardLayout.contentMarginTop + 16,
				}}
			>
				{/* Termly's iframe brings its own padding, so the card stays slim. */}
				<article
					className={cn(
						"w-full max-w-2xl rounded-2xl border bg-white shadow-sm",
						"border-[#e6e6e6] p-4 sm:p-5 md:p-6",
					)}
				>
					{termlyId ? null : (
						<header className="border-[#e6e6e6] border-b pb-5">
							<h1 className="font-semibold text-2xl text-[#1a1a1a] tracking-tight sm:text-3xl">
								{title}
							</h1>
							<p className="mt-2 text-[#525252] text-sm leading-relaxed">
								{description}
							</p>
						</header>
					)}

					<div className={bodyClassName}>
						{termlyId ? (
							<TermlyEmbed key={termlyId} dataId={termlyId} title={title} />
						) : (
							paragraphs?.map((paragraph) => (
								<p key={paragraph.slice(0, 32)}>{paragraph}</p>
							))
						)}
					</div>
				</article>
			</div>
		</div>
	);
}
