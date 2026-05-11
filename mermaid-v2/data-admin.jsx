// ─── Admin mock data ─────────────────────────────────────────────────────
// Admin perspective on /admin/* endpoints: users, advisories, fish-species,
// market-locations, plus platform-level metrics derived from all roles.

const ADMIN_USER = {
  id: 1,
  fullName: 'Liza Domingo',
  first: 'Liza',
  email: 'liza@mermaid.ph',
  role: 'ADMIN',
  team: 'Platform Operations',
  port: 'BFAR Region IV-A',
};

// Users (UserSummary): id, fullName, email, role, active
const ADMIN_USERS = [
  { id: 101, fullName: 'Ramiro Delgado',     email: 'ramiro@mermaid.ph',     role: 'FISHERMAN', active: true,  joined: '2025-08-12', lastSeen: '2h ago',     trips: 47, region: 'Batangas' },
  { id: 102, fullName: 'Carlos Bautista',    email: 'carlos@mermaid.ph',     role: 'FISHERMAN', active: true,  joined: '2025-09-04', lastSeen: '5h ago',     trips: 32, region: 'Quezon' },
  { id: 103, fullName: 'Tomas Reyes',        email: 'tomas@mermaid.ph',      role: 'FISHERMAN', active: true,  joined: '2025-07-21', lastSeen: '1h ago',     trips: 51, region: 'Quezon' },
  { id: 104, fullName: 'Helena Cruz',        email: 'helena@mermaid.ph',     role: 'FISHERMAN', active: true,  joined: '2025-11-02', lastSeen: '4d ago',     trips: 28, region: 'Batangas' },
  { id: 105, fullName: 'Capt. Arturo R.',    email: 'arturo@mermaid.ph',     role: 'FISHERMAN', active: true,  joined: '2024-12-15', lastSeen: 'Yesterday', trips: 89, region: 'Batangas' },
  { id: 106, fullName: 'Mateo Villar',       email: 'mateo@mermaid.ph',      role: 'FISHERMAN', active: false, joined: '2025-10-08', lastSeen: '11d ago',    trips: 14, region: 'Quezon' },
  { id: 210, fullName: 'Inez Marina',        email: 'inez@marinaseafoods.ph',role: 'VENDOR',    active: true,  joined: '2025-06-10', lastSeen: '1h ago',     listings: 28, region: 'Quezon' },
  { id: 211, fullName: 'Bay City Market',    email: 'ops@baycity.ph',        role: 'VENDOR',    active: true,  joined: '2025-07-01', lastSeen: '8h ago',     listings: 19, region: 'Quezon' },
  { id: 212, fullName: 'J. Aquino & Sons',   email: 'jaquino@aquino.ph',     role: 'VENDOR',    active: true,  joined: '2025-09-17', lastSeen: 'Yesterday', listings: 11, region: 'Batangas' },
  { id: 213, fullName: 'Puerto Azul Resto',  email: 'kitchen@puertoazul.ph', role: 'VENDOR',    active: true,  joined: '2025-08-22', lastSeen: '3h ago',     listings: 8,  region: 'Batangas' },
  { id: 214, fullName: 'Del Mar Cold Chain', email: 'ops@delmar.ph',         role: 'VENDOR',    active: true,  joined: '2025-05-30', lastSeen: '6h ago',     listings: 22, region: 'Batangas' },
  { id: 215, fullName: 'Taal Lake Fresh',    email: 'desk@taallake.ph',      role: 'VENDOR',    active: false, joined: '2025-12-01', lastSeen: '24d ago',    listings: 4,  region: 'Batangas' },
  { id: 1,   fullName: 'Liza Domingo',       email: 'liza@mermaid.ph',       role: 'ADMIN',     active: true,  joined: '2024-09-01', lastSeen: 'now',        region: 'HQ' },
  { id: 2,   fullName: 'Renato Villanueva',  email: 'reno@mermaid.ph',       role: 'ADMIN',     active: true,  joined: '2024-09-01', lastSeen: '2d ago',     region: 'HQ' },
];

