/**
 * Pure Eight — Demo Seed Script
 * Run: node scripts/seed-demo.mjs
 * Uses service role key (bypasses RLS) to seed realistic demo data.
 */

import { createClient } from '@supabase/supabase-js'

// Credentials come from .env.local — never hardcode a project URL or service key here,
// or the script silently targets a stale project after any migration.
try { process.loadEnvFile(new URL('../.env.local', import.meta.url)) } catch { /* fall back to ambient env */ }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (checked .env.local and environment).')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

function log(msg) { console.log(`✓ ${msg}`) }
function err(msg, e) { console.error(`✗ ${msg}:`, e?.message ?? e); process.exit(1) }
function warn(msg) { console.warn(`! ${msg}`) }

// Resolve auth user IDs by email at runtime. public.users.id is FK'd to auth.users(id),
// so hardcoded UUIDs break the moment the project changes.
const SEED_EMAILS = {
  staff:   'staff@pureeight.com',
  manager: 'demo@pureeight.com',
  hq:      'admin@pureeight.com',
  akbar:   'akbarqcr@gmail.com',
}

const { data: authList, error: authErr } = await db.auth.admin.listUsers({ perPage: 1000 })
if (authErr) err('list auth users', authErr)

const byEmail = new Map(authList.users.map((u) => [u.email?.toLowerCase(), u.id]))
const AUTH_USERS = {}
for (const [key, email] of Object.entries(SEED_EMAILS)) {
  const id = byEmail.get(email)
  if (id) AUTH_USERS[key] = id
  else warn(`No auth user for ${email} — skipping its user/staff rows. Create it in Auth to seed fully.`)
}
log(`Resolved ${Object.keys(AUTH_USERS).length}/${Object.keys(SEED_EMAILS).length} auth users on ${new URL(SUPABASE_URL).hostname}`)

async function upsert(table, data, conflict = 'id') {
  const { data: rows, error } = await db.from(table).upsert(data, { onConflict: conflict }).select()
  if (error) err(`upsert ${table}`, error)
  return rows
}

// ── 1. Tenant ────────────────────────────────────────────────
const [tenant] = await upsert('tenants', {
  id:   'a0000000-0000-0000-0000-000000000001',
  name: 'Pure Eight',
  type: 'hq',
})
log('Tenant: Pure Eight')

// ── 2. Outlet ────────────────────────────────────────────────
const [outlet] = await upsert('outlets', {
  id:        'b0000000-0000-0000-0000-000000000001',
  tenant_id: tenant.id,
  name:      'Pure Eight — Bandra',
  address:   '14 Hill Road, Bandra West',
  city:      'Mumbai',
  state:     'Maharashtra',
  phone:     '+91 22 2640 0000',
})
log('Outlet: Pure Eight Bandra')

// ── 3. public.users (mirror of auth.users) ───────────────────
for (const [key, id] of Object.entries(AUTH_USERS)) {
  const names = { staff: 'Priya Sharma', manager: 'Demo Manager', hq: 'HQ Admin', akbar: 'akbr' }
  await upsert('users', { id, full_name: names[key] })
}
log('Public users synced')

// ── 4. Staff records ─────────────────────────────────────────
const [staffRecord] = await upsert('staff', {
  id:          'c0000000-0000-0000-0000-000000000001',
  outlet_id:   outlet.id,
  user_id:     AUTH_USERS.staff ?? null,
  full_name:   'Priya Sharma',
  mobile:      '+91 98765 43210',
  role_title:  'Senior Stylist',
  skills:      ['haircut', 'colour', 'blowdry'],
})
log('Staff: Priya Sharma')

const [managerRecord] = await upsert('staff', {
  id:          'c0000000-0000-0000-0000-000000000002',
  outlet_id:   outlet.id,
  user_id:     AUTH_USERS.manager ?? null,
  full_name:   'Demo Manager',
  mobile:      '+91 91234 00000',
  role_title:  'Outlet Manager',
  skills:      [],
})
log('Staff: Demo Manager')

