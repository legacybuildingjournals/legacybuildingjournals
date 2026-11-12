import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { cn } from "@legacy-building/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Gift, Loader2 } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { useForm } from "react-hook-form";

import {
	GIFT_DETAILS_HOW_IT_WORKS,
	GiftHowItWorks,
	giftPrimaryButtonClass,
} from "@/components/gift/GiftPageChrome";
import { Input } from "@/components/journal/ui/input";
import { Skeleton } from "@/components/journal/ui/skeleton";
import { Textarea } from "@/components/journal/ui/textarea";
import {
	GIFT_MESSAGE_MAX,
	type GiftDetailsValues,
	giftDetailsSchema,
} from "@/lib/gift/schemas";
import { messageFromUnknownError } from "@/lib/journal/toast";
import { ROUTES } from "@/lib/routes";

const labelClass = "font-medium text-foreground text-sm";
const fieldClass =
	"h-11 rounded-xl border-border bg-background px-3 text-sm shadow-none";

function FieldErrorText({ id, message }: { id: string; message?: string }) {
	if (!message) return null;
	return (
		<p id={id} className="text-destructive text-xs">
			{message}
		</p>
	);
}

/**
 * SST-3 "Gift Invite" form. Saves a draft before checkout so the details
 * survive a failed or cancelled payment; passing `giftId` restores them.
 *
 * `renderFields` wraps the inputs: phones put them in the hero card, desktop
 * puts them in the right-hand "Gift Invite" card. The "How it works?" box and
 * the submit button follow the fields inside the same wrapper on desktop, and
 * sit below it on phones (`footerInside`).
 */
export function GiftDetailsForm({
	giftId,
	idPrefix,
	renderFields,
	footerInside = false,
}: {
	giftId?: string;
	/** Keeps label/input ids unique when two layouts share a page. */
	idPrefix: string;
	renderFields: (content: ReactNode) => ReactNode;
	footerInside?: boolean;
}) {
	const navigate = useNavigate();
	const offer = useQuery(api.gifts.queries.getOffer);
	const draft = useQuery(
		api.gifts.queries.getDraft,
		giftId ? { giftId: giftId as Id<"gifts"> } : "skip",
	);
	const saveDraft = useMutation(api.gifts.mutations.saveDraft);

	const form = useForm<GiftDetailsValues>({
		resolver: zodResolver(giftDetailsSchema),
		defaultValues: {
			recipientName: "",
			recipientEmail: "",
			title: "",
			message: "",
		},
	});
	const { errors, isSubmitting } = form.formState;
	const messageLength = form.watch("message")?.length ?? 0;

	useEffect(() => {
		if (draft && draft.status === "pending_payment") {
			form.reset({
				recipientName: draft.recipientName,
				recipientEmail: draft.recipientEmail,
				title: draft.title,
				message: draft.message,
			});
		}
	}, [draft, form]);

	const onSubmit = form.handleSubmit(async (values) => {
		form.clearErrors("root");
		try {
			const savedId = await saveDraft({
				giftId: draft?.status === "pending_payment" ? draft._id : undefined,
				...values,
			});
			await navigate({
				to: ROUTES.dashboardGiftCheckout,
				search: { giftId: savedId },
			});
		} catch (err) {
			form.setError("root", {
				message: messageFromUnknownError(
					err,
					"Could not save your gift. Please try again.",
				),
			});
		}
	});

	const loading = offer === undefined || (giftId && draft === undefined);
	const id = (name: string) => `${idPrefix}-${name}`;

	const fields = loading ? (
		<div className="flex flex-col gap-4">
			<Skeleton className="h-16 w-full" />
			<Skeleton className="h-16 w-full" />
			<Skeleton className="h-16 w-full" />
			<Skeleton className="h-28 w-full" />
		</div>
	) : (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-1.5">
				<label htmlFor={id("name")} className={labelClass}>
					Recipient&apos;s Name
				</label>
				<Input
					{...form.register("recipientName")}
					id={id("name")}
					placeholder="Enter full name"
					autoComplete="off"
					className={fieldClass}
					aria-invalid={Boolean(errors.recipientName)}
					aria-describedby={id("name-error")}
				/>
				<FieldErrorText
					id={id("name-error")}
					message={errors.recipientName?.message}
				/>
			</div>
			<div className="flex flex-col gap-1.5">
				<label htmlFor={id("email")} className={labelClass}>
					Recipient&apos;s Email
				</label>
				<Input
					{...form.register("recipientEmail")}
					id={id("email")}
					type="email"
					placeholder="Enter email address"
					autoComplete="off"
					className={fieldClass}
					aria-invalid={Boolean(errors.recipientEmail)}
					aria-describedby={id("email-error")}
				/>
				<FieldErrorText
					id={id("email-error")}
					message={errors.recipientEmail?.message}
				/>
			</div>
			<div className="flex flex-col gap-1.5">
				<label htmlFor={id("title")} className={labelClass}>
					Heartfelt Title (Email Subject)
				</label>
				<Input
					{...form.register("title")}
					id={id("title")}
					placeholder="e.g. A special gift for you"
					className={fieldClass}
					aria-invalid={Boolean(errors.title)}
					aria-describedby={id("title-error")}
				/>
				<FieldErrorText
					id={id("title-error")}
					message={errors.title?.message}
				/>
			</div>
			<div className="flex flex-col gap-1.5">
				<label htmlFor={id("message")} className={labelClass}>
					Personal Message
				</label>
				<Textarea
					{...form.register("message")}
					id={id("message")}
					placeholder="Write a short message..."
					rows={4}
					maxLength={GIFT_MESSAGE_MAX}
					className="min-h-28 rounded-xl border-border bg-background px-3 py-2 text-sm shadow-none"
					aria-invalid={Boolean(errors.message)}
					aria-describedby={id("message-error")}
				/>
				<span className="self-end text-muted-foreground text-xs">
					{messageLength}/{GIFT_MESSAGE_MAX}
				</span>
				<FieldErrorText
					id={id("message-error")}
					message={errors.message?.message}
				/>
			</div>
			{offer?.purchaser ? (
				<p className="text-muted-foreground text-xs">
					From{" "}
					<span className="font-medium text-foreground">
						{offer.purchaser.name}
					</span>{" "}
					({offer.purchaser.email}).
				</p>
			) : null}
		</div>
	);

	const footer = (
		<div className={cn("flex flex-col gap-4", footerInside && "mt-6")}>
			<GiftHowItWorks>{GIFT_DETAILS_HOW_IT_WORKS}</GiftHowItWorks>

			{errors.root?.message ? (
				<p className="text-center text-destructive text-sm" role="alert">
					{errors.root.message}
				</p>
			) : null}

			<button
				type="submit"
				disabled={Boolean(loading) || isSubmitting}
				className={giftPrimaryButtonClass}
			>
				{isSubmitting ? (
					<>
						<Loader2 className="size-4 animate-spin" aria-hidden />
						Saving…
					</>
				) : (
					<>
						<Gift className="size-4" aria-hidden />
						Send Gift
					</>
				)}
			</button>
		</div>
	);

	return (
		<form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
			{renderFields(
				footerInside ? (
					<>
						{fields}
						{footer}
					</>
				) : (
					fields
				),
			)}
			{footerInside ? null : footer}
		</form>
	);
}
