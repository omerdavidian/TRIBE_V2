import 'dotenv/config'
import { and, eq, inArray, isNull, notInArray, or, sql } from 'drizzle-orm'
import { db } from '../db/client.js'
import {
  donations,
  providerProfiles,
  providerServices,
  registries,
  serviceSignups,
  supportPages,
  userFavorites,
  users,
} from '../db/schema.js'

const protectedEmails = (
  process.env['ALPHA_PROTECTED_ADMIN_EMAILS'] ??
  process.env['PLATFORM_ALERT_EMAIL'] ??
  process.env['RESEND_FROM_EMAIL'] ??
  ''
)
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean)

async function run() {
  console.log('[wipe-sandbox-data] Starting teardown...')
  console.log(`[wipe-sandbox-data] Protected email count: ${protectedEmails.length}`)

  await db.transaction(async (tx) => {
    const deletedDonations = await tx
      .delete(donations)
      .where(eq(donations.isTestData, true))
      .returning({ id: donations.id })

    const deletedSignups = await tx
      .delete(serviceSignups)
      .where(eq(serviceSignups.isTestData, true))
      .returning({ id: serviceSignups.id })

    const candidateUsers = await tx
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.isRealUser, false),
          protectedEmails.length > 0
            ? notInArray(users.email, protectedEmails)
            : sql`true`
        )
      )

    const candidateUserIds = candidateUsers.map((row) => row.id)

    if (candidateUserIds.length > 0) {
      const providerProfileRows = await tx
        .select({ id: providerProfiles.id })
        .from(providerProfiles)
        .where(inArray(providerProfiles.userId, candidateUserIds))
      const providerProfileIds = providerProfileRows.map((row) => row.id)

      await tx.delete(userFavorites).where(or(
        inArray(userFavorites.userId, candidateUserIds),
        inArray(userFavorites.supportPageOwnerId, candidateUserIds)
      ))

      await tx.delete(supportPages).where(inArray(supportPages.userId, candidateUserIds))

      if (providerProfileIds.length > 0) {
        await tx.delete(providerServices).where(inArray(providerServices.providerProfileId, providerProfileIds))
      }

      await tx.delete(donations).where(inArray(donations.supporterId, candidateUserIds))
      await tx.delete(serviceSignups).where(or(
        inArray(serviceSignups.motherUserId, candidateUserIds),
        inArray(serviceSignups.volunteerUserId, candidateUserIds)
      ))

      await tx.delete(providerProfiles).where(inArray(providerProfiles.userId, candidateUserIds))
      await tx.delete(registries).where(inArray(registries.userId, candidateUserIds))
      await tx.delete(users).where(inArray(users.id, candidateUserIds))
    }

    // Also remove anonymous or orphaned test records that may not tie to users.
    await tx.delete(donations).where(and(eq(donations.isTestData, true), isNull(donations.supporterId)))
    await tx.delete(serviceSignups).where(and(eq(serviceSignups.isTestData, true), isNull(serviceSignups.volunteerUserId)))

    console.log(`[wipe-sandbox-data] Deleted test donations: ${deletedDonations.length}`)
    console.log(`[wipe-sandbox-data] Deleted test service signups: ${deletedSignups.length}`)
    console.log(`[wipe-sandbox-data] Deleted non-real users: ${candidateUserIds.length}`)
  })

  console.log('[wipe-sandbox-data] Complete.')
}

run().catch((error) => {
  console.error('[wipe-sandbox-data] Failed:', error)
  process.exit(1)
})