// Advisories — admin manages all (active and historical)
const ADMIN_ADVISORIES = [
  { id: 1, title: 'Tropical Depression Emong',
    message: 'Sustained winds 65 km/h; gusts to 90 km/h. Cancel all offshore trips through Friday.',
    severity: 'HIGH', affectedArea: 'Sibuyan Sea', isActive: true,
    activeFrom: '2026-04-22T06:00:00+08:00', activeTo: '2026-04-26T18:00:00+08:00',
    createdAt: '2026-04-22T05:42:00+08:00', createdBy: 'Liza Domingo' },
  { id: 2, title: 'Small-craft advisory',
    message: 'Wave heights 1.5–2.0m expected between 14:00–20:00. Exercise caution.',
    severity: 'MEDIUM', affectedArea: 'Balayan Bay', isActive: true,
    activeFrom: '2026-04-23T08:00:00+08:00', activeTo: '2026-04-23T22:00:00+08:00',
    createdAt: '2026-04-23T07:14:00+08:00', createdBy: 'Renato Villanueva' },
  { id: 3, title: 'Lunar tide extreme',
    message: 'Spring tides this week. Low at 03:42, high 09:15. Plan landings accordingly.',
    severity: 'LOW', affectedArea: 'Tayabas Bay', isActive: true,
    activeFrom: '2026-04-22T00:00:00+08:00', activeTo: '2026-04-25T23:59:00+08:00',
    createdAt: '2026-04-22T09:00:00+08:00', createdBy: 'Liza Domingo' },
  { id: 4, title: 'Squall line moving NE',
    message: 'Isolated thunderstorms; visibility may drop below 500m intermittently.',
    severity: 'MEDIUM', affectedArea: 'Ragay Gulf', isActive: true,
    activeFrom: '2026-04-22T18:00:00+08:00', activeTo: '2026-04-24T06:00:00+08:00',
    createdAt: '2026-04-22T17:30:00+08:00', createdBy: 'Liza Domingo' },
  { id: 5, title: 'Reef closure — spawning season',
    message: 'No fishing activity in protected zone for next 14 days.',
    severity: 'CRITICAL', affectedArea: 'Apo Reef',  isActive: true,
    activeFrom: '2026-04-20T00:00:00+08:00', activeTo: '2026-05-04T00:00:00+08:00',
    createdAt: '2026-04-19T16:00:00+08:00', createdBy: 'BFAR Coordination' },
  { id: 6, title: 'Old advisory — high winds',
    message: 'Sustained winds 45 km/h, advised caution.',
    severity: 'MEDIUM', affectedArea: 'Sibuyan Sea', isActive: false,
    activeFrom: '2026-04-15T00:00:00+08:00', activeTo: '2026-04-17T00:00:00+08:00',
    createdAt: '2026-04-15T05:00:00+08:00', createdBy: 'Liza Domingo' },
];

// Reference data — fish species (admin manages)
const ADMIN_SPECIES = [
  { id: 1, commonName: 'Yellowfin Tuna',      scientificName: 'Thunnus albacares',          active: true,  usageCount: 247 },
  { id: 2, commonName: 'Skipjack',            scientificName: 'Katsuwonus pelamis',         active: true,  usageCount: 312 },
  { id: 3, commonName: 'Mahi-mahi',           scientificName: 'Coryphaena hippurus',        active: true,  usageCount: 184 },
  { id: 4, commonName: 'Red Snapper',         scientificName: 'Lutjanus campechanus',       active: true,  usageCount: 96  },
  { id: 5, commonName: 'Grouper (Lapu-lapu)', scientificName: 'Epinephelus fuscoguttatus',  active: true,  usageCount: 142 },
  { id: 6, commonName: 'Spanish Mackerel',    scientificName: 'Scomberomorus commerson',    active: true,  usageCount: 88  },
  { id: 7, commonName: 'Squid (Pusit)',       scientificName: 'Loligo duvaucelii',          active: true,  usageCount: 156 },
  { id: 8, commonName: 'Blue Marlin',         scientificName: 'Makaira nigricans',          active: true,  usageCount: 24  },
  { id: 9, commonName: 'Sailfish',            scientificName: 'Istiophorus platypterus',    active: false, usageCount: 3   },
];

