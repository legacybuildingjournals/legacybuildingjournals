import { youtube } from "@legacy-building/ui/lib/brand-journal";
import { useState } from "react";
import { View } from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";

/** Embeds the Legacy Building explainer video. Watching it is optional. */
export function WelcomeVideo() {
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
				/>
			) : null}
		</View>
	);
}
