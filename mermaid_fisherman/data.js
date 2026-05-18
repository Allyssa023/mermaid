/* Realistic MERMAID fisherman data — based on backend domain models */

const DATA = {
  user: {
    fullName: "Mateo Villanueva",
    firstName: "Mateo",
    initials: "MV",
    role: "FISHERMAN",
    handle: "mateo.v",
    vesselName: "F/V Bantayog",
    homePort: "San Fernando Fish Port",
    bfarVerified: true,
    rating: 4.8,
    completedTrips: 142,
    memberSince: "2023",
  },

  // Marine advisories — from /advisories endpoint
  advisories: [
    { id: "ADV-204", severity: "HIGH", title: "Surf swell elevated", area: "San Juan Coast", message: "Wave heights exceeding 1.4m. Small craft use caution.", issuedAt: "2h ago", icon: "Wave" },
    { id: "ADV-203", severity: "MEDIUM", title: "NE wind brisk", area: "San Juan Coast", message: "Wind gusts up to 36 km/h. Avoid extended trips past 6PM.", issuedAt: "4h ago", icon: "Wind" },
    { id: "ADV-202", severity: "LOW", title: "Light rain", area: "Bacnotan Waters", message: "Brief showers expected within the next 6 hours.", issuedAt: "6h ago", icon: "Drop" },
    { id: "ADV-201", severity: "INFO", title: "BFAR Bulletin", area: "Region I", message: "Mackerel season opens June 1. Permits available.", issuedAt: "1d ago", icon: "Alert" },
  ],

  // Marine zones — La Union coastal grounds (from /marine/conditions endpoint)
  zones: [
    {
      id: "SF-BAY",
      name: "San Fernando Bay",
      region: "La Union · City of San Fernando",
      risk: "SAFE",
      waveM: 0.6,
      swellM: 0.4,
      swellS: 5,
      windKmh: 12,
      windDir: "NE",
      windGust: 18,
      tempC: 28.6,
      rainMm: 0.0,
      cloudPct: 22,
      advisory: null,
      spark: [0.4, 0.5, 0.5, 0.6, 0.7, 0.6, 0.5, 0.6, 0.7, 0.8, 0.7, 0.6],
      sparkColor: "#6ee7b7",
      delta: "+4.2%",
      deltaTone: "up",
      ledePrice: "+₱2,956",
    },
    {
      id: "BAUANG",
      name: "Bauang Reef",
      region: "La Union · Bauang",
      risk: "SAFE",
      waveM: 0.7,
      swellM: 0.5,
      swellS: 6,
      windKmh: 14,
      windDir: "ENE",
      windGust: 22,
      tempC: 28.8,
      rainMm: 0.0,
      cloudPct: 28,
      advisory: null,
      spark: [0.6, 0.6, 0.7, 0.7, 0.8, 0.7, 0.7, 0.7, 0.8, 0.8, 0.7, 0.7],
      sparkColor: "#6ee7b7",
      delta: "+2.8%",
      deltaTone: "up",
      ledePrice: "+₱1,210",
    },
    {
      id: "SAN-JUAN",
      name: "San Juan Coast",
      region: "La Union · San Juan",
      risk: "CAUTION",
      waveM: 1.4,
      swellM: 1.1,
      swellS: 8,
      windKmh: 24,
      windDir: "NE",
      windGust: 36,
      tempC: 27.8,
      rainMm: 1.4,
      cloudPct: 62,
      advisory: "Surf swell elevated — exercise caution on small craft",
      spark: [0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.4, 1.3, 1.4, 1.5, 1.4],
      sparkColor: "#fcd34d",
      delta: "+5.6%",
      deltaTone: "up",
      ledePrice: "+₱2,009",
    },
    {
      id: "BACNOTAN",
      name: "Bacnotan Waters",
      region: "La Union · Bacnotan",
      risk: "SAFE",
      waveM: 0.8,
      swellM: 0.6,
      swellS: 6,
      windKmh: 16,
      windDir: "E",
      windGust: 24,
      tempC: 28.4,
      rainMm: 0.2,
      cloudPct: 38,
      advisory: null,
      spark: [0.7, 0.8, 0.8, 0.7, 0.8, 0.9, 0.8, 0.8, 0.9, 0.8, 0.8, 0.8],
      sparkColor: "#6ee7b7",
      delta: "+1.4%",
      deltaTone: "up",
      ledePrice: "+₱780",
    },
  ],

  // Active trip
  activeTrip: {
    id: 4218,
    code: "T-4218",
    vesselName: "F/V Bantayog",
    targetArea: "Bauang Reef",
    departurePoint: "San Fernando Fish Port",
    departureLat: 16.6159,
    departureLng: 120.3166,
    startedAt: Date.now() - 1000 * 60 * 60 * 4 - 1000 * 60 * 17,
    status: "ACTIVE",
    checklist: {
      fuelChecked: true,
      engineChecked: true,
      radioChecked: true,
      lifeVestChecked: true,
      weatherReviewed: true,
      emergencyKitChecked: false,
    },
    crew: 4,
  },

  // Catch logs for active trip
  catchLogs: [
    { id: 1, species: "Bangus (Milkfish)", quantityKg: 38, pricePerKg: 220, loggedAt: "07:42", notes: "Mid-size, fresh from net 2" },
    { id: 2, species: "Galunggong (Round scad)", quantityKg: 64, pricePerKg: 145, loggedAt: "08:55", notes: null },
    { id: 3, species: "Tamban (Sardine)", quantityKg: 92, pricePerKg: 95, loggedAt: "09:28", notes: "Good haul, net 3 east" },
    { id: 4, species: "Tulingan (Bullet tuna)", quantityKg: 22, pricePerKg: 285, loggedAt: "10:14", notes: "Whole, gilled & gutted" },
  ],

  // Past trips
  pastTrips: [
    { id: 4217, code: "T-4217", area: "Polillo Strait", departure: "Real Port", durationH: 8, durationM: 22, kg: 312, revenue: 58400, date: "MAY 16", status: "COMPLETED" },
    { id: 4216, code: "T-4216", area: "Tayabas Bay South", departure: "Lucena Fish Port", durationH: 11, durationM: 04, kg: 428, revenue: 79200, date: "MAY 14", status: "COMPLETED" },
    { id: 4215, code: "T-4215", area: "Ragay Gulf", departure: "Pasacao Port", durationH: 6, durationM: 38, kg: 184, revenue: 32100, date: "MAY 11", status: "COMPLETED" },
    { id: 4214, code: "T-4214", area: "Lamon Bay", departure: "Atimonan Port", durationH: 2, durationM: 12, kg: 0, revenue: 0, date: "MAY 09", status: "CANCELLED" },
    { id: 4213, code: "T-4213", area: "Tayabas Bay North", departure: "Lucena Fish Port", durationH: 9, durationM: 48, kg: 358, revenue: 67400, date: "MAY 07", status: "COMPLETED" },
  ],

  // Catch alerts
  catchAlerts: [
    { id: 882, species: "Tulingan (Bullet tuna)", quantityKg: 22, askingPricePerKg: 285, status: "MATCHED", offers: 3, expiresIn: "1h 32m", urgent: false },
    { id: 881, species: "Tamban (Sardine)", quantityKg: 92, askingPricePerKg: 95, status: "ACTIVE", offers: 1, expiresIn: "3h 04m", urgent: false },
    { id: 880, species: "Galunggong", quantityKg: 64, askingPricePerKg: 145, status: "ACTIVE", offers: 2, expiresIn: "0h 41m", urgent: true },
    { id: 879, species: "Bangus", quantityKg: 38, askingPricePerKg: 220, status: "SOLD", offers: 4, soldFor: 8580, vendor: "Bayview Seafood Co." },
    { id: 878, species: "Lapu-Lapu (Grouper)", quantityKg: 12, askingPricePerKg: 480, status: "EXPIRED", offers: 0 },
  ],

  // Active deals
  deals: [
    { id: 451, vendor: "Bayview Seafood Co.", vendorAvatar: "BS", species: "Bangus", quantityKg: 60, agreedPrice: 215, status: "ENGAGED", lastActivity: "12m ago", unread: 2 },
    { id: 450, vendor: "Manila Pier 8 Distributors", vendorAvatar: "MP", species: "Tulingan", quantityKg: 30, agreedPrice: 280, status: "AWAITING_HANDOFF", lastActivity: "1h ago", unread: 0 },
    { id: 449, vendor: "Coastline Fresh", vendorAvatar: "CF", species: "Tamban", quantityKg: 120, agreedPrice: 90, status: "PROPOSAL", lastActivity: "2h ago", unread: 1 },
    { id: 448, vendor: "Lucena Wet Market Co-op", vendorAvatar: "LW", species: "Galunggong", quantityKg: 80, agreedPrice: 150, status: "ENGAGED", lastActivity: "4h ago", unread: 0 },
  ],

  // Orders — fisherman's outgoing sales to vendors
  orders: [
    { id: 1042, code: "O-1042", vendor: "Bayview Seafood Co.", species: "Bangus", qtyKg: 60, pricePerKg: 215, status: "PENDING", payment: "CASH", handoff: null, createdAt: "Today 09:14" },
    { id: 1041, code: "O-1041", vendor: "Manila Pier 8 Distributors", species: "Tulingan", qtyKg: 30, pricePerKg: 280, status: "CONFIRMED", payment: "CASH", handoff: "INITIATED", createdAt: "Today 08:50" },
    { id: 1040, code: "O-1040", vendor: "Coastline Fresh", species: "Tamban", qtyKg: 120, pricePerKg: 90, status: "CONFIRMED", payment: "CREDIT", handoff: "CONFIRMED", createdAt: "Yesterday" },
    { id: 1039, code: "O-1039", vendor: "Lucena Wet Market Co-op", species: "Galunggong", qtyKg: 80, pricePerKg: 150, status: "COMPLETED", payment: "CASH", handoff: "CONFIRMED", createdAt: "May 16" },
    { id: 1038, code: "O-1038", vendor: "South Tagalog Cold Chain", species: "Lapu-Lapu", qtyKg: 18, pricePerKg: 475, status: "DISPUTED", payment: "CREDIT", handoff: "CONFIRMED", createdAt: "May 15" },
  ],

  // Procurement orders — fisherman BUYING supplies (ice, fuel, etc.)
  procurement: [
    { id: 211, species: "Diesel", qtyKg: 80, pricePerKg: 62, status: "PENDING", paymentMethod: "CASH", vendor: "Lucena Marine Supply", note: "80L drum" },
    { id: 210, species: "Block Ice", qtyKg: 200, pricePerKg: 9, status: "ACCEPTED", paymentMethod: "CASH", vendor: "Quezon Cold Storage", note: "2 deliveries" },
    { id: 209, species: "Bait (Galunggong)", qtyKg: 25, pricePerKg: 85, status: "PENDING", paymentMethod: "CASH", vendor: "Bait Hub PH" },
  ],

  // Earnings
  earnings: {
    range: "30d",
    totalGross: 184250,
    cashCollected: 142100,
    creditOutstanding: 42150,
    orderCount: 38,
    avgPerOrder: 4848,
    weeklyData: [
      { week: "W18", value: 38400 }, { week: "W19", value: 42100 },
      { week: "W20", value: 51200 }, { week: "W21", value: 52550 },
    ],
    monthlyChart: [
      { day: 1, value: 4200 }, { day: 2, value: 5800 }, { day: 3, value: 0 },
      { day: 4, value: 6400 }, { day: 5, value: 7100 }, { day: 6, value: 5200 },
      { day: 7, value: 8400 }, { day: 8, value: 3900 }, { day: 9, value: 0 },
      { day: 10, value: 4800 }, { day: 11, value: 6200 }, { day: 12, value: 7800 },
      { day: 13, value: 9100 }, { day: 14, value: 4400 }, { day: 15, value: 5100 },
      { day: 16, value: 8200 }, { day: 17, value: 7400 }, { day: 18, value: 6800 },
      { day: 19, value: 9400 }, { day: 20, value: 8100 }, { day: 21, value: 0 },
      { day: 22, value: 5400 }, { day: 23, value: 6900 }, { day: 24, value: 8200 },
      { day: 25, value: 7100 }, { day: 26, value: 9800 }, { day: 27, value: 5400 },
      { day: 28, value: 7800 }, { day: 29, value: 8400 }, { day: 30, value: 9200 },
    ],
    ledger: [
      { orderId: 1041, date: "2026-05-17", vendor: "Manila Pier 8 Distributors", species: "Tulingan", qtyKg: 30, gross: 8400, paymentMethod: "CASH" },
      { orderId: 1040, date: "2026-05-16", vendor: "Coastline Fresh", species: "Tamban", qtyKg: 120, gross: 10800, paymentMethod: "CREDIT" },
      { orderId: 1039, date: "2026-05-16", vendor: "Lucena Wet Market Co-op", species: "Galunggong", qtyKg: 80, gross: 12000, paymentMethod: "CASH" },
      { orderId: 1037, date: "2026-05-14", vendor: "Bayview Seafood Co.", species: "Bangus", qtyKg: 45, gross: 9900, paymentMethod: "CASH" },
      { orderId: 1036, date: "2026-05-13", vendor: "Coastline Fresh", species: "Tamban", qtyKg: 90, gross: 8100, paymentMethod: "CASH" },
      { orderId: 1035, date: "2026-05-12", vendor: "South Tagalog Cold Chain", species: "Tulingan", qtyKg: 24, gross: 6720, paymentMethod: "CREDIT" },
    ],
  },

  // Messages / chats
  messages: [
    { id: 1, with: "Bayview Seafood Co.", initials: "BS", lastMsg: "Confirming pickup at 4pm at Lucena Port. Send your boat ID once you arrive.", time: "12m", unread: 2 },
    { id: 2, with: "Manila Pier 8 Distributors", initials: "MP", lastMsg: "Payment confirmed, ₱8,400 received via cash on handoff.", time: "1h", unread: 0 },
    { id: 3, with: "Coastline Fresh", initials: "CF", lastMsg: "Can you adjust the price to ₱88/kg for the Tamban? We can take all 120kg.", time: "2h", unread: 1 },
    { id: 4, with: "Lucena Wet Market Co-op", initials: "LW", lastMsg: "Great trip log shared. Will reach out for next week's haul.", time: "4h", unread: 0 },
    { id: 5, with: "BFAR Region IV-A Office", initials: "BF", lastMsg: "Your annual fishing permit renewal is due in 18 days.", time: "1d", unread: 0 },
    { id: 6, with: "South Tagalog Cold Chain", initials: "ST", lastMsg: "Dispute opened on order O-1038. Please respond within 48hrs.", time: "2d", unread: 0 },
  ],

  // Chat thread with selected vendor
  chatThread: [
    { from: "in", text: "Hi Mateo, saw your Bangus alert. Still available?", time: "09:14" },
    { from: "out", text: "Yes sir, 60kg total, fresh haul from this morning.", time: "09:16" },
    { from: "in", text: "Asking price ₱220/kg right? Can you do ₱215?", time: "09:18" },
    { from: "out", text: "Sige, ₱215 is fine. Pickup at Lucena Port?", time: "09:19" },
    { from: "in", text: "Yes, sending order now. Confirming pickup at 4pm at Lucena Port. Send your boat ID once you arrive.", time: "09:24" },
  ],

  // Activity feed
  activity: [
    { id: 1, kind: "deal", icon: "Users", tone: "lime", title: "Bayview Seafood Co. engaged your Bangus alert", time: "12m ago", meta: "₱215/kg · 60kg" },
    { id: 2, kind: "advisory", icon: "Alert", tone: "caution", title: "Caution advisory issued for Polillo Strait", time: "1h ago", meta: "NE winds 28km/h, gust 42" },
    { id: 3, kind: "order", icon: "Clipboard", tone: "safe", title: "Order O-1040 handoff confirmed by Coastline Fresh", time: "2h ago", meta: "₱10,800 · CREDIT" },
    { id: 4, kind: "payment", icon: "Wallet", tone: "lime", title: "Cash payment received from Manila Pier 8", time: "4h ago", meta: "₱8,400 · O-1041" },
    { id: 5, kind: "alert", icon: "Bell", tone: "violet", title: "Catch alert CA-882 matched with 3 vendors", time: "6h ago", meta: "Tulingan · 22kg" },
    { id: 6, kind: "procurement", icon: "Receipt", tone: "pink", title: "Diesel procurement order accepted", time: "8h ago", meta: "Lucena Marine Supply" },
  ],
};

window.DATA = DATA;
