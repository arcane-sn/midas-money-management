import http from 'node:http'
import { mkdirSync } from 'node:fs'
import { openDb, seed } from './src/db.js'
import { createApp } from './src/api.js'
import { runDue } from './src/recurring.js'
import { todayJakarta } from './src/capture.js'

const { MIDAS_TOKEN: token, MIDAS_PASSWORD: password } = process.env
if (!token || !password) { console.error('Set MIDAS_TOKEN and MIDAS_PASSWORD (copy .env.example to .env)'); process.exit(1) }
mkdirSync('data', { recursive: true })
const db = openDb('data/midas.db'); seed(db)
const tick = () => { const n = runDue(db, todayJakarta()); if (n) console.log(`recurring: created ${n}`) }
tick(); setInterval(tick, 3600000)
http.createServer(createApp(db, { token, password, dataDir: 'data' })).listen(5003, '127.0.0.1', () => console.log('MIDAS on http://127.0.0.1:5003'))