// ── 5. Services ──────────────────────────────────────────────
const services = await upsert('services', [
  { id: 'd0000000-0000-0000-0000-000000000001', brand_id: tenant.id, category: 'Hair', name: 'Haircut (Women)', duration_mins: 45, price: 800 },
  { id: 'd0000000-0000-0000-0000-000000000002', brand_id: tenant.id, category: 'Hair', name: 'Blowdry & Style', duration_mins: 30, price: 600 },
  { id: 'd0000000-0000-0000-0000-000000000003', brand_id: tenant.id, category: 'Hair', name: 'Hair Colour (Global)', duration_mins: 120, price: 3500 },
  { id: 'd0000000-0000-0000-0000-000000000004', brand_id: tenant.id, category: 'Hair', name: 'Deep Conditioning', duration_mins: 45, price: 1200 },
  { id: 'd0000000-0000-0000-0000-000000000005', brand_id: tenant.id, category: 'Skin', name: 'Facial (Classic)', duration_mins: 60, price: 1800 },
])
log(`Services: ${services.length} created`)

// ── 6. Customers ─────────────────────────────────────────────
const customers = await upsert('customers', [
  { id: 'e0000000-0000-0000-0000-000000000001', brand_id: tenant.id, full_name: 'Aarav Mehta',    mobile: '9876543210' },
  { id: 'e0000000-0000-0000-0000-000000000002', brand_id: tenant.id, full_name: 'Preethi Nair',   mobile: '9123456789' },
  { id: 'e0000000-0000-0000-0000-000000000003', brand_id: tenant.id, full_name: 'Sunita Agarwal', mobile: '9988776655' },
])
log(`Customers: ${customers.length} created`)

// ── 7. Appointments ──────────────────────────────────────────
// Today at 10:30, 12:00, 15:00 IST; tomorrow at 11:00
const IST = 5.5 * 60 * 60 * 1000
const today = new Date(); today.setHours(0,0,0,0)
const t = (h, m) => new Date(today.getTime() + h*3600000 + m*60000 - IST).toISOString()

const appts = await upsert('appointments', [
  {
    id: 'f0000000-0000-0000-0000-000000000001',
    outlet_id:   outlet.id,
    customer_id: customers[0].id,
    starts_at:   t(10, 30),
    ends_at:     t(11, 15),
    status:      'confirmed',
    source:      'online',
    notes:       'Prefers dry cut. Regular customer.',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000002',
    outlet_id:   outlet.id,
    customer_id: customers[1].id,
    starts_at:   t(12, 0),
    ends_at:     t(13, 0),
    status:      'pending',
    source:      'online',
    notes:       null,
  },
  {
    id: 'f0000000-0000-0000-0000-000000000003',
    outlet_id:   outlet.id,
    customer_id: customers[2].id,
    starts_at:   t(15, 0),
    ends_at:     t(16, 0),
    status:      'pending',
    source:      'manual',
    notes:       'First visit.',
  },
])
log(`Appointments: ${appts.length} for today`)

// ── 8. Appointment items (assign Priya as staff) ─────────────
await upsert('appointment_items', [
  {
    id: '77000001-0000-0000-0000-000000000001',
    appointment_id: appts[0].id,
    service_id:     services[0].id,   // Haircut
    staff_id:       staffRecord.id,
    duration_mins:  45,
    price:          800,
    status:         'confirmed',
  },
  {
    id: '77000001-0000-0000-0000-000000000002',
    appointment_id: appts[1].id,
    service_id:     services[2].id,   // Hair Colour
    staff_id:       staffRecord.id,
    duration_mins:  120,
    price:          3500,
    status:         'pending',
  },
  {
    id: '77000001-0000-0000-0000-000000000003',
    appointment_id: appts[1].id,
    service_id:     services[1].id,   // Blowdry (add-on)
    staff_id:       staffRecord.id,
    duration_mins:  30,
    price:          600,
    status:         'pending',
  },
  {
    id: '77000001-0000-0000-0000-000000000004',
    appointment_id: appts[2].id,
    service_id:     services[4].id,   // Facial
    staff_id:       staffRecord.id,
    duration_mins:  60,
    price:          1800,
    status:         'pending',
  },
])
log('Appointment items assigned to Priya Sharma')

const seededStaffLogin = AUTH_USERS.staff ? SEED_EMAILS.staff : '(no staff auth user — appointments are unassigned to a login)'
console.log(`\n🎉 Seed complete! 3 appointments today for: ${seededStaffLogin}`)
console.log('   Run the migration SQL in Supabase Dashboard to enable staff RLS.\n')
