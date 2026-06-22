import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
} from "react";
import { Uniwind, useUniwind } from "uniwind";

// The app is light-only — ignore the device's dark-mode setting. Setting it at
// module load (before first paint) avoids a dark flash on launch.
Uniwind.setTheme("light");

type ThemeName = "light" | "dark";

type AppThemeContextType = {
	currentTheme: string;
	isLight: boolean;
	isDark: boolean;
	setTheme: (theme: ThemeName) => void;
	toggleTheme: () => void;
};

const AppThemeContext = createContext<AppThemeContextType | undefined>(
	undefined,
);

export const AppThemeProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const { theme } = useUniwind();

	// Keep the app in light mode regardless of the OS appearance — re-force it if
	// the system theme changes while the app is open.
	useEffect(() => {
		if (theme !== "light") {
			Uniwind.setTheme("light");
		}
	}, [theme]);

	const isLight = useMemo(() => {
		return theme === "light";
	}, [theme]);

	const isDark = useMemo(() => {
		return theme === "dark";
	}, [theme]);

	const setTheme = useCallback((newTheme: ThemeName) => {
		Uniwind.setTheme(newTheme);
	}, []);

	const toggleTheme = useCallback(() => {
		Uniwind.setTheme(theme === "light" ? "dark" : "light");
	}, [theme]);

	const value = useMemo(
		() => ({
			currentTheme: theme,
			isLight,
			isDark,
			setTheme,
			toggleTheme,
		}),
		[theme, isLight, isDark, setTheme, toggleTheme],
	);

	return (
		<AppThemeContext.Provider value={value}>
			{children}
		</AppThemeContext.Provider>
	);
};

export function useAppTheme() {
	const context = useContext(AppThemeContext);
	if (!context) {
		throw new Error("useAppTheme must be used within AppThemeProvider");
	}
	return context;
}
