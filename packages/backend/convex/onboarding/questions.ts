/**
 * Onboarding question set.
 *
 * Dependency-free so both clients and the server validator import the same
 * definitions — the questionnaire is rendered from this file on web and native,
 * and answers are validated against it in `mutations.ts`.
 *
 * Q1 asks who the journal is for and selects one of five variants. Q2-Q5 are
 * reworded per recipient; Q6 differs only in one word; Q7 is shared verbatim.
 * The five variants stay separate even where they agree, because the wording is
 * meant to be tuned per relationship rather than collapsed behind a "self vs
 * someone else" flag.
 *
 * Slots are fixed: WHO, WHY, WHAT, MEANING, VALUE, HOW, CONFIRMATION. Two
 * questions must never collect the same thing.
 */

export const RECIPIENTS = [
	"child",
	"grandchild",
	"partner",
	"other",
	"myself",
] as const;

export type Recipient = (typeof RECIPIENTS)[number];

export const QUESTION_SLOTS = [
	"why",
	"what",
	"meaning",
	"value",
	"how",
	"confirmation",
] as const;

export type QuestionSlot = (typeof QUESTION_SLOTS)[number];

/** Decorative chip colors for option icons, mirroring the `--chart-N` idiom. */
export const OPTION_TINTS = [
	"chip-1",
	"chip-2",
	"chip-3",
	"chip-4",
	"chip-5",
] as const;

export type OptionTint = (typeof OPTION_TINTS)[number];

/**
 * Platform-neutral icon keys. Web and native use different icon libraries, so
 * each maps these to its own glyphs; typing the maps as `Record<OptionIcon, _>`
 * means adding a key here fails the build until both clients handle it.
 */
export const OPTION_ICONS = [
	"album",
	"book",
	"camera",
	"chat",
	"chats",
	"clock",
	"compass",
	"everything",
	"eye",
	"family",
	"footsteps",
	"gift",
	"globe",
	"growth",
	"heart",
	"heartCircle",
	"home",
	"hourglass",
	"idea",
	"leaf",
	"lineage",
	"mic",
	"mix",
	"people",
	"person",
	"personAdd",
	"question",
	"ribbon",
	"school",
	"smile",
	"sparkle",
	"trophy",
	"video",
	"write",
] as const;

export type OptionIcon = (typeof OPTION_ICONS)[number];

export type QuestionOption = {
	id: string;
	label: string;
	icon: OptionIcon;
	tint: OptionTint;
	/**
	 * Prose form used when the result screen reflects this answer back in a
	 * sentence. Falls back to a lowercased `label`, which reads correctly for
	 * most options but not all ("Myself" -> "myself" is fine, "Who I was at
	 * different points in my life" needs no change, but "My voice" does).
	 */
	phrase?: string;
};

export type Question = {
	id: string;
	slot: QuestionSlot | "who";
	prompt: string;
	/** Sub-copy under the prompt. */
	helper?: string;
	/** Small-caps label above the prompt; absent on Q1, which sets the context. */
	eyebrow?: string;
	/** Optional encouragement card at the foot of the screen. */
	footer?: string;
	options: QuestionOption[];
};

/** questionId -> optionId */
export type AnswerRecord = Record<string, string>;

export const TOTAL_QUESTIONS = 7;

const EVERYTHING: QuestionOption = {
	id: "everything",
	label: "A little of everything",
	icon: "everything",
	tint: "chip-5",
	phrase: "a little of everything",
};

// --- Q1 -------------------------------------------------------------------

export const RECIPIENT_QUESTION: Question = {
	id: "recipient",
	slot: "who",
	prompt: "Who would you most want to create a journal for?",
	helper:
		"Your answer helps us personalize your experience and the questions that follow.",
	options: [
		{
			id: "child",
			label: "My child or children",
			icon: "people",
			tint: "chip-1",
		},
		{
			id: "grandchild",
			label: "My grandchild or grandchildren",
			icon: "family",
			tint: "chip-2",
		},
		{
			id: "partner",
			label: "My partner",
			icon: "heart",
			tint: "chip-3",
		},
		{
			id: "other",
			label: "Another family member or someone important to me",
			icon: "personAdd",
			tint: "chip-4",
		},
		{
			id: "myself",
			label: "Myself",
			icon: "person",
			tint: "chip-5",
		},
	],
};

