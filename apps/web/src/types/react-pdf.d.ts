import type { FC, PropsWithChildren, ReactNode } from "react";

declare module "@react-pdf/renderer" {
	export const Document: FC<PropsWithChildren<Record<string, unknown>>>;
	export const Page: FC<PropsWithChildren<Record<string, unknown>>>;
	export const View: FC<PropsWithChildren<Record<string, unknown>>>;
	export const Text: FC<PropsWithChildren<Record<string, unknown>>>;
	export const Image: FC<PropsWithChildren<Record<string, unknown>>>;
	export const PDFViewer: FC<PropsWithChildren<Record<string, unknown>>>;
	export const StyleSheet: {
		create<T extends Record<string, unknown>>(styles: T): T;
	};
	export const Font: {
		register: (options: Record<string, unknown>) => void;
	};
	export function pdf(element: ReactNode): {
		toBlob: () => Promise<Blob>;
		toBuffer: () => Promise<Buffer>;
	};
}
