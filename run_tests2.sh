#!/bin/bash

# Login all users
curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" --data-binary '{"email":"admin@mermaid.local","password":"password"}' > /dev/null
curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" --data-binary '{"email":"isidro@test.com","password":"password"}' > /dev/null
curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" --data-binary '{"email":"rosario@test.com","password":"Test1234!"}' > /dev/null
curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" --data-binary '{"email":"isidro2@test.com","password":"Test1234!"}' > /dev/null

A_OTP=$(PGPASSWORD=1234 psql -h localhost -U postgres -d mermaid_db -t -A -c "SELECT otp_code FROM users WHERE email = 'admin@mermaid.local';" 2>&1)
F_OTP=$(PGPASSWORD=1234 psql -h localhost -U postgres -d mermaid_db -t -A -c "SELECT otp_code FROM users WHERE email = 'isidro@test.com';" 2>&1)
V_OTP=$(PGPASSWORD=1234 psql -h localhost -U postgres -d mermaid_db -t -A -c "SELECT otp_code FROM users WHERE email = 'rosario@test.com';" 2>&1)
F2_OTP=$(PGPASSWORD=1234 psql -h localhost -U postgres -d mermaid_db -t -A -c "SELECT otp_code FROM users WHERE email = 'isidro2@test.com';" 2>&1)

