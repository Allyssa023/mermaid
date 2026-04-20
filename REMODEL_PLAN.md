# MERMAID v2 — Full Platform Remodel Plan

## Context

Professor feedback session revealed three core weaknesses:
1. **"My Trips is just history"** — trips end and nothing happens with the data
2. **"No weighing scale at sea"** — catch logging asks for kg, but fishermen only weigh at the market
3. **"Marketplace for all"** — currently only fisherman→vendor, buyers (public/restaurants) are excluded
4. **"How do they know it's not a scam / fish is fresh?"** — no trust/verification mechanism

This remodel adds a Buyer role, fixes the trip-to-sale pipeline, adds an agentic AI assistant, and adds fish freshness photo verification via AI vision.

---

## Feature 1: Buyer Role + Vendor Inventory Marketplace

### What changes
- `users.role` enum expands: `FISHERMAN | VENDOR | BUYER | ADMIN`
- New registration flow for BUYER role
- Vendors can now post two types of listings:
  - **Demand listings** (existing) — what they NEED to buy
  - **Inventory listings** (new) — what they HAVE for sale right now
- Buyers browse vendor inventory listings and can reserve fish

### New DB table: `vendor_inventory_listings`
```sql
id, vendor_id, species_id, quantity_kg, price_per_kg, market_location_id,
harvest_date, notes, status (AVAILABLE | RESERVED | SOLD), is_deleted,
posted_at, updated_at
```

### New DB table: `buyer_reservations`
```sql
id, buyer_id, inventory_listing_id, quantity_kg, message, status (PENDING | CONFIRMED | CANCELLED),
created_at
```

### New API endpoints
- `POST /vendor/inventory` — vendor posts what they have
- `GET /vendor/inventory` — vendor views their own inventory listings
- `PUT /vendor/inventory/{id}` — update
- `DELETE /vendor/inventory/{id}` — soft delete
- `GET /marketplace/inventory` — public browse (no login required for viewing)
- `POST /marketplace/inventory/{id}/reserve` — buyer reserves fish
- `GET /buyer/reservations` — buyer sees their reservations

### Files to create/modify
- `backend/src/main/resources/openapi/api.yaml` — add all new paths
- `V14__add_buyer_role_and_inventory.sql` — migration
- `domain/VendorInventoryListing.java`
- `domain/BuyerReservation.java`
- `repository/VendorInventoryListingRepository.java`
- `repository/BuyerReservationRepository.java`
- `service/VendorInventoryService.java`
- `service/BuyerReservationService.java`
- `mapper/VendorInventoryMapper.java`
- `controller/VendorInventoryController.java`
- `controller/BuyerMarketplaceController.java`

---

## Feature 2: Catch Settlement Flow (Fixes the Weighing Scale Problem)

### The problem
Fishermen don't carry weighing scales at sea. Current catch log requires `quantity_kg` which they can't know until they sell at the market. This makes the UX broken and data unreliable.

### New flow
1. **At sea**: fisherman logs catch by **species + basket/piece count** (no kg required)
2. **At market**: fisherman taps "Settle Catch" → enters actual weighed kg + agreed price
3. Transaction confirmed → trip summary shows total ₱ earned

### Changes to catch_logs
- `quantity_kg` becomes optional (nullable)
- Add `quantity_estimate` (text field: "2 baskets", "3 pieces", etc.)
- Add `is_settled` boolean
- Add `settled_kg`, `settled_price_per_kg`, `settled_at`, `settled_with_vendor_id`

### New API endpoints
- `PUT /trips/{tripId}/catches/{catchId}/settle` — record actual weight + price
- `GET /trips/{tripId}/summary` — trip income summary (total ₱ from all settled catches)

### New DB migration: `V15__catch_settlement.sql`
```sql
ALTER TABLE catch_logs
  ALTER COLUMN quantity_kg DROP NOT NULL,
  ADD COLUMN quantity_estimate VARCHAR(100),
  ADD COLUMN is_settled BOOLEAN DEFAULT FALSE,
  ADD COLUMN settled_kg DECIMAL(10,2),
  ADD COLUMN settled_price_per_kg DECIMAL(10,2),
  ADD COLUMN settled_at TIMESTAMP,
  ADD COLUMN settled_with_vendor_id BIGINT REFERENCES users(id);
```

### Files to create/modify
- `api.yaml` — update catch schemas, add settle endpoint, add trip summary endpoint
- `V15__catch_settlement.sql`
- `domain/CatchLog.java` — add new fields
- `service/CatchLogService.java` — add settle method
- `controller/CatchLogController.java` — add settle endpoint

---

## Feature 3: Fisherman Catch Availability Posts

### What it does
After logging a catch, fisherman can post "I'm landing at [market] at [time] with [species]" — visible to vendors and buyers before the boat docks. Creates pre-landing market coordination.

