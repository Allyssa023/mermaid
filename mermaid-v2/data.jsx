// ─── Mock data — aligned with backend OpenAPI schema ────────────────────
// Fields mirror the API: Trip, CatchAlert, Order (with handoff & payment),
// DemandListing, SafetyChecklist, MarineConditionsResponse, etc.

const USER = {
  id: 101,
  fullName: 'Ramiro Delgado',
  first: 'Ramiro',
  email: 'ramiro@mermaid.ph',
  role: 'FISHERMAN',
  vessel: 'MV Sirena II',
  license: 'PH-FL-2421',
  port: 'Bauan · Batangas',
};

// MarineConditionsResponse — risk: SAFE | CAUTION | UNSAFE
const ZONES = [
  { zoneId: 'z1', zoneName: 'Verde Island Passage', region: 'Batangas · Mindoro',
    risk: { level: 'SAFE',    score: 2, advisory: 'Excellent conditions. Calm seas, light breeze from SW.' },
    marine: { waveHeightM: 0.8, swellHeightM: 0.4, swellPeriodS: 7.2 },
    weather: { windSpeedKmh: 12, windGustsKmh: 18, precipitationMm: 0.0, temperatureC: 28, cloudCoverPct: 15 } },
  { zoneId: 'z2', zoneName: 'Tayabas Bay', region: 'Quezon',
    risk: { level: 'SAFE',    score: 3, advisory: 'Stable. Minor chop expected in outer bay after 2pm.' },
    marine: { waveHeightM: 1.1, swellHeightM: 0.6, swellPeriodS: 6.8 },
    weather: { windSpeedKmh: 16, windGustsKmh: 22, precipitationMm: 0.2, temperatureC: 29, cloudCoverPct: 30 } },
  { zoneId: 'z3', zoneName: 'Balayan Bay', region: 'Batangas',
    risk: { level: 'CAUTION', score: 6, advisory: 'Elevated swells and gusts. Small-craft advisory in effect.' },
    marine: { waveHeightM: 1.7, swellHeightM: 1.2, swellPeriodS: 5.9 },
    weather: { windSpeedKmh: 24, windGustsKmh: 34, precipitationMm: 1.4, temperatureC: 27, cloudCoverPct: 60 } },
  { zoneId: 'z4', zoneName: 'Ragay Gulf', region: 'Bicol',
    risk: { level: 'CAUTION', score: 6, advisory: 'Squall band passing through. Expect reduced visibility.' },
    marine: { waveHeightM: 1.9, swellHeightM: 1.4, swellPeriodS: 5.4 },
    weather: { windSpeedKmh: 28, windGustsKmh: 40, precipitationMm: 3.2, temperatureC: 27, cloudCoverPct: 75 } },
  { zoneId: 'z5', zoneName: 'Sibuyan Sea', region: 'Romblon',
    risk: { level: 'UNSAFE',  score: 9, advisory: 'Dangerous. Tropical depression tracking NW. Stay ashore.' },
    marine: { waveHeightM: 2.8, swellHeightM: 2.1, swellPeriodS: 4.8 },
    weather: { windSpeedKmh: 42, windGustsKmh: 65, precipitationMm: 8.1, temperatureC: 26, cloudCoverPct: 95 } },
  { zoneId: 'z6', zoneName: 'Batangas Channel', region: 'Batangas',
    risk: { level: 'SAFE',    score: 1, advisory: 'Ideal for nearshore operations and training runs.' },
    marine: { waveHeightM: 0.6, swellHeightM: 0.3, swellPeriodS: 7.8 },
    weather: { windSpeedKmh: 9, windGustsKmh: 14, precipitationMm: 0.0, temperatureC: 29, cloudCoverPct: 10 } },
];

// Advisory — severity: LOW | MEDIUM | HIGH | CRITICAL
const ADVISORIES = [
  { id: 1, severity: 'HIGH',    affectedArea: 'Sibuyan Sea',  title: 'Tropical Depression Emong',
    message: 'Sustained winds 65 km/h; gusts to 90 km/h. Cancel all offshore trips through Friday.', ts: '2h ago' },
  { id: 2, severity: 'MEDIUM',  affectedArea: 'Balayan Bay',  title: 'Small-craft advisory',
    message: 'Wave heights 1.5–2.0m expected between 14:00–20:00. Exercise caution.', ts: '5h ago' },
  { id: 3, severity: 'LOW',     affectedArea: 'Tayabas Bay',  title: 'Lunar tide extreme',
    message: 'Spring tides this week. Low at 03:42, high 09:15. Plan landings accordingly.', ts: '1d ago' },
  { id: 4, severity: 'MEDIUM',  affectedArea: 'Ragay Gulf',   title: 'Squall line moving NE',
    message: 'Isolated thunderstorms; visibility may drop below 500m intermittently.', ts: '1d ago' },
];