// --- Q6 / Q7 --------------------------------------------------------------

/** Identical across every variant; only Q6's prompt changes one word. */
const CAPTURE_OPTIONS: QuestionOption[] = [
	{
		id: "writing",
		label: "Writing",
		icon: "write",
		tint: "chip-1",
		phrase: "writing",
	},
	{
		id: "voice",
		label: "My voice",
		icon: "mic",
		tint: "chip-2",
		phrase: "your own voice",
	},
	{
		id: "video",
		label: "Video",
		icon: "video",
		tint: "chip-3",
		phrase: "video",
	},
	{
		id: "combination",
		label: "A combination of them",
		icon: "mix",
		tint: "chip-4",
		phrase: "a mix of ways",
	},
];

const CONFIRMATION_QUESTION: Question = {
	id: "confirmation",
	slot: "confirmation",
	prompt:
		"How would it feel knowing these stories and memories were being preserved for the future?",
	options: [
		{
			id: "very_meaningful",
			label: "Very meaningful to me",
			icon: "heartCircle",
			tint: "chip-1",
		},
		{
			id: "would_value",
			label: "I think I'd value that",
			icon: "sparkle",
			tint: "chip-2",
		},
		{
			id: "curious",
			label: "I'm curious to try it",
			icon: "compass",
			tint: "chip-3",
		},
		{
			id: "unsure",
			label: "I'm not sure yet",
			icon: "question",
			tint: "chip-4",
		},
	],
};

function captureQuestion(prompt: string, footer?: string): Question {
	return {
		id: "capture",
		slot: "how",
		prompt,
		footer,
		options: CAPTURE_OPTIONS,
	};
}

// --- Q2-Q7 per recipient --------------------------------------------------