### New DB table: `availability_posts`
```sql
id, fisherman_id, species_id, quantity_estimate, market_location_id,
estimated_arrival_time, notes, status (ACTIVE | EXPIRED | FULFILLED),
created_at, expires_at
```

### New API endpoints
- `POST /fisherman/availability` — post landing announcement
- `GET /fisherman/availability` — fisherman's own posts
- `GET /marketplace/availability` — all active posts (vendors + buyers can see)
- `PUT /fisherman/availability/{id}` — update or expire

### Files to create/modify
- `V16__availability_posts.sql`
- `domain/AvailabilityPost.java`
- `service/AvailabilityPostService.java`
- `controller/AvailabilityPostController.java`

---

## Feature 4: Fish Freshness Photo Verification (AI Vision)

### The problem
Professor asked: "How do they know the fish is fresh? How do they know it's not a scam?"

### Solution
Fishermen must upload photos when posting a catch for marketplace. The system uses Gemma 4 (multimodal) via Ollama to analyze freshness indicators automatically.

### Required photo types (enforced by UI)
- **Whole fish** — full body shot
- **Eyes close-up** — clear & bulging = fresh; cloudy & sunken = old
- **Gills close-up** — bright red = fresh; brown/gray = old
- **Flesh/scales** — optional but encouraged

### AI Freshness Analysis
Gemma 4 receives the images and returns:
- Freshness rating: `VERY_FRESH | FRESH | ACCEPTABLE | NOT_RECOMMENDED`
- Short Taglish explanation: *"Maliwanag ang mata at pula ang hasang — fresh pa ito."*
- Confidence score (0.0–1.0)

### New DB table: `catch_photos`
```sql
id, reference_type (AVAILABILITY_POST | CATCH_LOG), reference_id,
photo_type (WHOLE_FISH | EYES | GILLS | FLESH | OTHER),
file_path, uploaded_at, fisherman_id
```

### New DB table: `freshness_verifications`
```sql
id, reference_type, reference_id, freshness_rating, explanation,
confidence_score, analyzed_at, model_used
```

### Photo storage
- Local filesystem: `backend/uploads/catch-photos/{year}/{month}/{fishermanId}/`
- Served via static resource endpoint: `GET /uploads/catch-photos/**`
- Max file size: 5MB per photo, 4 photos max per catch

### New API endpoints
- `POST /fisherman/catches/{catchId}/photos` — multipart upload
- `GET /fisherman/catches/{catchId}/photos` — get photo list with URLs
- `GET /fisherman/catches/{catchId}/freshness` — get AI freshness result
- `POST /admin/freshness/reanalyze/{catchId}` — force re-analysis

### Files to create/modify
- `V17__catch_photos_and_freshness.sql`
- `domain/CatchPhoto.java`
- `domain/FreshnessVerification.java`
- `service/PhotoStorageService.java` — handles file save/delete
- `service/FreshnessAnalysisService.java` — calls Gemma 4 vision via Ollama
- `controller/CatchPhotoController.java`
- `backend/src/main/resources/application.properties` — add upload path config

---

## Feature 5: Merman Bot — Agentic AI Assistant

### Overview
A conversational AI assistant embedded in all dashboards (fisherman, vendor, buyer). It is **agentic** — it doesn't just answer questions, it can **take actions** in the system (log catches, post listings, search marketplace) with user confirmation before any write.

Powered by: **Ollama + Gemma 4** on `localhost:11434`
Integration: **Spring AI** (`spring-ai-ollama-spring-boot-starter`)
Language: **Taglish** (Filipino-English mix)

### Architecture
```
React floating chat widget (bottom-right, all dashboards)
        ↓  POST /api/ai/chat  (JWT required)
AiController → AiService (Spring AI ChatClient)
        ↓  Spring AI tool calling
Ollama → Gemma 4 (localhost:11434)
        ↓  tool calls resolved as Java method calls
MermaidAiTools.java (calls existing services directly)
```

### New DB table: `ai_conversations`
```sql
id, user_id, conversation_id (UUID), role (USER | ASSISTANT), content TEXT,
tool_calls_json, created_at
```
Stores conversation history for context continuity across messages.

### System prompt (role-aware, injected per request)
```
Ikaw si Merman, ang AI assistant ng MERMAID platform para sa mga mangingisda,
vendors, at buyers sa La Union, Pilipinas.

Tumugon sa Taglish (mix ng Tagalog at English). Maging maingat, makulit, at
matulungin. Huwag gumawa ng aksyon sa sistema nang walang kumpirmasyon ng user.

User ngayon: {fullName}
Role: {FISHERMAN | VENDOR | BUYER}
Petsa at oras: {datetime}
{if FISHERMAN} Active trip: {tripId or "wala"}
```

