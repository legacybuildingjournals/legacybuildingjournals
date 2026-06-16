import { brand } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ImageCarouselProps = {
	imageUrls: string[];
	alt: string;
	className?: string;
	intervalMs?: number;
	showArrows?: boolean;
	onImageAreaClick?: () => void;
};

export function ImageCarousel({
	imageUrls,
	alt,
	className,
	intervalMs = 4000,
	showArrows = true,
	onImageAreaClick,
}: ImageCarouselProps) {
	const [activeIndex, setActiveIndex] = useState(0);
	const count = imageUrls.length;
	const imageListKey = imageUrls.join("\0");

	const goTo = useCallback(
		(index: number) => {
			if (count === 0) return;
			setActiveIndex(((index % count) + count) % count);
		},
		[count],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset slide when images change
	useEffect(() => {
		setActiveIndex(0);
	}, [imageListKey]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: restart autoplay when images change
	useEffect(() => {
		if (count <= 1) return;
		const id = window.setInterval(() => {
			setActiveIndex((prev) => (prev + 1) % count);
		}, intervalMs);
		return () => window.clearInterval(id);
	}, [count, intervalMs, imageListKey]);

	if (count === 0) {
		return (
			<div
				className={cn(
					"flex h-full min-h-[150px] w-full items-center justify-center bg-transparent",
					className,
				)}
			>
				<span className="text-[#8a8a8a] text-sm">No image</span>
			</div>
		);
	}

	const carouselTrack = (
		<div
			className="flex h-full transition-transform duration-500 ease-in-out"
			style={{ transform: `translateX(-${activeIndex * 100}%)` }}
		>
			{imageUrls.map((url, index) => {
				const shouldLoad = Math.abs(index - activeIndex) <= 1;
				return (
					<div
						key={url}
						className="flex h-full w-full shrink-0 items-center justify-center"
					>
						{shouldLoad ? (
							<img
								src={url}
								alt={alt}
								loading={index === activeIndex ? "eager" : "lazy"}
								decoding="async"
								className="h-full w-full object-contain"
								draggable={false}
							/>
						) : null}
					</div>
				);
			})}
		</div>
	);

	return (
		<div
			className={cn(
				"relative h-[200px] w-full overflow-hidden bg-transparent",
				className,
			)}
		>
			{onImageAreaClick ? (
				<button
					type="button"
					className="h-full w-full cursor-pointer border-0 bg-transparent p-0 text-left transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]"
					onClick={onImageAreaClick}
					aria-label={alt}
				>
					{carouselTrack}
				</button>
			) : (
				<div className="h-full">{carouselTrack}</div>
			)}

			{count > 1 && showArrows ? (
				<>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							goTo(activeIndex - 1);
						}}
						className="absolute top-1/2 left-2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-muted-foreground/80 text-primary-foreground shadow-sm transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95"
						aria-label="Previous slide"
					>
						<ChevronLeft className="size-5" strokeWidth={2.5} aria-hidden />
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							goTo(activeIndex + 1);
						}}
						className="absolute top-1/2 right-2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-muted-foreground/80 text-primary-foreground shadow-sm transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95"
						aria-label="Next slide"
					>
						<ChevronRight className="size-5" strokeWidth={2.5} aria-hidden />
					</button>
				</>
			) : null}

			{count > 1 ? (
				<ul className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
					{imageUrls.map((url, index) => {
						const active = index === activeIndex;
						return (
							<li key={`dot-${url}`}>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										goTo(index);
									}}
									className="relative z-10 flex size-2.5 cursor-pointer items-center justify-center rounded-full p-0"
									aria-label={`Slide ${index + 1}`}
									aria-current={active ? "true" : undefined}
								>
									<span
										className={cn(
											"block size-2 rounded-full transition-colors",
											active ? "scale-110" : "opacity-70",
										)}
										style={{
											backgroundColor: active ? brand.primary : "#d4d4d4",
										}}
									/>
								</button>
							</li>
						);
					})}
				</ul>
			) : null}
		</div>
	);
}