const CHILD_QUESTIONS: Question[] = [
	{
		id: "why",
		slot: "why",
		prompt: "What would be your biggest reason for keeping this journal?",
		helper:
			"There are no wrong answers. This helps us understand what matters most to you.",
		options: [
			{
				id: "preserve_childhood",
				label: "Preserving their childhood",
				icon: "smile",
				tint: "chip-1",
				phrase: "preserve their childhood",
			},
			{
				id: "share_feelings",
				label: "Sharing my thoughts and feelings with them",
				icon: "chat",
				tint: "chip-2",
				phrase: "share your thoughts and feelings with them",
			},
			{
				id: "pass_lessons",
				label: "Passing along lessons and advice",
				icon: "idea",
				tint: "chip-3",
				phrase: "pass along lessons and advice",
			},
			{
				id: "family_story",
				label: "Helping them understand our family's story",
				icon: "home",
				tint: "chip-4",
				phrase: "help them understand your family's story",
			},
			{
				id: "something_personal",
				label: "Giving them something personal from me",
				icon: "gift",
				tint: "chip-5",
				phrase: "give them something personal from you",
			},
			EVERYTHING,
		],
	},
	{
		id: "what",
		slot: "what",
		prompt: "What kinds of moments would you most want to capture?",
		footer: "The moments you capture today can mean everything tomorrow.",
		options: [
			{
				id: "milestones",
				label: "Milestones and accomplishments",
				icon: "trophy",
				tint: "chip-1",
				phrase: "milestones and accomplishments",
			},
			{
				id: "funny",
				label: "Funny or unexpected moments",
				icon: "smile",
				tint: "chip-2",
				phrase: "the funny and unexpected moments",
			},
			{
				id: "everyday",
				label: "Ordinary everyday memories",
				icon: "camera",
				tint: "chip-3",
				phrase: "the ordinary everyday memories",
			},
			{
				id: "challenges",
				label: "Challenges and what we learned from them",
				icon: "growth",
				tint: "chip-4",
				phrase: "challenges and what you learned from them",
			},
			{
				id: "traditions",
				label: "Family traditions and experiences",
				icon: "leaf",
				tint: "chip-5",
				phrase: "family traditions and experiences",
			},
			EVERYTHING,
		],
	},
	{
		id: "meaning",
		slot: "meaning",
		prompt:
			"Years from now, what would you most want these journals to communicate?",
		options: [
			{
				id: "mean_to_me",
				label: "How much they mean to me",
				icon: "heart",
				tint: "chip-1",
				phrase: "how much they mean to you",
			},
			{
				id: "noticed",
				label: "What I noticed and appreciated about them",
				icon: "eye",
				tint: "chip-2",
				phrase: "what you noticed and appreciated about them",
			},
			{
				id: "time_together",
				label: "What our time together was really like",
				icon: "clock",
				tint: "chip-3",
				phrase: "what your time together was really like",
			},
			{
				id: "unsaid",
				label: "Things I may not always say out loud",
				icon: "chats",
				tint: "chip-4",
				phrase: "the things you may not always say out loud",
			},
			{
				id: "learned",
				label: "What I've learned along the way",
				icon: "school",
				tint: "chip-5",
				phrase: "what you've learned along the way",
			},
			EVERYTHING,
		],
	},
	{
		id: "value",
		slot: "value",
		prompt: "What would make these journals feel most meaningful to you?",
		options: [
			{
				id: "otherwise_forgotten",
				label: "Preserving moments that could otherwise be forgotten",
				icon: "hourglass",
				tint: "chip-1",
				phrase: "preserving moments that could otherwise be forgotten",
			},
			{
				id: "remember_differently",
				label: "Capturing stories we may remember differently later",
				icon: "album",
				tint: "chip-2",
				phrase: "capturing stories you may remember differently later",
			},
			{
				id: "unsaid",
				label: "Sharing thoughts I may not always say out loud",
				icon: "chats",
				tint: "chip-3",
				phrase: "sharing thoughts you may not always say out loud",
			},
			{
				id: "personal",
				label: "Creating something personal for them",
				icon: "gift",
				tint: "chip-4",
				phrase: "creating something personal for them",
			},
			{
				id: "over_time",
				label: "Showing how life changed over time",
				icon: "growth",
				tint: "chip-5",
				phrase: "showing how life changed over time",
			},
			EVERYTHING,
		],
	},
	captureQuestion(
		"How would you most naturally want to capture these stories and memories?",
	),
	CONFIRMATION_QUESTION,
];