const FORECAST_24H = (() => {
  const out = [];
  for (let h = 0; h < 24; h++) {
    const wave = 0.8 + Math.sin((h - 4) / 24 * Math.PI * 2) * 0.35 + Math.sin(h/3) * 0.1;
    const wind = 14 + Math.sin((h - 11) / 24 * Math.PI * 2) * 6 + Math.cos(h/4) * 2;
    out.push({ h, wave: +wave.toFixed(2), wind: +wind.toFixed(1) });
  }
  return out;
})();

// FishSpecies — { id, commonName, scientificName, active }
const SPECIES = [
  { id: 1, commonName: 'Yellowfin Tuna',      scientificName: 'Thunnus albacares',     tag: 'YT', active: true },
  { id: 2, commonName: 'Skipjack',            scientificName: 'Katsuwonus pelamis',    tag: 'SK', active: true },
  { id: 3, commonName: 'Mahi-mahi',           scientificName: 'Coryphaena hippurus',   tag: 'MM', active: true },
  { id: 4, commonName: 'Red Snapper',         scientificName: 'Lutjanus campechanus',  tag: 'RS', active: true },
  { id: 5, commonName: 'Grouper (Lapu-lapu)', scientificName: 'Epinephelus fuscoguttatus', tag: 'LL', active: true },
  { id: 6, commonName: 'Spanish Mackerel',    scientificName: 'Scomberomorus commerson',tag: 'SM', active: true },
  { id: 7, commonName: 'Squid (Pusit)',       scientificName: 'Loligo duvaucelii',     tag: 'PS', active: true },
  { id: 8, commonName: 'Blue Marlin',         scientificName: 'Makaira nigricans',     tag: 'BM', active: true },
];
const sp = (name) => SPECIES.find(s => s.commonName === name || s.commonName.startsWith(name));

// MarketLocation
const LOCATIONS = [
  { id: 1, name: 'Marina Seafoods Depot', municipality: 'Quezon',        province: 'Quezon' },
  { id: 2, name: 'Bay City Market',       municipality: 'Lucena City',   province: 'Quezon' },
  { id: 3, name: 'Lipa Port',             municipality: 'Lipa',          province: 'Batangas' },
  { id: 4, name: 'Anilao Landing',        municipality: 'Mabini',        province: 'Batangas' },
  { id: 5, name: 'Batangas Port',         municipality: 'Batangas City', province: 'Batangas' },
  { id: 6, name: 'Taal Fresh',            municipality: 'Taal',          province: 'Batangas' },
];

// Trip — aligned with API schema. status: PLANNED | ACTIVE | COMPLETED | CANCELLED
// SafetyChecklist: exactly 6 booleans per API.
const ACTIVE_TRIP = {
  id: 2819,
  tripCode: 'T-2819',
  fishermanId: USER.id,
  fishermanName: USER.fullName,
  name: 'Verde Passage Morning Run',
  departurePoint: 'Bauan Port',
  targetArea: 'Verde Island Passage',
  vesselName: 'MV Sirena II',
  crew: 3,
  startedAt: '2026-04-23T04:42:00+08:00',
  endedAt: null,
  status: 'ACTIVE',
  durationH: 5,
  durationM: 23,
  distance: 18.4,
  fuel: 62,
  expectedReturn: '13:30',
  checklist: {
    fuelChecked: true,
    engineChecked: true,
    radioChecked: true,
    lifeVestChecked: true,
    weatherReviewed: true,
    emergencyKitChecked: false,
    checklistCompletedAt: null,
  },
  catches: [
    // CatchLog shape: { id, species, quantityEstimate, quantityKg, estimatedPricePerKg, isSettled, loggedAt, notes }
    { id: 1001, species: sp('Yellowfin'), quantityEstimate: '4 pcs',  quantityKg: 42,  estimatedPricePerKg: 380, isSettled: false, loggedAt: '2026-04-23T05:18:00+08:00', notes: 'Dawn bite off Silonay point' },
    { id: 1002, species: sp('Skipjack'),  quantityEstimate: '12 pcs', quantityKg: 34,  estimatedPricePerKg: 180, isSettled: false, loggedAt: '2026-04-23T06:04:00+08:00', notes: 'School near FAD #14' },
    { id: 1003, species: sp('Mahi'),      quantityEstimate: '2 pcs',  quantityKg: 9,   estimatedPricePerKg: 260, isSettled: true,  settledKg: 9, settledPricePerKg: 258, loggedAt: '2026-04-23T07:32:00+08:00', notes: 'Trolling over thermocline' },
    { id: 1004, species: sp('Squid'),     quantityEstimate: '8 kg',   quantityKg: 8,   estimatedPricePerKg: 220, isSettled: false, loggedAt: '2026-04-23T08:11:00+08:00', notes: '' },
    { id: 1005, species: sp('Grouper'),   quantityEstimate: '1 pc',   quantityKg: 3.2, estimatedPricePerKg: 420, isSettled: false, loggedAt: '2026-04-23T09:26:00+08:00', notes: 'Rare catch — bottom rig' },
  ],
};

