// ─── Vendor (Buyer) mock data ───────────────────────────────────────────
// VENDOR perspective on the same API surface:
//   - DemandListing (vendor posts) — they own the listings
//   - CatchAlert (browse) — read-only, browse fishermen's posts
//   - Order (buyer side) — they create orders against alerts/listings
//   - ListingInterest — fishermen express interest on their listings

const VENDOR_USER = {
  id: 210,
  fullName: 'Inez Marina',
  first: 'Inez',
  email: 'inez@marinaseafoods.ph',
  role: 'VENDOR',
  business: 'Marina Seafoods',
  taxId: 'BIR-4421-MS',
  port: 'Pinagbayanan · Quezon',
};

// Vendor's own demand listings (vendor view of /vendor/demand-listings)
const VENDOR_LISTINGS = [
  { id: 612, listingCode: 'L-612', vendorId: 210, vendorName: 'Marina Seafoods',
    fishSpecies: { commonName: 'Yellowfin Tuna', scientificName: 'Thunnus albacares', tag: 'YT' },
    marketLocation: { name: 'Marina Seafoods Depot', municipality: 'Quezon' },
    quantityKg: 60, offerPricePerKg: 400, neededBy: '2026-04-25T16:00:00+08:00',
    notes: 'Export-grade only. Ice at sea required.',
    status: 'OPEN', postedAt: '2026-04-22T09:00:00+08:00',
    interests: 7, fulfilledKg: 18, urgent: false },
  { id: 611, listingCode: 'L-611', vendorId: 210, vendorName: 'Marina Seafoods',
    fishSpecies: { commonName: 'Skipjack', scientificName: 'Katsuwonus pelamis', tag: 'SK' },
    marketLocation: { name: 'Marina Seafoods Depot', municipality: 'Quezon' },
    quantityKg: 100, offerPricePerKg: 175, neededBy: '2026-04-28T12:00:00+08:00',
    notes: 'Bulk weekly contract.',
    status: 'OPEN', postedAt: '2026-04-21T14:30:00+08:00',
    interests: 12, fulfilledKg: 42, urgent: false },
  { id: 609, listingCode: 'L-609', vendorId: 210, vendorName: 'Marina Seafoods',
    fishSpecies: { commonName: 'Mahi-mahi', scientificName: 'Coryphaena hippurus', tag: 'MM' },
    marketLocation: { name: 'Marina Seafoods Depot', municipality: 'Quezon' },
    quantityKg: 30, offerPricePerKg: 260, neededBy: '2026-04-24T18:00:00+08:00',
    notes: 'Whole fish, 2kg+ pieces.',
    status: 'OPEN', postedAt: '2026-04-20T08:15:00+08:00',
    interests: 4, fulfilledKg: 9, urgent: true },
  { id: 605, listingCode: 'L-605', vendorId: 210, vendorName: 'Marina Seafoods',
    fishSpecies: { commonName: 'Spanish Mackerel', scientificName: 'Scomberomorus commerson', tag: 'SM' },
    marketLocation: { name: 'Marina Seafoods Depot', municipality: 'Quezon' },
    quantityKg: 25, offerPricePerKg: 340, neededBy: '2026-04-23T20:00:00+08:00',
    notes: '',
    status: 'CLOSED', postedAt: '2026-04-18T11:00:00+08:00',
    interests: 3, fulfilledKg: 25, urgent: false },
  { id: 600, listingCode: 'L-600', vendorId: 210, vendorName: 'Marina Seafoods',
    fishSpecies: { commonName: 'Red Snapper', scientificName: 'Lutjanus campechanus', tag: 'RS' },
    marketLocation: { name: 'Marina Seafoods Depot', municipality: 'Quezon' },
    quantityKg: 50, offerPricePerKg: 390, neededBy: '2026-04-21T16:00:00+08:00',
    notes: '',
    status: 'CLOSED', postedAt: '2026-04-15T09:00:00+08:00',
    interests: 6, fulfilledKg: 50, urgent: false },
];

