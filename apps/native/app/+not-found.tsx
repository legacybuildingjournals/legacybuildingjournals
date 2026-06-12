import { Link, Stack } from "expo-router";
import { Button, Surface } from "heroui-native";
import { Text, View } from "react-native";

import { Container } from "@/components/container";

export default function NotFoundScreen() {
	return (
		<>
			<Stack.Screen options={{ title: "Oops!" }} />
			<Container className="flex-1" isScrollable={false}>
				<View className="flex-1 items-center justify-center p-4">
					<Surface
						variant="secondary"
						className="w-full max-w-sm rounded-lg p-5"
					>
						<View className="items-center gap-3">
							<Text className="font-medium text-foreground text-lg">
								Page not found
							</Text>
							<Text className="text-center text-muted text-sm">
								This screen doesn&apos;t exist or has moved.
							</Text>
						</View>
						<Link href="/" asChild>
							<Button className="mt-4 w-full" size="sm">
								<Button.Label>Go home</Button.Label>
							</Button>
						</Link>
					</Surface>
				</View>
			</Container>
		</>
	);
}