const GRANDCHILD_QUESTIONS: Question[] = [
	{
		id: "why",
		slot: "why",
		prompt: "What would be your biggest reason for keeping this journal?",
		helper:
			"There are no wrong answers. This helps us understand what matters most to you.",
		options: [
			{
				id: "family_history",
				label: "Preserving our family's history",
				icon: "home",
				tint: "chip-1",
				phrase: "preserve your family's history",
			},
			{
				id: "share_feelings",
				label: "Sharing my thoughts and feelings with them",
				icon: "chat",
				tint: "chip-2",
				phrase: "share your thoughts and feelings with them",
			},
			{
				id: "pass_lessons",
				label: "Passing along lessons and advice",
				icon: "idea",
				tint: "chip-3",
				phrase: "pass along lessons and advice",
			},
			{
				id: "where_from",
				label: "Helping them know where they come from",
				icon: "lineage",
				tint: "chip-4",
				phrase: "help them know where they come from",
			},
			{
				id: "something_personal",
				label: "Giving them something personal from me",
				icon: "gift",
				tint: "chip-5",
				phrase: "give them something personal from you",
			},
			EVERYTHING,
		],
	},
	{
		id: "what",
		slot: "what",
		prompt: "What kinds of moments would you most want to capture?",
		footer: "Some stories only you can pass down.",
		options: [
			{
				id: "milestones",
				label: "Milestones and accomplishments",
				icon: "trophy",
				tint: "chip-1",
				phrase: "milestones and accomplishments",
			},
			{
				id: "funny",
				label: "Funny or unexpected moments",
				icon: "smile",
				tint: "chip-2",
				phrase: "the funny and unexpected moments",
			},
			{
				id: "everyday",
				label: "Ordinary everyday memories",
				icon: "camera",
				tint: "chip-3",
				phrase: "the ordinary everyday memories",
			},
			{
				id: "own_life",
				label: "Stories from my own life",
				icon: "book",
				tint: "chip-4",
				phrase: "stories from your own life",
			},
			{
				id: "traditions",
				label: "Family traditions and experiences",
				icon: "leaf",
				tint: "chip-5",
				phrase: "family traditions and experiences",
			},
			EVERYTHING,
		],
	},
	{
		id: "meaning",
		slot: "meaning",
		prompt:
			"Years from now, what would you most want these journals to communicate?",
		options: [
			{
				id: "mean_to_me",
				label: "How much they mean to me",
				icon: "heart",
				tint: "chip-1",
				phrase: "how much they mean to you",
			},
			{
				id: "noticed",
				label: "What I noticed and appreciated about them",
				icon: "eye",
				tint: "chip-2",
				phrase: "what you noticed and appreciated about them",
			},
			{
				id: "where_family_came_from",
				label: "Where our family came from",
				icon: "globe",
				tint: "chip-3",
				phrase: "where your family came from",
			},
			{
				id: "unsaid",
				label: "Things I may not always say out loud",
				icon: "chats",
				tint: "chip-4",
				phrase: "the things you may not always say out loud",
			},
			{
				id: "learned",
				label: "What I've learned along the way",
				icon: "school",
				tint: "chip-5",
				phrase: "what you've learned along the way",
			},
			EVERYTHING,
		],
	},
	{
		id: "value",
		slot: "value",
		prompt: "What would make these journals feel most meaningful to you?",
		options: [
			{
				id: "otherwise_forgotten",
				label: "Preserving moments that could otherwise be forgotten",
				icon: "hourglass",
				tint: "chip-1",
				phrase: "preserving moments that could otherwise be forgotten",
			},
			{
				id: "outlast",
				label: "Knowing my stories will outlast me",
				icon: "everything",
				tint: "chip-2",
				phrase: "knowing your stories will outlast you",
			},
			{
				id: "unsaid",
				label: "Sharing thoughts I may not always say out loud",
				icon: "chats",
				tint: "chip-3",
				phrase: "sharing thoughts you may not always say out loud",
			},
			{
				id: "personal",
				label: "Creating something personal for them",
				icon: "gift",
				tint: "chip-4",
				phrase: "creating something personal for them",
			},
			{
				id: "over_time",
				label: "Showing how life changed over time",
				icon: "growth",
				tint: "chip-5",
				phrase: "showing how life changed over time",
			},
			EVERYTHING,
		],
	},
	captureQuestion(
		"How would you most naturally want to capture these stories and memories?",
	),
	CONFIRMATION_QUESTION,
];