const PAST_TRIPS = [
  { id: 2811, tripCode: 'T-2811', date: '2026-04-18', day: '18', month: 'APR', name: 'Balayan Bay Night Run',   targetArea: 'Balayan Bay',        durationH: 9.2, catchKg: 112, revenue: 18400, status: 'COMPLETED', crew: 4 },
  { id: 2807, tripCode: 'T-2807', date: '2026-04-15', day: '15', month: 'APR', name: 'Verde Island Morning',    targetArea: 'Verde Passage',      durationH: 6.0, catchKg: 78,  revenue: 14200, status: 'COMPLETED', crew: 3 },
  { id: 2802, tripCode: 'T-2802', date: '2026-04-11', day: '11', month: 'APR', name: 'Tayabas Scout Trip',      targetArea: 'Tayabas Bay',        durationH: 4.3, catchKg: 34,  revenue: 6100,  status: 'COMPLETED', crew: 2 },
  { id: 2794, tripCode: 'T-2794', date: '2026-04-07', day: '07', month: 'APR', name: 'Sibuyan Deepwater',       targetArea: 'Sibuyan Sea',        durationH: 0,   catchKg: 0,   revenue: 0,     status: 'CANCELLED', crew: 0 },
  { id: 2788, tripCode: 'T-2788', date: '2026-04-03', day: '03', month: 'APR', name: 'Batangas Channel Dawn',   targetArea: 'Batangas Channel',   durationH: 5.5, catchKg: 58,  revenue: 9800,  status: 'COMPLETED', crew: 3 },
];

const PLANNED_TRIPS = [
  { id: 2821, tripCode: 'T-2821', date: '2026-04-25', day: '25', month: 'APR', name: 'Verde Island Long Run', targetArea: 'Verde Island Passage', durationH: null, catchKg: null, revenue: null, status: 'PLANNED', crew: 4, depart: '03:30' },
  { id: 2823, tripCode: 'T-2823', date: '2026-04-28', day: '28', month: 'APR', name: 'Tayabas Grouper Hunt',  targetArea: 'Tayabas Bay',          durationH: null, catchKg: null, revenue: null, status: 'PLANNED', crew: 3, depart: '04:15' },
];