// Active catch alerts vendor can browse (/marketplace/catch-alerts)
const VENDOR_BROWSE_ALERTS = [
  { id: 841, alertCode: 'CA-841',
    fisherman: { id: 101, fullName: 'Ramiro Delgado', vessel: 'MV Sirena II' },
    species: { commonName: 'Yellowfin Tuna', tag: 'YT' },
    quantityKg: 42, quantityEstimate: '4 pcs', landingSite: 'Verde Passage',
    askingPricePerKg: 380, expiresIn: '3h 12m', urgent: false, distance: '8 km',
    matchScore: 96, alreadyOffered: false },
  { id: 839, alertCode: 'CA-839',
    fisherman: { id: 101, fullName: 'Ramiro Delgado', vessel: 'MV Sirena II' },
    species: { commonName: 'Grouper (Lapu-lapu)', tag: 'LL' },
    quantityKg: 3.2, quantityEstimate: '1 pc', landingSite: 'Verde Passage',
    askingPricePerKg: 420, expiresIn: '0h 41m', urgent: true, distance: '8 km',
    matchScore: 88, alreadyOffered: false },
  { id: 838, alertCode: 'CA-838',
    fisherman: { id: 101, fullName: 'Ramiro Delgado', vessel: 'MV Sirena II' },
    species: { commonName: 'Squid (Pusit)', tag: 'PS' },
    quantityKg: 8, quantityEstimate: '8 kg', landingSite: 'Verde Passage',
    askingPricePerKg: 220, expiresIn: '2h 03m', urgent: false, distance: '8 km',
    matchScore: 71, alreadyOffered: false },
  { id: 836, alertCode: 'CA-836',
    fisherman: { id: 102, fullName: 'Carlos Bautista', vessel: 'Lakambini' },
    species: { commonName: 'Yellowfin Tuna', tag: 'YT' },
    quantityKg: 28, quantityEstimate: '3 pcs', landingSite: 'Tayabas Bay',
    askingPricePerKg: 395, expiresIn: '4h 30m', urgent: false, distance: '22 km',
    matchScore: 84, alreadyOffered: true },
  { id: 833, alertCode: 'CA-833',
    fisherman: { id: 103, fullName: 'Tomas Reyes', vessel: 'Aguila' },
    species: { commonName: 'Skipjack', tag: 'SK' },
    quantityKg: 56, quantityEstimate: '20 pcs', landingSite: 'Lucena Port',
    askingPricePerKg: 170, expiresIn: '1h 45m', urgent: true, distance: '14 km',
    matchScore: 92, alreadyOffered: false },
  { id: 831, alertCode: 'CA-831',
    fisherman: { id: 104, fullName: 'Helena Cruz', vessel: 'Tala II' },
    species: { commonName: 'Mahi-mahi', tag: 'MM' },
    quantityKg: 16, quantityEstimate: '4 pcs', landingSite: 'Anilao Landing',
    askingPricePerKg: 265, expiresIn: '5h 20m', urgent: false, distance: '36 km',
    matchScore: 78, alreadyOffered: false },
];

// Listing interests — fishermen who expressed interest on vendor's listings
const VENDOR_INTERESTS = [
  { id: 91, listingId: 612, speciesName: 'Yellowfin Tuna',
    fishermanName: 'Ramiro Delgado', fishermanVessel: 'MV Sirena II',
    message: 'I have 42kg fresh from this morning. Iced at sea. Available for delivery.',
    createdAt: '2h ago', status: 'new' },
  { id: 90, listingId: 612, speciesName: 'Yellowfin Tuna',
    fishermanName: 'Carlos Bautista', fishermanVessel: 'Lakambini',
    message: 'Have 28kg, can match your offer price. Tayabas landing.',
    createdAt: '4h ago', status: 'new' },
  { id: 88, listingId: 611, speciesName: 'Skipjack',
    fishermanName: 'Tomas Reyes', fishermanVessel: 'Aguila',
    message: '56 pcs available now. Need quick handoff before tide turns.',
    createdAt: '5h ago', status: 'replied' },
  { id: 86, listingId: 609, speciesName: 'Mahi-mahi',
    fishermanName: 'Helena Cruz', fishermanVessel: 'Tala II',
    message: '4 pcs averaging 4kg each. Whole, gilled and gutted.',
    createdAt: '8h ago', status: 'replied' },
  { id: 84, listingId: 611, speciesName: 'Skipjack',
    fishermanName: 'Migs Domingo', fishermanVessel: 'Bagwis',
    message: 'Can supply 30kg/week recurring if price holds.',
    createdAt: 'Yesterday', status: 'archived' },
];