const PARTNER_QUESTIONS: Question[] = [
	{
		id: "why",
		slot: "why",
		prompt: "What would be your biggest reason for keeping this journal?",
		helper:
			"There are no wrong answers. This helps us understand what matters most to you.",
		options: [
			{
				id: "life_together",
				label: "Preserving the life we've built together",
				icon: "home",
				tint: "chip-1",
				phrase: "preserve the life you've built together",
			},
			{
				id: "share_feelings",
				label: "Sharing my thoughts and feelings with them",
				icon: "chat",
				tint: "chip-2",
				phrase: "share your thoughts and feelings with them",
			},
			{
				id: "how_we_got_here",
				label: "Remembering how we got here",
				icon: "footsteps",
				tint: "chip-3",
				phrase: "remember how you got here",
			},
			{
				id: "unsaid",
				label: "Saying things I don't always say out loud",
				icon: "chats",
				tint: "chip-4",
				phrase: "say the things you don't always say out loud",
			},
			{
				id: "something_personal",
				label: "Giving them something personal from me",
				icon: "gift",
				tint: "chip-5",
				phrase: "give them something personal from you",
			},
			EVERYTHING,
		],
	},
	{
		id: "what",
		slot: "what",
		prompt: "What kinds of moments would you most want to capture?",
		footer: "The ordinary days are the ones you'll want back.",
		options: [
			{
				id: "milestones",
				label: "Milestones we've shared",
				icon: "trophy",
				tint: "chip-1",
				phrase: "the milestones you've shared",
			},
			{
				id: "funny",
				label: "Funny or unexpected moments",
				icon: "smile",
				tint: "chip-2",
				phrase: "the funny and unexpected moments",
			},
			{
				id: "everyday",
				label: "Ordinary everyday memories",
				icon: "camera",
				tint: "chip-3",
				phrase: "the ordinary everyday memories",
			},
			{
				id: "challenges",
				label: "Challenges we came through together",
				icon: "growth",
				tint: "chip-4",
				phrase: "the challenges you came through together",
			},
			{
				id: "traditions",
				label: "Traditions and experiences we share",
				icon: "leaf",
				tint: "chip-5",
				phrase: "the traditions and experiences you share",
			},
			EVERYTHING,
		],
	},
	{
		id: "meaning",
		slot: "meaning",
		prompt:
			"Years from now, what would you most want these journals to communicate?",
		options: [
			{
				id: "mean_to_me",
				label: "How much they mean to me",
				icon: "heart",
				tint: "chip-1",
				phrase: "how much they mean to you",
			},
			{
				id: "noticed",
				label: "What I notice and appreciate about them",
				icon: "eye",
				tint: "chip-2",
				phrase: "what you notice and appreciate about them",
			},
			{
				id: "life_together",
				label: "What our life together has really been like",
				icon: "clock",
				tint: "chip-3",
				phrase: "what your life together has really been like",
			},
			{
				id: "unsaid",
				label: "Things I may not always say out loud",
				icon: "chats",
				tint: "chip-4",
				phrase: "the things you may not always say out loud",
			},
			{
				id: "learned",
				label: "What I've learned alongside them",
				icon: "school",
				tint: "chip-5",
				phrase: "what you've learned alongside them",
			},
			EVERYTHING,
		],
	},
	{
		id: "value",
		slot: "value",
		prompt: "What would make these journals feel most meaningful to you?",
		options: [
			{
				id: "otherwise_forgotten",
				label: "Preserving moments that could otherwise be forgotten",
				icon: "hourglass",
				tint: "chip-1",
				phrase: "preserving moments that could otherwise be forgotten",
			},
			{
				id: "remember_differently",
				label: "Capturing stories we may remember differently later",
				icon: "album",
				tint: "chip-2",
				phrase: "capturing stories you may remember differently later",
			},
			{
				id: "unsaid",
				label: "Sharing thoughts I may not always say out loud",
				icon: "chats",
				tint: "chip-3",
				phrase: "sharing thoughts you may not always say out loud",
			},
			{
				id: "personal",
				label: "Creating something personal for them",
				icon: "gift",
				tint: "chip-4",
				phrase: "creating something personal for them",
			},
			{
				id: "over_time",
				label: "Showing how our life changed over time",
				icon: "growth",
				tint: "chip-5",
				phrase: "showing how your life changed over time",
			},
			EVERYTHING,
		],
	},
	captureQuestion(
		"How would you most naturally want to capture these stories and memories?",
	),
	CONFIRMATION_QUESTION,
];