// CatchAlert — status: ACTIVE | MATCHED | EXPIRED | CANCELLED
// Fields: fisherman{id,fullName}, species, catchLogId, quantityEstimate, quantityKg, landingSite,
//         askingPricePerKg, status, matchedListingIds[], expiresAt, createdAt
const CATCH_ALERTS = [
  { id: 841, alertCode: 'CA-841', fisherman: { id: USER.id, fullName: USER.fullName },
    species: sp('Yellowfin'), catchLogId: 1001,
    quantityEstimate: '4 pcs', quantityKg: 42, landingSite: 'Verde Passage', askingPricePerKg: 380,
    status: 'ACTIVE', matchedListingIds: [512, 497, 504, 509, 501], urgent: false,
    createdAt: '2026-04-23T09:14:00+08:00', expiresAt: '2026-04-23T13:14:00+08:00', postedLabel: '09:14' },
  { id: 840, alertCode: 'CA-840', fisherman: { id: USER.id, fullName: USER.fullName },
    species: sp('Mahi'), catchLogId: 1003,
    quantityEstimate: '2 pcs', quantityKg: 9, landingSite: 'Verde Passage', askingPricePerKg: 260,
    status: 'MATCHED', matchedListingIds: [510, 501, 504], urgent: false, buyer: 'Marina Seafoods',
    createdAt: '2026-04-23T08:42:00+08:00', expiresAt: '2026-04-23T12:42:00+08:00', postedLabel: '08:42' },
  { id: 839, alertCode: 'CA-839', fisherman: { id: USER.id, fullName: USER.fullName },
    species: sp('Grouper'), catchLogId: 1005,
    quantityEstimate: '1 pc', quantityKg: 3.2, landingSite: 'Verde Passage', askingPricePerKg: 420,
    status: 'ACTIVE', matchedListingIds: [505, 501, 497, 512, 510, 504, 509], urgent: true,
    createdAt: '2026-04-23T09:58:00+08:00', expiresAt: '2026-04-23T10:39:00+08:00', postedLabel: '09:58' },
  { id: 838, alertCode: 'CA-838', fisherman: { id: USER.id, fullName: USER.fullName },
    species: sp('Squid'), catchLogId: 1004,
    quantityEstimate: '8 kg', quantityKg: 8, landingSite: 'Verde Passage', askingPricePerKg: 220,
    status: 'ACTIVE', matchedListingIds: [501, 497], urgent: false,
    createdAt: '2026-04-23T08:22:00+08:00', expiresAt: '2026-04-23T10:22:00+08:00', postedLabel: '08:22' },
  { id: 832, alertCode: 'CA-832', fisherman: { id: USER.id, fullName: USER.fullName },
    species: sp('Skipjack'), catchLogId: null,
    quantityEstimate: '12 pcs', quantityKg: 34, landingSite: 'Balayan Bay', askingPricePerKg: 180,
    status: 'EXPIRED', matchedListingIds: [497], urgent: false,
    createdAt: '2026-04-22T15:10:00+08:00', expiresAt: '2026-04-22T19:10:00+08:00', postedLabel: 'Yest.' },
  { id: 828, alertCode: 'CA-828', fisherman: { id: USER.id, fullName: USER.fullName },
    species: sp('Spanish'), catchLogId: null,
    quantityEstimate: '3 pcs', quantityKg: 18, landingSite: 'Tayabas Bay', askingPricePerKg: 340,
    status: 'MATCHED', matchedListingIds: [509, 504, 497, 510], urgent: false, buyer: 'Bay City Market',
    createdAt: '2026-04-22T11:30:00+08:00', expiresAt: '2026-04-22T15:30:00+08:00', postedLabel: 'Yest.' },
  { id: 825, alertCode: 'CA-825', fisherman: { id: USER.id, fullName: USER.fullName },
    species: sp('Red Snapper'), catchLogId: null,
    quantityEstimate: '5 pcs', quantityKg: 11, landingSite: 'Verde Passage', askingPricePerKg: 380,
    status: 'CANCELLED', matchedListingIds: [], urgent: false,
    createdAt: '2026-04-21T06:00:00+08:00', expiresAt: '2026-04-21T10:00:00+08:00', postedLabel: 'Apr 21' },
];

