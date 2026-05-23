import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', [
  'mother',
  'supporter',
  'provider',
  'admin',
])

export const authProviderEnum = pgEnum('auth_provider', [
  'email',
  'google',
  'apple',
])

export const applicationStatusEnum = pgEnum('application_status', [
  'pending',
  'approved',
  'rejected',
])

export const bookingStatusEnum = pgEnum('booking_status', [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'disputed',
])

export const donationStatusEnum = pgEnum('donation_status', [
  'pending',
  'completed',
  'refunded',
  'failed',
])

// ─── Tables ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  role: userRoleEnum('role').notNull().default('supporter'),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  authProvider: authProviderEnum('auth_provider').notNull().default('email'),
  googleId: text('google_id').unique(),
  appleId: text('apple_id').unique(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  emailVerificationToken: text('email_verification_token'),
  emailVerificationSentAt: timestamp('email_verification_sent_at', {
    withTimezone: true,
  }),
  passwordResetToken: text('password_reset_token'),
  passwordResetExpiresAt: timestamp('password_reset_expires_at', {
    withTimezone: true,
  }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const providerProfiles = pgTable('provider_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  businessName: text('business_name'),
  bio: text('bio'),
  serviceAreas: text('service_areas').array().notNull().default([]),
  avatarUrl: text('avatar_url'),
  websiteUrl: text('website_url'),
  stripeAccountId: text('stripe_account_id'),
  stripeOnboardingCompleted: boolean('stripe_onboarding_completed')
    .notNull()
    .default(false),
  applicationStatus: applicationStatusEnum('application_status')
    .notNull()
    .default('pending'),
  reviewNote: text('review_note'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const serviceCategories = pgTable('service_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  iconName: text('icon_name'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
})

export const providerServices = pgTable('provider_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerProfileId: uuid('provider_profile_id')
    .notNull()
    .references(() => providerProfiles.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => serviceCategories.id),
  priceMinCents: integer('price_min_cents'),
  priceMaxCents: integer('price_max_cents'),
  description: text('description'),
})

export const registries = pgTable('registries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  isPublished: boolean('is_published').notNull().default(false),
  coverImageUrl: text('cover_image_url'),
  targetAmountCents: integer('target_amount_cents'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const registryItems = pgTable('registry_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  registryId: uuid('registry_id')
    .notNull()
    .references(() => registries.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => serviceCategories.id),
  providerProfileId: uuid('provider_profile_id').references(
    () => providerProfiles.id
  ),
  title: text('title').notNull(),
  description: text('description'),
  targetAmountCents: integer('target_amount_cents').notNull(),
  fundedAmountCents: integer('funded_amount_cents').notNull().default(0),
  isFulfilled: boolean('is_fulfilled').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const donations = pgTable('donations', {
  id: uuid('id').primaryKey().defaultRandom(),
  supporterId: uuid('supporter_id').references(() => users.id),
  registryItemId: uuid('registry_item_id').references(() => registryItems.id),
  registryId: uuid('registry_id').references(() => registries.id),
  amountCents: integer('amount_cents').notNull(),
  stripeSessionId: text('stripe_session_id').unique(),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  status: donationStatusEnum('status').notNull().default('pending'),
  message: text('message'),
  isAnonymous: boolean('is_anonymous').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
})

export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  motherId: uuid('mother_id')
    .notNull()
    .references(() => users.id),
  providerId: uuid('provider_id')
    .notNull()
    .references(() => users.id),
  providerServiceId: uuid('provider_service_id').references(
    () => providerServices.id
  ),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  durationMinutes: integer('duration_minutes'),
  amountCents: integer('amount_cents').notNull(),
  platformFeePercent: integer('platform_fee_percent').notNull().default(10),
  stripeSessionId: text('stripe_session_id').unique(),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  stripeTransferId: text('stripe_transfer_id'),
  status: bookingStatusEnum('status').notNull().default('pending'),
  notes: text('notes'),
  cancellationReason: text('cancellation_reason'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const waitlist = pgTable('waitlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  source: text('source').default('website'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
})

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  providerProfile: one(providerProfiles, {
    fields: [users.id],
    references: [providerProfiles.userId],
  }),
  registries: many(registries),
  donations: many(donations),
  motherBookings: many(bookings, { relationName: 'motherBookings' }),
  providerBookings: many(bookings, { relationName: 'providerBookings' }),
}))

export const providerProfilesRelations = relations(
  providerProfiles,
  ({ one, many }) => ({
    user: one(users, {
      fields: [providerProfiles.userId],
      references: [users.id],
    }),
    services: many(providerServices),
  })
)

export const registriesRelations = relations(registries, ({ one, many }) => ({
  user: one(users, {
    fields: [registries.userId],
    references: [users.id],
  }),
  items: many(registryItems),
  donations: many(donations),
}))

export const registryItemsRelations = relations(registryItems, ({ one }) => ({
  registry: one(registries, {
    fields: [registryItems.registryId],
    references: [registries.id],
  }),
  category: one(serviceCategories, {
    fields: [registryItems.categoryId],
    references: [serviceCategories.id],
  }),
  providerProfile: one(providerProfiles, {
    fields: [registryItems.providerProfileId],
    references: [providerProfiles.id],
  }),
}))

export const donationsRelations = relations(donations, ({ one }) => ({
  supporter: one(users, {
    fields: [donations.supporterId],
    references: [users.id],
  }),
  registryItem: one(registryItems, {
    fields: [donations.registryItemId],
    references: [registryItems.id],
  }),
  registry: one(registries, {
    fields: [donations.registryId],
    references: [registries.id],
  }),
}))

export const bookingsRelations = relations(bookings, ({ one }) => ({
  mother: one(users, {
    fields: [bookings.motherId],
    references: [users.id],
    relationName: 'motherBookings',
  }),
  provider: one(users, {
    fields: [bookings.providerId],
    references: [users.id],
    relationName: 'providerBookings',
  }),
}))
