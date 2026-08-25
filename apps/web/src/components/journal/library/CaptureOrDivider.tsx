import {
	captureOrRowClass,
	captureOrRuleClass,
	captureOrTextClass,
} from "@/components/journal/library/entryFormStyles";

/** The "or pick one instead" separator shared by every capture surface. */
export function CaptureOrDivider() {
	return (
		<div className={captureOrRowClass}>
			<span className={captureOrRuleClass} />
			<span className={captureOrTextClass}>OR</span>
			<span className={captureOrRuleClass} />
		</div>
	);
}