// Order — status: PENDING | CONFIRMED | COMPLETED | CANCELLED | DISPUTED
// Fields: buyer, seller (UserRef), species, agreedPricePerKg, orderedQtyKg, dispatchMode
// Sub-resources: handoff { actualQtyKg, finalPricePerKg, totalAmount, confirmedByBuyer, confirmedBySeller, status }
//                payment { amount, method, status }
const ORDERS = [
  { id: 7412, orderCode: 'ORD-7412',
    buyer: { id: 210, fullName: 'Marina Seafoods' },
    seller: { id: USER.id, fullName: USER.fullName },
    buyerSub: 'Brgy. Pinagbayanan, Quezon',
    species: sp('Mahi'),
    agreedPricePerKg: 260, orderedQtyKg: 9, dispatchMode: 'DELIVERY',
    status: 'CONFIRMED',
    handoff: null,  // not yet initiated
    payment: null,
    createdAt: '2026-04-23', notes: 'Ice provided by seller.' },

  { id: 7411, orderCode: 'ORD-7411',
    buyer: { id: 211, fullName: 'Bay City Market' },
    seller: { id: USER.id, fullName: USER.fullName },
    buyerSub: 'Lucena City',
    species: sp('Spanish'),
    agreedPricePerKg: 340, orderedQtyKg: 18, dispatchMode: 'PICKUP',
    status: 'CONFIRMED',
    handoff: { id: 501, orderId: 7411, actualQtyKg: 18, finalPricePerKg: 340, totalAmount: 6120,
               confirmedBySeller: true, confirmedByBuyer: false, status: 'PENDING' },
    payment: null,
    createdAt: '2026-04-22' },

  { id: 7409, orderCode: 'ORD-7409',
    buyer: { id: 212, fullName: 'J. Aquino & Sons' },
    seller: { id: USER.id, fullName: USER.fullName },
    buyerSub: 'Lipa Port',
    species: sp('Yellowfin'),
    agreedPricePerKg: 400, orderedQtyKg: 28, dispatchMode: 'DELIVERY',
    status: 'PENDING',
    handoff: null, payment: null,
    createdAt: '2026-04-22' },

  { id: 7402, orderCode: 'ORD-7402',
    buyer: { id: 213, fullName: 'Puerto Azul Resto' },
    seller: { id: USER.id, fullName: USER.fullName },
    buyerSub: 'Anilao, Batangas',
    species: sp('Grouper'),
    agreedPricePerKg: 520, orderedQtyKg: 6, dispatchMode: 'PICKUP',
    status: 'COMPLETED',
    handoff: { id: 494, orderId: 7402, actualQtyKg: 6, finalPricePerKg: 520, totalAmount: 3120,
               confirmedBySeller: true, confirmedByBuyer: true, status: 'CONFIRMED' },
    payment: { id: 301, orderId: 7402, amount: 3120, method: 'GCASH', status: 'CONFIRMED' },
    createdAt: '2026-04-19' },

  { id: 7398, orderCode: 'ORD-7398',
    buyer: { id: 210, fullName: 'Marina Seafoods' },
    seller: { id: USER.id, fullName: USER.fullName },
    buyerSub: 'Brgy. Pinagbayanan, Quezon',
    species: sp('Skipjack'),
    agreedPricePerKg: 175, orderedQtyKg: 42, dispatchMode: 'DELIVERY',
    status: 'COMPLETED',
    handoff: { id: 488, orderId: 7398, actualQtyKg: 42, finalPricePerKg: 175, totalAmount: 7350,
               confirmedBySeller: true, confirmedByBuyer: true, status: 'CONFIRMED' },
    payment: { id: 295, orderId: 7398, amount: 7350, method: 'BANK_TRANSFER', status: 'CONFIRMED' },
    createdAt: '2026-04-17' },

  { id: 7391, orderCode: 'ORD-7391',
    buyer: { id: 214, fullName: 'Del Mar Cold Chain' },
    seller: { id: USER.id, fullName: USER.fullName },
    buyerSub: 'Batangas Port',
    species: sp('Mahi'),
    agreedPricePerKg: 255, orderedQtyKg: 14, dispatchMode: 'PICKUP',
    status: 'COMPLETED',
    handoff: { id: 481, orderId: 7391, actualQtyKg: 14, finalPricePerKg: 255, totalAmount: 3570,
               confirmedBySeller: true, confirmedByBuyer: true, status: 'CONFIRMED' },
    payment: { id: 289, orderId: 7391, amount: 3570, method: 'CASH', status: 'CONFIRMED' },
    createdAt: '2026-04-14' },

  { id: 7387, orderCode: 'ORD-7387',
    buyer: { id: 211, fullName: 'Bay City Market' },
    seller: { id: USER.id, fullName: USER.fullName },
    buyerSub: 'Lucena City',
    species: sp('Squid'),
    agreedPricePerKg: 215, orderedQtyKg: 22, dispatchMode: 'DELIVERY',
    status: 'DISPUTED',
    handoff: { id: 476, orderId: 7387, actualQtyKg: 19, finalPricePerKg: 215, totalAmount: 4085,
               confirmedBySeller: true, confirmedByBuyer: false, status: 'DISPUTED',
               disputeReason: 'Buyer claims 3kg short of agreed weight.' },
    payment: null,
    createdAt: '2026-04-12' },

  { id: 7381, orderCode: 'ORD-7381',
    buyer: { id: 213, fullName: 'Puerto Azul Resto' },
    seller: { id: USER.id, fullName: USER.fullName },
    buyerSub: 'Anilao, Batangas',
    species: sp('Red Snapper'),
    agreedPricePerKg: 380, orderedQtyKg: 11, dispatchMode: 'PICKUP',
    status: 'CANCELLED',
    handoff: null, payment: null,
    createdAt: '2026-04-10' },
];

