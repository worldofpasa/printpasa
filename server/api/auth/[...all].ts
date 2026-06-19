import { getAuth } from '~~/server/lib/auth'

export default defineEventHandler((event) => {
  return getAuth().handler(toWebRequest(event))
})
