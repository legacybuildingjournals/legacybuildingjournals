import { cn } from "@legacy-building/ui/lib/utils";
import { Trash2, Upload, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/journal/ui/button";

export const ACCEPTED_VIDEO_TYPES = "video/mp4,video/quicktime,video/x-m4v";
/** Matches the native cap so a journal behaves the same on both clients. */
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

type EntryVideoUploadProps = {
	accentColor: string;
	value: File | null;
	onChange: (file: File | null) => void;
	invalid?: boolean;
};

function formatSize(bytes: number): string {
	const mb = bytes / (1024 * 1024);
	return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/**
 * Upload slot for a video entry. Mirrors the recorder's role in the audio form:
 * it is the entry's content, so the form has no separate media field.
 */
export function EntryVideoUpload({
	accentColor,
	value,
	onChange,
	invalid,
}: EntryVideoUploadProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Object URLs must be revoked or the blob leaks for the page's lifetime.
	useEffect(() => {
		if (!value) {
			setPreviewUrl(null);
			return;
		}
		const url = URL.createObjectURL(value);
		setPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [value]);

	function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		// Reset so re-picking the same file still fires a change event.
		event.target.value = "";
		if (!file) return;

		if (file.size > MAX_VIDEO_BYTES) {
			setError("Video must be 200 MB or smaller.");
			return;
		}
		setError(null);
		onChange(file);
	}

	return (
		<div className="flex w-full flex-col gap-3">
			<span className="font-medium text-[#1a1a1a] text-base leading-[1.4]">
				Upload video
			</span>

			{value && previewUrl ? (
				<div className="flex w-full flex-col gap-3">
					{/* biome-ignore lint/a11y/useMediaCaption: user-supplied journal footage has no caption track */}
					<video
						src={previewUrl}
						controls
						className="max-h-[320px] w-full rounded-[12px] bg-black"
					/>
					<div className="flex flex-wrap items-center gap-3">
						<span className="text-[#8a8a8a] text-sm">
							{value.name} · {formatSize(value.size)}
						</span>
						<div className="ml-auto flex gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => inputRef.current?.click()}
								className="h-9 rounded-[10px] transition-colors active:scale-[0.98]"
							>
								<Upload className="mr-1.5 size-4" />
								Replace
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => onChange(null)}
								className="h-9 rounded-[10px] border-[#b0200c] text-[#b0200c] transition-colors hover:bg-[#b0200c]/5 hover:text-[#b0200c] active:scale-[0.98]"
							>
								<Trash2 className="mr-1.5 size-4" />
								Remove
							</Button>
						</div>
					</div>
				</div>
			) : (
				<button
					type="button"
					onClick={() => inputRef.current?.click()}
					aria-invalid={invalid}
					className={cn(
						"flex min-h-[180px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed bg-white transition-all hover:bg-[#fffdf5] hover:shadow-sm active:scale-[0.995]",
						invalid ? "border-[#b0200c]" : "border-[#dca114]",
					)}
					style={{ color: accentColor }}
				>
					<Video className="size-8" strokeWidth={1.5} />
					<span className="font-medium text-base">Choose a video</span>
					<span className="text-[#8a8a8a] text-sm">
						MP4 or MOV, up to 200 MB
					</span>
				</button>
			)}

			{error ? (
				<p className="text-[#b0200c] text-sm" role="alert">
					{error}
				</p>
			) : null}

			<input
				ref={inputRef}
				type="file"
				accept={ACCEPTED_VIDEO_TYPES}
				className="hidden"
				onChange={handleFile}
			/>
		</div>
	);
}