// DemandListing — fields: vendorName, fishSpecies, marketLocation, quantityKg, offerPricePerKg,
//                         notes, neededBy, status: OPEN | CLOSED, postedAt
const LISTINGS = [
  { id: 512, listingCode: 'L-512', vendorId: 210, vendorName: 'Marina Seafoods',
    fishSpecies: sp('Yellowfin'),
    marketLocation: { name: 'Marina Seafoods Depot', municipality: 'Quezon' },
    quantityKg: 60, offerPricePerKg: 400, neededBy: '2026-04-25',
    notes: 'Export-grade only. Ice at sea preferred.', status: 'OPEN', urgent: false, isNew: true },
  { id: 510, listingCode: 'L-510', vendorId: 211, vendorName: 'Bay City Market',
    fishSpecies: sp('Mahi'),
    marketLocation: { name: 'Bay City Market', municipality: 'Lucena City' },
    quantityKg: 40, offerPricePerKg: 270, neededBy: '2026-04-24',
    notes: 'Whole fish, 2kg+ pieces.', status: 'OPEN', urgent: true, isNew: false },
  { id: 509, listingCode: 'L-509', vendorId: 212, vendorName: 'J. Aquino & Sons',
    fishSpecies: sp('Spanish'),
    marketLocation: { name: 'Lipa Port', municipality: 'Lipa' },
    quantityKg: 25, offerPricePerKg: 340, neededBy: '2026-04-25',
    notes: '', status: 'OPEN', urgent: false, isNew: false },
  { id: 505, listingCode: 'L-505', vendorId: 213, vendorName: 'Puerto Azul Resto',
    fishSpecies: sp('Grouper'),
    marketLocation: { name: 'Anilao Landing', municipality: 'Mabini' },
    quantityKg: 15, offerPricePerKg: 560, neededBy: '2026-04-26',
    notes: 'Live preferred, 1.5–3kg individuals.', status: 'OPEN', urgent: false, isNew: false },
  { id: 504, listingCode: 'L-504', vendorId: 214, vendorName: 'Del Mar Cold Chain',
    fishSpecies: sp('Red Snapper'),
    marketLocation: { name: 'Batangas Port', municipality: 'Batangas City' },
    quantityKg: 80, offerPricePerKg: 390, neededBy: '2026-04-27',
    notes: 'Bulk contract, weekly.', status: 'OPEN', urgent: false, isNew: false },
  { id: 501, listingCode: 'L-501', vendorId: 215, vendorName: 'Taal Lake Fresh',
    fishSpecies: sp('Squid'),
    marketLocation: { name: 'Taal Fresh', municipality: 'Taal' },
    quantityKg: 30, offerPricePerKg: 220, neededBy: '2026-04-24',
    notes: 'Small-medium sizes.', status: 'OPEN', urgent: false, isNew: false },
  { id: 497, listingCode: 'L-497', vendorId: 210, vendorName: 'Marina Seafoods',
    fishSpecies: sp('Skipjack'),
    marketLocation: { name: 'Marina Seafoods Depot', municipality: 'Quezon' },
    quantityKg: 100, offerPricePerKg: 175, neededBy: '2026-04-28',
    notes: '', status: 'OPEN', urgent: false, isNew: false },
  { id: 493, listingCode: 'L-493', vendorId: 213, vendorName: 'Puerto Azul Resto',
    fishSpecies: sp('Blue Marlin'),
    marketLocation: { name: 'Anilao Landing', municipality: 'Mabini' },
    quantityKg: 20, offerPricePerKg: 620, neededBy: '2026-04-30',
    notes: 'Sashimi-grade.', status: 'OPEN', urgent: false, isNew: false },
];