### AI Tools — Read (no confirmation needed)

| Tool method | Description | Who |
|-------------|-------------|-----|
| `getMarineConditions(zone?)` | SAFE/CAUTION/UNSAFE + wave/wind data | All |
| `getActiveAdvisories()` | Current safety warnings | All |
| `searchMarketplace(species?, location?, maxPrice?)` | Browse demand + inventory listings | All |
| `getMarketPrices(species?)` | Average prices from recent settlements | All |
| `getAvailabilityPosts(location?)` | Fishermen landing announcements | All |
| `getMyTrips(status?)` | Fisherman's trip history | Fisherman |
| `getMyEarnings(period?)` | Income from settled catches | Fisherman |
| `getMyListings()` | Vendor's demand and inventory listings | Vendor |
| `getListingInterests()` | Who expressed interest in vendor's listings | Vendor |
| `getMyReservations()` | Buyer's reservations | Buyer |

### AI Tools — Write (requires confirmation before executing)

| Tool method | Description | Who |
|-------------|-------------|-----|
| `logCatch(species, quantityEstimate, notes?)` | Add catch to active trip | Fisherman |
| `startTrip(departure, targetArea, vesselName)` | Begin a new trip | Fisherman |
| `endTrip(notes?)` | End the active trip | Fisherman |
| `postAvailability(species, qty, market, arrivalTime)` | Announce landing | Fisherman |
| `settleCatch(catchId, actualKg, pricePerKg)` | Record market sale | Fisherman |
| `createDemandListing(species, qty, price, location, deadline?)` | Post buy request | Vendor |
| `createInventoryListing(species, qty, price, location)` | Post what vendor has | Vendor |
| `closeListing(listingId)` | Close a demand listing | Vendor |
| `reserveFish(listingId, qty, message?)` | Reserve from vendor inventory | Buyer |

### Confirmation flow example
```
Fisherman: "Nakahuli ako ng dalawang bilog na tuna"

Merman: "Isusulat ko ito sa iyong active trip:
  • Species: Tuna
  • Dami: 2 piraso
  Tama ba? (oo/hindi)"

Fisherman: "oo"

Merman: [calls logCatch("tuna", "2 pieces")]
        "Naka-log na ang tuna sa iyong trip! Btw, may vendor sa San Fernando
        na naghahanap ng tuna ngayon — ₱380/kg. Gusto mo makita ang listing?"
```

### New API endpoints
- `POST /ai/chat` — main chat endpoint
  - Request: `{ "message": string, "conversationId": string? }`
  - Response: `{ "reply": string, "conversationId": string, "actions": [] }`
- `GET /ai/conversations` — list user's conversation history
- `DELETE /ai/conversations/{conversationId}` — clear a conversation

### New `application.properties` config
```properties
spring.ai.ollama.base-url=http://localhost:11434
spring.ai.ollama.chat.model=gemma4
spring.ai.ollama.chat.options.temperature=0.7
spring.ai.ollama.chat.options.num-ctx=4096
```

### Files to create/modify
- `backend/pom.xml` — add `spring-ai-ollama-spring-boot-starter`
- `V18__ai_conversations.sql`
- `domain/AiConversation.java`
- `repository/AiConversationRepository.java`
- `service/AiService.java` — Spring AI ChatClient, system prompt builder, conversation history
- `service/MermaidAiTools.java` — all @Tool annotated methods
- `controller/AiController.java`
- `api.yaml` — add /ai/chat paths

### Frontend: Merman Bot Widget
- `frontend/src/components/MermanBot/MermanBot.jsx` — floating button + slide-up panel
- `frontend/src/components/MermanBot/ChatBubble.jsx` — user/assistant message bubbles
- `frontend/src/hooks/useMermanBot.js` — manages messages, conversationId, API calls
- Mounted globally in `App.jsx` — visible on all authenticated pages
- Stores `conversationId` in `sessionStorage` for continuity within session

---

## Feature 6: Trip Income Analytics

### What it does
After catches are settled, trips show total ₱ earned. Dashboard shows income trends.

### New endpoints
- `GET /trips/{tripId}/summary` — { totalCatches, settledCatches, totalEarned, catchBreakdown[] }
- `GET /fisherman/analytics` — { weeklyEarnings[], topSpecies[], topMarkets[], monthlyIncome }

### Files to create/modify
- `service/TripAnalyticsService.java`
- `controller/TripAnalyticsController.java`

---

## Feature 7: SOS Emergency Button

### What it does
During an active trip, fisherman taps SOS → system records an emergency alert and notifies a registered emergency contact.

### New DB table: `emergency_contacts`
```sql
id, user_id, contact_name, contact_phone, relationship, created_at
```

### New DB table: `sos_alerts`
```sql
id, fisherman_id, trip_id, triggered_at, latitude?, longitude?, status (ACTIVE | RESOLVED), notes
```

