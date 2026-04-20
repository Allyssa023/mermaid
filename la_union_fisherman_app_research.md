e# La Union Fisherman App Research Brief

## Project Context

You are refactoring the fisherman app so it focuses on **La Union**. The app connects **fishermen** with **wet market vendors** and also shows **marine conditions** such as:

- Wave height
- Wind conditions
- Marine advisories
- Other coastal safety indicators

This brief summarizes the research that supports focusing the product on La Union first.

---

## Research Goal

The goal was to identify:

1. Which **La Union municipalities** appear to have the strongest **fishermen-to-market opportunity**
2. The likely **trip-origin trend** or where fishermen most commonly **start their trips**
3. Which municipalities should be prioritized first for an app rollout

---

## Scope: Coastal Municipalities in La Union

La Union’s fisheries activity is spread across **11 coastal municipalities plus San Fernando City**:

- Bangar
- Luna
- Balaoan
- Bacnotan
- San Juan
- Bauang
- Caba
- Aringay
- Agoo
- Sto. Tomas
- Rosario
- City of San Fernando

---

## Data Availability Notes

The most useful public data I found came from provincial ecological profiles:

- **2022 Ecological Profile** for municipality-level fisherman headcount
- **2024 Ecological Profile** for municipality-level fish production

However, I **did not find a clean official dataset** showing municipality-by-municipality counts of **wet market vendors**. Because of that, the “fishermen-to-market ratio” cannot be stated as an exact official figure.

Instead, the best public proxy is:

- **number of fishermen / fishing crews**
- **fish production volume**
- **presence of market or landing infrastructure**

This means some conclusions below are **evidence-based inferences**, not direct official counts.

---

## Strongest Municipalities by Fisherman Concentration

Based on the provincial ecological profile, the municipalities with the largest counts of **municipal fishing crews** are:

| Municipality | Fishermen / Fishing Crew Count |
|---|---:|
| Agoo | 1,600 |
| San Fernando City | 1,094 |
| Sto. Tomas | 963 |
| Bauang | 589 |
| Aringay | 530 |
| Bacnotan | 506 |

These municipalities appear to be the strongest **trip-origin areas** if we interpret fisherman concentration as a signal of where fishing activity starts.

---

## Strongest Municipalities by Fish Production

Based on the 2024 ecological profile, the biggest coastal production hubs are:

| Municipality | Fish Production (mt) |
|---|---:|
| Sto. Tomas | 1,320.87 |
| Rosario | 1,106.91 |
| Aringay | 1,094.27 |
| Bacnotan | 200.88 |
| San Fernando City | 197.00 |
| Luna | 145.10 |
| Agoo | 120.00 |

This shows a strong commercial fisheries belt in the **south and southeast coast** of La Union, especially:

- Sto. Tomas
- Rosario
- Aringay

There is also a secondary cluster around:

- Bacnotan
- San Fernando City
- Luna

---

## Best-Supported Interpretation of the Fishermen-to-Market Opportunity

Because there is no single public dataset for wet market vendor counts, the best-supported interpretation is this:

### Strongest municipalities for marketplace opportunity

The municipalities that appear most promising for a fisherman-to-vendor matching app are:

- **Sto. Tomas**
- **Aringay**
- **Agoo**
- **Bacnotan**
- **Bauang**
- **Rosario**
- **San Fernando City**

### Why these areas stand out

These areas combine at least one or more of the following:

- high fisherman concentration
- strong production output
- likely active fish trading movement
- existing market or landing activity

### Important inference

Public records suggest that **San Fernando City** has stronger formal market infrastructure because it has a **city public market**, an **auxiliary wet market**, and a **Community Fish Landing Center**. Public references also indicate **Luna** and **Balaoan** have Community Fish Landing Centers.

That suggests the municipalities likely facing stronger **fishermen-to-market pressure** are those with high fishing activity but less visibly concentrated market infrastructure, especially:

- **Agoo**
- **Sto. Tomas**
- **Aringay**
- **Bauang**
- **Bacnotan**

This is an inference based on available public evidence, not a direct official market-vendor ratio.

---

## Trip-Origin Trend: Where Fishermen Likely Start Their Trips

A clear pattern appears in the data: the main coastal fishing municipalities are dominated by **motorized municipal fishing**, not non-motorized fishing.

Examples:

| Municipality | Motorized | Non-Motorized |
|---|---:|---:|
| Agoo | 1,500 | 100 |
| Sto. Tomas | 860 | 103 |
| San Fernando City | 944 | 150 |
| Bauang | 550 | 39 |
| Aringay | 510 | 20 |
| Bacnotan | 468 | 38 |

