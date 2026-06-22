/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_actions from "../admin/actions.js";
import type * as admin_billing from "../admin/billing.js";
import type * as admin_helpers from "../admin/helpers.js";
import type * as admin_mutations from "../admin/mutations.js";
import type * as admin_queries from "../admin/queries.js";
import type * as email_actions from "../email/actions.js";
import type * as email_helpers from "../email/helpers.js";
import type * as email_mutations from "../email/mutations.js";
import type * as email_queries from "../email/queries.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as journal_actions from "../journal/actions.js";
import type * as journal_auth from "../journal/auth.js";
import type * as journal_enrich from "../journal/enrich.js";
import type * as journal_entries_mutations from "../journal/entries/mutations.js";
import type * as journal_entries_queries from "../journal/entries/queries.js";
import type * as journal_migrations from "../journal/migrations.js";
import type * as journal_mutations from "../journal/mutations.js";
import type * as journal_orderHelpers from "../journal/orderHelpers.js";
import type * as journal_orderQueries from "../journal/orderQueries.js";
import type * as journal_queries from "../journal/queries.js";
import type * as journal_sort from "../journal/sort.js";
import type * as journal_storage from "../journal/storage.js";
import type * as revenuecat_helpers from "../revenuecat/helpers.js";
import type * as revenuecat_mutations from "../revenuecat/mutations.js";
import type * as stripe_access from "../stripe/access.js";
import type * as stripe_actions from "../stripe/actions.js";
import type * as stripe_config from "../stripe/config.js";
import type * as stripe_customerHelpers from "../stripe/customerHelpers.js";
import type * as stripe_embeddedCheckout from "../stripe/embeddedCheckout.js";
import type * as stripe_helpers from "../stripe/helpers.js";
import type * as stripe_mutations from "../stripe/mutations.js";
import type * as stripe_products_mutations from "../stripe/products/mutations.js";
import type * as stripe_products_queries from "../stripe/products/queries.js";
import type * as stripe_queries from "../stripe/queries.js";
import type * as subscriptions_helpers from "../subscriptions/helpers.js";
import type * as subscriptions_mutations from "../subscriptions/mutations.js";
import type * as subscriptions_queries from "../subscriptions/queries.js";
import type * as user_actionHelpers from "../user/actionHelpers.js";
import type * as user_actions from "../user/actions.js";
import type * as user_deleteAccount from "../user/deleteAccount.js";
import type * as user_mutations from "../user/mutations.js";
import type * as user_queries from "../user/queries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/actions": typeof admin_actions;
  "admin/billing": typeof admin_billing;
  "admin/helpers": typeof admin_helpers;
  "admin/mutations": typeof admin_mutations;
  "admin/queries": typeof admin_queries;
  "email/actions": typeof email_actions;
  "email/helpers": typeof email_helpers;
  "email/mutations": typeof email_mutations;
  "email/queries": typeof email_queries;
  helpers: typeof helpers;
  http: typeof http;
  "journal/actions": typeof journal_actions;
  "journal/auth": typeof journal_auth;
  "journal/enrich": typeof journal_enrich;
  "journal/entries/mutations": typeof journal_entries_mutations;
  "journal/entries/queries": typeof journal_entries_queries;
  "journal/migrations": typeof journal_migrations;
  "journal/mutations": typeof journal_mutations;
  "journal/orderHelpers": typeof journal_orderHelpers;
  "journal/orderQueries": typeof journal_orderQueries;
  "journal/queries": typeof journal_queries;
  "journal/sort": typeof journal_sort;
  "journal/storage": typeof journal_storage;
  "revenuecat/helpers": typeof revenuecat_helpers;
  "revenuecat/mutations": typeof revenuecat_mutations;
  "stripe/access": typeof stripe_access;
  "stripe/actions": typeof stripe_actions;
  "stripe/config": typeof stripe_config;
  "stripe/customerHelpers": typeof stripe_customerHelpers;
  "stripe/embeddedCheckout": typeof stripe_embeddedCheckout;
  "stripe/helpers": typeof stripe_helpers;
  "stripe/mutations": typeof stripe_mutations;
  "stripe/products/mutations": typeof stripe_products_mutations;
  "stripe/products/queries": typeof stripe_products_queries;
  "stripe/queries": typeof stripe_queries;
  "subscriptions/helpers": typeof subscriptions_helpers;
  "subscriptions/mutations": typeof subscriptions_mutations;
  "subscriptions/queries": typeof subscriptions_queries;
  "user/actionHelpers": typeof user_actionHelpers;
  "user/actions": typeof user_actions;
  "user/deleteAccount": typeof user_deleteAccount;
  "user/mutations": typeof user_mutations;
  "user/queries": typeof user_queries;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  stripe: import("@convex-dev/stripe/_generated/component.js").ComponentApi<"stripe">;
};
