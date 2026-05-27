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
  'business',
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
  'info_requested',
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

export const betaInvitationStatusEnum = pgEnum('beta_invitation_status', [
  'draft',
  'sent',
  'opened',
  'accepted',
  'revoked',
])

export const fundingFrequencyEnum = pgEnum('funding_frequency', [
  'one_time',
  'daily',
  'weekly',
  'monthly',
])

export const billingFrequencyEnum = pgEnum('billing_frequency', [
  'flat',
  'hourly',
  'daily',
  'weekly',
])

// ─── Tables ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  role: userRoleEnum('role').notNull().default('supporter'),
  isActive: boolean('is_active').notNull().default(true),
  suspendedAt: timestamp('suspended_at', { withTimezone: true }),
  suspendedReason: text('suspended_reason'),
  fullName: text('full_name'),
  firstName: text('first_name'),
  lastName: text('last_name'),
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
  phone: text('phone'),
  googleReviewUrl: text('google_review_url'),
  instagramUrl: text('instagram_url'),
  facebookUrl: text('facebook_url'),
  attributes: text('attributes').array().notNull().default([]),
  stripeAccountId: text('stripe_account_id'),
  stripeOnboardingCompleted: boolean('stripe_onboarding_completed')
    .notNull()
    .default(false),
  applicationStatus: applicationStatusEnum('application_status')
    .notNull()
    .default('pending'),
  reviewNote: text('review_note'),
  infoRequestMessage: text('info_request_message'),
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
  billingFrequency: billingFrequencyEnum('billing_frequency').notNull().default('flat'),
  description: text('description'),
})

export const providerOperatingHours = pgTable('provider_operating_hours', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerProfileId: uuid('provider_profile_id')
    .notNull()
    .references(() => providerProfiles.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(), // 0=Monday … 6=Sunday
  isClosed: boolean('is_closed').notNull().default(false),
  openTime: text('open_time'),  // 'HH:MM' 24-hour
  closeTime: text('close_time'), // 'HH:MM' 24-hour
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
  customPurpose: text('custom_purpose'),
  fundingFrequency: fundingFrequencyEnum('funding_frequency').notNull().default('one_time'),
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

export const betaInvitations = pgTable('beta_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  status: betaInvitationStatusEnum('status').notNull().default('draft'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  openedAt: timestamp('opened_at', { withTimezone: true }),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const systemFeatureFlags = pgTable('system_feature_flags', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  label: text('label').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const passItForwardAllocations = pgTable('pass_it_forward_allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  recipientUserId: uuid('recipient_user_id')
    .notNull()
    .references(() => users.id),
  amountCents: integer('amount_cents').notNull(),
  note: text('note'),
  allocatedBy: uuid('allocated_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const enterprisePartners = pgTable('enterprise_partners', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  domain: text('domain').notNull().unique(),
  budgetCents: integer('budget_cents').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const servicePriceCaps = pgTable('service_price_caps', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => serviceCategories.id, { onDelete: 'cascade' })
    .unique(),
  capCents: integer('cap_cents').notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const providerReviews = pgTable('provider_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerProfileId: uuid('provider_profile_id')
    .notNull()
    .references(() => providerProfiles.id, { onDelete: 'cascade' }),
  motherId: uuid('mother_id')
    .notNull()
    .references(() => users.id),
  rating: integer('rating').notNull(),
  isRecommended: boolean('is_recommended').notNull().default(false),
  reviewText: text('review_text'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const adminActionLogs = pgTable('admin_action_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminUserId: uuid('admin_user_id')
    .notNull()
    .references(() => users.id),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: text('target_id'),
  details: text('details'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  createdInvitations: many(betaInvitations),
  receivedAllocations: many(passItForwardAllocations),
  adminActionLogs: many(adminActionLogs),
}))

export const providerProfilesRelations = relations(
  providerProfiles,
  ({ one, many }) => ({
    user: one(users, {
      fields: [providerProfiles.userId],
      references: [users.id],
    }),
    services: many(providerServices),
    reviews: many(providerReviews),
    operatingHours: many(providerOperatingHours),
  })
)

export const providerOperatingHoursRelations = relations(providerOperatingHours, ({ one }) => ({
  providerProfile: one(providerProfiles, {
    fields: [providerOperatingHours.providerProfileId],
    references: [providerProfiles.id],
  }),
}))

export const providerReviewsRelations = relations(providerReviews, ({ one }) => ({
  providerProfile: one(providerProfiles, {
    fields: [providerReviews.providerProfileId],
    references: [providerProfiles.id],
  }),
  mother: one(users, {
    fields: [providerReviews.motherId],
    references: [users.id],
  }),
}))

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

export const betaInvitationsRelations = relations(betaInvitations, ({ one }) => ({
  creator: one(users, {
    fields: [betaInvitations.createdBy],
    references: [users.id],
  }),
}))

export const systemFeatureFlagsRelations = relations(systemFeatureFlags, ({ one }) => ({
  updater: one(users, {
    fields: [systemFeatureFlags.updatedBy],
    references: [users.id],
  }),
}))

export const passItForwardAllocationsRelations = relations(
  passItForwardAllocations,
  ({ one }) => ({
    recipient: one(users, {
      fields: [passItForwardAllocations.recipientUserId],
      references: [users.id],
    }),
    allocator: one(users, {
      fields: [passItForwardAllocations.allocatedBy],
      references: [users.id],
    }),
  })
)

export const enterprisePartnersRelations = relations(enterprisePartners, ({ one }) => ({
  creator: one(users, {
    fields: [enterprisePartners.createdBy],
    references: [users.id],
  }),
}))

export const servicePriceCapsRelations = relations(servicePriceCaps, ({ one }) => ({
  category: one(serviceCategories, {
    fields: [servicePriceCaps.categoryId],
    references: [serviceCategories.id],
  }),
  updater: one(users, {
    fields: [servicePriceCaps.updatedBy],
    references: [users.id],
  }),
}))

export const adminActionLogsRelations = relations(adminActionLogs, ({ one }) => ({
  admin: one(users, {
    fields: [adminActionLogs.adminUserId],
    references: [users.id],
  }),
}))