// Messages / conversations
const CONVERSATIONS = [
  {
    id: 'c1', userId: 210, name: 'Marina Seafoods', tag: 'Vendor', avatar: 'MS', initial: 'M', color: 'accent',
    online: true, unread: 2,
    last: 'Great, we can match the price. When can you deliver?',
    lastTime: '09:42',
    messages: [
      { from: 'them', ts: '09:12', content: 'Kumusta, Ramiro! Saw your Mahi listing at ₱260/kg.' },
      { from: 'them', ts: '09:12', content: 'Quote:Mahi-mahi·Brgy. Pinagbayanan::Interested at ₱260. We need it by tomorrow if possible.' },
      { from: 'me',   ts: '09:20', content: 'Available — 9kg total, 2 whole fish. Quality is top-grade, iced at sea.' },
      { from: 'me',   ts: '09:21', content: 'I can deliver to your Pinagbayanan depot.' },
      { from: 'them', ts: '09:36', content: 'Perfect. Can you do ₱255?' },
      { from: 'me',   ts: '09:38', content: '₱258 and I cover the ice. Fair?' },
      { from: 'them', ts: '09:42', content: 'Great, we can match the price. When can you deliver?' },
    ]
  },
  { id: 'c2', userId: 211, name: 'Bay City Market', tag: 'Vendor', avatar: 'BC', initial: 'B', color: 'warm',
    online: true, unread: 0,
    last: 'Handoff at 15:00 works. Ipapasok ko na sa system.', lastTime: '08:14' },
  { id: 'c3', userId: 301, name: 'Capt. Arturo R.', tag: 'Fisherman · Sirena I', avatar: 'AR', initial: 'A', color: 'sage',
    online: false, unread: 0,
    last: 'Tide reading looks good for Thursday. Talk tonight.', lastTime: 'Yest.' },
  { id: 'c4', userId: 213, name: 'Puerto Azul Resto', tag: 'Vendor', avatar: 'PA', initial: 'P', color: 'accent',
    online: false, unread: 1,
    last: 'Need 15kg of Lapu-lapu by Saturday, live if possible.', lastTime: 'Yest.' },
  { id: 'c5', userId: 1,   name: 'BFAR Region IV-A', tag: 'Authority', avatar: 'BF', initial: 'B', color: 'warm',
    online: false, unread: 0,
    last: 'License renewal reminder: expires June 14.', lastTime: 'Apr 21' },
  { id: 'c6', userId: 214, name: 'Del Mar Cold Chain', tag: 'Vendor', avatar: 'DM', initial: 'D', color: 'sage',
    online: true, unread: 0,
    last: 'Weekly bulk contract ready for review.', lastTime: 'Apr 21' },
  { id: 'c7', userId: 302, name: 'Ka Benjie (Port)', tag: 'Harbor Master', avatar: 'BP', initial: 'K', color: 'accent',
    online: false, unread: 0,
    last: 'Slip 7 is yours for Friday morning.', lastTime: 'Apr 20' },
];

// Activity feed for dashboard
const ACTIVITY = [
  { ts: '10 min ago', who: 'Marina Seafoods',  what: 'offered ₱260/kg on your Mahi-mahi listing', type: 'offer' },
  { ts: '34 min ago', who: 'System',           what: 'logged catch: 4 pcs Yellowfin Tuna (42kg)', type: 'catch' },
  { ts: '1 hr ago',   who: 'Bay City Market',  what: 'initiated handoff for ORD-7411', type: 'order' },
  { ts: '2 hr ago',   who: 'Advisory',         what: 'Tropical Depression Emong updated — Sibuyan Sea', type: 'advisory' },
  { ts: '3 hr ago',   who: 'Puerto Azul',      what: 'posted new listing — Lapu-lapu ₱560/kg × 15kg', type: 'listing' },
  { ts: 'Yesterday',  who: 'You',              what: 'completed trip T-2811 · 112kg · ₱18,400', type: 'trip' },
  { ts: 'Yesterday',  who: 'BFAR',             what: 'sent license renewal reminder', type: 'system' },
];

// Make everything globally available
Object.assign(window, {
  USER, ZONES, ADVISORIES, FORECAST_24H, SPECIES, LOCATIONS,
  ACTIVE_TRIP, PAST_TRIPS, PLANNED_TRIPS,
  CATCH_ALERTS, ORDERS, LISTINGS, CONVERSATIONS, ACTIVITY,
});
