import { Component, type ReactNode } from "react";
import { Text, View } from "react-native";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false };

	static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	render() {
		if (!this.state.hasError) return this.props.children;

		return (
			<View className="flex-1 items-center justify-center gap-3 bg-background px-6">
				<Text className="text-center font-semibold text-foreground text-lg">
					Something went wrong
				</Text>
				<Text className="text-center text-muted-foreground text-sm">
					Please close and reopen the app.
				</Text>
			</View>
		);
	}
}
