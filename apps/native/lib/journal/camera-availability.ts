import * as Device from "expo-device";

/**
 * Simulators have no camera. Handing `UIImagePickerController` a `.camera`
 * source there raises an ObjC exception from `setMediaTypes:` that aborts the
 * process — it is not a rejected promise, so it cannot be caught in JS. The
 * only safe move is to never launch the camera when one isn't present.
 */
export function isCameraAvailable(): boolean {
	return Device.isDevice;
}

export const NO_CAMERA_MESSAGE =
	"This device has no camera. Choose from your gallery instead, or try again on a real device.";