const OTHER_QUESTIONS: Question[] = [
	{
		id: "why",
		slot: "why",
		prompt: "What would be your biggest reason for keeping this journal?",
		helper:
			"There are no wrong answers. This helps us understand what matters most to you.",
		options: [
			{
				id: "shared_memories",
				label: "Preserving memories we share",
				icon: "album",
				tint: "chip-1",
				phrase: "preserve the memories you share",
			},
			{
				id: "share_feelings",
				label: "Sharing my thoughts and feelings with them",
				icon: "chat",
				tint: "chip-2",
				phrase: "share your thoughts and feelings with them",
			},
			{
				id: "pass_lessons",
				label: "Passing along lessons and advice",
				icon: "idea",
				tint: "chip-3",
				phrase: "pass along lessons and advice",
			},
			{
				id: "our_story",
				label: "Helping them understand our story",
				icon: "book",
				tint: "chip-4",
				phrase: "help them understand your story",
			},
			{
				id: "something_personal",
				label: "Giving them something personal from me",
				icon: "gift",
				tint: "chip-5",
				phrase: "give them something personal from you",
			},
			EVERYTHING,
		],
	},
	{
		id: "what",
		slot: "what",
		prompt: "What kinds of moments would you most want to capture?",
		footer: "Some people deserve more than a passing mention.",
		options: [
			{
				id: "milestones",
				label: "Milestones and accomplishments",
				icon: "trophy",
				tint: "chip-1",
				phrase: "milestones and accomplishments",
			},
			{
				id: "funny",
				label: "Funny or unexpected moments",
				icon: "smile",
				tint: "chip-2",
				phrase: "the funny and unexpected moments",
			},
			{
				id: "everyday",
				label: "Ordinary everyday memories",
				icon: "camera",
				tint: "chip-3",
				phrase: "the ordinary everyday memories",
			},
			{
				id: "challenges",
				label: "Challenges and what we learned from them",
				icon: "growth",
				tint: "chip-4",
				phrase: "challenges and what you learned from them",
			},
			{
				id: "traditions",
				label: "Traditions and experiences we share",
				icon: "leaf",
				tint: "chip-5",
				phrase: "the traditions and experiences you share",
			},
			EVERYTHING,
		],
	},
	{
		id: "meaning",
		slot: "meaning",
		prompt:
			"Years from now, what would you most want these journals to communicate?",
		options: [
			{
				id: "mean_to_me",
				label: "How much they mean to me",
				icon: "heart",
				tint: "chip-1",
				phrase: "how much they mean to you",
			},
			{
				id: "noticed",
				label: "What I noticed and appreciated about them",
				icon: "eye",
				tint: "chip-2",
				phrase: "what you noticed and appreciated about them",
			},
			{
				id: "time_together",
				label: "What our time together was really like",
				icon: "clock",
				tint: "chip-3",
				phrase: "what your time together was really like",
			},
			{
				id: "unsaid",
				label: "Things I may not always say out loud",
				icon: "chats",
				tint: "chip-4",
				phrase: "the things you may not always say out loud",
			},
			{
				id: "learned",
				label: "What I've learned along the way",
				icon: "school",
				tint: "chip-5",
				phrase: "what you've learned along the way",
			},
			EVERYTHING,
		],
	},
	{
		id: "value",
		slot: "value",
		prompt: "What would make these journals feel most meaningful to you?",
		options: [
			{
				id: "otherwise_forgotten",
				label: "Preserving moments that could otherwise be forgotten",
				icon: "hourglass",
				tint: "chip-1",
				phrase: "preserving moments that could otherwise be forgotten",
			},
			{
				id: "remember_differently",
				label: "Capturing stories we may remember differently later",
				icon: "album",
				tint: "chip-2",
				phrase: "capturing stories you may remember differently later",
			},
			{
				id: "unsaid",
				label: "Sharing thoughts I may not always say out loud",
				icon: "chats",
				tint: "chip-3",
				phrase: "sharing thoughts you may not always say out loud",
			},
			{
				id: "personal",
				label: "Creating something personal for them",
				icon: "gift",
				tint: "chip-4",
				phrase: "creating something personal for them",
			},
			{
				id: "over_time",
				label: "Showing how life changed over time",
				icon: "growth",
				tint: "chip-5",
				phrase: "showing how life changed over time",
			},
			EVERYTHING,
		],
	},
	captureQuestion(
		"How would you most naturally want to capture these stories and memories?",
	),
	CONFIRMATION_QUESTION,
];