### Trend interpretation

This suggests that fishing trips in the major municipalities usually start from **organized municipal coastal launch points**, not from scattered informal shoreline departures.

For product design, that means the app should treat **municipality-based launch points and landing hubs** as first-class entities.

Instead of thinking only in terms of province-wide marine conditions, the dashboard and marketplace should be centered around:

- launch municipality
- landing / unloading area
- nearest vendor cluster
- active advisories for that specific coastal zone

---

## Recommended Rollout Priority for the App

### Tier 1

Focus first on:

- **Sto. Tomas**
- **Aringay**
- **Agoo**
- **Rosario**

Why:

- strongest mix of fishing activity and production output
- stronger chance of daily fish-to-market movement
- better opportunity to validate marketplace matching

### Tier 2

Next priority:

- **San Fernando City**
- **Bacnotan**
- **Bauang**

Why:

- still strong in fishing activity
- important commercial and transport relevance
- useful for expansion after the first cluster is validated

### Tier 3

Later rollout:

- **Luna**
- **Bangar**
- **Caba**
- **San Juan**
- **Balaoan**

Why:

- still relevant coastal municipalities
- but lower immediate priority compared with the strongest activity hubs

---

## Product Implications for the Dashboard Refactor

Since the app will now focus on **La Union**, the dashboard should no longer feel like a generic marine conditions viewer.

### Suggested dashboard focus

Each municipality should have its own dashboard context with:

- current marine conditions
- wave height
- wind speed and direction
- advisories / warnings
- launch-area status
- vendor demand or available buyers
- recent catch or landing activity

### Suggested dashboard filtering

Allow users to filter by:

- municipality
- coastal zone
- launch point
- landing point
- advisory severity
- vendor demand level

### Suggested user flow

1. Fisherman selects or is assigned a **home municipality**
2. Dashboard shows **localized marine conditions** for that municipality
3. App highlights **safe / unsafe trip timing** based on advisories
4. Fisherman can view **nearby vendors or wet market buyers**
5. Fisherman can tag intended landing area or expected catch availability

---

## Practical Refactor Direction

If you are restructuring the codebase, it would make sense to organize the data model around La Union-specific entities such as:

- `Municipality`
- `CoastalZone`
- `LaunchPoint`
- `LandingSite`
- `Vendor`
- `MarineCondition`
- `Advisory`
- `FishingTrip`

This makes the dashboard more aligned with real operations in La Union instead of showing marine data in a generic province-wide way.

---

## Recommended V1 Positioning

A strong V1 positioning would be:

> A La Union-focused fisheries marketplace and safety app that helps fishermen check marine conditions, understand advisories, and connect directly with wet market vendors near their likely landing areas.

---

## Conclusion

The strongest municipalities for initial product focus are those that show either:

- high fisherman concentration,
- high fish production,
- or strong commercial relevance.

The best initial areas appear to be:

- **Sto. Tomas**
- **Aringay**
- **Agoo**
- **Rosario**
- **San Fernando City**
- **Bacnotan**
- **Bauang**

The launch trend suggests that fishermen commonly begin trips from municipality-based coastal hubs, and most major activity is tied to **motorized municipal fishing**. That makes municipality-centered dashboards, launch points, landing hubs, and vendor mapping the right direction for your refactor.

---

## Sources

1. La Union Provincial Government. **CY 2022 Ecological Profile**.  
   https://launion.gov.ph/wp-content/uploads/2024/04/CY-2022-Ecological-Profile.pdf

2. La Union Provincial Government. **La Union Ecological Profile 2024**.  
   https://launion.gov.ph/wp-content/uploads/2025/11/1-La-Union-Ecological-Profile-2024-Final.pdf

3. La Union Provincial Government. Provincial portal / ecological profile publication page.  
   https://launion.gov.ph/%F0%9D%97%A3%F0%9D%97%9A%F0%9D%97%9F%F0%9D%97%A8-%F0%9D%97%A3%F0%9D%97%94%F0%9D%97%A5%F0%9D%97%A7%F0%9D%97%A1%F0%9D%97%98%F0%9D%97%A5%F0%9D%97%98%F0%9D%97%97-%F0%9D%97%AA%F0%9D%97%9C%F0%9D%97%A7/

4. La Union Provincial Government. Public reference listing relevant to community and fisheries infrastructure.  
   https://launion.gov.ph/wp-content/uploads/2024/05/List-of-CSO-2022-2025.pdf
