// MERMAID Buyer Dashboard — Sample data modeled on the backend
// (BuyerHomeController, BuyerOrderController, BuyerMarketplaceController, FavoriteRepository,
//  BuyerRecommendationsController, MarineController, ChatController)

const BUYER_DATA = {
  buyer: {
    name: "Aaron Velasco",
    handle: "@aaron.buys",
    business: "Sailors' Table · Quezon City",
    tier: "PRO",
    initials: "AV",
  },

  // KPI snapshot
  kpis: {
    pending:    { count: 2, deltaPct: -1.0, sub: "awaiting vendor confirm" },
    confirmed:  { count: 4, deltaPct: 12.5, sub: "prep in progress" },
    spendMonth: { peso: 48230, deltaPct: 6.25, sub: "vs last month" },
  },

  // Featured fresh listing (mirrors the screenshot's "featured asset" focal block)
  featured: {
    listingCode: "LST-2107",
    species: "Yellowfin Tuna",
    sci: "Thunnus albacares",
    vendor: "Aqua Pearl Seafoods",
    vendorHandle: "@aqua_pearl",
    rating: 4.8,
    reviewCount: 217,
    distanceKm: 4.2,
    market: "Navotas Fish Port",
    harvestHrsAgo: 6,
    availableKg: 31.396,
    pricePerKg: 480,
    bfarRefPerKg: 500,
    freshnessScore: 96,
    soldKg: 18.6,
    totalListedKg: 50,
    avatar: "linear-gradient(135deg,#fbbf24,#f87171)",
    initials: "YT",
    window: "6h since harvest",
    expires: "Best before 18:00 tomorrow",
    expiresPct: 0.32,
  },

  // Marine advisory (BuyerHomeController would surface zone)
  advisory: {
    zoneName: "Manila Bay · Z4 (vendor zone)",
    state: "Calm — dispatch on track",
    level: "safe",
    seaState: "Slight · 0.6 m",
    windKt: 12,
    windDir: "NE",
    sst: 28.4,
    tide: "Rising · 1.4 m",
    visibility: "10+ km",
    nextAdvisoryHrs: 6,
    items: [
      { kind: "info",   title: "Cold-chain dispatch on schedule", sub: "Your 3 active orders ETA: today 14:00–17:00", time: "now" },
      { kind: "warn",   title: "Small craft advisory · Zone 5",   sub: "May delay tomorrow's Squid from Lingayen pier", time: "2h" },
      { kind: "danger", title: "Red tide bulletin · Bataan",      sub: "2 saved vendors paused listings — see details",  time: "12h" },
      { kind: "info",   title: "BFAR price ceiling refreshed",    sub: "Yellowfin ₱500 · Bangus ₱260 · Tilapia ₱180",     time: "1d" },
    ],
  },

  // My orders (BuyerOrderController returns: orderCode, speciesName, orderedQtyKg,
  // agreedPricePerKg, status: PENDING/CONFIRMED/COMPLETED/CANCELLED)
  orders: [
    { code: "ORD-7821", vendor: "Aqua Pearl Seafoods", species: "Yellowfin Tuna",  qty: 4.2, price: 480, total: 2016, status: "confirmed", eta: "Today · 14:00", avatar: "linear-gradient(135deg,#fbbf24,#f87171)", initials: "YT" },
    { code: "ORD-7820", vendor: "Bay Currents Catch",  species: "Bangus",          qty: 12,  price: 220, total: 2640, status: "pending",   eta: "Awaiting confirm", avatar: "linear-gradient(135deg,#5eead4,#38bdf8)", initials: "BG" },
    { code: "ORD-7819", vendor: "Pier 12 Fishhouse",   species: "Tilapia",         qty: 8.5, price: 180, total: 1530, status: "confirmed", eta: "Today · 16:30", avatar: "linear-gradient(135deg,#a78bfa,#6a5fc1)", initials: "TI" },
    { code: "ORD-7818", vendor: "Bicol Reef Direct",   species: "Blue Marlin",     qty: 6,   price: 620, total: 3720, status: "pending",   eta: "Awaiting confirm", avatar: "linear-gradient(135deg,#60a5fa,#3b82f6)", initials: "BM" },
    { code: "ORD-7817", vendor: "Aqua Pearl Seafoods", species: "Galunggong",      qty: 22,  price: 120, total: 2640, status: "completed", eta: "Picked up", avatar: "linear-gradient(135deg,#c2ef4e,#84cc16)", initials: "GG" },
    { code: "ORD-7816", vendor: "Tideline Coastal",    species: "Squid",           qty: 9,   price: 280, total: 2520, status: "completed", eta: "Delivered", avatar: "linear-gradient(135deg,#fa7faa,#f97316)", initials: "SQ" },
    { code: "ORD-7815", vendor: "Aqua Pearl Seafoods", species: "Shrimp",          qty: 5,   price: 540, total: 2700, status: "completed", eta: "Delivered", avatar: "linear-gradient(135deg,#f472b6,#ec4899)", initials: "SH" },
    { code: "ORD-7814", vendor: "Coral Coast Co.",     species: "Lapu-Lapu",       qty: 3.5, price: 720, total: 2520, status: "cancelled",eta: "Refunded", avatar: "linear-gradient(135deg,#fbbf24,#f59e0b)", initials: "LL" },
  ],

  // Marketplace fresh listings (recommendations + browse)
  marketplace: [
    { id: 4821, species: "Yellowfin Tuna", vendor: "Aqua Pearl Seafoods",  market: "Navotas · 4.2km",  qty: 24, price: 480, recommended: true,  freshness: 96, avatar: "linear-gradient(135deg,#fbbf24,#f87171)", initials: "YT" },
    { id: 4820, species: "Mahi-mahi",      vendor: "Bicol Reef Direct",    market: "Legazpi · ship",   qty: 18, price: 410, recommended: true,  freshness: 92, avatar: "linear-gradient(135deg,#60a5fa,#3b82f6)", initials: "MM" },
    { id: 4819, species: "Galunggong",     vendor: "Pier 12 Fishhouse",    market: "Navotas · 4.2km",  qty: 48, price: 105, recommended: false, freshness: 88, avatar: "linear-gradient(135deg,#c2ef4e,#84cc16)", initials: "GG" },
    { id: 4818, species: "Squid",          vendor: "Tideline Coastal",     market: "Pangasinan · ship",qty: 14, price: 260, recommended: false, freshness: 90, avatar: "linear-gradient(135deg,#fa7faa,#f97316)", initials: "SQ" },
    { id: 4817, species: "Bangus",         vendor: "Bay Currents Catch",   market: "Dagupan · ship",   qty: 80, price: 220, recommended: true,  freshness: 94, avatar: "linear-gradient(135deg,#5eead4,#38bdf8)", initials: "BG" },
    { id: 4816, species: "Lapu-Lapu",      vendor: "Coral Coast Co.",      market: "Cebu · ship",      qty: 6,  price: 720, recommended: false, freshness: 89, avatar: "linear-gradient(135deg,#fbbf24,#f59e0b)", initials: "LL" },
  ],

  // Saved vendors (Favorites)
  saved: [
    { name: "Aqua Pearl Seafoods", handle: "@aqua_pearl", rating: 4.8, orders: 18, active: true,  initials: "AP", avatar: "linear-gradient(135deg,#fbbf24,#f87171)" },
    { name: "Bay Currents Catch",  handle: "@bay_currents", rating: 4.6, orders: 7,  active: true,  initials: "BC", avatar: "linear-gradient(135deg,#5eead4,#38bdf8)" },
    { name: "Pier 12 Fishhouse",   handle: "@pier12", rating: 4.7, orders: 4, active: false, initials: "P12", avatar: "linear-gradient(135deg,#a78bfa,#6a5fc1)" },
    { name: "Tideline Coastal",    handle: "@tideline", rating: 4.5, orders: 2, active: true, initials: "TC", avatar: "linear-gradient(135deg,#fa7faa,#f97316)" },
  ],

  // Activity feed (Notifications + chat)
  activity: [
    { kind: "order",   title: "ORD-7821 confirmed",          body: "Aqua Pearl Seafoods accepted · ETA 14:00 today", time: "2m" },
    { kind: "alert",   title: "Fresh catch · Yellowfin",      body: "Aqua Pearl listed 24kg @ ₱480/kg from morning haul", time: "8m" },
    { kind: "review",  title: "Review reminder",              body: "Rate your order ORD-7816 from Tideline Coastal", time: "32m" },
    { kind: "system",  title: "Payment settled",              body: "₱2,640 charged to BPI ····2914 for ORD-7817", time: "1h" },
    { kind: "dispute", title: "Vendor message",               body: "Bicol Reef Direct: \"Marlin from today's longline ready 09:00\"", time: "3h" },
    { kind: "order",   title: "Order ready for pickup",       body: "ORD-7819 · Pier 12 — 8.5kg Tilapia at counter", time: "4h" },
  ],

  // Cart summary
  cart: { items: 3, subtotal: 8186, itemsSpecies: ["Yellowfin Tuna", "Bangus", "Squid"] },
};

// Sparkline seed
function genSparkB(seed, points = 36) {
  const out = [];
  let v = 50;
  for (let i = 0; i < points; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const r = seed / 233280;
    v += (r - 0.5) * 18;
    v = Math.max(15, Math.min(85, v));
    out.push(v);
  }
  return out;
}
const BUYER_SPARK = {
  spend:     genSparkB(31, 36),
  orders:    genSparkB(43, 36),
  freshness: genSparkB(57, 36),
};

window.BUYER_DATA = BUYER_DATA;
window.BUYER_SPARK = BUYER_SPARK;
