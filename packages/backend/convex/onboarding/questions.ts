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

/**
 * Platform-neutral icon keys. Each client maps them to its own Lucide
 * component (`lucide-react` / `lucide-react-native`); typing those maps as
 * `Record<OptionIcon, _>` means adding a key here fails the build until both
 * clients handle it.
 *
 * Which key an option gets is decided by its position, not its meaning — see
 * `ICONS_BY_SLOT` — because that is how the Figma designs assign them.
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
	"heartPulse",
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
	phrase: "a little of everything",
};

// --- Q1 -------------------------------------------------------------------

export const RECIPIENT_QUESTION: Question = {
	id: "recipient",
	slot: "who",
	prompt: "Who would you want to create a journal for?",
	helper:
		"Your answer helps us personalize your experience and the questions that follow.",
	options: [
		{
			id: "child",
			label: "My child or children",
			icon: "people",
		},
		{
			id: "grandchild",
			label: "My grandchild or grandchildren",
			icon: "family",
		},
		{
			id: "partner",
			label: "My partner",
			icon: "heart",
		},
		{
			id: "other",
			label: "Another family member or someone important to me",
			icon: "personAdd",
		},
		{
			id: "myself",
			label: "Myself",
			icon: "person",
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
		phrase: "writing",
	},
	{
		id: "voice",
		label: "My voice",
		icon: "mic",
		phrase: "your own voice",
	},
	{
		id: "video",
		label: "Video",
		icon: "video",
		phrase: "video",
	},
	{
		id: "combination",
		label: "A combination of them",
		icon: "mix",
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
			icon: "heartPulse",
		},
		{
			id: "would_value",
			label: "I think I'd value that",
			icon: "sparkle",
		},
		{
			id: "curious",
			label: "I'm curious to try it",
			icon: "compass",
		},
		{
			id: "unsure",
			label: "I'm not sure yet",
			icon: "question",
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
		prompt: "What would be the biggest reason for keeping this journal?",
		helper:
			"There are no wrong answers. This helps us understand what matters to you.",
		options: [
			{
				id: "preserve_childhood",
				label: "Preserving their childhood",
				icon: "smile",
				phrase: "preserve their childhood",
			},
			{
				id: "share_feelings",
				label: "Sharing my thoughts and feelings with them",
				icon: "chat",
				phrase: "share your thoughts and feelings with them",
			},
			{
				id: "pass_lessons",
				label: "Passing along lessons and advice",
				icon: "idea",
				phrase: "pass along lessons and advice",
			},
			{
				id: "family_story",
				label: "Helping them understand our family's story",
				icon: "home",
				phrase: "help them understand your family's story",
			},
			{
				id: "something_personal",
				label: "Giving them something personal from me",
				icon: "gift",
				phrase: "give them something personal from you",
			},
			EVERYTHING,
		],
	},
	{
		id: "what",
		slot: "what",
		prompt: "What kinds of moments should this journal capture?",
		footer: "The moments you capture today can mean everything tomorrow.",
		options: [
			{
				id: "milestones",
				label: "Milestones and accomplishments",
				icon: "trophy",
				phrase: "milestones and accomplishments",
			},
			{
				id: "funny",
				label: "Funny or unexpected moments",
				icon: "smile",
				phrase: "the funny and unexpected moments",
			},
			{
				id: "everyday",
				label: "Ordinary everyday memories",
				icon: "camera",
				phrase: "the ordinary everyday memories",
			},
			{
				id: "challenges",
				label: "Challenges and what we learned from them",
				icon: "growth",
				phrase: "challenges and what you learned from them",
			},
			{
				id: "traditions",
				label: "Family traditions and experiences",
				icon: "leaf",
				phrase: "family traditions and experiences",
			},
			EVERYTHING,
		],
	},
	{
		id: "meaning",
		slot: "meaning",
		prompt: "Years from now, what should these journals communicate?",
		options: [
			{
				id: "mean_to_me",
				label: "How much they mean to me",
				icon: "heart",
				phrase: "how much they mean to you",
			},
			{
				id: "noticed",
				label: "What I noticed and appreciated about them",
				icon: "eye",
				phrase: "what you noticed and appreciated about them",
			},
			{
				id: "time_together",
				label: "What our time together was really like",
				icon: "clock",
				phrase: "what your time together was really like",
			},
			{
				id: "unsaid",
				label: "Things I may not always say out loud",
				icon: "chats",
				phrase: "the things you may not always say out loud",
			},
			{
				id: "learned",
				label: "What I've learned along the way",
				icon: "school",
				phrase: "what you've learned along the way",
			},
			EVERYTHING,
		],
	},
	{
		id: "value",
		slot: "value",
		prompt: "What would make these journals feel meaningful?",
		options: [
			{
				id: "otherwise_forgotten",
				label: "Preserving moments that could otherwise be forgotten",
				icon: "hourglass",
				phrase: "preserving moments that could otherwise be forgotten",
			},
			{
				id: "remember_differently",
				label: "Capturing stories we may remember differently later",
				icon: "album",
				phrase: "capturing stories you may remember differently later",
			},
			{
				id: "unsaid",
				label: "Sharing thoughts I may not always say out loud",
				icon: "chats",
				phrase: "sharing thoughts you may not always say out loud",
			},
			{
				id: "personal",
				label: "Creating something personal for them",
				icon: "gift",
				phrase: "creating something personal for them",
			},
			{
				id: "over_time",
				label: "Showing how life changed over time",
				icon: "growth",
				phrase: "showing how life changed over time",
			},
			EVERYTHING,
		],
	},
	captureQuestion(
		"What would feel natural for capturing these stories and memories?",
	),
	CONFIRMATION_QUESTION,
];

const GRANDCHILD_QUESTIONS: Question[] = [
	{
		id: "why",
		slot: "why",
		prompt: "What would be the biggest reason for keeping this journal?",
		helper:
			"There are no wrong answers. This helps us understand what matters to you.",
		options: [
			{
				id: "family_history",
				label: "Preserving our family's history",
				icon: "home",
				phrase: "preserve your family's history",
			},
			{
				id: "share_feelings",
				label: "Sharing my thoughts and feelings with them",
				icon: "chat",
				phrase: "share your thoughts and feelings with them",
			},
			{
				id: "pass_lessons",
				label: "Passing along lessons and advice",
				icon: "idea",
				phrase: "pass along lessons and advice",
			},
			{
				id: "where_from",
				label: "Helping them know where they come from",
				icon: "lineage",
				phrase: "help them know where they come from",
			},
			{
				id: "something_personal",
				label: "Giving them something personal from me",
				icon: "gift",
				phrase: "give them something personal from you",
			},
			EVERYTHING,
		],
	},
	{
		id: "what",
		slot: "what",
		prompt: "What kinds of moments should this journal capture?",
		footer: "Some stories only you can pass down.",
		options: [
			{
				id: "milestones",
				label: "Milestones and accomplishments",
				icon: "trophy",
				phrase: "milestones and accomplishments",
			},
			{
				id: "funny",
				label: "Funny or unexpected moments",
				icon: "smile",
				phrase: "the funny and unexpected moments",
			},
			{
				id: "everyday",
				label: "Ordinary everyday memories",
				icon: "camera",
				phrase: "the ordinary everyday memories",
			},
			{
				id: "own_life",
				label: "Stories from my own life",
				icon: "book",
				phrase: "stories from your own life",
			},
			{
				id: "traditions",
				label: "Family traditions and experiences",
				icon: "leaf",
				phrase: "family traditions and experiences",
			},
			EVERYTHING,
		],
	},
	{
		id: "meaning",
		slot: "meaning",
		prompt: "Years from now, what should these journals communicate?",
		options: [
			{
				id: "mean_to_me",
				label: "How much they mean to me",
				icon: "heart",
				phrase: "how much they mean to you",
			},
			{
				id: "noticed",
				label: "What I noticed and appreciated about them",
				icon: "eye",
				phrase: "what you noticed and appreciated about them",
			},
			{
				id: "where_family_came_from",
				label: "Where our family came from",
				icon: "globe",
				phrase: "where your family came from",
			},
			{
				id: "unsaid",
				label: "Things I may not always say out loud",
				icon: "chats",
				phrase: "the things you may not always say out loud",
			},
			{
				id: "learned",
				label: "What I've learned along the way",
				icon: "school",
				phrase: "what you've learned along the way",
			},
			EVERYTHING,
		],
	},
	{
		id: "value",
		slot: "value",
		prompt: "What would make these journals feel meaningful?",
		options: [
			{
				id: "otherwise_forgotten",
				label: "Preserving moments that could otherwise be forgotten",
				icon: "hourglass",
				phrase: "preserving moments that could otherwise be forgotten",
			},
			{
				id: "outlast",
				label: "Knowing my stories will outlast me",
				icon: "everything",
				phrase: "knowing your stories will outlast you",
			},
			{
				id: "unsaid",
				label: "Sharing thoughts I may not always say out loud",
				icon: "chats",
				phrase: "sharing thoughts you may not always say out loud",
			},
			{
				id: "personal",
				label: "Creating something personal for them",
				icon: "gift",
				phrase: "creating something personal for them",
			},
			{
				id: "over_time",
				label: "Showing how life changed over time",
				icon: "growth",
				phrase: "showing how life changed over time",
			},
			EVERYTHING,
		],
	},
	captureQuestion(
		"What would feel natural for capturing these stories and memories?",
	),
	CONFIRMATION_QUESTION,
];

const PARTNER_QUESTIONS: Question[] = [
	{
		id: "why",
		slot: "why",
		prompt: "What would be the biggest reason for keeping this journal?",
		helper:
			"There are no wrong answers. This helps us understand what matters to you.",
		options: [
			{
				id: "shared_memories",
				label: "Preserving our shared memories",
				icon: "smile",
				phrase: "preserve your shared memories",
			},
			{
				id: "share_feelings",
				label: "Sharing my thoughts and feelings with them",
				icon: "smile",
				phrase: "share your thoughts and feelings with them",
			},
			{
				id: "pass_lessons",
				label: "Passing along lessons and advice",
				icon: "smile",
				phrase: "pass along lessons and advice",
			},
			{
				id: "our_story",
				label: "Capturing our story together",
				icon: "smile",
				phrase: "capture your story together",
			},
			{
				id: "leave_something",
				label: "Leaving something personal behind",
				icon: "smile",
				phrase: "leave something personal behind",
			},
			EVERYTHING,
		],
	},
	{
		id: "what",
		slot: "what",
		prompt: "What kinds of moments should this journal capture?",
		footer: "The ordinary days are the ones you'll want back.",
		options: [
			{
				id: "milestones",
				label: "Milestones we've shared",
				icon: "trophy",
				phrase: "the milestones you've shared",
			},
			{
				id: "funny",
				label: "Funny or unexpected moments",
				icon: "smile",
				phrase: "the funny and unexpected moments",
			},
			{
				id: "everyday",
				label: "Ordinary everyday memories",
				icon: "camera",
				phrase: "the ordinary everyday memories",
			},
			{
				id: "challenges",
				label: "Challenges we came through together",
				icon: "growth",
				phrase: "the challenges you came through together",
			},
			{
				id: "traditions",
				label: "Traditions and experiences we share",
				icon: "leaf",
				phrase: "the traditions and experiences you share",
			},
			EVERYTHING,
		],
	},
	{
		id: "meaning",
		slot: "meaning",
		prompt: "Years from now, what should these journals communicate?",
		options: [
			{
				id: "mean_to_me",
				label: "How much they mean to me",
				icon: "heart",
				phrase: "how much they mean to you",
			},
			{
				id: "noticed",
				label: "What I notice and appreciate about them",
				icon: "eye",
				phrase: "what you notice and appreciate about them",
			},
			{
				id: "life_together",
				label: "What our life together has really been like",
				icon: "clock",
				phrase: "what your life together has really been like",
			},
			{
				id: "unsaid",
				label: "Things I may not always say out loud",
				icon: "chats",
				phrase: "the things you may not always say out loud",
			},
			{
				id: "learned",
				label: "What I've learned alongside them",
				icon: "school",
				phrase: "what you've learned alongside them",
			},
			EVERYTHING,
		],
	},
	{
		id: "value",
		slot: "value",
		prompt: "What would make these journals feel meaningful?",
		options: [
			{
				id: "otherwise_forgotten",
				label: "Preserving moments that could otherwise be forgotten",
				icon: "hourglass",
				phrase: "preserving moments that could otherwise be forgotten",
			},
			{
				id: "remember_differently",
				label: "Capturing stories we may remember differently later",
				icon: "album",
				phrase: "capturing stories you may remember differently later",
			},
			{
				id: "unsaid",
				label: "Sharing thoughts I may not always say out loud",
				icon: "chats",
				phrase: "sharing thoughts you may not always say out loud",
			},
			{
				id: "personal",
				label: "Creating something personal for them",
				icon: "gift",
				phrase: "creating something personal for them",
			},
			{
				id: "over_time",
				label: "Showing how our life changed over time",
				icon: "growth",
				phrase: "showing how your life changed over time",
			},
			EVERYTHING,
		],
	},
	captureQuestion(
		"What would feel natural for capturing these stories and memories?",
	),
	CONFIRMATION_QUESTION,
];

const OTHER_QUESTIONS: Question[] = [
	{
		id: "why",
		slot: "why",
		prompt: "What would be the biggest reason for keeping this journal?",
		helper:
			"There are no wrong answers. This helps us understand what matters to you.",
		options: [
			{
				id: "shared_memories",
				label: "Preserving shared memories",
				icon: "smile",
				phrase: "preserve shared memories",
			},
			{
				id: "share_feelings",
				label: "Sharing my thoughts and feelings",
				icon: "smile",
				phrase: "share your thoughts and feelings",
			},
			{
				id: "pass_lessons",
				label: "Passing along lessons and advice",
				icon: "smile",
				phrase: "pass along lessons and advice",
			},
			{
				id: "family_story",
				label: "Helping them understand our family’s story",
				icon: "smile",
				phrase: "help them understand your family’s story",
			},
			{
				id: "something_personal",
				label: "Giving them something personal from me",
				icon: "smile",
				phrase: "give them something personal from you",
			},
			EVERYTHING,
		],
	},
	{
		id: "what",
		slot: "what",
		prompt: "What kinds of moments should this journal capture?",
		footer: "Some people deserve more than a passing mention.",
		options: [
			{
				id: "milestones",
				label: "Milestones and accomplishments",
				icon: "trophy",
				phrase: "milestones and accomplishments",
			},
			{
				id: "funny",
				label: "Funny or unexpected moments",
				icon: "smile",
				phrase: "the funny and unexpected moments",
			},
			{
				id: "everyday",
				label: "Ordinary everyday memories",
				icon: "camera",
				phrase: "the ordinary everyday memories",
			},
			{
				id: "challenges",
				label: "Challenges and what we learned from them",
				icon: "growth",
				phrase: "challenges and what you learned from them",
			},
			{
				id: "traditions",
				label: "Traditions and experiences we share",
				icon: "leaf",
				phrase: "the traditions and experiences you share",
			},
			EVERYTHING,
		],
	},
	{
		id: "meaning",
		slot: "meaning",
		prompt: "Years from now, what should these journals communicate?",
		options: [
			{
				id: "mean_to_me",
				label: "How much they mean to me",
				icon: "heart",
				phrase: "how much they mean to you",
			},
			{
				id: "noticed",
				label: "What I noticed and appreciated about them",
				icon: "eye",
				phrase: "what you noticed and appreciated about them",
			},
			{
				id: "time_together",
				label: "What our time together was really like",
				icon: "clock",
				phrase: "what your time together was really like",
			},
			{
				id: "unsaid",
				label: "Things I may not always say out loud",
				icon: "chats",
				phrase: "the things you may not always say out loud",
			},
			{
				id: "learned",
				label: "What I've learned along the way",
				icon: "school",
				phrase: "what you've learned along the way",
			},
			EVERYTHING,
		],
	},
	{
		id: "value",
		slot: "value",
		prompt: "What would make these journals feel meaningful?",
		options: [
			{
				id: "otherwise_forgotten",
				label: "Preserving moments that could otherwise be forgotten",
				icon: "hourglass",
				phrase: "preserving moments that could otherwise be forgotten",
			},
			{
				id: "remember_differently",
				label: "Capturing stories we may remember differently later",
				icon: "album",
				phrase: "capturing stories you may remember differently later",
			},
			{
				id: "unsaid",
				label: "Sharing thoughts I may not always say out loud",
				icon: "chats",
				phrase: "sharing thoughts you may not always say out loud",
			},
			{
				id: "personal",
				label: "Creating something personal for them",
				icon: "gift",
				phrase: "creating something personal for them",
			},
			{
				id: "over_time",
				label: "Showing how life changed over time",
				icon: "growth",
				phrase: "showing how life changed over time",
			},
			EVERYTHING,
		],
	},
	captureQuestion(
		"What would feel natural for capturing these stories and memories?",
	),
	CONFIRMATION_QUESTION,
];

const MYSELF_QUESTIONS: Question[] = [
	{
		id: "why",
		slot: "why",
		prompt: "What would be the biggest reason for keeping this journal?",
		helper:
			"There are no wrong answers. This helps us understand what matters to you.",
		options: [
			{
				id: "preserve_memories",
				label: "Preserving my memories",
				icon: "smile",
				phrase: "preserve your memories",
			},
			{
				id: "express_feelings",
				label: "Expressing my thoughts and feelings",
				icon: "smile",
				phrase: "express your thoughts and feelings",
			},
			{
				id: "record_lessons",
				label: "Recording lessons and advice",
				icon: "smile",
				phrase: "record lessons and advice",
			},
			{
				id: "own_story",
				label: "Understanding my own story",
				icon: "smile",
				phrase: "understand your own story",
			},
			{
				id: "future_self",
				label: "Leaving something personal for my future self",
				icon: "smile",
				phrase: "leave something personal for your future self",
			},
			EVERYTHING,
		],
	},
	{
		id: "what",
		slot: "what",
		prompt: "What kinds of moments should this journal capture?",
		footer: "Your story is happening right now.",
		options: [
			{
				id: "milestones",
				label: "Important milestones",
				icon: "trophy",
				phrase: "the important milestones",
			},
			{
				id: "everyday",
				label: "Everyday experiences",
				icon: "camera",
				phrase: "the everyday experiences of your life",
			},
			{
				id: "challenges",
				label: "Challenges and what I learned from them",
				icon: "growth",
				phrase: "challenges and what you learned from them",
			},
			{
				id: "accomplishments",
				label: "Accomplishments I'm proud of",
				icon: "ribbon",
				phrase: "the accomplishments you're proud of",
			},
			{
				id: "relationships",
				label: "Relationships and people important to me",
				icon: "people",
				phrase: "the relationships and people important to you",
			},
			EVERYTHING,
		],
	},
	{
		id: "meaning",
		slot: "meaning",
		prompt:
			"Years from now, what would you want these journals to remind you of?",
		options: [
			{
				id: "who_i_was",
				label: "Who I was at different points in my life",
				icon: "person",
				phrase: "who you were at different points in your life",
			},
			{
				id: "mattered_most",
				label: "What mattered to me",
				icon: "heart",
				phrase: "what mattered to you",
			},
			{
				id: "grown_changed",
				label: "How I've grown and changed",
				icon: "growth",
				phrase: "how you've grown and changed",
			},
			{
				id: "accomplished",
				label: "Things I've accomplished",
				icon: "trophy",
				phrase: "the things you've accomplished",
			},
			{
				id: "lessons",
				label: "Lessons I've learned",
				icon: "school",
				phrase: "the lessons you've learned",
			},
			EVERYTHING,
		],
	},
	{
		id: "value",
		slot: "value",
		prompt: "What would make these journals feel meaningful?",
		options: [
			{
				id: "otherwise_forget",
				label: "Preserving moments I might otherwise forget",
				icon: "hourglass",
				phrase: "preserving moments you might otherwise forget",
			},
			{
				id: "look_back",
				label: "Being able to look back on my life",
				icon: "eye",
				phrase: "being able to look back on your life",
			},
			{
				id: "changed_over_time",
				label: "Seeing how I've changed over time",
				icon: "growth",
				phrase: "seeing how you've changed over time",
			},
			{
				id: "thinking_feeling",
				label: "Remembering what I was thinking and feeling",
				icon: "chats",
				phrase: "remembering what you were thinking and feeling",
			},
			{
				id: "preserved",
				label: "Having my story preserved for the future",
				icon: "everything",
				phrase: "having your story preserved for the future",
			},
			EVERYTHING,
		],
	},
	captureQuestion(
		"What would feel natural for capturing these stories and memories?",
	),
	CONFIRMATION_QUESTION,
];

/**
 * From the Figma eyebrows ("CREATING FOR " + the recipient). Grandchild has no
 * designed screen, so it follows the Child pattern.
 */
