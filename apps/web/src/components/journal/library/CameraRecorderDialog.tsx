import { Circle, Square, Video } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/journal/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/journal/ui/dialog";

function pickVideoMimeType(): string {
	const candidates = [
		"video/mp4",
		"video/webm;codecs=vp9,opus",
		"video/webm;codecs=vp8,opus",
		"video/webm",
	];
	for (const type of candidates) {
		if (MediaRecorder.isTypeSupported(type)) return type;
	}
	return "";
}

function mimeToExtension(mimeType: string): string {
	if (mimeType.startsWith("video/mp4")) return "mp4";
	return "webm";
}

function formatDurationSeconds(totalSeconds: number): string {
	const seconds = Math.max(0, Math.floor(totalSeconds));
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${String(secs).padStart(2, "0")}`;
}

type CameraRecorderDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	accentColor: string;
	onRecorded: (file: File) => void;
};

/**
 * In-browser camera capture. The `capture` attribute on a file input only
 * triggers a native camera on mobile browsers — desktop Chrome/Firefox/Safari
 * ignore it and fall back to a plain file picker. This dialog uses
 * getUserMedia + MediaRecorder directly so "Record Video" opens the camera
 * on every platform.
 */
export function CameraRecorderDialog({
	open,
	onOpenChange,
	accentColor,
	onRecorded,
}: CameraRecorderDialogProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const recorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef = useRef<Blob[]>([]);

	const [recording, setRecording] = useState(false);
	const [duration, setDuration] = useState(0);
	const [error, setError] = useState<string | null>(null);

	const stopStream = useCallback(() => {
		for (const track of streamRef.current?.getTracks() ?? []) {
			track.stop();
		}
		streamRef.current = null;
	}, []);

	useEffect(() => {
		if (!open) {
			stopStream();
			recorderRef.current = null;
			chunksRef.current = [];
			setRecording(false);
			setDuration(0);
			setError(null);
			return;
		}

		let cancelled = false;
		void navigator.mediaDevices
			.getUserMedia({ video: true, audio: true })
			.then((stream) => {
				if (cancelled) {
					for (const track of stream.getTracks()) track.stop();
					return;
				}
				streamRef.current = stream;
				if (videoRef.current) videoRef.current.srcObject = stream;
			})
			.catch(() => {
				if (!cancelled) {
					setError(
						"Couldn't access your camera. Check your browser's camera permission and try again.",
					);
				}
			});

		return () => {
			cancelled = true;
			stopStream();
		};
	}, [open, stopStream]);

	useEffect(() => {
		if (!recording) return;
		const interval = window.setInterval(() => {
			setDuration((d) => d + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, [recording]);

	const startRecording = () => {
		const stream = streamRef.current;
		if (!stream) return;

		const preferredMimeType = pickVideoMimeType();
		const recorder = preferredMimeType
			? new MediaRecorder(stream, { mimeType: preferredMimeType })
			: new MediaRecorder(stream);
		chunksRef.current = [];
		recorder.ondataavailable = (e) => {
			if (e.data.size > 0) chunksRef.current.push(e.data);
		};
		recorder.onstop = () => {
			if (chunksRef.current.length === 0) return;
			const actualMimeType =
				recorder.mimeType || preferredMimeType || "video/webm";
			const ext = mimeToExtension(actualMimeType);
			const blob = new Blob(chunksRef.current, { type: actualMimeType });
			const file = new File([blob], `recording-${Date.now()}.${ext}`, {
				type: actualMimeType,
			});
			onRecorded(file);
			onOpenChange(false);
		};
		recorderRef.current = recorder;
		recorder.start();
		setDuration(0);
		setRecording(true);
	};

	const stopRecording = () => {
		const recorder = recorderRef.current;
		if (recorder && recorder.state !== "inactive") {
			recorder.stop();
		}
		setRecording(false);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next && recording) stopRecording();
				onOpenChange(next);
			}}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Record Video</DialogTitle>
					<DialogDescription>
						{error ? "" : "Recording starts once you press the record button."}
					</DialogDescription>
				</DialogHeader>

				{error ? (
					<div className="flex flex-col items-center gap-3 rounded-[12px] bg-muted p-6 text-center">
						<Video className="size-8 text-muted-foreground" />
						<p className="text-muted-foreground text-sm">{error}</p>
					</div>
				) : (
					<div className="flex flex-col items-center gap-4">
						<div className="relative aspect-video w-full overflow-hidden rounded-[12px] bg-black">
							{/* biome-ignore lint/a11y/useMediaCaption: live self-preview, no captions to show */}
							<video
								ref={videoRef}
								autoPlay
								muted
								playsInline
								className="size-full object-cover"
							/>
							{recording && (
								<span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 font-semibold text-white text-xs">
									<Circle className="size-2.5 animate-pulse fill-red-500 text-red-500" />
									{formatDurationSeconds(duration)}
								</span>
							)}
						</div>

						<Button
							type="button"
							onClick={recording ? stopRecording : startRecording}
							className="h-11 w-full rounded-[8px] font-semibold text-sm text-white shadow-none transition-opacity hover:opacity-95 active:scale-[0.99]"
							style={{
								backgroundColor: recording ? "#b0200c" : accentColor,
							}}
						>
							{recording ? (
								<>
									<Square className="mr-2 size-4 fill-current" />
									Stop Recording
								</>
							) : (
								<>
									<Circle className="mr-2 size-4 fill-current" />
									Start Recording
								</>
							)}
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
