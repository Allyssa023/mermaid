// data.js — realistic mock data wired to actual MERMAID vendor features
// Backend domain: orders, lots, listings, deals, catch alerts, reviews, shop

window.MERMAID_DATA = (() => {
  const today = new Date();
  const day = (d) => new Date(today.getTime() - d * 86400000);

  const species = [
    { id: 1, common: 'Yellowfin Tuna',     local: 'Tambakol',      icon: '🐟', color: '#fa7faa' },
    { id: 2, common: 'Milkfish',           local: 'Bangus',        icon: '🐠', color: '#5ec8e6' },
    { id: 3, common: 'Grouper',            local: 'Lapu-Lapu',     icon: '🪸', color: '#c2ef4e' },
    { id: 4, common: 'Mackerel Scad',      local: 'Galunggong',    icon: '🐡', color: '#9d8cff' },
    { id: 5, common: 'Spanish Mackerel',   local: 'Tanigue',       icon: '🦈', color: '#ff9d6b' },
    { id: 6, common: 'Red Snapper',        local: 'Maya-Maya',     icon: '🐟', color: '#ff5e9c' },
    { id: 7, common: 'Blue Crab',          local: 'Alimasag',      icon: '🦀', color: '#5ce0c0' },
  ];

  const fishermen = [
    'Mang Ricco Salazar', 'Cap. Lourdes Bañes', 'Berto Cunanan',
    'Mariela Vargas',     'Tomas Aquino',       'Esme Pajaro',
    'Jonas Tabaranza',    'Inez de la Cruz',
  ];

  const buyers = [
    'Cebu Pacific Catering', 'Manila Bay Grill',   'Coastal Foods PH',
    'Sunset Eatery',         'Marina Sushi Co.',   'San Pedro Resto',
    'Reef & River Bistro',   'Atin-Atin Carinderia',
  ];

  // Sparkline series — 30 points per top species
  const seriesFor = (seed, drift = 0) => {
    const pts = [];
    let v = 50 + (seed * 13) % 35;
    for (let i = 0; i < 30; i++) {
      v += (Math.sin((i + seed) / 2.5) * 4) + ((seed + i) % 5 - 2) + drift * 0.2;
      pts.push(Math.max(8, v));
    }
    return pts;
  };

  const topSpecies = [
    {
      ...species[0],
      type: 'Premium · Sashimi grade',
      revenueShare: 32.4,
      revenueDelta: 6.25,
      lots: 4,
      pricePerKg: 480,
      lastWeek: 28960,
      series: seriesFor(3),
    },
    {
      ...species[2],
      type: 'Reef · Whole fresh',
      revenueShare: 21.7,
      revenueDelta: 4.18,
      lots: 3,
      pricePerKg: 380,
      lastWeek: 21090,
      series: seriesFor(11),
    },
    {
      ...species[5],
      type: 'Reef · Fillet',
      revenueShare: 12.9,
      revenueDelta: -1.89,
      lots: 2,
      pricePerKg: 320,
      lastWeek: 10870,
      series: seriesFor(7, -1),
    },
  ];

  const featuredListing = {
    ...species[0],
    code: 'LST-218',
    title: species[0].common,
    soldKg: 31.39686,
    remainingKg: 14.6,
    pricePerKg: 480,
    costPerKg: 360,
    margin: 25,
    listedAt: day(2),
    pickupLocation: 'Cebu City — Pier 4',
    photos: 5,
    rating: 4.8,
    reviews: 124,
    lotId: 'LOT-2026-0418',
    fisherman: 'Cap. Lourdes Bañes',
  };

  const miniStats = [
    { name: 'Sell-through', sub: 'Listing velocity',     value: '0.82', unit: 'kg/hr', delta: -1.10, deltaWindow: '24H', deltaDir: 'down', bar: 36 },
    { name: 'Price',        sub: 'Avg agreed/kg',        value: '₱419', unit: '',      delta: -1.09, deltaWindow: '24H', deltaDir: 'down', bar: 58 },
    { name: 'Sell ratio',   sub: 'Lot turnover',         value: '60.6', unit: '%',     delta: null,  deltaWindow: '24H', deltaDir: null,   bar: 60 },
    { name: 'Reward',       sub: 'Margin vs cost',       value: '25',   unit: '%',     delta: 2.23, deltaWindow: '24H', deltaDir: 'up',   bar: 72, dual: { delta: 1.46, window: '48H' } },
  ];

  const orders = [
    { id: 9821, code: 'ORD-9821', buyer: buyers[0], species: species[0].common, qty: 6.5, price: 480, total: 3120, status: 'PENDING',   created: day(0), badge: 'new'  },
    { id: 9820, code: 'ORD-9820', buyer: buyers[3], species: species[2].common, qty: 2.0, price: 380, total: 760,  status: 'CONFIRMED', created: day(0), badge: 'prep' },
    { id: 9819, code: 'ORD-9819', buyer: buyers[5], species: species[1].common, qty: 12.0, price: 220, total: 2640, status: 'CONFIRMED', created: day(0), badge: 'ready' },
    { id: 9818, code: 'ORD-9818', buyer: buyers[4], species: species[5].common, qty: 4.5, price: 320, total: 1440, status: 'COMPLETED', created: day(1), badge: 'done' },
    { id: 9815, code: 'ORD-9815', buyer: buyers[1], species: species[3].common, qty: 22.0, price: 160, total: 3520, status: 'COMPLETED', created: day(2), badge: 'done' },
    { id: 9814, code: 'ORD-9814', buyer: buyers[6], species: species[6].common, qty: 8.0, price: 280, total: 2240, status: 'CANCELLED', created: day(2), badge: 'cancel' },
  ];

  const advisories = [
    {
      tone: 'warn',
      title: 'Squall line · Tañon Strait',
      sub: 'Gale warning 16:00 ChT — handoff windows for 3 incoming lots may slip by 4–6h.',
      time: '24m',
      icon: 'storm',
    },
    {
      tone: 'info',
      title: 'BFAR red-tide advisory lifted',
      sub: 'Sorsogon Bay cleared. Shellfish listings can resume tomorrow.',
      time: '1h',
      icon: 'badge',
    },
    {
      tone: 'ok',
      title: 'New match · Tambakol 22kg',
      sub: 'Cap. Lourdes Bañes posted a sashimi-grade lot matching your watchlist.',
      time: '2h',
      icon: 'fish',
    },
    {
      tone: 'info',
      title: 'Fuel index +3.1%',
      sub: 'Distributor diesel tracker rose this morning; expect price-per-kg pressure on Galunggong.',
      time: '3h',
      icon: 'wave',
    },
  ];

  const lowStock = [
    { species: species[0], remaining: 14.6, threshold: 40, lots: 2, days: 1, color: '#fa7faa' },
    { species: species[2], remaining:  8.2, threshold: 25, lots: 1, days: 0, color: '#c2ef4e' },
    { species: species[5], remaining:  4.0, threshold: 18, lots: 1, days: 2, color: '#ff5e9c' },
    { species: species[6], remaining: 11.5, threshold: 30, lots: 2, days: 1, color: '#5ce0c0' },
  ];

  const procurementAlerts = [
    {
      code: 'CA-4419', species: species[0], qty: 22, price: 360,
      expires: 'in 6h 12m', fisher: 'Cap. Lourdes Bañes', match: 96,
    },
    {
      code: 'CA-4418', species: species[4], qty: 14, price: 240,
      expires: 'in 9h 04m', fisher: 'Berto Cunanan', match: 84,
    },
    {
      code: 'CA-4416', species: species[3], qty: 38, price: 110,
      expires: 'in 11h', fisher: 'Mariela Vargas', match: 72,
    },
    {
      code: 'CA-4415', species: species[2], qty: 9, price: 320,
      expires: 'in 12h', fisher: 'Jonas Tabaranza', match: 68,
    },
  ];

  const activeListings = [
    { code: 'LST-218', species: species[0], amount: 7699, color: '#fa7faa' },
    { code: 'LST-217', species: species[2], amount: 1340, color: '#c2ef4e' },
    { code: 'LST-216', species: species[3], amount:  540, color: '#9d8cff' },
    { code: 'LST-215', species: species[5], amount:  980, color: '#ff5e9c', dim: true },
  ];

  // ---------- Storefront listings ----------
  const listings = [
    { id: 218, code: 'LST-218', species: species[0], title: 'Sashimi-grade Yellowfin', price: 480, status: 'ACTIVE', stock: 14.6, sold30d: 31.4, views: 482, photos: 6, rating: 4.8, reviews: 124 },
    { id: 217, code: 'LST-217', species: species[2], title: 'Live reef Lapu-Lapu, whole', price: 380, status: 'ACTIVE', stock: 8.2,  sold30d: 22.1, views: 318, photos: 5, rating: 4.9, reviews: 86  },
    { id: 216, code: 'LST-216', species: species[3], title: 'Fresh Galunggong (Mackerel scad)', price: 110, status: 'ACTIVE', stock: 38, sold30d: 84.0, views: 612, photos: 4, rating: 4.6, reviews: 211 },
    { id: 215, code: 'LST-215', species: species[5], title: 'Maya-Maya fillet, pickup-only', price: 320, status: 'DRAFT',  stock: 4.0,  sold30d: 11.5, views: 88,  photos: 5, rating: null, reviews: 0   },
    { id: 214, code: 'LST-214', species: species[6], title: 'Live Alimasag (Blue crab) — bundle of 6', price: 240, status: 'ACTIVE', stock: 11.5, sold30d: 18.0, views: 274, photos: 4, rating: 4.7, reviews: 52 },
    { id: 213, code: 'LST-213', species: species[4], title: 'Smoked Tanigue steak, vac-pack', price: 360, status: 'PAUSED', stock: 0,    sold30d: 4.0,  views: 41,  photos: 5, rating: 4.4, reviews: 18 },
  ];

  // ---------- Inventory lots ----------
  const lots = [
    { id: 4218, code: 'LOT-2026-0418', species: species[0], received: day(2), initialKg: 46.0, remainingKg: 14.6, costPerKg: 360, source: 'Cap. Lourdes Bañes', orderCode: 'PO-1244', listed: true },
    { id: 4217, code: 'LOT-2026-0417', species: species[2], received: day(3), initialKg: 30.3, remainingKg:  8.2, costPerKg: 280, source: 'Jonas Tabaranza',   orderCode: 'PO-1239', listed: true },
    { id: 4216, code: 'LOT-2026-0416', species: species[3], received: day(1), initialKg: 122,  remainingKg: 84.0, costPerKg:  82, source: 'Mariela Vargas',    orderCode: 'PO-1241', listed: true },
    { id: 4215, code: 'LOT-2026-0415', species: species[6], received: day(2), initialKg: 24.0, remainingKg: 11.5, costPerKg: 195, source: 'Tomas Aquino',      orderCode: 'PO-1238', listed: true },
    { id: 4214, code: 'LOT-2026-0414', species: species[5], received: day(4), initialKg: 18.5, remainingKg:  4.0, costPerKg: 240, source: 'Berto Cunanan',     orderCode: 'PO-1232', listed: false },
    { id: 4213, code: 'LOT-2026-0413', species: species[4], received: day(5), initialKg: 22.0, remainingKg:  0.0, costPerKg: 260, source: 'Esme Pajaro',       orderCode: 'PO-1230', listed: true },
    { id: 4212, code: 'LOT-2026-0412', species: species[1], received: day(0), initialKg: 60.0, remainingKg: 50.5, costPerKg: 140, source: 'Inez de la Cruz',   orderCode: 'PO-1247', listed: true },
  ];

  // ---------- Deals / messages threads ----------
  const deals = [
    {
      id: 412, code: 'CA-4419', species: species[0], fisher: 'Cap. Lourdes Bañes',
      lastMsg: 'How about ₱370/kg if we take all 22?',  lastAt: '12:18', unread: 2,
      status: 'NEGOTIATING', myQty: 22, ask: 360, offer: 370, agreed: null,
      messages: [
        { from: 'fisher', t: '08:42', text: '22kg yellowfin tuna, sashimi grade. Iced this morning.' },
        { from: 'fisher', t: '08:42', text: 'Asking ₱400/kg, flexible if you take whole.', kind: 'offer', price: 400, qty: 22 },
        { from: 'me',     t: '11:05', text: 'Can do ₱360/kg, all 22.', kind: 'counter', price: 360, qty: 22 },
        { from: 'fisher', t: '12:18', text: 'How about ₱370/kg if we take all 22?', kind: 'counter', price: 370, qty: 22 },
      ],
    },
    {
      id: 411, code: 'CA-4418', species: species[4], fisher: 'Berto Cunanan',
      lastMsg: 'Deal! See you at Pier 4 at 14:00.', lastAt: '11:02', unread: 0,
      status: 'AGREED', myQty: 14, ask: 240, offer: 240, agreed: 240,
      messages: [],
    },
    {
      id: 410, code: 'CA-4416', species: species[3], fisher: 'Mariela Vargas',
      lastMsg: 'I can do ₱105/kg, that\'s the lowest.', lastAt: 'Yesterday', unread: 1,
      status: 'NEGOTIATING', myQty: 38, ask: 110, offer: 105, agreed: null,
      messages: [],
    },
    {
      id: 409, code: 'CA-4415', species: species[2], fisher: 'Jonas Tabaranza',
      lastMsg: 'Cancelled — already sold to another vendor.', lastAt: 'Mon', unread: 0,
      status: 'CANCELLED', myQty: 9, ask: 320, offer: null, agreed: null,
      messages: [],
    },
  ];

  // ---------- Analytics ----------
  const analyticsSummary = {
    totalOrders: 184, totalRevenue: 412800, totalQtyKg: 942, avgOrderValue: 2243, uniqueBuyers: 38, repeatRate: 0.68,
  };
  const revenueBySpecies = [
    { name: 'Yellowfin Tuna',   revenue: 134000, kg: 280 },
    { name: 'Grouper',          revenue:  89000, kg: 235 },
    { name: 'Red Snapper',      revenue:  53000, kg: 168 },
    { name: 'Spanish Mackerel', revenue:  41000, kg: 113 },
    { name: 'Mackerel Scad',    revenue:  38000, kg: 346 },
    { name: 'Blue Crab',        revenue:  31000, kg:  98 },
    { name: 'Milkfish',         revenue:  26800, kg: 192 },
  ];
  const procurementSpend = [
    { name: 'Yellowfin Tuna',   spend: 100800, kg: 280 },
    { name: 'Mackerel Scad',    spend:  28400, kg: 346 },
    { name: 'Grouper',          spend:  65800, kg: 235 },
    { name: 'Red Snapper',      spend:  38640, kg: 168 },
    { name: 'Spanish Mackerel', spend:  29380, kg: 113 },
    { name: 'Blue Crab',        spend:  19110, kg:  98 },
    { name: 'Milkfish',         spend:  16320, kg: 192 },
  ];
  const repeatBuyers = [
    { name: 'Cebu Pacific Catering', orders: 22, spent: 64800, last: '2d', tier: 'VIP' },
    { name: 'Manila Bay Grill',      orders: 18, spent: 51200, last: '1d', tier: 'VIP' },
    { name: 'Coastal Foods PH',      orders: 14, spent: 39400, last: '3d', tier: 'Reg' },
    { name: 'Sunset Eatery',         orders: 11, spent: 26100, last: '4h', tier: 'Reg' },
    { name: 'Marina Sushi Co.',      orders:  9, spent: 28800, last: '6h', tier: 'VIP' },
    { name: 'Reef & River Bistro',   orders:  7, spent: 15200, last: '5d', tier: 'New' },
  ];

  // ---------- Reviews ----------
  const reviews = [
    { id: 71, reviewer: 'Cebu Pacific Catering', rating: 5, code: 'ORD-9818', species: species[5].common, qty: 4.5, date: day(1),
      comment: 'Fillet was pristine — the freshness photos matched exactly what we received. Will reorder for the weekend banquet.',
      reply: null },
    { id: 70, reviewer: 'Manila Bay Grill', rating: 5, code: 'ORD-9815', species: species[3].common, qty: 22, date: day(2),
      comment: 'Bulk Galunggong arrived ice-cold, eyes bright. Handoff was on time at Pier 4. Solid 5.',
      reply: 'Thank you! See you next Tuesday for the standing 30kg order.' },
    { id: 69, reviewer: 'Sunset Eatery', rating: 4, code: 'ORD-9811', species: species[0].common, qty: 3, date: day(4),
      comment: 'Tuna was great but pickup window was tight — could you confirm earlier next time?',
      reply: null },
    { id: 68, reviewer: 'Marina Sushi Co.', rating: 5, code: 'ORD-9806', species: species[0].common, qty: 6, date: day(6),
      comment: 'Best yellowfin we\'ve sourced in months. Bright red gills, firm flesh, sashimi-cut perfect.',
      reply: 'Thanks Marina! Cap. Lourdes will be thrilled to hear it.' },
    { id: 67, reviewer: 'Coastal Foods PH', rating: 3, code: 'ORD-9803', species: species[1].common, qty: 12, date: day(7),
      comment: 'Milkfish was OK but two pieces had bruised bellies. Otherwise on time.', reply: null },
  ];

  // ---------- Marine advisory ----------
  const advisoryStations = [
    { id: 'TS-CEB', name: 'Mactan Channel',  tide: 1.42, trend: 'up',   wind: 14, waveHt: 0.6, status: 'OK',  risk: 22 },
    { id: 'TS-BOH', name: 'Bohol Strait',    tide: 0.92, trend: 'down', wind: 22, waveHt: 1.1, status: 'WARN', risk: 58 },
    { id: 'TS-TAN', name: 'Tañon Strait',    tide: 1.18, trend: 'up',   wind: 28, waveHt: 1.8, status: 'ALERT',risk: 84 },
    { id: 'TS-SUR', name: 'Surigao Strait',  tide: 1.05, trend: 'flat', wind: 12, waveHt: 0.5, status: 'OK',   risk: 18 },
  ];
  const bfarNotices = [
    { id: 'B-2206', title: 'Red-tide ban LIFTED — Sorsogon Bay', sub: 'Shellfish harvesting & sale resumes 06:00 tomorrow.', tone: 'ok',   date: 'today' },
    { id: 'B-2204', title: 'Sardine closed-season reminder',     sub: 'Visayan Sea closure: Nov 15 → Feb 15. Inventory holding from before window allowed with cert.', tone: 'info', date: '2d' },
    { id: 'B-2201', title: 'Effort cap — purse-seine, Region 7', sub: 'Daily landing cap 4.2t in effect for accredited vessels.', tone: 'info', date: '4d' },
    { id: 'B-2197', title: 'Squall warning — Tañon Strait',      sub: 'Gale force gusts to 45kt 16:00→24:00. Handoff windows may slip 4–6h.', tone: 'warn', date: 'now' },
  ];
  const tideSeries = [0.4,0.5,0.7,0.95,1.2,1.35,1.4,1.42,1.38,1.25,1.05,0.85,0.6,0.45,0.5,0.65,0.85,1.05,1.25,1.4,1.5,1.55,1.5,1.42];

  // ---------- Shop profile ----------
  const shop = {
    displayName: 'Perlas Coast Seafood',
    slug: 'perlas-coast',
    bio: 'BFAR-accredited Cebu City vendor. Sashimi-grade tuna, live reef fish, and value cuts sourced direct from accredited cooperatives. Pickup at Pier 4, same-day delivery within Metro Cebu.',
    pickupLocation: 'Pier 4, Cebu City — Bay 12 (look for the lime crate)',
    logoInitials: 'PC',
    banner: 'wave',
    hours: [
      { day: 'MON', open: '05:30', close: '18:00', closed: false },
      { day: 'TUE', open: '05:30', close: '18:00', closed: false },
      { day: 'WED', open: '05:30', close: '18:00', closed: false },
      { day: 'THU', open: '05:30', close: '18:00', closed: false },
      { day: 'FRI', open: '05:30', close: '20:00', closed: false },
      { day: 'SAT', open: '04:00', close: '20:00', closed: false },
      { day: 'SUN', open: '06:00', close: '14:00', closed: false },
    ],
    metrics: { followers: 1284, repeat: 68, fulfillment: 99.2, response: '12 min' },
  };

  return {
    species, fishermen, buyers,
    topSpecies, featuredListing, miniStats,
    orders, advisories, lowStock, procurementAlerts, activeListings,
    listings, lots, deals,
    analyticsSummary, revenueBySpecies, procurementSpend, repeatBuyers,
    reviews, advisoryStations, bfarNotices, tideSeries, shop,
    vendor: {
      handle: '@perlas_seafood',
      tier: 'BFAR',
      name: 'Mariel Quintos',
      shop: 'Perlas Coast Seafood',
      slug: 'perlas-coast',
      todayRevenue: 18420,
      openOrders: { new: 3, preparing: 4, ready: 2 },
      unread: 11,
    },
  };
})();
