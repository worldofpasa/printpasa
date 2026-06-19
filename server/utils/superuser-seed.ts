import { hashPassword } from 'better-auth/crypto'
import { and, eq, ne } from 'drizzle-orm'
import { useDB, schema } from '~~/server/database'

function superuserEmail(username: string) {
  return `${username}@printpasa.local`
}

function superuserDisplayName(username: string) {
  return username.charAt(0).toUpperCase() + username.slice(1)
}

export async function seedSuperuserFromEnv() {
  const config = useRuntimeConfig()
  const password = (config.superuserPassword as string)?.trim()
    || process.env.NUXT_SUPERUSER_PASSWORD?.trim()

  if (!password) {
    console.log('[seed-superuser] NUXT_SUPERUSER_PASSWORD not set, skipping.')
    return
  }

  const username = (
    (config.superuserUsername as string)?.trim()
    || process.env.NUXT_SUPERUSER_USERNAME?.trim()
    || 'admin'
  ).toLowerCase()

  const db = useDB()
  const userId = username
  const email = superuserEmail(username)
  const name = superuserDisplayName(username)
  const passwordHash = await hashPassword(password)

  const existingUser = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  })

  if (!existingUser) {
    await db.insert(schema.users).values({
      id: userId,
      email,
      name,
      image: null,
      role: 'superuser',
      emailVerified: true,
    })
    console.log(`[seed-superuser] created superuser "${username}" (${userId})`)
  } else {
    await db
      .update(schema.users)
      .set({
        email,
        name,
        role: 'superuser',
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId))
  }

  const existingAccount = await db.query.authAccounts.findFirst({
    where: and(
      eq(schema.authAccounts.userId, userId),
      eq(schema.authAccounts.providerId, 'credential'),
    ),
  })

  if (!existingAccount) {
    await db.insert(schema.authAccounts).values({
      id: crypto.randomUUID(),
      accountId: email,
      providerId: 'credential',
      userId,
      password: passwordHash,
    })
    console.log('[seed-superuser] created credential account')
  } else {
    await db
      .update(schema.authAccounts)
      .set({ password: passwordHash, updatedAt: new Date() })
      .where(eq(schema.authAccounts.id, existingAccount.id))
    console.log('[seed-superuser] rotated superuser password')
  }

  await db
    .update(schema.users)
    .set({ role: 'user', updatedAt: new Date() })
    .where(and(eq(schema.users.role, 'superuser'), ne(schema.users.id, userId)))
}

export async function resolvePipelineOwnerUserId(
  configured: string,
): Promise<string | null> {
  const ref = configured.trim()
  if (!ref) return null

  const db = useDB()
  const byId = await db.query.users.findFirst({
    where: eq(schema.users.id, ref),
  })
  if (byId) return byId.id

  const byName = await db.query.users.findFirst({
    where: eq(schema.users.name, ref),
  })
  if (byName) return byName.id

  const byEmail = await db.query.users.findFirst({
    where: eq(schema.users.email, ref),
  })
  if (byEmail) return byEmail.id

  return null
}
