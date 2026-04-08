# La Union Fisherman App — Departure Points and Target Areas Reference

This document translates the municipality research into a format that is easier to use when refactoring form fields from **free-text inputs** to **select fields**.

## Purpose

Use this file as a reference for:
- municipality dropdowns
- departure point dropdowns
- target area dropdowns
- confidence labels for data quality
- guided agent refactoring for validation and UI consistency

## Notes on Data Quality

There is **no single provincewide official list** of boat departure points per municipality that was publicly verified in the research. Because of that:
- **Documented** means the location is directly supported by an official or strongly grounded source
- **Best-supported launch cluster** means the location is the strongest practical launch area based on coastal barangays, fish landing centers, communal waters, river mouths, and related fisheries references
- **Inferred** means the area is useful for app design but should later be validated with local BFAR/LGU or fisherfolk interviews

---

## Suggested Select-Field Structure

### Municipality
Use a fixed select field with the 12 coastal LGUs:
- Agoo
- Aringay
- Caba
- Santo Tomas
- Rosario
- Bauang
- City of San Fernando
- San Juan
- Bacnotan
- Balaoan
- Bangar
- Luna

### Departure Point
Recommended behavior:
- make this field depend on the selected municipality
- show only the departure points for that municipality
- allow one default option such as `Select departure point`

### Target Area
Recommended behavior:
- also dependent on municipality
- optionally dependent on departure point
- use standardized values instead of raw user text

### Confidence Level
Suggested enum:
- `documented`
- `best_supported`
- `inferred`

---

## Municipality Reference

### 1. Agoo
**Departure Points / Launch Cluster**
- Sta. Rita Central
- Sta. Rita West
- Sta. Rita Sur
- San Francisco
- San Agustin East *(processing node, useful supporting location)*

**Target Areas**
- Lingayen Gulf off Agoo
- Sta. Rita–Gumacbao nearshore zone

**Confidence Level**
- best_supported

**Notes**
Agoo’s communal waters include the Gumacbao stretch from San Francisco to Sta. Rita Sur. San Agustin East was identified as a fish-processing node, which is useful as a supporting fisheries location.

---

### 2. Aringay
**Departure Points / Launch Cluster**
- Samara
- Sta. Lucia
- San Antonio
- San Simon East
- San Simon West
- Pangao-aoan East
- Pangao-aoan West
- Sta. Cecilia
- Sto. Rosario East
- Sto. Rosario West
- Sta. Rita East
- Sta. Rita West

**Target Areas**
- Lingayen Gulf off Aringay
- Aringay communal-water belt
- Samara nearshore fishing area

**Confidence Level**
- best_supported

**Notes**
These barangays are directly tied to Aringay’s communal waters in provincial planning material, making them strong candidates for municipality-specific departure choices.

---

### 3. Caba
**Departure Points / Launch Cluster**
- San Carlos
- Santiago Norte
- Santiago Sur
- Wenceslao

**Target Areas**
- Lingayen Gulf off Caba
- Caba River mouth
- Antaguing River mouth

**Confidence Level**
- best_supported

**Notes**
These were derived from the documented coastal barangays and fisheries references tied to the gulf and river systems.

---

### 4. Santo Tomas
**Departure Points / Launch Cluster**
- Damortis
- Balaoc
- Baybay
- Cupang
- Casilagan
- Raois
- Ubagan

**Target Areas**
- Lingayen Gulf off Santo Tomas
- Ilocos Coast off Santo Tomas
- Raois nearshore waters
- Capengpeng River area
- Casilagan River area

**Confidence Level**
- documented for Damortis
- best_supported for the rest

**Notes**
Damortis is the clearest documented landing port of vessels engaged in fishing. The other coastal areas are strong launch clusters based on nearby waters, lagoon, and river systems.

---

### 5. Rosario
**Departure Points / Launch Cluster**
- Bani
- Damortis
- Rabon

**Target Areas**
- Southern Lingayen Gulf
- Agoo–Damortis coastal zone
- Rosario nearshore fishing grounds

**Confidence Level**
- best_supported

**Notes**
The Bani–Damortis–Rabon corridor is tied to existing fishing grounds in provincial planning references.

---

### 6. Bauang
**Departure Points / Launch Cluster**
- Pudoc
- Baccuit
- Bauang town-center coast

**Target Areas**
- Bauang nearshore coast
- Bauang River mouth

**Confidence Level**
- inferred

**Notes**
No single clearly named fish port was verified from the gathered sources. These are the strongest app-design launch clusters based on coastal references and recent fisheries-related coastal work.

---

### 7. City of San Fernando
**Departure Points / Launch Cluster**
- Ilocanos Sur Community Fish Landing Center

**Target Areas**
- San Fernando coastal waters
- West Philippine Sea side off San Fernando

