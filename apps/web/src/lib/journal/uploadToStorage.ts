import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";

export async function uploadToStorage(
	file: File | Blob,
	generateUploadUrl: () => Promise<string>,
	contentType: string,
	/** Fraction (0–1) of the file body sent so far. Large video uploads can
	 * take a while; without this the "Creating…" button looks stuck. */
	onProgress?: (fraction: number) => void,
): Promise<Id<"_storage">> {
	const uploadUrl = await generateUploadUrl();

	// `fetch` doesn't expose upload progress in browsers, so XHR is used
	// here instead purely to drive the progress callback.
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open("POST", uploadUrl);
		xhr.setRequestHeader("Content-Type", contentType);

		xhr.upload.onprogress = (event) => {
			if (event.lengthComputable) {
				onProgress?.(event.loaded / event.total);
			}
		};

		xhr.onerror = () => {
			reject(new Error("Upload failed: network error"));
		};

		xhr.onload = () => {
			if (xhr.status < 200 || xhr.status >= 300) {
				reject(
					new Error(
						xhr.responseText
							? `Upload failed (${xhr.status}): ${xhr.responseText}`
							: `Upload failed (${xhr.status})`,
					),
				);
				return;
			}

			try {
				const json = JSON.parse(xhr.responseText) as {
					storageId?: Id<"_storage">;
				};
				if (!json.storageId) {
					reject(
						new Error("Upload failed: server did not return a storage id"),
					);
					return;
				}
				onProgress?.(1);
				resolve(json.storageId);
			} catch {
				reject(new Error("Upload failed: invalid server response"));
			}
		};

		xhr.send(file);
	});
}