// Vendor orders — buyer perspective
const VENDOR_ORDERS = [
  { id: 7412, orderCode: 'ORD-7412',
    buyer: { id: 210, fullName: 'Marina Seafoods' },
    seller: { id: 101, fullName: 'Ramiro Delgado', vessel: 'MV Sirena II' },
    species: { commonName: 'Mahi-mahi', tag: 'MM' },
    agreedPricePerKg: 260, orderedQtyKg: 9, dispatchMode: 'DELIVERY',
    status: 'CONFIRMED', handoff: null, payment: null,
    createdAt: '2026-04-23', total: 2340 },
  { id: 7411, orderCode: 'ORD-7411',
    buyer: { id: 210, fullName: 'Marina Seafoods' },
    seller: { id: 105, fullName: 'Capt. Arturo R.', vessel: 'Sirena I' },
    species: { commonName: 'Spanish Mackerel', tag: 'SM' },
    agreedPricePerKg: 340, orderedQtyKg: 18, dispatchMode: 'PICKUP',
    status: 'CONFIRMED',
    handoff: { actualQtyKg: 18, finalPricePerKg: 340, totalAmount: 6120,
               confirmedBySeller: true, confirmedByBuyer: false, status: 'PENDING' },
    payment: null, createdAt: '2026-04-22', total: 6120 },
  { id: 7410, orderCode: 'ORD-7410',
    buyer: { id: 210, fullName: 'Marina Seafoods' },
    seller: { id: 103, fullName: 'Tomas Reyes', vessel: 'Aguila' },
    species: { commonName: 'Skipjack', tag: 'SK' },
    agreedPricePerKg: 175, orderedQtyKg: 42, dispatchMode: 'DELIVERY',
    status: 'PENDING', handoff: null, payment: null,
    createdAt: '2026-04-22', total: 7350 },
  { id: 7405, orderCode: 'ORD-7405',
    buyer: { id: 210, fullName: 'Marina Seafoods' },
    seller: { id: 104, fullName: 'Helena Cruz', vessel: 'Tala II' },
    species: { commonName: 'Mahi-mahi', tag: 'MM' },
    agreedPricePerKg: 265, orderedQtyKg: 16, dispatchMode: 'DELIVERY',
    status: 'COMPLETED',
    handoff: { actualQtyKg: 16, finalPricePerKg: 265, totalAmount: 4240,
               confirmedBySeller: true, confirmedByBuyer: true, status: 'CONFIRMED' },
    payment: { amount: 4240, method: 'GCASH', status: 'CONFIRMED' },
    createdAt: '2026-04-19', total: 4240 },
  { id: 7398, orderCode: 'ORD-7398',
    buyer: { id: 210, fullName: 'Marina Seafoods' },
    seller: { id: 101, fullName: 'Ramiro Delgado', vessel: 'MV Sirena II' },
    species: { commonName: 'Skipjack', tag: 'SK' },
    agreedPricePerKg: 175, orderedQtyKg: 42, dispatchMode: 'DELIVERY',
    status: 'COMPLETED',
    handoff: { actualQtyKg: 42, finalPricePerKg: 175, totalAmount: 7350,
               confirmedBySeller: true, confirmedByBuyer: true, status: 'CONFIRMED' },
    payment: { amount: 7350, method: 'BANK_TRANSFER', status: 'CONFIRMED' },
    createdAt: '2026-04-17', total: 7350 },
  { id: 7387, orderCode: 'ORD-7387',
    buyer: { id: 210, fullName: 'Marina Seafoods' },
    seller: { id: 106, fullName: 'Mateo Villar', vessel: 'Tagumpay' },
    species: { commonName: 'Squid (Pusit)', tag: 'PS' },
    agreedPricePerKg: 215, orderedQtyKg: 22, dispatchMode: 'DELIVERY',
    status: 'DISPUTED',
    handoff: { actualQtyKg: 19, finalPricePerKg: 215, totalAmount: 4085,
               confirmedBySeller: true, confirmedByBuyer: false, status: 'DISPUTED',
               disputeReason: 'Short 3kg of agreed weight.' },
    payment: null, createdAt: '2026-04-12', total: 4085 },
];