const ADMIN_LOCATIONS = [
  { id: 1, name: 'Marina Seafoods Depot', municipality: 'Quezon',         province: 'Quezon',   active: true,  vendors: 1, listings: 28 },
  { id: 2, name: 'Bay City Market',       municipality: 'Lucena City',    province: 'Quezon',   active: true,  vendors: 1, listings: 19 },
  { id: 3, name: 'Lipa Port',             municipality: 'Lipa',           province: 'Batangas', active: true,  vendors: 1, listings: 11 },
  { id: 4, name: 'Anilao Landing',        municipality: 'Mabini',         province: 'Batangas', active: true,  vendors: 1, listings: 8  },
  { id: 5, name: 'Batangas Port',         municipality: 'Batangas City',  province: 'Batangas', active: true,  vendors: 1, listings: 22 },
  { id: 6, name: 'Taal Fresh',            municipality: 'Taal',           province: 'Batangas', active: false, vendors: 1, listings: 4  },
];

// Platform metrics
const ADMIN_METRICS = {
  totalUsers: 1287,
  fishermen: 942,
  vendors: 341,
  admins: 4,
  newThisWeek: 28,
  activeNow: 184,

  totalTrips: 8642,
  activeTrips: 47,
  tripsToday: 96,

  totalListings: 412,
  openListings: 187,

  totalAlerts: 2341,
  activeAlerts: 84,

  totalOrders: 5611,
  ordersToday: 138,
  orderVolumeKg: 18420,
  orderVolumePhp: 4120000,

  disputedOrders: 7,

  uptimePct: 99.94,
  marineApiHealth: 'OK',
  mailQueue: 12,
};

// Platform activity series — last 30 days
const ADMIN_DAU = (() => {
  const out = [];
  for (let i = 0; i < 30; i++) {
    const base = 220 + Math.sin(i / 4) * 35 + (i % 7 === 6 ? -40 : 0);
    out.push({ day: i, dau: Math.round(base + Math.random() * 22) });
  }
  return out;
})();

// Activity audit log
const ADMIN_AUDIT = [
  { ts: '08:42', actor: 'Renato Villanueva', action: 'updated advisory', target: 'A-2 Small-craft advisory', kind: 'advisory' },
  { ts: '08:11', actor: 'System',            action: 'auto-expired',     target: '12 catch alerts',          kind: 'system' },
  { ts: '07:55', actor: 'Liza Domingo',      action: 'created species',  target: 'Threadfin Bream',          kind: 'lookup' },
  { ts: '07:30', actor: 'System',            action: 'flagged dispute',  target: 'ORD-7387 Bay City vs Mateo', kind: 'flag' },
  { ts: '06:18', actor: 'Liza Domingo',      action: 'deactivated user', target: 'Mateo Villar (id 106)',    kind: 'user' },
  { ts: 'Yest. 22:14', actor: 'BFAR Coord',  action: 'posted advisory',  target: 'A-5 Reef closure',         kind: 'advisory' },
  { ts: 'Yest. 18:02', actor: 'System',      action: 'sync OK',          target: 'Marine data · Open-Meteo', kind: 'system' },
  { ts: 'Yest. 14:40', actor: 'Liza Domingo', action: 'merged duplicate', target: 'Yellowfin Tuna ↔ Tuna YF', kind: 'lookup' },
];

// Health checks
const ADMIN_HEALTH = [
  { name: 'API Gateway',           status: 'OK',   detail: '99.94% uptime · p95 142ms' },
  { name: 'PostgreSQL',            status: 'OK',   detail: '24 connections · 0 slow queries' },
  { name: 'Marine data (Open-Meteo)', status: 'OK', detail: 'Last sync 4 min ago' },
  { name: 'Mail queue',            status: 'WARN', detail: '12 pending · oldest 8 min' },
  { name: 'WebSocket (chat)',      status: 'OK',   detail: '47 active connections' },
  { name: 'Storage',               status: 'OK',   detail: '38% of 100GB used' },
];

Object.assign(window, {
  ADMIN_USER, ADMIN_USERS, ADMIN_ADVISORIES, ADMIN_SPECIES, ADMIN_LOCATIONS,
  ADMIN_METRICS, ADMIN_DAU, ADMIN_AUDIT, ADMIN_HEALTH,
});
