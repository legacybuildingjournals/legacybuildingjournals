import { youtube } from "@legacy-building/ui/lib/brand-journal";
import { useState } from "react";
import { View } from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";

type WelcomeVideoProps = {
	/** Fired once when the YouTube player reports the video finished. */
	onEnded: () => void;
};

/** Embeds the Legacy Building explainer video and reports completion, matching
 * the web welcome page's "watch to continue" gate. Uses a WebView-backed
 * YouTube iframe so we can reliably detect the "ended" state. */
export function WelcomeVideo({ onEnded }: WelcomeVideoProps) {
	const [width, setWidth] = useState(0);

	return (
		<View
			className="w-full overflow-hidden rounded-2xl bg-black"
			onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
		>
			{width > 0 ? (
				<YoutubePlayer
					height={Math.round((width * 9) / 16)}
					width={width}
					videoId={youtube.welcomeVideoId}
					initialPlayerParams={{ rel: false, modestbranding: true }}
					webViewProps={{ allowsInlineMediaPlayback: true }}
					onChangeState={(state: string) => {
						if (state === "ended") onEnded();
					}}
				/>
			) : null}
		</View>
	);
}
