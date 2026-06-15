export {};

declare global {
	namespace YT {
		enum PlayerState {
			ENDED = 0,
			PLAYING = 1,
			PAUSED = 2,
			BUFFERING = 3,
			CUED = 5,
		}

		interface PlayerOptions {
			width?: string | number;
			height?: string | number;
			videoId?: string;
			playerVars?: Record<string, string | number>;
			events?: {
				onReady?: (event: PlayerEvent) => void;
				onStateChange?: (event: OnStateChangeEvent) => void;
			};
		}

		interface PlayerEvent {
			target: Player;
		}

		interface OnStateChangeEvent {
			data: PlayerState;
			target: Player;
		}

		class Player {
			constructor(elementId: string | HTMLElement, options: PlayerOptions);
			destroy(): void;
		}
	}

	interface Window {
		YT: typeof YT;
		onYouTubeIframeAPIReady?: () => void;
	}
}
