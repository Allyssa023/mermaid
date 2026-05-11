// ─── Buyer mock data ─────────────────────────────────────────────────────
// Buyer browses public vendor demand listings (/buyer/marketplace/listings)
// and places orders against them (/buyer/orders).

const BUYER_USER = {
  id: 401,
  fullName: 'Sofia Mendez',
  first: 'Sofia',
  email: 'sofia.m@example.ph',
  role: 'BUYER',
  business: 'Casa Mendez Kitchen',
  port: 'Tagaytay · Cavite',
};

// Public open listings the buyer can browse — same shape as vendor demand listings
// but viewed from outside. Each is a vendor offering to sell (procurement contract
// the buyer commits to fulfill — a forward order with set price).
// In practice for this prototype we treat them as catalog listings to purchase.
const BUYER_LISTINGS = [
  { id: 612, listingCode: 'L-612', vendorName: 'Marina Seafoods', vendorRating: 4.8, vendorTrades: 184,
    species: { commonName: 'Yellowfin Tuna', tag: 'YT' },
    location: 'Pinagbayanan · Quezon',
    quantityKg: 60, pricePerKg: 400, neededBy: 'Apr 25',
    notes: 'Export-grade, sashimi-quality. Iced at sea.',
    tag: 'Premium', urgent: false, available: 42 },
  { id: 611, listingCode: 'L-611', vendorName: 'Marina Seafoods', vendorRating: 4.8, vendorTrades: 184,
    species: { commonName: 'Skipjack', tag: 'SK' },
    location: 'Pinagbayanan · Quezon',
    quantityKg: 100, pricePerKg: 175, neededBy: 'Apr 28',
    notes: 'Bulk weekly contract. Excellent for canning.',
    tag: 'Bulk', urgent: false, available: 58 },
  { id: 609, listingCode: 'L-609', vendorName: 'Marina Seafoods', vendorRating: 4.8, vendorTrades: 184,
    species: { commonName: 'Mahi-mahi', tag: 'MM' },
    location: 'Pinagbayanan · Quezon',
    quantityKg: 30, pricePerKg: 260, neededBy: 'Apr 24',
    notes: 'Whole fish, 2kg+ pieces. Limited stock.',
    tag: 'Limited', urgent: true, available: 21 },
  { id: 615, listingCode: 'L-615', vendorName: 'Bay City Market', vendorRating: 4.6, vendorTrades: 92,
    species: { commonName: 'Grouper (Lapu-lapu)', tag: 'LL' },
    location: 'Lucena City · Quezon',
    quantityKg: 18, pricePerKg: 560, neededBy: 'Apr 25',
    notes: 'Live, 1.5–3kg individuals. Restaurant grade.',
    tag: 'Premium', urgent: false, available: 12 },
  { id: 618, listingCode: 'L-618', vendorName: 'J. Aquino & Sons', vendorRating: 4.5, vendorTrades: 47,
    species: { commonName: 'Spanish Mackerel', tag: 'SM' },
    location: 'Lipa · Batangas',
    quantityKg: 25, pricePerKg: 340, neededBy: 'Apr 26',
    notes: 'Whole fish, gilled and gutted on request.',
    tag: '', urgent: false, available: 25 },
  { id: 619, listingCode: 'L-619', vendorName: 'Puerto Azul Resto', vendorRating: 4.9, vendorTrades: 31,
    species: { commonName: 'Red Snapper', tag: 'RS' },
    location: 'Anilao · Batangas',
    quantityKg: 12, pricePerKg: 380, neededBy: 'Apr 24',
    notes: 'Reef-caught. Smaller individual portions available.',
    tag: 'Premium', urgent: false, available: 8 },
  { id: 622, listingCode: 'L-622', vendorName: 'Del Mar Cold Chain', vendorRating: 4.7, vendorTrades: 215,
    species: { commonName: 'Squid (Pusit)', tag: 'PS' },
    location: 'Batangas City · Batangas',
    quantityKg: 60, pricePerKg: 218, neededBy: 'Apr 27',
    notes: 'Frozen at sea. Mixed sizes.',
    tag: 'Bulk', urgent: false, available: 60 },
  { id: 624, listingCode: 'L-624', vendorName: 'Marina Seafoods', vendorRating: 4.8, vendorTrades: 184,
    species: { commonName: 'Blue Marlin', tag: 'BM' },
    location: 'Pinagbayanan · Quezon',
    quantityKg: 20, pricePerKg: 620, neededBy: 'Apr 30',
    notes: 'Sashimi-grade. Pre-order — landing expected Thu.',
    tag: 'Premium', urgent: false, available: 0 },
];

