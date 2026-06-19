import { seedSuperuserFromEnv } from '~~/server/utils/superuser-seed'

export default defineNitroPlugin(() => {
  seedSuperuserFromEnv().catch((err) => {
    console.error('[seed-superuser] failed:', err)
  })
})