const MYSELF_QUESTIONS: Question[] = [
	{
		id: "why",
		slot: "why",
		prompt: "What would be your biggest reason for keeping this journal?",
		helper:
			"There are no wrong answers. This helps us understand what matters most to you.",
		options: [
			{
				id: "remember_experiences",
				label: "Remembering experiences I've had",
				icon: "album",
				tint: "chip-1",
				phrase: "remember the experiences you've had",
			},
			{
				id: "grow_change",
				label: "Seeing how I grow and change",
				icon: "growth",
				tint: "chip-2",
				phrase: "see how you grow and change",
			},
			{
				id: "working_toward",
				label: "Recording what I'm working toward",
				icon: "compass",
				tint: "chip-3",
				phrase: "record what you're working toward",
			},
			{
				id: "thoughts_feelings",
				label: "Capturing my thoughts and feelings",
				icon: "chat",
				tint: "chip-4",
				phrase: "capture your thoughts and feelings",
			},
			{
				id: "preserve_story",
				label: "Preserving my story for the future",
				icon: "hourglass",
				tint: "chip-5",
				phrase: "preserve your story for the future",
			},
			EVERYTHING,
		],
	},
	{
		id: "what",
		slot: "what",
		prompt: "What parts of your life would you most want to capture?",
		footer: "Your story is happening right now.",
		options: [
			{
				id: "milestones",
				label: "Important milestones",
				icon: "trophy",
				tint: "chip-1",
				phrase: "the important milestones",
			},
			{
				id: "everyday",
				label: "Everyday experiences",
				icon: "camera",
				tint: "chip-2",
				phrase: "the everyday experiences of your life",
			},
			{
				id: "challenges",
				label: "Challenges and what I learned from them",
				icon: "growth",
				tint: "chip-3",
				phrase: "challenges and what you learned from them",
			},
			{
				id: "accomplishments",
				label: "Accomplishments I'm proud of",
				icon: "ribbon",
				tint: "chip-4",
				phrase: "the accomplishments you're proud of",
			},
			{
				id: "relationships",
				label: "Relationships and people important to me",
				icon: "people",
				tint: "chip-5",
				phrase: "the relationships and people important to you",
			},
			EVERYTHING,
		],
	},
	{
		id: "meaning",
		slot: "meaning",
		prompt:
			"Years from now, what would you most want these journals to remind you of?",
		options: [
			{
				id: "who_i_was",
				label: "Who I was at different points in my life",
				icon: "person",
				tint: "chip-1",
				phrase: "who you were at different points in your life",
			},
			{
				id: "mattered_most",
				label: "What mattered most to me",
				icon: "heart",
				tint: "chip-2",
				phrase: "what mattered most to you",
			},
			{
				id: "grown_changed",
				label: "How I've grown and changed",
				icon: "growth",
				tint: "chip-3",
				phrase: "how you've grown and changed",
			},
			{
				id: "accomplished",
				label: "Things I've accomplished",
				icon: "trophy",
				tint: "chip-4",
				phrase: "the things you've accomplished",
			},
			{
				id: "lessons",
				label: "Lessons I've learned",
				icon: "school",
				tint: "chip-5",
				phrase: "the lessons you've learned",
			},
			EVERYTHING,
		],
	},
	{
		id: "value",
		slot: "value",
		prompt: "What would make these journals feel most meaningful to you?",
		options: [
			{
				id: "otherwise_forget",
				label: "Preserving moments I might otherwise forget",
				icon: "hourglass",
				tint: "chip-1",
				phrase: "preserving moments you might otherwise forget",
			},
			{
				id: "look_back",
				label: "Being able to look back on my life",
				icon: "eye",
				tint: "chip-2",
				phrase: "being able to look back on your life",
			},
			{
				id: "changed_over_time",
				label: "Seeing how I've changed over time",
				icon: "growth",
				tint: "chip-3",
				phrase: "seeing how you've changed over time",
			},
			{
				id: "thinking_feeling",
				label: "Remembering what I was thinking and feeling",
				icon: "chats",
				tint: "chip-4",
				phrase: "remembering what you were thinking and feeling",
			},
			{
				id: "preserved",
				label: "Having my story preserved for the future",
				icon: "everything",
				tint: "chip-5",
				phrase: "having your story preserved for the future",
			},
			EVERYTHING,
		],
	},
	captureQuestion(
		"How would you most naturally want to capture your stories and memories?",
	),
	CONFIRMATION_QUESTION,
];

