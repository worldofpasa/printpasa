import Database from 'better-sqlite3'

const dbPath = process.env.DB_PATH || '/data/db/printpasa.db'
const db = new Database(dbPath)

console.log('=== USERS ===')
const users = db.prepare('SELECT id, email, name, role FROM users').all()
console.log(JSON.stringify(users, null, 2))

console.log('\n=== PROJECTS (last 10) ===')
const projects = db.prepare('SELECT id, user_id, name, slug FROM projects ORDER BY created_at DESC LIMIT 10').all()
console.log(JSON.stringify(projects, null, 2))

db.close()