// Buyer's orders — placed against listings via POST /buyer/orders
const BUYER_ORDERS = [
  { id: 8412, orderCode: 'ORD-8412', listingCode: 'L-609',
    vendorName: 'Marina Seafoods',
    species: 'Mahi-mahi',
    qtyKg: 6, pricePerKg: 260, total: 1560,
    dispatchMode: 'PICKUP',
    status: 'CONFIRMED',
    placedAt: '2026-04-23', readyBy: 'Apr 24, 10:00',
    handoff: null, payment: null },
  { id: 8409, orderCode: 'ORD-8409', listingCode: 'L-615',
    vendorName: 'Bay City Market',
    species: 'Grouper (Lapu-lapu)',
    qtyKg: 3, pricePerKg: 560, total: 1680,
    dispatchMode: 'DELIVERY',
    status: 'PENDING',
    placedAt: '2026-04-23', readyBy: 'Apr 25, 14:00',
    handoff: null, payment: null },
  { id: 8398, orderCode: 'ORD-8398', listingCode: 'L-619',
    vendorName: 'Puerto Azul Resto',
    species: 'Red Snapper',
    qtyKg: 4, pricePerKg: 380, total: 1520,
    dispatchMode: 'PICKUP',
    status: 'COMPLETED',
    placedAt: '2026-04-19', readyBy: 'Apr 20, 09:00',
    handoff: { confirmedBySeller: true, confirmedByBuyer: true, status: 'CONFIRMED' },
    payment: { amount: 1520, method: 'GCASH', status: 'CONFIRMED' } },
  { id: 8387, orderCode: 'ORD-8387', listingCode: 'L-622',
    vendorName: 'Del Mar Cold Chain',
    species: 'Squid (Pusit)',
    qtyKg: 8, pricePerKg: 218, total: 1744,
    dispatchMode: 'DELIVERY',
    status: 'COMPLETED',
    placedAt: '2026-04-15', readyBy: 'Apr 17, 11:00',
    handoff: { confirmedBySeller: true, confirmedByBuyer: true, status: 'CONFIRMED' },
    payment: { amount: 1744, method: 'BANK_TRANSFER', status: 'CONFIRMED' } },
  { id: 8378, orderCode: 'ORD-8378', listingCode: 'L-611',
    vendorName: 'Marina Seafoods',
    species: 'Skipjack',
    qtyKg: 12, pricePerKg: 175, total: 2100,
    dispatchMode: 'DELIVERY',
    status: 'COMPLETED',
    placedAt: '2026-04-12', readyBy: 'Apr 13, 16:00',
    handoff: { confirmedBySeller: true, confirmedByBuyer: true, status: 'CONFIRMED' },
    payment: { amount: 2100, method: 'CASH', status: 'CONFIRMED' } },
  { id: 8366, orderCode: 'ORD-8366', listingCode: 'L-612',
    vendorName: 'Marina Seafoods',
    species: 'Yellowfin Tuna',
    qtyKg: 5, pricePerKg: 395, total: 1975,
    dispatchMode: 'PICKUP',
    status: 'CANCELLED',
    placedAt: '2026-04-08', readyBy: 'Apr 09, 09:00',
    handoff: null, payment: null,
    cancelReason: 'Buyer cancelled — schedule conflict.' },
];

// Saved / favorite vendors for the buyer
const BUYER_FAVORITES = [
  { id: 210, name: 'Marina Seafoods', port: 'Pinagbayanan · Quezon', rating: 4.8, trades: 184, lastBought: '2 days ago' },
  { id: 213, name: 'Puerto Azul Resto', port: 'Anilao · Batangas', rating: 4.9, trades: 31, lastBought: '5 days ago' },
  { id: 214, name: 'Del Mar Cold Chain', port: 'Batangas Port', rating: 4.7, trades: 215, lastBought: '9 days ago' },
];

const BUYER_ACTIVITY = [
  { ts: '12 min ago', who: 'Marina Seafoods',  what: 'confirmed your order ORD-8412 (6kg Mahi-mahi)', type: 'order' },
  { ts: '2 hr ago',   who: 'Bay City Market',  what: 'replied to your message about Grouper availability', type: 'message' },
  { ts: '4 hr ago',   who: 'Marina Seafoods',  what: 'posted new listing — Yellowfin Tuna ₱400/kg × 60kg', type: 'listing' },
  { ts: 'Yesterday',  who: 'You',              what: 'placed order ORD-8409 — Lapu-lapu 3kg × ₱560', type: 'order' },
  { ts: 'Yesterday',  who: 'Del Mar',          what: 'completed delivery for ORD-8387 · ₱1,744', type: 'order' },
];

// Mini buyer-side conversations
const BUYER_CONVERSATIONS = [
  { id: 'b1', userId: 210, name: 'Marina Seafoods', tag: 'Vendor', initial: 'M', color: 'accent',
    online: true, unread: 1, last: 'Your Mahi order is ready for pickup tomorrow 10am.', lastTime: '11:14' },
  { id: 'b2', userId: 211, name: 'Bay City Market', tag: 'Vendor', initial: 'B', color: 'warm',
    online: false, unread: 0, last: 'We have Lapu-lapu landing Thursday. Reserve some?', lastTime: '09:42' },
  { id: 'b3', userId: 213, name: 'Puerto Azul Resto', tag: 'Vendor', initial: 'P', color: 'sage',
    online: false, unread: 0, last: 'Thanks! Order completed.', lastTime: 'Apr 20' },
  { id: 'b4', userId: 214, name: 'Del Mar Cold Chain', tag: 'Vendor', initial: 'D', color: 'plum',
    online: true, unread: 0, last: 'Frozen squid contract for Q2 ready to review.', lastTime: 'Apr 18' },
];

Object.assign(window, {
  BUYER_USER, BUYER_LISTINGS, BUYER_ORDERS, BUYER_FAVORITES, BUYER_ACTIVITY, BUYER_CONVERSATIONS,
});