const EYEBROWS: Record<Recipient, string> = {
	child: "CREATING FOR YOUR CHILDREN",
	grandchild: "CREATING FOR YOUR GRANDCHILDREN",
	partner: "CREATING FOR YOUR PARTNER",
	other: "CREATING FOR SOMEONE IMPORTANT",
	myself: "CREATING YOUR OWN STORY",
};

function withEyebrow(recipient: Recipient, questions: Question[]): Question[] {
	return questions.map((question) => ({
		...question,
		eyebrow: EYEBROWS[recipient],
	}));
}

export const QUESTION_SETS: Record<Recipient, Question[]> = {
	child: withEyebrow("child", CHILD_QUESTIONS),
	grandchild: withEyebrow("grandchild", GRANDCHILD_QUESTIONS),
	partner: withEyebrow("partner", PARTNER_QUESTIONS),
	other: withEyebrow("other", OTHER_QUESTIONS),
	myself: withEyebrow("myself", MYSELF_QUESTIONS),
};

// --- Lookup + validation --------------------------------------------------

export function isRecipient(value: string): value is Recipient {
	return (RECIPIENTS as readonly string[]).includes(value);
}

/**
 * Which library shelf a recipient's journal belongs on, matching
 * `journals.type`. Only "myself" is a my-story journal; every other recipient
 * is a journal *about someone else*, which is what drives where onboarding
 * drops the user when it finishes.
 */
export function journalTypeForRecipient(
	recipient: Recipient,
): "my_story" | "their_story" {
	return recipient === "myself" ? "my_story" : "their_story";
}

/** Every question for a recipient, Q1 first. */
export function questionsFor(recipient: Recipient): Question[] {
	return [RECIPIENT_QUESTION, ...QUESTION_SETS[recipient]];
}

export function findOption(
	recipient: Recipient,
	questionId: string,
	optionId: string,
): QuestionOption | undefined {
	const question = questionsFor(recipient).find((q) => q.id === questionId);
	return question?.options.find((option) => option.id === optionId);
}

/** Prose form of a chosen answer, for the result screen. */
export function answerPhrase(
	recipient: Recipient,
	questionId: string,
	answers: AnswerRecord,
): string {
	const optionId = answers[questionId];
	if (!optionId) return "";
	const option = findOption(recipient, questionId, optionId);
	if (!option) return "";
	return option.phrase ?? option.label.toLowerCase();
}

export type AnswerState = {
	/** Undefined until Q1 is answered. */
	recipient?: Recipient;
	answers: AnswerRecord;
};

export const EMPTY_ANSWER_STATE: AnswerState = { answers: {} };

/**
 * Records an answer, returning the next state.
 *
 * Changing Q1 to a different recipient discards every later answer: the other
 * variant's questions carry different option ids, so keeping them would send
 * ids that don't exist in the new set and fail validation on submit. Picking
 * the *same* recipient again is a no-op, so paging back and forth without
 * changing anything doesn't wipe the user's progress.
 */
export function applyAnswer(
	state: AnswerState,
	questionId: string,
	optionId: string,
): AnswerState {
	if (questionId === RECIPIENT_QUESTION.id) {
		if (!isRecipient(optionId)) return state;
		if (state.recipient === optionId) return state;
		return {
			recipient: optionId,
			answers: { [RECIPIENT_QUESTION.id]: optionId },
		};
	}

	return {
		...state,
		answers: { ...state.answers, [questionId]: optionId },
	};
}

/**
 * True when `answers` holds exactly one valid option for every question in the
 * recipient's set — including Q1, whose answer must equal `recipient`.
 *
 * Shared by both clients and `submitExternal`/`submitInApp`, so a client that
 * lets the user change Q1 without clearing later answers is caught server-side.
 */
export function isCompleteAnswerSet(
	recipient: Recipient,
	answers: AnswerRecord,
): boolean {
	const questions = questionsFor(recipient);
	if (Object.keys(answers).length !== questions.length) return false;
	if (answers[RECIPIENT_QUESTION.id] !== recipient) return false;

	return questions.every((question) => {
		const optionId = answers[question.id];
		if (!optionId) return false;
		return question.options.some((option) => option.id === optionId);
	});
}