const EYEBROWS: Record<Recipient, string> = {
	child: "CREATING FOR YOUR CHILDREN",
	grandchild: "CREATING FOR YOUR GRANDCHILDREN",
	partner: "CREATING FOR MY PARTNER",
	other: "CREATING FOR SOMEONE SPECIAL",
	myself: "CREATING FOR MYSELF",
};

/**
 * Icon for the option at each position, per slot. The Figma designs tie the
 * glyph to the row (Partner's "Capturing our story together" carries the same
 * house icon as Child's "Helping them understand our family's story"), so
 * option copy can change per recipient without touching icons.
 */
const ICONS_BY_SLOT: Record<QuestionSlot, OptionIcon[]> = {
	why: ["smile", "chat", "idea", "home", "gift", "everything"],
	what: ["trophy", "smile", "camera", "growth", "leaf", "everything"],
	meaning: ["heart", "eye", "clock", "chats", "school", "everything"],
	value: ["hourglass", "album", "chats", "gift", "growth", "everything"],
	how: ["write", "mic", "video", "mix"],
	confirmation: ["heartPulse", "sparkle", "compass", "question"],
};

function finalize(recipient: Recipient, questions: Question[]): Question[] {
	return questions.map((question) => {
		const icons = question.slot === "who" ? [] : ICONS_BY_SLOT[question.slot];
		return {
			...question,
			eyebrow: EYEBROWS[recipient],
			options: question.options.map((option, index) => ({
				...option,
				icon: icons[index] ?? option.icon,
			})),
		};
	});
}

export const QUESTION_SETS: Record<Recipient, Question[]> = {
	child: finalize("child", CHILD_QUESTIONS),
	grandchild: finalize("grandchild", GRANDCHILD_QUESTIONS),
	partner: finalize("partner", PARTNER_QUESTIONS),
	other: finalize("other", OTHER_QUESTIONS),
	myself: finalize("myself", MYSELF_QUESTIONS),
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