**Confidence Level**
- documented

**Notes**
The Community Fish Landing Center in Ilocanos Sur is the most clearly documented fisheries landing node for the city.

---

### 8. San Juan
**Departure Points / Launch Cluster**
- Urbiztondo
- Ili Norte
- Ili Sur
- Santo Rosario
- Taboc
- Santa Rosa

**Target Areas**
- San Juan nearshore coast
- Western beach corridor off San Juan

**Confidence Level**
- inferred to best_supported

**Notes**
A formal fish-port list was not found in the gathered sources, so these are practical coastal launch clusters inferred from shoreline and barangay references.

---

### 9. Bacnotan
**Departure Points / Launch Cluster**
- Baroro
- Poblacion coast
- Paratong coast

**Target Areas**
- Baroro River mouth
- Bacnotan nearshore waters

**Confidence Level**
- best_supported

**Notes**
Baroro is the strongest identifiable fisheries-related coastal node, supported by coastal and municipal references.

---

### 10. Balaoan
**Departure Points / Launch Cluster**
- Paraoir
- Almeida

**Target Areas**
- Balaoan north coastal nearshore waters
- Paraoir–Almeida fishing grounds
- Sea-urchin grounds

**Confidence Level**
- best_supported

**Notes**
Paraoir and Almeida are explicitly associated with boating and fishing, making them strong departure point values.

---

### 11. Bangar
**Departure Points / Launch Cluster**
- Bangar coastal barangays
- Amburayan River mouth

**Target Areas**
- Bangar coastal waters
- Amburayan estuary
- Amburayan river mouth zone

**Confidence Level**
- best_supported

**Notes**
A single formal fish port was not verified, but fisheries activity is tied to the coastal barangays and the Amburayan River system.

---

### 12. Luna
**Departure Points / Launch Cluster**
- Darigayos
- Oaqui
- Rimos coastal belt
- Luna Community Fish Landing Center

**Target Areas**
- Luna nearshore waters
- Darigayos–Oaqui fishing grounds
- Northern coastal fishing grounds

**Confidence Level**
- documented for the fish landing center
- best_supported for the barangay cluster

**Notes**
Luna stands out as a strong northern fisheries hub. The fish landing center is the clearest formal node, while the barangay belt provides practical launch options.

---

## Recommended Form Design

### Option 1 — Three-level guided selects
1. `municipality`
2. `departure_point`
3. `target_area`

This is the cleanest option for reducing inconsistent text input.

### Option 2 — Municipality first, then auto-fill choices
After selecting a municipality:
- filter the available departure points
- filter the available target areas
- optionally show a `confidence_level` badge in the UI

### Option 3 — Municipality plus free-form fallback
If you still need flexibility:
- primary field = select
- fallback field = optional text input such as `other_departure_point`

This is useful while your data is still being validated.

---

## Suggested Enum-Like JSON Shape

```json
[
  {
    "municipality": "Agoo",
    "departure_points": [
      "Sta. Rita Central",
      "Sta. Rita West",
      "Sta. Rita Sur",
      "San Francisco",
      "San Agustin East"
    ],
    "target_areas": [
      "Lingayen Gulf off Agoo",
      "Sta. Rita-Gumacbao nearshore zone"
    ],
    "confidence_level": "best_supported"
  },
  {
    "municipality": "City of San Fernando",
    "departure_points": [
      "Ilocanos Sur Community Fish Landing Center"
    ],
    "target_areas": [
      "San Fernando coastal waters",
      "West Philippine Sea side off San Fernando"
    ],
    "confidence_level": "documented"
  }
]
```

---

## Refactor Guidance for Your Agent

When converting form inputs from text fields to selects, the agent should:

1. replace raw text municipality input with a fixed select list of the 12 coastal LGUs
2. make `departure_point` dependent on the selected municipality
3. make `target_area` dependent on the selected municipality
4. optionally make `target_area` also depend on `departure_point`
5. prevent values that do not belong to the selected municipality
6. add fallback support only where data confidence is not fully documented
7. store normalized string values so analytics and filters remain consistent
8. avoid duplicated entries caused by different spellings of the same barangay or area

---

## Best Initial Implementation Strategy

For a first stable release, prioritize the municipalities with stronger fisheries importance and clearer operational value:
- Santo Tomas
- Aringay
- Agoo
- Rosario
- City of San Fernando
- Bacnotan
- Luna

Then expand the others once you validate more granular landing data with local users.

---

## Final Reminder

This file is intended for **product design and refactoring support**, not as a final legally authoritative fisheries registry. Before production rollout, validate the departure points with:
- local fisherfolk interviews
- municipal agriculture offices
- BFAR or local fisheries offices
- wet market vendor onboarding feedback

