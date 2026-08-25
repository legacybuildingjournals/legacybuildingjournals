import { brand } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { Pause, Play, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

function pickMimeType(): string {
	const candidates = [
		"audio/mp4",
		"audio/mp4;codecs=mp4a.40.2",
		"audio/webm;codecs=opus",
		"audio/webm",
	];
	for (const type of candidates) {
		if (MediaRecorder.isTypeSupported(type)) return type;
	}
	return "";
}

function mimeToExtension(mimeType: string): string {
	if (mimeType.startsWith("audio/mp4") || mimeType.startsWith("audio/mpeg"))
		return "mp4";
	if (mimeType.startsWith("audio/ogg")) return "ogg";
	return "webm";
}

const VISUALIZER_BAR_IDS = Array.from(
	{ length: 40 },
	(_, n) => `recorder-bar-${n}`,
);

function formatDurationSeconds(totalSeconds: number): string {
	const seconds = Math.max(0, Math.floor(totalSeconds));
	if (!Number.isFinite(seconds)) return "0:00";
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${String(secs).padStart(2, "0")}`;
}

type AudioRecorderFieldProps = {
	accentColor: string;
	value: File | null;
	onChange: (file: File | null) => void;
	/** Saved recording URL when editing an entry that already has audio. */
	existingAudioUrl?: string | null;
	/** Called when the user removes the saved recording so they can record again. */
	onExistingAudioClear?: () => void;
	invalid?: boolean;
	/** Begin a recording session as soon as the field mounts. */
	autoStart?: boolean;
};

/** Bubble recording row: 40px control, waveform box (max 300px), duration. */
export function AudioRecorderField({
	accentColor,
	value,
	onChange,
	existingAudioUrl,
	onExistingAudioClear,
	autoStart,
	invalid,
}: AudioRecorderFieldProps) {
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const streamRef = useRef<MediaStream | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const rafRef = useRef<number | null>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const shouldSaveOnStopRef = useRef(true);
	const previewAudioRef = useRef<HTMLAudioElement | null>(null);
	const previewObjectUrlRef = useRef<string | null>(null);

	const [sessionActive, setSessionActive] = useState(false);
	const [paused, setPaused] = useState(false);
	const [previewPlaying, setPreviewPlaying] = useState(false);
	const [previewSrc, setPreviewSrc] = useState<string | null>(null);
	const [previewDuration, setPreviewDuration] = useState(0);
	const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [bars, setBars] = useState<number[]>(() =>
		Array.from({ length: 40 }, () => 6),
	);

	const isRecording = sessionActive && !paused;
	const hasExistingAudio = Boolean(existingAudioUrl) && value === null;
	const hasCompletedRecording =
		(value !== null || hasExistingAudio) && !sessionActive;

	const stopVisualizer = useCallback(() => {
		if (rafRef.current !== null) {
			cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
		}
	}, []);

	const stopStream = useCallback(() => {
		stopVisualizer();
		for (const track of streamRef.current?.getTracks() ?? []) {
			track.stop();
		}
		streamRef.current = null;
		void audioContextRef.current?.close();
		audioContextRef.current = null;
		analyserRef.current = null;
	}, [stopVisualizer]);

	const stopPreview = useCallback(() => {
		previewAudioRef.current?.pause();
		setPreviewPlaying(false);
	}, []);

	const revokePreviewObjectUrl = useCallback(() => {
		if (previewObjectUrlRef.current) {
			URL.revokeObjectURL(previewObjectUrlRef.current);
			previewObjectUrlRef.current = null;
		}
	}, []);

	const resetSession = useCallback(() => {
		stopStream();
		chunksRef.current = [];
		mediaRecorderRef.current = null;
		setSessionActive(false);
		setPaused(false);
	}, [stopStream]);

	const drawVisualizer = useCallback(() => {
		const analyser = analyserRef.current;
		const canvas = canvasRef.current;
		if (!analyser || !canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const bufferLength = analyser.frequencyBinCount;
		const data = new Uint8Array(bufferLength);
		analyser.getByteFrequencyData(data);

		const barCount = 40;
		const nextBars: number[] = [];
		const step = Math.floor(bufferLength / barCount);
		for (let i = 0; i < barCount; i++) {
			const sample = data[i * step] ?? 0;
			nextBars.push(6 + (sample / 255) * 26);
		}
		setBars(nextBars);

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = "#c7c7c7";
		const barWidth = canvas.width / barCount;
		for (let i = 0; i < barCount; i++) {
			const h = nextBars[i] ?? 6;
			ctx.fillRect(i * barWidth + 1, canvas.height - h, barWidth - 2, h);
		}

		rafRef.current = requestAnimationFrame(drawVisualizer);
	}, []);

	const startRecording = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;

			const audioContext = new AudioContext();
			audioContextRef.current = audioContext;
			const source = audioContext.createMediaStreamSource(stream);
			const analyser = audioContext.createAnalyser();
			analyser.fftSize = 256;
			source.connect(analyser);
			analyserRef.current = analyser;

			const preferredMimeType = pickMimeType();
			const recorder = preferredMimeType
				? new MediaRecorder(stream, { mimeType: preferredMimeType })
				: new MediaRecorder(stream);
			chunksRef.current = [];
			shouldSaveOnStopRef.current = true;
			recorder.ondataavailable = (e) => {
				if (e.data.size > 0) chunksRef.current.push(e.data);
			};
			recorder.onstop = () => {
				if (shouldSaveOnStopRef.current && chunksRef.current.length > 0) {
					const actualMimeType =
						recorder.mimeType || preferredMimeType || "audio/mp4";
					const ext = mimeToExtension(actualMimeType);
					const blob = new Blob(chunksRef.current, { type: actualMimeType });
					const file = new File([blob], `recording-${Date.now()}.${ext}`, {
						type: actualMimeType,
					});
					onChange(file);
				}
				resetSession();
			};
			mediaRecorderRef.current = recorder;
			recorder.start();
			setSessionActive(true);
			setPaused(false);
			setDuration(0);
			drawVisualizer();
		} catch {
			resetSession();
		}
	};

	const pauseRecording = () => {
		const recorder = mediaRecorderRef.current;
		if (recorder?.state === "recording") {
			recorder.pause();
			setPaused(true);
			stopVisualizer();
		}
	};

	const resumeRecording = () => {
		const recorder = mediaRecorderRef.current;
		if (recorder?.state === "paused") {
			recorder.resume();
			setPaused(false);
			drawVisualizer();
		}
	};

	const finalizeRecording = () => {
		shouldSaveOnStopRef.current = true;
		const recorder = mediaRecorderRef.current;
		if (recorder && recorder.state !== "inactive") {
			recorder.stop();
		}
	};

	const deleteRecording = () => {
		stopPreview();
		if (sessionActive) {
			shouldSaveOnStopRef.current = false;
			const recorder = mediaRecorderRef.current;
			if (recorder && recorder.state !== "inactive") {
				recorder.stop();
			} else {
				resetSession();
			}
			setDuration(0);
			return;
		}
		if (value) {
			onChange(null);
			setDuration(0);
			return;
		}
		if (existingAudioUrl) {
			onExistingAudioClear?.();
			setDuration(0);
		}
	};

	const togglePreview = () => {
		const audio = previewAudioRef.current;
		if (!audio || !previewSrc) return;
		if (previewPlaying) {
			audio.pause();
			return;
		}
		void audio.play().catch(() => {
			setPreviewPlaying(false);
		});
	};

	const handleMainButton = () => {
		if (hasCompletedRecording) {
			togglePreview();
			return;
		}
		if (isRecording) {
			pauseRecording();
			return;
		}
		if (sessionActive && paused) {
			resumeRecording();
			return;
		}
		if (!sessionActive && !value && !existingAudioUrl) {
			void startRecording();
		}
	};

	useEffect(() => {
		if (!isRecording) return;
		const interval = window.setInterval(() => {
			setDuration((d) => d + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, [isRecording]);

	// Mounted by AudioCaptureCard's "Record Audio" button, which has already
	// taken the user's click. The ref guard keeps a re-render from restarting
	// a session that is already live.
	const autoStartedRef = useRef(false);
	// biome-ignore lint/correctness/useExhaustiveDependencies: startRecording is re-created every render; the ref guard makes a single run the contract
	useEffect(() => {
		if (!autoStart || autoStartedRef.current) return;
		autoStartedRef.current = true;
		void startRecording();
	}, [autoStart]);

	// Resolve a local blob URL for saved or newly recorded audio so duration + playback work.
	useEffect(() => {
		let cancelled = false;

		const applyPreviewSrc = (nextSrc: string | null) => {
			if (!cancelled) {
				setPreviewSrc(nextSrc);
				setPreviewCurrentTime(0);
				setPreviewDuration(0);
				setPreviewPlaying(false);
			}
		};

		stopPreview();
		revokePreviewObjectUrl();

		if (value) {
			const url = URL.createObjectURL(value);
			previewObjectUrlRef.current = url;
			applyPreviewSrc(url);
			return () => {
				cancelled = true;
				revokePreviewObjectUrl();
				applyPreviewSrc(null);
			};
		}

		if (!existingAudioUrl) {
			applyPreviewSrc(null);
			return () => {
				cancelled = true;
			};
		}

		applyPreviewSrc(existingAudioUrl);

		void fetch(existingAudioUrl)
			.then((res) => {
				if (!res.ok) throw new Error("fetch failed");
				return res.blob();
			})
			.then((blob) => {
				if (cancelled) return;
				revokePreviewObjectUrl();
				const url = URL.createObjectURL(blob);
				previewObjectUrlRef.current = url;
				applyPreviewSrc(url);
			})
			.catch(() => {
				// Keep direct URL fallback for playback.
			});

		return () => {
			cancelled = true;
			revokePreviewObjectUrl();
			applyPreviewSrc(null);
		};
	}, [value, existingAudioUrl, revokePreviewObjectUrl, stopPreview]);

	useEffect(() => {
		const audio = previewAudioRef.current;
		if (!audio || !previewSrc) return;

		const onPlay = () => setPreviewPlaying(true);
		const onPause = () => setPreviewPlaying(false);
		const onEnded = () => {
			setPreviewPlaying(false);
			setPreviewCurrentTime(0);
		};
		const onTimeUpdate = () => setPreviewCurrentTime(audio.currentTime);
		const syncDuration = () => {
			if (Number.isFinite(audio.duration) && audio.duration > 0) {
				setPreviewDuration(audio.duration);
			}
		};

		audio.addEventListener("play", onPlay);
		audio.addEventListener("pause", onPause);
		audio.addEventListener("ended", onEnded);
		audio.addEventListener("timeupdate", onTimeUpdate);
		audio.addEventListener("loadedmetadata", syncDuration);
		audio.addEventListener("durationchange", syncDuration);

		syncDuration();

		return () => {
			audio.removeEventListener("play", onPlay);
			audio.removeEventListener("pause", onPause);
			audio.removeEventListener("ended", onEnded);
			audio.removeEventListener("timeupdate", onTimeUpdate);
			audio.removeEventListener("loadedmetadata", syncDuration);
			audio.removeEventListener("durationchange", syncDuration);
		};
	}, [previewSrc]);

	useEffect(() => {
		return () => {
			stopPreview();
			revokePreviewObjectUrl();
			if (mediaRecorderRef.current?.state === "recording") {
				shouldSaveOnStopRef.current = false;
				mediaRecorderRef.current.stop();
			}
			stopStream();
		};
	}, [stopPreview, stopStream, revokePreviewObjectUrl]);

	const mainButtonLabel = (() => {
		if (hasCompletedRecording) {
			return previewPlaying ? "Pause playback" : "Play recording";
		}
		if (isRecording) return "Pause recording";
		if (sessionActive && paused) return "Resume recording";
		return "Start recording";
	})();

	const showMainAsActive = isRecording || (sessionActive && paused);
	const completedDuration = previewDuration > 0 ? previewDuration : 0;
	const displaySeconds = (() => {
		if (sessionActive) {
			return formatDurationSeconds(duration);
		}
		if (hasCompletedRecording) {
			if (previewPlaying || previewCurrentTime > 0) {
				return `${formatDurationSeconds(previewCurrentTime)} / ${formatDurationSeconds(completedDuration)}`;
			}
			return formatDurationSeconds(completedDuration);
		}
		return formatDurationSeconds(0);
	})();
	const playbackProgress =
		hasCompletedRecording && completedDuration > 0
			? previewCurrentTime / completedDuration
			: 0;

	return (
		<div className="flex w-full flex-row flex-wrap items-center gap-3">
			{previewSrc ? (
				<audio
					key={previewSrc}
					ref={previewAudioRef}
					src={previewSrc}
					preload="metadata"
					className="hidden"
				>
					<track kind="captions" />
				</audio>
			) : null}

			<button
				type="button"
				onClick={handleMainButton}
				className="flex size-10 shrink-0 items-center justify-center rounded p-1 hover:opacity-80"
				style={{
					color: showMainAsActive
						? brand.destructive
						: accentColor || brand.alert,
				}}
				aria-label={mainButtonLabel}
			>
				{hasCompletedRecording ? (
					previewPlaying ? (
						<Pause className="size-8 fill-current" aria-hidden />
					) : (
						<Play className="size-8 fill-current" aria-hidden />
					)
				) : isRecording ? (
					<Pause className="size-8 fill-current" aria-hidden />
				) : (
					<Play className="size-8 fill-current" aria-hidden />
				)}
			</button>

			<div
				className={cn(
					"relative h-11 min-h-11 w-full min-w-[200px] max-w-[300px] flex-1 overflow-hidden rounded-[10px] border bg-white",
					invalid ? "border-[#b0200c]" : "border-[#c7c7c7]",
				)}
			>
				<canvas
					ref={canvasRef}
					width={300}
					height={44}
					className="absolute inset-0 size-full"
					aria-hidden
				/>
				<div className="absolute inset-0 flex items-end justify-around px-2 pb-1.5">
					{VISUALIZER_BAR_IDS.map((barId, i) => {
						const barProgress = (i + 1) / VISUALIZER_BAR_IDS.length;
						const played =
							hasCompletedRecording && barProgress <= playbackProgress;
						return (
							<div
								key={barId}
								className="w-[5px] rounded-sm transition-colors duration-150"
								style={{
									height: bars[i] ?? 6,
									backgroundColor: played
										? accentColor || brand.alert
										: "#c7c7c7",
									opacity: played && previewPlaying ? 1 : played ? 0.85 : 0.55,
								}}
							/>
						);
					})}
				</div>
			</div>

			<span className="shrink-0 font-normal text-[#1a1a1a] text-sm tabular-nums leading-[1.4]">
				{displaySeconds}
			</span>

			{sessionActive ? (
				<div className="flex shrink-0 items-center gap-1">
					<button
						type="button"
						onClick={finalizeRecording}
						className="rounded-lg px-3 py-1.5 font-semibold text-sm hover:opacity-80"
						style={{ color: accentColor || brand.alert }}
					>
						Done
					</button>
					<button
						type="button"
						onClick={deleteRecording}
						className="flex size-9 items-center justify-center rounded-lg text-[#525252] hover:bg-[#f5f5f5] hover:text-[#b0200c]"
						aria-label="Delete recording"
					>
						<Trash2 className="size-4" aria-hidden />
					</button>
				</div>
			) : hasCompletedRecording ? (
				<button
					type="button"
					onClick={deleteRecording}
					className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[#525252] hover:bg-[#f5f5f5] hover:text-[#b0200c]"
					aria-label="Delete recording"
				>
					<Trash2 className="size-4" aria-hidden />
				</button>
			) : null}
		</div>
	);
}