// Top suppliers (vendor's network)
const VENDOR_SUPPLIERS = [
  { id: 101, name: 'Ramiro Delgado',  vessel: 'MV Sirena II',  port: 'Bauan',   trades: 24, kg: 612,  rating: 4.9, last: '2h ago',     onTimePct: 96 },
  { id: 105, name: 'Capt. Arturo R.', vessel: 'Sirena I',       port: 'Bauan',   trades: 19, kg: 484,  rating: 4.8, last: 'Yesterday', onTimePct: 94 },
  { id: 103, name: 'Tomas Reyes',     vessel: 'Aguila',         port: 'Lucena',  trades: 16, kg: 720,  rating: 4.7, last: '5h ago',    onTimePct: 88 },
  { id: 104, name: 'Helena Cruz',     vessel: 'Tala II',        port: 'Anilao',  trades: 14, kg: 308,  rating: 4.9, last: '4d ago',    onTimePct: 100 },
  { id: 102, name: 'Carlos Bautista', vessel: 'Lakambini',      port: 'Tayabas', trades: 11, kg: 336,  rating: 4.6, last: '4h ago',    onTimePct: 91 },
  { id: 106, name: 'Mateo Villar',    vessel: 'Tagumpay',       port: 'Lucena',  trades: 9,  kg: 198,  rating: 4.2, last: '11d ago',   onTimePct: 78 },
];

// Daily price index — vendor-relevant species, last 7 days, ₱/kg
const PRICE_INDEX = [
  { species: 'Yellowfin Tuna', tag: 'YT', current: 395, change: +1.8, series: [388, 392, 395, 390, 388, 392, 395] },
  { species: 'Skipjack',       tag: 'SK', current: 175, change: -0.6, series: [178, 180, 178, 176, 175, 174, 175] },
  { species: 'Mahi-mahi',      tag: 'MM', current: 265, change: +2.4, series: [255, 258, 260, 260, 262, 263, 265] },
  { species: 'Spanish Mack.',  tag: 'SM', current: 340, change: 0,    series: [335, 340, 342, 338, 340, 340, 340] },
  { species: 'Grouper',        tag: 'LL', current: 555, change: +0.9, series: [545, 548, 550, 552, 555, 555, 555] },
  { species: 'Squid (Pusit)',  tag: 'PS', current: 218, change: -1.2, series: [225, 222, 220, 220, 218, 219, 218] },
];

// 14-day procurement chart — kg per day
const PROCUREMENT_14D = (() => {
  const out = [];
  const start = new Date('2026-04-10');
  for (let i = 0; i < 14; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const base = 80 + Math.sin(i / 2.2) * 20 + (i % 7 === 5 ? 35 : 0);
    out.push({ day: d.getDate(), kg: Math.round(base + Math.random() * 16) });
  }
  return out;
})();

// Activity feed for vendor dashboard
const VENDOR_ACTIVITY = [
  { ts: '12 min ago', who: 'Ramiro Delgado',  what: 'expressed interest in your Yellowfin listing (42kg)', type: 'offer' },
  { ts: '38 min ago', who: 'System',          what: 'matched 3 catch alerts to L-611 (Skipjack)', type: 'match' },
  { ts: '1 hr ago',   who: 'Capt. Arturo R.', what: 'initiated handoff for ORD-7411 — awaiting your confirm', type: 'order' },
  { ts: '2 hr ago',   who: 'Helena Cruz',     what: 'completed delivery for ORD-7405 · ₱4,240', type: 'order' },
  { ts: '4 hr ago',   who: 'You',             what: 'posted listing L-612 — Yellowfin ₱400/kg × 60kg', type: 'listing' },
  { ts: 'Yesterday',  who: 'BFAR',            what: 'sent quarterly compliance reminder', type: 'system' },
];

Object.assign(window, {
  VENDOR_USER, VENDOR_LISTINGS, VENDOR_BROWSE_ALERTS, VENDOR_INTERESTS,
  VENDOR_ORDERS, VENDOR_SUPPLIERS, PRICE_INDEX, PROCUREMENT_14D, VENDOR_ACTIVITY,
});
