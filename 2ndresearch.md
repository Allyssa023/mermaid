# How fish actually moves from boat to buyer in Cagayan

**In Philippine small-scale coastal fisheries — including Cagayan — the buyer, not the fisherman, is the source of truth for transactions.** Fish is overwhelmingly sold "supply-push" at the landing site to a buyer who is already waiting, at a price the buyer sets, inside a long-standing credit/loyalty relationship called the **suki** system. Formal fisher-driven "listings" of catch essentially do not exist in the traditional economy; what exists is **patron-pull** (the suki has a standing claim on all catch) plus **occasional pasabi** (word-of-mouth advance orders) for high-value species. For a marketplace feature in MERMAID, this means a pure "fishermen post catch" model fights the grain of the existing economy. A **buyer-posts-demand + fisher-pushes-brief-catch-alerts hybrid**, anchored to the BFAR/Navotas reference price and designed to *augment* rather than replace the suki, is the architecture most likely to be adopted in coastal Cagayan.

The rest of this report walks through the supply chain, the actors and terms, who initiates and prices transactions, and what Cagayan-specific context implies for the app.

## The supply chain has four to five layers, and fish flows one way

The canonical Philippine small-scale fisheries chain, described by the Cooperative Development Authority and BFAR and corroborated in academic ethnographies (Drury O'Neill et al. 2018/2019, Pomeroy 1992, FAO), runs as follows:

**Fisherman → Village buyer / landing-site comprador → Consolidator or byahero (viajero) → Consignacion broker at a wholesale port → Volume buyer / labasero → Wet-market retailer (tindera) → Consumer.**

Not every fish passes through every layer. A small-scale Cagayan fisher's catch typically follows one of three routes. **High-volume low-value species** (galunggong, tamban, aramang) are bought whole-banyera (per tub) at the landing by a local comprador or topper, iced, and either retailed locally in Aparri/Tuguegarao markets or consolidated for long-distance shipment. **High-value species** (tuna, ludong, lapu-lapu, dorado) are picked up directly by a byahero or a pre-booked restaurant/export buyer, often trucked south to Metro Manila. **Surplus and by-catch** go to dried-fish and bagoong processors at very low prices — Aparri is historically a bagoong/bugguong center and collects a ₱10-per-sack trader fee on aramang.

Roughly **50 metric tons a day of iced fish arrives at Navotas Fish Port Complex by overland truck from provinces north and south of Manila**, Cagayan included, which means Cagayan's best fish often leaves the region while inflows of galunggong and bangus from Pangasinan fill local palengkes. The province is a net fish-deficit area despite its long coastline.

## Middlemen are not a single role — they are a layered cast

Philippine fish-trade terminology mixes Spanish, Tagalog, Chinese, and Ilocano, and the same person may wear multiple hats. The key actors a MERMAID user will meet:

| Local term | Role |
|---|---|
| **Mangngalap / mananagat** | Fisherman (Ilocano / Tagalog) |
| **Suki** | Long-term preferred trading partner on either side; the relationship, not a job title |
| **Comprador / komprador** | Landing-site buyer who often finances fuel, ice, or gear in exchange for exclusive purchase rights; the core patron in the patron-client system |
| **Parokyano** | Regular customer (used more by retailers for their repeat buyers than at landing level) |
| **Byahero / viajero** | Traveling trader who consolidates fish and ships it to city markets (Tuguegarao, Manila) |
| **Consignacion broker** | Commission agent at a wholesale fish port who runs the whispered auction; charges ~5–6% |
| **Labasero / volume buyer** | Buyer who lifts banyera-lots out of the wholesale port and moves them to secondary markets |
| **Tindera / aglaklako** | Wet-market retailer (usually a woman) |
| **Financiador / palakaya** | The financier tier — often the same person as the comprador, but sometimes a separate capital provider behind the comprador |

The single most important fact about these actors is the **patron-client suki tie**. Drury O'Neill et al.'s 2019 *Frontiers in Marine Science* study of Concepcion, Iloilo — widely cited as the canonical recent ethnography — describes it as **interest-free loans, regularity, trust, personal connectedness and selectivity**, where the patron "passes both social and financial services" including market-price information. Pomeroy's 1992 ICLARM paper asked whether the suki was "symbiotic or parasitic" and concluded it is genuinely both: the patron provides insurance against typhoons, bad catches, and medical emergencies, but also sets ex-vessel prices unilaterally and captures most margin. Dagoon (SEAFDEC 2000) documents that **about 98% of Philippine wholesale fish trade operates on credit** — the chain is glued together by debt, not cash.

## The buyer, not the fisherman, sets the price

At every tier, price is set by the buyer side, not the seller side, with only thin negotiation. **At the beach, the comprador/suki quotes an ex-vessel price on arrival**, which the fisher generally accepts because they are in debt to that patron, because the fish spoils within hours, and because they have no real-time downstream price information. **At wholesale ports** (Navotas, Malabon Tañong, and to a smaller extent Aparri's landings), price is set by **bulungan** — a Spanish-era *whispered* auction where buyers whisper bids into the broker's ear and the broker picks the highest without the other bidders or the fisher seeing the losing bids. Transparency is deliberately suppressed. **At retail**, the vendor posts an asking price and the customer haggles, typically 20–30% below ask.

Factors that shift the negotiated price: freshness (prices collapse toward dawn), species hierarchy (lapu-lapu and malasugi at ₱500–600/kg in Jan 2025 BFAR retail data, versus tamban at ₱20–25/kg at landing), size, total volume landed (a saturated market crashes price within hours), distance from Navotas (lapu-lapu was ₱500/kg at Malabon versus ₱600/kg at Marikina in the same week), season, and — critically — the strength of the fisher's debt to the patron. Ludong from the Cagayan River is the outlier at **₱5,000–7,000/kg**, reflecting endemic scarcity and a closed season from October 1 to November 15 under BFAR FAO 31.

**Navotas is the reference price that cascades down to Cagayan.** BFAR publishes a weekly and monthly Consolidated Wholesale Price Monitoring Report for Navotas Fish Port Complex, and PFDA Navotas posts a daily Price Watch on Facebook. Byaheros and compradors price-off these figures minus transport, ice, commission, and spoilage allowance. This is the single most exploitable data source for a fisher-facing app.

## Information flows down to fishers, almost never up

The critical asymmetry for MERMAID's design is that **buyers know far more than fishers**. The patron sees multiple fishers' catches, knows Navotas prices, and hears restaurant demand. Individual fishers know only what they personally caught and what their patron tells them. Drury O'Neill et al. found that experimentally raising prices did not change fishers' decisions because **the price signal is so filtered through patrons that fishers have stopped treating it as actionable**. There is no tradition of fishers "posting" catch: information moves via kapitbahay word-of-mouth ("the boats are back"), the auctioneer physically shouting at the landing, and — increasingly — SMS and Messenger used *by the trader* to coordinate pickup.

The COVID lockdowns forced a partial exception: when restaurants closed, fishers in Zamboanga Sibugay and elsewhere were "forced to sell their products through Facebook," and USAID's Fish Tiangge linked 6,000 fisherfolk with 300,000+ households. This proved fishers **can** post when conventional channels fail, but the behavior did not become the norm once markets reopened. Advance orders (**pasabi**) exist mainly for restaurants, hotel buyers, exporters (squid and small pelagics for Taiwan/China), and household sukis buying for a fiesta — a minority of volume, but a meaningful share of margin.

## Consignment and credit run in both directions

Yes, there is a consignment model, but it is the **opposite of what a Western marketplace would assume**. Two flows operate simultaneously:

Boat owners **consign** their catch to a licensed broker at the wholesale port (e.g., ESE Consignacion in Bocaue has operated since 1989), who auctions it via bulungan and remits proceeds minus a 5–6% commission. The fisher is the consignor, the broker is the consignee, and cash is settled after the auction — this is classic forward-consignment.

In parallel, the **patron-client direction runs the other way**: the comprador advances cash, fuel, ice, or gear *before* the trip, and is repaid in fish at a pre-set ex-vessel price on return. This is effectively **reverse consignment** — the buyer "pre-pays" and takes first claim on the catch. Vendors taking fish first and paying later in cash also happens at the retailer tier, where a tindera will take a banyera on credit from the broker and pay after selling, again enabled by the suki relationship. The upshot: in Cagayan's coastal economy, **trust-based credit, not spot cash, is the dominant settlement mode** at every layer.

## Cagayan-specific realities that shape the app

Cagayan holds ~73% of Cagayan Valley's coastline and produces 66.9% of the region's fisheries output (PSA 2024), with municipal marine fisheries (39.9%) the largest single slice. Major coastal municipalities run west-to-east from Sta. Praxedes, Claveria, Sanchez Mira, Pamplona, Abulug, Ballesteros, Aparri, Buguey, Gonzaga, Sta. Teresita, to Sta. Ana on the Pacific corner. The key landing sites are **Aparri** (Macanaya, Toran, Furugganan, Punta Pier, and the BFAR-supported Community Fish Landing Center; ~11,000 aramang fisherfolk alone), **Taggat Landing in Claveria** (second-largest municipal landing in the province), and **San Vicente Fish Port in Santa Ana** on the Pacific side. BFAR's Regional Fisheries Training Center in Aparri, operating since 1979, is a natural institutional partner, alongside CSU-Aparri, the Santa Ana Fisherfolk Marketing Cooperative, and the newer BUSILAC cooperative in Aparri.

The species mix is small-pelagic-dominated (galunggong, tamban, hasa-hasa, dorado, tulingan, yellowfin on the Pacific side) plus the iconic river/estuarine **ludong** and **aramang** at Aparri. Fish flows outward to Tuguegarao, Dagupan, and Navotas via byaheros; higher-value species leave the region while lower-value galunggong and bangus flow inward from Pangasinan.

Terminology is Ilocano-first with Ibanag/Itawes in inland and river communities, mixed with Spanish-origin trade loanwords. The fisher is **mangngalap**, the fish is **ikan**, the boat is **bangka** or **motorbanca**, the tub unit is **banyera**, the shrimp is **aramang**, and the fish-paste is **bugguong**. No clean Ilocano word for "dealer" has emerged; fishers code-switch between **suki**, **komprador**, **byahero**, and **aglaklako** (retailer).

**Connectivity is the biggest technical constraint.** Globe dominates Cagayan Valley with ~90%+ share; Smart is reliable only in town centers. Coastal barangays in Buguey, Gonzaga, Sta. Teresita, outer Santa Ana (Casambalangan, Palawig), and outer Claveria/Sanchez Mira have intermittent 4G, and offshore cellular disappears beyond ~5–10 km. Much of coastal Cagayan falls under DOST's Geographically Isolated and Disadvantaged Areas designation. **Offline-first architecture with SMS fallback is not optional** — it is the baseline.

## What this means for MERMAID's marketplace feature

The question of whether fishers post catch or vendors post buying requests has a clear answer from the evidence: **the vendor/buyer is the natural source of truth**, because they already carry the information (downstream prices, restaurant orders, volume needs), they already initiate transactions in the field, and they use smartphones more intensively than fishers. A fisher-posts-catch model inverts the existing economy and asks low-literacy, time-pressed fishers with spotty signal to do information work that buyers are better positioned to do.

But a pure buyer-posts model leaves the asymmetry intact. The right design is a **demand-pull primary flow with a supply-side alert channel**:

1. **Buyers post standing or spot demand** ("Lapu-lapu, 5 kg, ₱450/kg or better, Carmen market pickup by 7 AM"). This matches how byaheros and tinderas already plan their day.
2. **Fishers push a brief catch alert on landing** — species, rough volume, size grade, landing site — which the system matches against active demand and notifies subscribed buyers by SMS/Messenger. This is a digital version of the auctioneer shouting at the beach, compressed into one tap.
3. **A BFAR/Navotas reference-price ticker** is displayed on both sides, giving fishers a floor-price anchor they historically lack. BFAR's Consolidated Wholesale Price Monitoring Report and PFDA Navotas Price Watch are scrapeable.
4. **Do not try to replace the suki.** Design the app as a *second channel* — useful for surplus above the suki's claim, for bad days when the suki is oversupplied, or for species the local comprador does not handle. Framing MERMAID as a threat to the patron relationship will get it rejected at the barangay level.
5. **Respect bulungan-style price privacy.** Buyers should be able to send sealed offers visible only to the fisher, not a fully public leaderboard — this matches cultural expectations around price opacity.
6. **Recognize the women.** Fish brokers, wholesalers, and retailers in the Philippines are disproportionately women, and fishers' wives typically handle household-level sales. Women are the likely first adopters on both sides.
7. **Localize units and language.** Kilo, banyera, tali (bundle), slice (for tuna/malasugi); Ilocano primary with Filipino and English; preserve Spanish loanwords (banyera, viajero, suki, komprador) that fishers already use.
8. **Pilot geography:** Aparri (scale, institutional density), Santa Ana (cooperative, Pacific-side), and Claveria (second-largest landing) give cross-sectional coverage of the province.

## Conclusion

The Philippine small-scale fisheries trade is not a Western spot market with price discovery — it is a **debt-mediated, patron-brokered, information-asymmetric chain** where the buyer is almost always the active party and the fisher is almost always a price-taker. Recognizing this reframes the MERMAID marketplace question: the interesting design problem is not "how do we digitize fisher listings," but **"how do we let fishers see what buyers see, without blowing up the suki relationships that give them emergency credit?"** A demand-pull marketplace with supply-side alerts, a visible BFAR reference price, sealed-bid privacy, SMS fallback for coastal dead zones, and Ilocano localization is the architecture that respects how Cagayan coastal fishing already works while fixing the one asymmetry that most hurts fishers — their lack of independent price information. The suki is older than BFAR and will outlast the app; the app's job is to upgrade it, not to replace it.