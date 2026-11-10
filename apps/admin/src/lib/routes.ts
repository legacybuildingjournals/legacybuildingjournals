export const ROUTES = {
	home: "/",
	signIn: "/sign-in",
	dashboard: "/dashboard",
	users: "/users",
	subscriptions: "/subscriptions",
	gifts: "/gifts",
	settings: "/settings",
} as const;

export type AppPath = (typeof ROUTES)[keyof typeof ROUTES];
