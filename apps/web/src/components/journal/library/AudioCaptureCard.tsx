import { Mic, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { AudioRecorderField } from "@/components/journal/library/AudioRecorderField";
import { CaptureOrDivider } from "@/components/journal/library/CaptureOrDivider";
import {
	captureCardClass,
	captureCopyClass,
	captureFilledButtonClass,
	captureIconCircleClass,
	captureOutlineButtonClass,
	captureTitleClass,
	entryErrorTextClass,
	MAX_AUDIO_BYTES,
} from "@/components/journal/library/entryFormStyles";
import { Button } from "@/components/journal/ui/button";

type AudioCaptureCardProps = {
	accentColor: string;
	value: File | null;
	onChange: (file: File | null) => void;
	invalid?: boolean;
};

/**
 * Empty state for an audio entry, matching the video tab's capture card.
 *
 * The moment a clip exists — recorded here or picked from disk — the existing
 * waveform recorder takes over, so this only owns the empty state.
 */
export function AudioCaptureCard({
	accentColor,
	value,
	onChange,
	invalid,
}: AudioCaptureCardProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [recording, setRecording] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		// Reset so re-picking the same file still fires a change event.
		event.target.value = "";
		if (!file) return;
		if (file.size > MAX_AUDIO_BYTES) {
			setError("Audio must be 50 MB or smaller.");
			return;
		}
		setError(null);
		onChange(file);
	}

	const fileInput = (
		<input
			ref={inputRef}
			type="file"
			accept="audio/*"
			className="hidden"
			onChange={handleFile}
		/>
	);

	if (value !== null || recording) {
		return (
			<div className="flex w-full flex-col gap-2">
				<AudioRecorderField
					accentColor={accentColor}
					value={value}
					onChange={(next) => {
						// Deleting the clip drops back to the card.
						if (next === null) setRecording(false);
						onChange(next);
					}}
					autoStart={recording && value === null}
					invalid={invalid}
				/>
				{fileInput}
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col gap-2">
			{error ? (
				<p className={entryErrorTextClass} role="alert">
					{error}
				</p>
			) : null}

			<div
				aria-invalid={invalid}
				className={captureCardClass}
				style={{
					borderColor: invalid ? "#b0200c" : accentColor,
					backgroundColor: `${accentColor}0d`,
				}}
			>
				<span
					className={captureIconCircleClass}
					style={{ backgroundColor: `${accentColor}1a` }}
				>
					<Mic
						className="size-6"
						style={{ color: accentColor }}
						strokeWidth={2}
						aria-hidden
					/>
				</span>

				<h4 className={captureTitleClass}>Capture Your Memory</h4>
				<p className={captureCopyClass}>
					Record a new audio clip or choose one from your files.
				</p>

				<Button
					type="button"
					onClick={() => setRecording(true)}
					className={captureFilledButtonClass}
					style={{ backgroundColor: accentColor }}
				>
					<Mic className="mr-2 size-4" />
					Record Audio
				</Button>

				<CaptureOrDivider />

				<Button
					type="button"
					variant="outline"
					onClick={() => inputRef.current?.click()}
					className={captureOutlineButtonClass}
					style={{ borderColor: accentColor, color: accentColor }}
				>
					<Upload className="mr-2 size-4" />
					Choose From Files
				</Button>
			</div>

			{fileInput}
		</div>
	);
}
