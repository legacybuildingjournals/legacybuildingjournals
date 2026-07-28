/**
 * Social brand marks.
 *
 * Hand-rolled rather than imported: lucide dropped its brand icons in v1, and
 * these need to be the real logos in the real brand colours. Each takes its
 * colour from `currentColor`, so the caller sets it on the wrapper.
 */

type IconProps = { className?: string };

export function YouTubeIcon({ className }: IconProps) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
			focusable="false"
		>
			<path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z" />
		</svg>
	);
}

export function FacebookIcon({ className }: IconProps) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
			focusable="false"
		>
			<path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" />
		</svg>
	);
}

export function InstagramIcon({ className }: IconProps) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			focusable="false"
		>
			<rect x="2" y="2" width="20" height="20" rx="5.5" />
			<circle cx="12" cy="12" r="4.5" />
			<circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
		</svg>
	);
}

export function TikTokIcon({ className }: IconProps) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
			focusable="false"
		>
			<path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 1 1 .77-5.06V9.7a5.68 5.68 0 0 0-.77-.05A5.66 5.66 0 1 0 15.54 15.3V8.9a7.34 7.34 0 0 0 4.29 1.38V7.2a4.28 4.28 0 0 1-3.23-1.38Z" />
		</svg>
	);
}
