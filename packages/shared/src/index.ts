// ─── Roles & Enums ────────────────────────────────────────────────────────────

export type UserRole =
  | 'mother'
  | 'supporter'
  | 'provider'
  | 'business'
  | 'admin'

export type AuthProvider = 'email' | 'google' | 'apple'

export type ApplicationStatus = 'pending' | 'approved' | 'rejected'

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed'

export type DonationStatus = 'pending' | 'completed' | 'refunded' | 'failed'

export type FundingFrequency = 'one_time' | 'daily' | 'weekly' | 'monthly'

// ─── Core entities ────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  role: UserRole
  firstName: string | null
  lastName: string | null
  /** @deprecated Use firstName + lastName instead */
  fullName: string | null
  avatarUrl: string | null
  authProvider: AuthProvider
  emailVerifiedAt: string | null
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ProviderProfile {
  id: string
  userId: string
  businessName: string | null
  bio: string | null
  serviceAreas: string[]
  avatarUrl: string | null
  websiteUrl: string | null
  stripeOnboardingCompleted: boolean
  applicationStatus: ApplicationStatus
  averageRating?: number
  reviewCount?: number
  recommendCount?: number
  createdAt: string
  updatedAt: string
}

export interface ServiceCategory {
  id: string
  slug: string
  name: string
  description: string | null
  iconName: string | null
  sortOrder: number
  isActive: boolean
}

export interface ProviderService {
  id: string
  providerProfileId: string
  categoryId: string
  priceMinCents: number | null
  priceMaxCents: number | null
  description: string | null
}

export interface Registry {
  id: string
  userId: string
  slug: string
  title: string
  description: string | null
  dueDate: string | null
  isPublished: boolean
  coverImageUrl: string | null
  targetAmountCents: number | null
  createdAt: string
  updatedAt: string
}

export interface RegistryItem {
  id: string
  registryId: string
  categoryId: string | null
  providerProfileId: string | null
  title: string
  description: string | null
  targetAmountCents: number
  fundedAmountCents: number
  isFulfilled: boolean
  sortOrder: number
  customPurpose: string | null
  fundingFrequency: FundingFrequency
}

export interface Donation {
  id: string
  supporterId: string | null
  registryItemId: string | null
  registryId: string | null
  amountCents: number
  status: DonationStatus
  message: string | null
  isAnonymous: boolean
  createdAt: string
  completedAt: string | null
}

export interface Booking {
  id: string
  motherId: string
  providerId: string
  providerServiceId: string | null
  scheduledAt: string | null
  durationMinutes: number | null
  amountCents: number
  status: BookingStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface WaitlistEntry {
  id: string
  email: string
  createdAt: string
}

export interface ProviderReview {
  id: string
  providerProfileId: string
  motherId: string
  rating: number
  isRecommended: boolean
  reviewText: string | null
  createdAt: string
}

// ─── API Request / Response shapes ───────────────────────────────────────────

export interface ApiError {
  statusCode: number
  error: string
  message: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Auth
export interface RegisterBody {
  email: string
  password: string
  firstName: string
  lastName: string
  role: UserRole
}

export interface LoginBody {
  email: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  user: User
}

export interface JwtPayload {
  sub: string // user id
  email: string
  role: UserRole
  iat?: number
  exp?: number
}

// Waitlist
export interface WaitlistJoinBody {
  email: string
}

export interface WaitlistJoinResponse {
  message: string
}

// Admin
export interface AdminOverviewMetrics {
  gmvCents: number
  activeUsers: Record<UserRole, number>
  waitlistCount: number
  waitlistToSignupConversionRate: number
  retention30dRate: number
  retention90dRate: number
  rescueQueueCount: number
  openProviderVettingCount: number
  migrationCount: number
  latestMigrationAt: string | null
}

export interface AdminHealthSnapshot {
  apiLatencyMs: number
  dbLatencyMs: number
  errorRate1h: number
  schemaMigrationCount: number
  latestMigrationAt: string | null
  generatedAt: string
}

export interface AdminUserDirectoryItem {
  id: string
  email: string
  role: UserRole
  fullName: string | null
  isActive: boolean
  suspendedAt: string | null
  lastLoginAt: string | null
  createdAt: string
}

export interface SystemFeatureFlag {
  key: string
  label: string
  enabled: boolean
  updatedAt: string
}

export interface BetaInvitation {
  id: string
  email: string
  inviteCode: string
  status: 'draft' | 'sent' | 'opened' | 'accepted' | 'revoked'
  sentAt: string | null
  openedAt: string | null
  acceptedAt: string | null
  createdAt: string
}
