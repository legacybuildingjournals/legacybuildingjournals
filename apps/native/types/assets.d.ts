declare module "@legacy-building/assets/images/*.jpeg" {
	const src: number;
	export default src;
}

declare module "@legacy-building/assets/images/*.jpg" {
	const src: number;
	export default src;
}

declare module "@legacy-building/assets/images/*.png" {
	const src: number;
	export default src;
}

// Local app assets (imported via the "@/" alias).
declare module "@/assets/images/*.jpeg" {
	const src: number;
	export default src;
}

declare module "@/assets/images/*.jpg" {
	const src: number;
	export default src;
}

declare module "@/assets/images/*.png" {
	const src: number;
	export default src;
}
