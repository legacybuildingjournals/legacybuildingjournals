import { cn } from "@legacy-building/ui/lib/utils";
import {
	Camera,
	Image as ImageIcon,
	Trash2,
	Upload,
	Video,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CameraRecorderDialog } from "@/components/journal/library/CameraRecorderDialog";
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
	// Fallback input for browsers without getUserMedia/MediaRecorder support
	// (or non-secure contexts): `capture` at least asks a phone browser for
	// the camera directly, even though desktop browsers ignore it.
	const cameraInputRef = useRef<HTMLInputElement>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [cameraOpen, setCameraOpen] = useState(false);
	const supportsInBrowserCamera =
		typeof navigator !== "undefined" &&
		Boolean(navigator.mediaDevices?.getUserMedia) &&
		typeof MediaRecorder !== "undefined";

	function handleRecordClick() {
		if (supportsInBrowserCamera) {
			setCameraOpen(true);
			return;
		}
		cameraInputRef.current?.click();
	}

	function handleRecorded(file: File) {
		if (file.size > MAX_VIDEO_BYTES) {
			setError("Video must be 200 MB or smaller.");
			return;
		}
		setError(null);
		onChange(file);
	}

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
				<div
					aria-invalid={invalid}
					className={cn(
						"flex w-full flex-col items-center rounded-[12px] border p-6",
					)}
					style={{
						borderColor: invalid ? "#b0200c" : accentColor,
						// The wash is the accent at low opacity, per the design.
						backgroundColor: `${accentColor}0d`,
					}}
				>
					<span
						className="mb-3 flex size-12 items-center justify-center rounded-full"
						style={{ backgroundColor: `${accentColor}1a` }}
					>
						<Video
							className="size-6"
							style={{ color: accentColor }}
							strokeWidth={2}
						/>
					</span>

					<h4 className="font-semibold text-[#212529] text-base leading-6">
						Capture Your Memory
					</h4>
					<p className="mt-1.5 max-w-[220px] text-center text-[#6c757d] text-sm leading-5">
						Record a new video or choose one from your gallery.
					</p>

					<Button
						type="button"
						onClick={handleRecordClick}
						className="mt-5 h-11 w-full rounded-[8px] font-semibold text-sm text-white shadow-none transition-opacity hover:opacity-95 active:scale-[0.99]"
						style={{ backgroundColor: accentColor }}
					>
						<Camera className="mr-2 size-4" />
						Record Video
					</Button>

					<div className="flex w-full items-center gap-3 py-3">
						<span className="h-px flex-1 bg-[#e9ecef]" />
						<span className="text-[#6c757d] text-xs">OR</span>
						<span className="h-px flex-1 bg-[#e9ecef]" />
					</div>

					<Button
						type="button"
						variant="outline"
						onClick={() => inputRef.current?.click()}
						className="h-11 w-full rounded-[8px] bg-white font-semibold text-sm shadow-none transition-colors hover:bg-white hover:opacity-90 active:scale-[0.99]"
						style={{ borderColor: accentColor, color: accentColor }}
					>
						<ImageIcon className="mr-2 size-4" />
						Choose From Gallery
					</Button>
				</div>
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
			<input
				ref={cameraInputRef}
				type="file"
				accept={ACCEPTED_VIDEO_TYPES}
				capture="user"
				className="hidden"
				onChange={handleFile}
			/>

			<CameraRecorderDialog
				open={cameraOpen}
				onOpenChange={setCameraOpen}
				accentColor={accentColor}
				onRecorded={handleRecorded}
			/>
		</div>
	);
}
