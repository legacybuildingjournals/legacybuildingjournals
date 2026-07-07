import { useNativeDeviceInfoSync } from "@/hooks/use-native-device-info-sync";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function NativeAppProviders({
	children,
}: {
	children: React.ReactNode;
}) {
	useNativeDeviceInfoSync();
	usePushNotifications();

	return children;
}