### New API endpoints
- `POST /fisherman/emergency-contact` — register emergency contact
- `GET /fisherman/emergency-contact` — get registered contact
- `POST /trips/{tripId}/sos` — trigger SOS alert
- `PUT /trips/{tripId}/sos/resolve` — mark resolved

### Files to create/modify
- `V19__sos_and_emergency.sql`
- `domain/EmergencyContact.java`, `domain/SosAlert.java`
- `service/SosAlertService.java`
- `controller/SosController.java`

---

## Feature 8: Rating & Trust System

### What it does
After a transaction (catch settlement), both parties can rate each other. Builds trust and reduces scam risk alongside photo verification.

### New DB table: `ratings`
```sql
id, rater_id, ratee_id, transaction_type (CATCH_SETTLEMENT | RESERVATION),
transaction_id, score (1-5), comment, created_at
```

### Logic
- Fisherman rates vendor after settling a catch with them
- Vendor rates fisherman after a settlement
- Buyer rates vendor after a reservation is fulfilled
- Ratings displayed on user profiles in marketplace

### New API endpoints
- `POST /ratings` — submit rating after transaction
- `GET /users/{userId}/ratings` — view ratings for a user
- `GET /users/{userId}/rating-summary` — average score + count

---

## Implementation Order (Recommended)

| Phase | Features | Priority |
|-------|----------|----------|
| 1 | Catch Settlement Flow (fix quantity_kg) | HIGH — fixes broken UX |
| 2 | Buyer Role + Vendor Inventory Marketplace | HIGH — prof's explicit request |
| 3 | Availability Posts | MEDIUM — enables pre-landing coordination |
| 4 | Fish Freshness Photo Upload + AI Vision | HIGH — addresses trust/scam concern |
| 5 | Merman Bot (AI Assistant) — read tools first | HIGH — most impressive feature |
| 6 | Merman Bot write tools + confirmation flow | HIGH — completes agentic behavior |
| 7 | Trip Income Analytics | MEDIUM — makes trips purposeful |
| 8 | SOS Emergency Button | MEDIUM — safety feature |
| 9 | Rating & Trust System | LOW — nice to have |

---

## Connected Flow (The Story to Tell the Prof)

```
Fisherman checks Merman Bot → "Ligtas ba lumabas ngayon?"
        ↓
Merman calls getMarineConditions() → "SAFE ang Bauang zone. Pwede ka na!"
        ↓
Fisherman starts trip (via bot or Trip UI)
        ↓
At sea → chats "Nakahuli ako ng 2 bilog na tuna" to Merman Bot
        ↓
Merman confirms → logs catch (species: tuna, estimate: 2 pieces)
        ↓
Fisherman posts availability: "Landing sa San Fernando at 6AM may tuna"
        ↓
Vendor sees availability post → messages fisherman OR interest via bot
Buyer sees post → reserves tuna from vendor inventory
        ↓
Fisherman arrives at market → uploads fish photos
        ↓
Gemma 4 Vision analyzes photos → "FRESH — Maliwanag ang mata, pula ang hasang"
        ↓
Freshness badge appears on listing → buyers and vendors trust the product
        ↓
Fish weighed at market → Fisherman settles catch (actual kg + price)
        ↓
Trip summary: "Kita mo ngayong araw: ₱2,400"
        ↓
Both parties rate each other → builds reputation score
```

---

## Ollama Setup (for dev/demo)

```bash
# Install Ollama (https://ollama.com)
ollama pull gemma4        # handles both chat and vision (multimodal)

# Verify
curl http://localhost:11434/api/tags
```

## Key Config Changes

**`backend/pom.xml`** — add:
```xml
<dependency>
  <groupId>org.springframework.ai</groupId>
  <artifactId>spring-ai-ollama-spring-boot-starter</artifactId>
</dependency>
```

**`backend/src/main/resources/application.properties`** — add:
```properties
spring.ai.ollama.base-url=http://localhost:11434
spring.ai.ollama.chat.model=gemma4
spring.servlet.multipart.max-file-size=5MB
spring.servlet.multipart.max-request-size=25MB
mermaid.uploads.path=./uploads/catch-photos
```

---

## Verification Checklist

- [ ] Ollama running with `gemma4` model pulled
- [ ] `POST /ai/chat` returns Taglish response for marine condition query
- [ ] Fisherman logs catch via bot → appears in `/trips/{id}/catches`
- [ ] Photo upload returns URL, Gemma vision returns freshness rating
- [ ] Buyer can browse `/marketplace/inventory` without login
- [ ] Buyer reservation appears in vendor's dashboard
- [ ] Catch settlement calculates trip income correctly
- [ ] SOS button creates alert record and shows emergency contact
- [ ] Rating submitted after settlement → visible on user profile
