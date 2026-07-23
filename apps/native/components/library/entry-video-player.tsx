import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useState } from "react";
import { Image, Pressable, View } from "react-native";

type EntryVideoPlayerProps = {
	uri: string;
	/** Entry cover frame, shown until playback starts. */
	posterUri?: string;
};

/**
 * Poster-first video player. The cover frame carries a play badge (so a video
 * entry reads like a photo entry in the timeline); tapping it hands over to the
 * platform player with its own controls.
 */
export function EntryVideoPlayer({ uri, posterUri }: EntryVideoPlayerProps) {
	const [started, setStarted] = useState(false);

	const player = useVideoPlayer(uri, (instance) => {
		instance.loop = false;
	});

	function start() {
		setStarted(true);
		player.play();
	}

	return (
		<View className="overflow-hidden rounded-2xl bg-black">
			<VideoView
				player={player}
				style={{ width: "100%", height: 240 }}
				contentFit="contain"
				fullscreenOptions={{ enable: true }}
				allowsPictureInPicture
				nativeControls={started}
			/>

			{started ? null : (
				<Pressable
					onPress={start}
					accessibilityRole="button"
					accessibilityLabel="Play video"
					className="absolute inset-0 items-center justify-center active:opacity-90"
				>
					{posterUri ? (
						<Image
							source={{ uri: posterUri }}
							className="absolute inset-0 h-full w-full"
							resizeMode="cover"
							accessibilityIgnoresInvertColors
						/>
					) : null}
					<View className="size-16 items-center justify-center rounded-full bg-black/55">
						<Ionicons name="play" size={30} color="#ffffff" />
					</View>
				</Pressable>
			)}
		</View>
	);
}
