import { brand } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { Pause, Play, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const VISUALIZER_BAR_IDS = Array.from(
	{ length: 40 },
	(_, n) => `recorder-bar-${n}`,
);

function formatDurationSeconds(totalSeconds: number): string {
	const seconds = Math.max(0, totalSeconds);
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	if (mins === 0) return String(secs);
	return `${mins}:${String(secs).padStart(2, "0")}`;
}

type AudioRecorderFieldProps = {
	accentColor: string;
	value: File | null;
	onChange: (file: File | null) => void;
	invalid?: boolean;
};

/** Bubble recording row: 40px control, waveform box (max 300px), duration. */
export function AudioRecorderField({
	accentColor,
	value,
	onChange,
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
	const previewUrlRef = useRef<string | null>(null);

	const [sessionActive, setSessionActive] = useState(false);
	const [paused, setPaused] = useState(false);
	const [previewPlaying, setPreviewPlaying] = useState(false);
	const [duration, setDuration] = useState(0);
	const [bars, setBars] = useState<number[]>(() =>
		Array.from({ length: 40 }, () => 6),
	);

	const isRecording = sessionActive && !paused;
	const hasCompletedRecording = value !== null && !sessionActive;

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

			const recorder = new MediaRecorder(stream);
			chunksRef.current = [];
			shouldSaveOnStopRef.current = true;
			recorder.ondataavailable = (e) => {
				if (e.data.size > 0) chunksRef.current.push(e.data);
			};
			recorder.onstop = () => {
				if (shouldSaveOnStopRef.current && chunksRef.current.length > 0) {
					const blob = new Blob(chunksRef.current, { type: "audio/webm" });
					const file = new File([blob], `recording-${Date.now()}.webm`, {
						type: blob.type || "audio/webm",
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
		onChange(null);
		setDuration(0);
	};

	const togglePreview = () => {
		if (!value) return;
		if (previewPlaying) {
			stopPreview();
			return;
		}

		if (previewUrlRef.current) {
			URL.revokeObjectURL(previewUrlRef.current);
			previewUrlRef.current = null;
		}
		previewAudioRef.current?.pause();
		previewAudioRef.current = null;

		const url = URL.createObjectURL(value);
		previewUrlRef.current = url;
		const audio = new Audio(url);
		previewAudioRef.current = audio;
		audio.onended = () => setPreviewPlaying(false);
		void audio
			.play()
			.then(() => setPreviewPlaying(true))
			.catch(() => {
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
		if (!sessionActive && !value) {
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

	useEffect(() => {
		if (!value || sessionActive) return;
		const url = URL.createObjectURL(value);
		const audio = new Audio(url);
		const onLoaded = () => {
			if (Number.isFinite(audio.duration)) {
				setDuration(Math.max(1, Math.round(audio.duration)));
			}
			URL.revokeObjectURL(url);
		};
		audio.addEventListener("loadedmetadata", onLoaded);
		audio.load();
		return () => {
			audio.removeEventListener("loadedmetadata", onLoaded);
			URL.revokeObjectURL(url);
		};
	}, [value, sessionActive]);

	useEffect(() => {
		stopPreview();
		if (previewUrlRef.current) {
			URL.revokeObjectURL(previewUrlRef.current);
			previewUrlRef.current = null;
		}
		previewAudioRef.current = null;
	}, [value, stopPreview]);

	useEffect(() => {
		return () => {
			stopPreview();
			if (previewUrlRef.current) {
				URL.revokeObjectURL(previewUrlRef.current);
			}
			if (mediaRecorderRef.current?.state === "recording") {
				shouldSaveOnStopRef.current = false;
				mediaRecorderRef.current.stop();
			}
			stopStream();
		};
	}, [stopPreview, stopStream]);

	const mainButtonLabel = (() => {
		if (hasCompletedRecording) {
			return previewPlaying ? "Pause playback" : "Play recording";
		}
		if (isRecording) return "Pause recording";
		if (sessionActive && paused) return "Resume recording";
		return "Start recording";
	})();

	const showMainAsActive = isRecording || (sessionActive && paused);
	const displaySeconds = formatDurationSeconds(
		sessionActive || value
			? Math.max(duration, sessionActive && !value ? 0 : 1)
			: 0,
	);

	return (
		<div className="flex w-full flex-row flex-wrap items-center gap-3">
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
					{VISUALIZER_BAR_IDS.map((barId, i) => (
						<div
							key={barId}
							className="w-[5px] rounded-sm bg-[#c7c7c7]"
							style={{ height: bars[i] ?? 6 }}
						/>
					))}
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
