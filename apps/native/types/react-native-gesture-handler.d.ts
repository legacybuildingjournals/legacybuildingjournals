import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";

declare module "react-native-gesture-handler" {
	interface GestureHandlerRootViewProps extends PropsWithChildren {
		style?: StyleProp<ViewStyle>;
	}
}
