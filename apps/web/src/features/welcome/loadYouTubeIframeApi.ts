const YOUTUBE_IFRAME_API_ID = "youtube-iframe-api";
const YOUTUBE_IFRAME_API_SRC = "https://www.youtube.com/iframe_api";

export function loadYouTubeIframeApi(): Promise<typeof YT> {
	if (window.YT?.Player) {
		return Promise.resolve(window.YT);
	}

	return new Promise((resolve) => {
		const previous = window.onYouTubeIframeAPIReady;
		window.onYouTubeIframeAPIReady = () => {
			previous?.();
			resolve(window.YT);
		};

		if (!document.getElementById(YOUTUBE_IFRAME_API_ID)) {
			const script = document.createElement("script");
			script.id = YOUTUBE_IFRAME_API_ID;
			script.src = YOUTUBE_IFRAME_API_SRC;
			document.head.appendChild(script);
		}
	});
}
