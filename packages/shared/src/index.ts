// ─── Roles & Enums ────────────────────────────────────────────────────────────

export type UserRole = 'mother' | 'supporter' | 'provider' | 'admin'

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

// ─── Core entities ────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  role: UserRole
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
  fullName: string
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