AT=$(curl -s -X POST http://localhost:8080/api/auth/otp/verify -H "Content-Type: application/json" --data-binary "{\"email\":\"admin@mermaid.local\",\"code\":\"$A_OTP\"}" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
FT=$(curl -s -X POST http://localhost:8080/api/auth/otp/verify -H "Content-Type: application/json" --data-binary "{\"email\":\"isidro@test.com\",\"code\":\"$F_OTP\"}" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
VT=$(curl -s -X POST http://localhost:8080/api/auth/otp/verify -H "Content-Type: application/json" --data-binary "{\"email\":\"rosario@test.com\",\"code\":\"$V_OTP\"}" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
F2T=$(curl -s -X POST http://localhost:8080/api/auth/otp/verify -H "Content-Type: application/json" --data-binary "{\"email\":\"isidro2@test.com\",\"code\":\"$F2_OTP\"}" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

echo "TOKENS: AT=$([ -n "$AT" ] && echo OK || echo FAIL) FT=$([ -n "$FT" ] && echo OK || echo FAIL) VT=$([ -n "$VT" ] && echo OK || echo FAIL) F2T=$([ -n "$F2T" ] && echo OK || echo FAIL)"

echo ""
echo "=== T20: POST /api/admin/users ==="
B20=$(curl -s -X POST http://localhost:8080/api/admin/users \
  -H "Authorization: Bearer $AT" \
  -H "Content-Type: application/json" \
  --data-binary '{"email":"admintest_fresh99@test.com","password":"Admin1234!","fullName":"Admin Test User","role":"FISHERMAN"}')
USER_ID=$(echo "$B20" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
S20="unknown"
if echo "$B20" | python -c "import sys,json; d=json.load(sys.stdin); exit(0 if 'id' in d else 1)" 2>/dev/null; then S20="201"; else S20=$(echo "$B20" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','err'))" 2>/dev/null); fi
echo "T20: S=$S20 userId=$USER_ID"

echo ""
echo "=== T21: PUT /api/admin/users/USER_ID ==="
if [ -n "$USER_ID" ] && [ "$USER_ID" != "" ]; then
  B21=$(curl -s -X PUT "http://localhost:8080/api/admin/users/$USER_ID" \
    -H "Authorization: Bearer $AT" \
    -H "Content-Type: application/json" \
    --data-binary '{"role":"VENDOR","fullName":"Admin Test User Updated","email":"admintest_fresh99@test.com"}')
  VROLE=$(echo "$B21" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('role','err'))" 2>/dev/null)
  if echo "$B21" | python -c "import sys,json; d=json.load(sys.stdin); exit(0 if 'role' in d else 1)" 2>/dev/null; then S21="200"; else S21=$(echo "$B21" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','err'))" 2>/dev/null); fi
  echo "T21: S=$S21 role=$VROLE"
fi

echo ""
echo "=== T23: POST /api/admin/fish-species ==="
B23=$(curl -s -X POST http://localhost:8080/api/admin/fish-species \
  -H "Authorization: Bearer $AT" \
  -H "Content-Type: application/json" \
  --data-binary '{"commonName":"QATestFish99","scientificName":"Testus fishus"}')
SPECIES_ID=$(echo "$B23" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
if echo "$B23" | python -c "import sys,json; d=json.load(sys.stdin); exit(0 if 'id' in d else 1)" 2>/dev/null; then S23="201"; else S23=$(echo "$B23" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','err'))" 2>/dev/null); fi
LOOKUP=""
if [ -n "$SPECIES_ID" ]; then
  LOOKUP=$(curl -s "http://localhost:8080/api/lookups/fish-species" | python -c "import sys,json; d=json.load(sys.stdin); found=[x for x in d if str(x.get('id',''))==str($SPECIES_ID)]; print('Found' if found else 'NotFound')" 2>/dev/null)
fi
echo "T23: S=$S23 speciesId=$SPECIES_ID lookup=$LOOKUP"

echo ""
echo "=== T24: PUT /api/admin/fish-species ==="
if [ -n "$SPECIES_ID" ] && [ "$SPECIES_ID" != "" ]; then
  B24=$(curl -s -X PUT "http://localhost:8080/api/admin/fish-species/$SPECIES_ID" \
    -H "Authorization: Bearer $AT" \
    -H "Content-Type: application/json" \
    --data-binary '{"commonName":"QATestFishUpdated","scientificName":"Testus fishus updated"}')
  VNAME=$(echo "$B24" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('commonName',d.get('name','err')))" 2>/dev/null)
  if echo "$B24" | python -c "import sys,json; d=json.load(sys.stdin); exit(0 if 'id' in d else 1)" 2>/dev/null; then S24="200"; else S24=$(echo "$B24" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','err'))" 2>/dev/null); fi
  echo "T24: S=$S24 name=$VNAME"
fi

echo ""
echo "=== T25: DELETE /api/admin/fish-species ==="
if [ -n "$SPECIES_ID" ] && [ "$SPECIES_ID" != "" ]; then
  S25=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "http://localhost:8080/api/admin/fish-species/$SPECIES_ID" -H "Authorization: Bearer $AT")
  ABSENT=$(curl -s "http://localhost:8080/api/lookups/fish-species" | python -c "import sys,json; d=json.load(sys.stdin); found=[x for x in d if str(x.get('id',''))==str($SPECIES_ID)]; print('StillPresent' if found else 'Absent')" 2>/dev/null)
  echo "T25: S=$S25 lookup=$ABSENT"
fi

echo ""
echo "=== T26: POST /api/admin/market-locations ==="
B26=$(curl -s -X POST http://localhost:8080/api/admin/market-locations \
  -H "Authorization: Bearer $AT" \
  -H "Content-Type: application/json" \
  --data-binary '{"name":"QA Test Market","municipality":"Manila"}')
LOC_ID=$(echo "$B26" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
if echo "$B26" | python -c "import sys,json; d=json.load(sys.stdin); exit(0 if 'id' in d else 1)" 2>/dev/null; then S26="201"; else S26=$(echo "$B26" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','err'))" 2>/dev/null); fi
echo "T26: S=$S26 locationId=$LOC_ID body=$(echo $B26 | head -c 100)"

echo ""
echo "=== T27: DELETE /api/admin/market-locations ==="
if [ -n "$LOC_ID" ] && [ "$LOC_ID" != "" ]; then
  S27=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "http://localhost:8080/api/admin/market-locations/$LOC_ID" -H "Authorization: Bearer $AT")
  echo "T27: S=$S27"
fi

echo ""
echo "=== T28: POST /api/admin/advisories ==="
B28=$(curl -s -X POST http://localhost:8080/api/admin/advisories \
  -H "Authorization: Bearer $AT" \
  -H "Content-Type: application/json" \
  --data-binary '{"title":"QA Test Advisory","message":"Stay safe near the coast today","severity":"WARNING","affectedArea":"Manila Bay","activeFrom":"2026-05-09T00:00:00Z","activeTo":"2026-05-10T00:00:00Z","isActive":true}')
ADV_ID=$(echo "$B28" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
if echo "$B28" | python -c "import sys,json; d=json.load(sys.stdin); exit(0 if 'id' in d else 1)" 2>/dev/null; then S28="201"; else S28=$(echo "$B28" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','err'))" 2>/dev/null); fi
echo "T28: S=$S28 advisoryId=$ADV_ID body=$(echo $B28 | head -c 100)"

echo ""
echo "=== T29: PUT /api/admin/advisories ==="
if [ -n "$ADV_ID" ] && [ "$ADV_ID" != "" ]; then
  B29=$(curl -s -X PUT "http://localhost:8080/api/admin/advisories/$ADV_ID" \
    -H "Authorization: Bearer $AT" \
    -H "Content-Type: application/json" \
    --data-binary '{"title":"Updated QA Advisory","message":"Updated safety message for testing","severity":"DANGER","affectedArea":"Manila Bay","activeFrom":"2026-05-09T00:00:00Z","activeTo":"2026-05-11T00:00:00Z","isActive":true}')
  VTITLE=$(echo "$B29" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('title','err'))" 2>/dev/null)
  if echo "$B29" | python -c "import sys,json; d=json.load(sys.stdin); exit(0 if 'title' in d else 1)" 2>/dev/null; then S29="200"; else S29=$(echo "$B29" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','err'))" 2>/dev/null); fi
  echo "T29: S=$S29 title=$VTITLE"
fi

echo ""
echo "=== T30: DELETE /api/admin/advisories ==="
if [ -n "$ADV_ID" ] && [ "$ADV_ID" != "" ]; then
  S30D=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "http://localhost:8080/api/admin/advisories/$ADV_ID" -H "Authorization: Bearer $AT")
  S30G=$(curl -s -o /dev/null -w "%{http_code}" -X GET "http://localhost:8080/api/admin/advisories/$ADV_ID" -H "Authorization: Bearer $AT")
  echo "T30: DEL=$S30D GET=$S30G"
fi

echo ""
echo "=== T33: Trip isolation ==="
B33=$(curl -s -X POST http://localhost:8080/api/trips \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  --data-binary '{"departurePoint":"Test Port","targetArea":"Manila Bay"}')
TRIP_ID=$(echo "$B33" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
if echo "$B33" | python -c "import sys,json; d=json.load(sys.stdin); exit(0 if 'id' in d else 1)" 2>/dev/null; then S33C="201"; else S33C=$(echo "$B33" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','err'))" 2>/dev/null); fi
echo "T33 create: S=$S33C tripId=$TRIP_ID"

if [ -n "$TRIP_ID" ] && [ "$TRIP_ID" != "" ]; then
  S33A=$(curl -s -o /dev/null -w "%{http_code}" -X GET "http://localhost:8080/api/trips/$TRIP_ID" -H "Authorization: Bearer $F2T")
  echo "T33 fisherman2 access: S=$S33A (expect 403 or 404)"
fi

echo ""
echo "=== T34: Vendor listing isolation ==="
B34=$(curl -s -X POST http://localhost:8080/api/vendor/demand-listings \
  -H "Authorization: Bearer $VT" \
  -H "Content-Type: application/json" \
  --data-binary '{"speciesId":1,"quantityKg":50.0,"offerPricePerKg":150.0,"locationId":1}')
LISTING_ID=$(echo "$B34" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
if echo "$B34" | python -c "import sys,json; d=json.load(sys.stdin); exit(0 if 'id' in d else 1)" 2>/dev/null; then S34C="201"; else S34C=$(echo "$B34" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','err'))" 2>/dev/null); fi
echo "T34 create: S=$S34C listingId=$LISTING_ID body=$(echo $B34 | head -c 100)"

if [ -n "$LISTING_ID" ] && [ "$LISTING_ID" != "" ]; then
  curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" --data-binary '{"email":"vendor2@test.com","password":"Test1234!"}' > /dev/null
  V2_OTP=$(PGPASSWORD=1234 psql -h localhost -U postgres -d mermaid_db -t -A -c "SELECT otp_code FROM users WHERE email = 'vendor2@test.com';" 2>&1)
  V2T=$(curl -s -X POST http://localhost:8080/api/auth/otp/verify -H "Content-Type: application/json" --data-binary "{\"email\":\"vendor2@test.com\",\"code\":\"$V2_OTP\"}" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
  if [ -n "$V2T" ]; then
    S34A=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "http://localhost:8080/api/vendor/demand-listings/$LISTING_ID" \
      -H "Authorization: Bearer $V2T" \
      -H "Content-Type: application/json" \
      --data-binary '{"quantityKg":100}')
    echo "T34 vendor2 access: S=$S34A (expect 403 or 404)"
  fi
fi

echo ""
echo "=== T35: Negative weight catch ==="
if [ -n "$TRIP_ID" ] && [ "$TRIP_ID" != "" ]; then
  B35=$(curl -s -X POST "http://localhost:8080/api/trips/$TRIP_ID/catches" \
    -H "Authorization: Bearer $FT" \
    -H "Content-Type: application/json" \
    --data-binary '{"fishSpeciesId":1,"weightKg":-5,"pricePerKg":100}')
  S35=$(echo "$B35" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','check_id'))" 2>/dev/null)
  if [ "$S35" = "check_id" ]; then S35="201"; fi
  echo "T35: S=$S35 body=$(echo $B35 | head -c 150)"
fi

echo ""
echo "=== T37: Marine conditions SQL injection ==="
S37_NOAUTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/api/marine/conditions/1%20OR%201%3D1")
echo "T37 no auth: S=$S37_NOAUTH"
B37=$(curl -s "http://localhost:8080/api/marine/conditions/1%20OR%201%3D1" -H "Authorization: Bearer $AT")
S37=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/api/marine/conditions/1%20OR%201%3D1" -H "Authorization: Bearer $AT")
HAS_STACK=$(echo "$B37" | grep -c "at org\.\|at java\." || echo "0")
echo "T37 with admin auth: S=$S37 stacktraceLines=$HAS_STACK body=$(echo $B37 | head -c 200)"

echo ""
echo "=== DONE ==="
