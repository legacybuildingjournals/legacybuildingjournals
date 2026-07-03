import { useAuth } from "@clerk/expo";
import { type Href, Link, Redirect, useRouter } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";
import { AuthPrimaryButton } from "@/components/auth/auth-primary-button";
import { AuthScreen } from "@/components/auth/auth-screen";
import { LoadingScreen } from "@/components/loading-screen";
import { nativeImages } from "@/lib/assets";

export default function AuthHomePage() {
	const router = useRouter();
	const { isLoaded, isSignedIn } = useAuth();

	if (!isLoaded) {
		return <LoadingScreen />;
	}

	if (isSignedIn) {
		return <Redirect href="/(tabs)" />;
	}

	return (
		<AuthScreen scroll={false}>
			<View className="items-center gap-7">
				<Image
					source={nativeImages.verticalLogo}
					className="h-[124px] w-[180px]"
					resizeMode="contain"
					accessibilityLabel="Legacy Building"
				/>

				<Text className="font-medium text-[22px] text-primary-foreground tracking-wide">
					Write Your Story
				</Text>

				<View className="mt-3 w-full gap-5">
					<AuthPrimaryButton
						label="Sign Up"
						onPress={() => router.push("/sign-up" as Href)}
					/>
					<View className="flex-row flex-wrap justify-center">
						<Text className="text-[15px] text-primary-foreground">
							Already have an account?{"  "}
						</Text>
						<Link href={"/sign-in" as Href} asChild>
							<Pressable accessibilityRole="link" className="active:opacity-60">
								<Text className="font-semibold text-[15px] text-primary-foreground underline">
									Log in
								</Text>
							</Pressable>
						</Link>
					</View>
				</View>
			</View>
		</AuthScreen>
	);
}
