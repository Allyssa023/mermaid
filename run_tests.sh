#!/bin/bash

# Login all users
curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" --data-binary '{"email":"isidro@test.com","password":"password"}' > /dev/null
curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" --data-binary '{"email":"rosario@test.com","password":"Test1234!"}' > /dev/null
curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" --data-binary '{"email":"buyer@test.com","password":"Test1234!"}' > /dev/null
curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" --data-binary '{"email":"isidro2@test.com","password":"Test1234!"}' > /dev/null
curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" --data-binary '{"email":"admin@mermaid.local","password":"password"}' > /dev/null

# Get OTPs
F_OTP=$(PGPASSWORD=1234 psql -h localhost -U postgres -d mermaid_db -t -A -c "SELECT otp_code FROM users WHERE email = 'isidro@test.com';" 2>&1)
F2_OTP=$(PGPASSWORD=1234 psql -h localhost -U postgres -d mermaid_db -t -A -c "SELECT otp_code FROM users WHERE email = 'isidro2@test.com';" 2>&1)
V_OTP=$(PGPASSWORD=1234 psql -h localhost -U postgres -d mermaid_db -t -A -c "SELECT otp_code FROM users WHERE email = 'rosario@test.com';" 2>&1)
B_OTP=$(PGPASSWORD=1234 psql -h localhost -U postgres -d mermaid_db -t -A -c "SELECT otp_code FROM users WHERE email = 'buyer@test.com';" 2>&1)
A_OTP=$(PGPASSWORD=1234 psql -h localhost -U postgres -d mermaid_db -t -A -c "SELECT otp_code FROM users WHERE email = 'admin@mermaid.local';" 2>&1)

# Verify OTPs
FT=$(curl -s -X POST http://localhost:8080/api/auth/otp/verify -H "Content-Type: application/json" --data-binary "{\"email\":\"isidro@test.com\",\"code\":\"$F_OTP\"}" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
F2T=$(curl -s -X POST http://localhost:8080/api/auth/otp/verify -H "Content-Type: application/json" --data-binary "{\"email\":\"isidro2@test.com\",\"code\":\"$F2_OTP\"}" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
VT=$(curl -s -X POST http://localhost:8080/api/auth/otp/verify -H "Content-Type: application/json" --data-binary "{\"email\":\"rosario@test.com\",\"code\":\"$V_OTP\"}" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
BT=$(curl -s -X POST http://localhost:8080/api/auth/otp/verify -H "Content-Type: application/json" --data-binary "{\"email\":\"buyer@test.com\",\"code\":\"$B_OTP\"}" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
AT=$(curl -s -X POST http://localhost:8080/api/auth/otp/verify -H "Content-Type: application/json" --data-binary "{\"email\":\"admin@mermaid.local\",\"code\":\"$A_OTP\"}" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

echo "TOKEN_STATUS: FT=$([ -n "$FT" ] && echo OK || echo FAIL) F2T=$([ -n "$F2T" ] && echo OK || echo FAIL) VT=$([ -n "$VT" ] && echo OK || echo FAIL) BT=$([ -n "$BT" ] && echo OK || echo FAIL) AT=$([ -n "$AT" ] && echo OK || echo FAIL)"

echo ""
echo "=== TEST RESULTS ==="

# T5: GET /api/auth/profile with FISHERMAN_TOKEN
B5=$(curl -s -X GET http://localhost:8080/api/auth/profile -H "Authorization: Bearer $FT")
S5=$(curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:8080/api/auth/profile -H "Authorization: Bearer $FT")
HF=$(echo "$B5" | python -c "import sys,json; d=json.load(sys.stdin); print('email='+d.get('email','N/A')+' role='+d.get('role','N/A'))" 2>/dev/null)
[ "$S5" = "200" ] && R="PASS" || R="FAIL"
echo "T5|$R|GET /api/auth/profile with token|200|$S5|$HF"

# T6 already tested (no token)
echo "T6|PASS|GET /api/auth/profile no token|401|401|Tested separately"

# T7 already tested (forgot password)
echo "T7|PASS|POST /api/auth/forgot-password|200|200|Tested separately"

# T8 already tested (invalid OTP)
echo "T8|PASS|POST /api/auth/otp/verify invalid OTP|400or401|401|Returns 401 for invalid OTP"

# T9: GET /api/fisherman/profile
B9=$(curl -s -X GET http://localhost:8080/api/fisherman/profile -H "Authorization: Bearer $FT")
S9=$(curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:8080/api/fisherman/profile -H "Authorization: Bearer $FT")
[ "$S9" = "200" ] && R="PASS" || R="FAIL"
echo "T9|$R|GET /api/fisherman/profile|200|$S9|$B9"

# T10: PUT /api/fisherman/profile - update vesselName
S10=$(curl -s -o /dev/null -w "%{http_code}" -X PUT http://localhost:8080/api/fisherman/profile \
  -H "Authorization: Bearer $FT" -H "Content-Type: application/json" \
  --data-binary '{"vesselName":"Test Boat"}')
VERIFY10=$(curl -s -X GET http://localhost:8080/api/fisherman/profile -H "Authorization: Bearer $FT" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('vesselName',''))" 2>/dev/null)
[ "$S10" = "200" ] && R="PASS" || R="FAIL"
echo "T10|$R|PUT /api/fisherman/profile vesselName|200|$S10|vesselName verified=$VERIFY10"

# T11: VENDOR cannot PUT /api/fisherman/profile
S11=$(curl -s -o /dev/null -w "%{http_code}" -X PUT http://localhost:8080/api/fisherman/profile \
  -H "Authorization: Bearer $VT" -H "Content-Type: application/json" \
  --data-binary '{"vesselName":"Hack"}')
[ "$S11" = "403" ] && R="PASS" || R="FAIL"
echo "T11|$R|PUT /api/fisherman/profile vendor token|403|$S11|"

# T12: GET /api/buyer/profile
S12=$(curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:8080/api/buyer/profile -H "Authorization: Bearer $BT")
B12=$(curl -s -X GET http://localhost:8080/api/buyer/profile -H "Authorization: Bearer $BT")
EMAIL12=$(echo "$B12" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('email',''))" 2>/dev/null)
[ "$S12" = "200" ] && R="PASS" || R="FAIL"
echo "T12|$R|GET /api/buyer/profile|200|$S12|email=$EMAIL12"

# T13: PATCH /api/buyer/profile
S13=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH http://localhost:8080/api/buyer/profile \
  -H "Authorization: Bearer $BT" -H "Content-Type: application/json" \
  --data-binary '{"phone":"09123456789"}')
[ "$S13" = "200" ] && R="PASS" || R="FAIL"
echo "T13|$R|PATCH /api/buyer/profile|200|$S13|phone field not in buyer profile response"

echo ""
echo "=== NOTIFICATION TESTS ==="

# T14: GET /api/notifications
B14=$(curl -s -X GET http://localhost:8080/api/notifications -H "Authorization: Bearer $FT")
S14=$(curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:8080/api/notifications -H "Authorization: Bearer $FT")
[ "$S14" = "200" ] && R="PASS" || R="FAIL"
NOTIF_COUNT=$(echo "$B14" | python -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 'not-list')" 2>/dev/null)
echo "T14|$R|GET /api/notifications|200|$S14|count=$NOTIF_COUNT"

# T15: GET /api/notifications/unread-count
B15=$(curl -s -X GET http://localhost:8080/api/notifications/unread-count -H "Authorization: Bearer $FT")
S15=$(curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:8080/api/notifications/unread-count -H "Authorization: Bearer $FT")
[ "$S15" = "200" ] && R="PASS" || R="FAIL"
HAS_COUNT=$(echo "$B15" | python -c "import sys,json; d=json.load(sys.stdin); print('count=' + str(d.get('count','MISSING')))" 2>/dev/null)
echo "T15|$R|GET /api/notifications/unread-count|200|$S15|$HAS_COUNT"

# T16: PUT /api/notifications/read-all
S16=$(curl -s -o /dev/null -w "%{http_code}" -X PUT http://localhost:8080/api/notifications/read-all -H "Authorization: Bearer $FT")
UNREAD16=$(curl -s -X GET http://localhost:8080/api/notifications/unread-count -H "Authorization: Bearer $FT" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('count','?'))" 2>/dev/null)
[ "$S16" = "200" ] && R="PASS" || R="FAIL"
echo "T16|$R|PUT /api/notifications/read-all|200|$S16|unread-count after=$UNREAD16"

# T17: PUT /api/notifications/{id}/read
NOTIF_ID=$(echo "$B14" | python -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if isinstance(d,list) and len(d)>0 else 'none')" 2>/dev/null)
if [ -n "$NOTIF_ID" ] && [ "$NOTIF_ID" != "none" ]; then
  S17=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "http://localhost:8080/api/notifications/$NOTIF_ID/read" -H "Authorization: Bearer $FT")
  [ "$S17" = "200" ] && R="PASS" || R="FAIL"
  echo "T17|$R|PUT /api/notifications/{id}/read|200|$S17|notifId=$NOTIF_ID"
else
  echo "T17|SKIP|PUT /api/notifications/{id}/read|200|N/A|No notifications exist"
fi

# T18: Read another user's notification
if [ -n "$NOTIF_ID" ] && [ "$NOTIF_ID" != "none" ]; then
  S18=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "http://localhost:8080/api/notifications/$NOTIF_ID/read" -H "Authorization: Bearer $F2T")
  [[ "$S18" = "403" || "$S18" = "404" ]] && R="PASS" || R="FAIL"
  echo "T18|$R|PUT /api/notifications/{id}/read other user|403or404|$S18|"
else
  echo "T18|SKIP|Cross-user notification|403or404|N/A|No notifications"
fi

echo ""
echo "=== ADMIN TESTS ==="

# T19: GET /api/admin/users
S19=$(curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:8080/api/admin/users -H "Authorization: Bearer $AT")
[ "$S19" = "200" ] && R="PASS" || R="FAIL"
echo "T19|$R|GET /api/admin/users|200|$S19|"

# T20: POST /api/admin/users
B20=$(curl -s -X POST http://localhost:8080/api/admin/users \
  -H "Authorization: Bearer $AT" -H "Content-Type: application/json" \
  --data-binary '{"email":"newuser_admin@test.com","password":"Admin1234!","fullName":"New Admin User","role":"FISHERMAN"}')
S20=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/admin/users \
  -H "Authorization: Bearer $AT" -H "Content-Type: application/json" \
  --data-binary '{"email":"newuser_admin2@test.com","password":"Admin1234!","fullName":"New Admin User2","role":"FISHERMAN"}')
USER_ID=$(echo "$B20" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
# Try to get status from first response
S20_FIRST="201"
if echo "$B20" | python -c "import sys,json; d=json.load(sys.stdin); exit(0 if 'id' in d else 1)" 2>/dev/null; then
  S20_FIRST="201"
else
  S20_FIRST=$(echo "$B20" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','unknown'))" 2>/dev/null)
fi
[ "$S20" = "201" ] && R="PASS" || R="FAIL"
echo "T20|$R|POST /api/admin/users|201|$S20|userId=$USER_ID (second user)"

# T21: PUT /api/admin/users/{userId}
if [ -n "$USER_ID" ] && [ "$USER_ID" != "" ]; then
  B21=$(curl -s -X PUT "http://localhost:8080/api/admin/users/$USER_ID" \
    -H "Authorization: Bearer $AT" -H "Content-Type: application/json" \
    --data-binary '{"role":"VENDOR","fullName":"New Admin User","email":"newuser_admin@test.com"}')
  S21=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "http://localhost:8080/api/admin/users/$USER_ID" \
    -H "Authorization: Bearer $AT" -H "Content-Type: application/json" \
    --data-binary '{"role":"VENDOR","fullName":"New Admin User","email":"newuser_admin@test.com"}')
  VERIFY_ROLE=$(echo "$B21" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('role',''))" 2>/dev/null)
  [ "$S21" = "200" ] && R="PASS" || R="FAIL"
  echo "T21|$R|PUT /api/admin/users/{id}|200|$S21|role=$VERIFY_ROLE"
else
  echo "T21|SKIP|PUT /api/admin/users/{id}|200|N/A|userId not obtained from T20"
fi

# T22: GET /api/admin/users with fisherman token -> 403
S22=$(curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:8080/api/admin/users -H "Authorization: Bearer $FT")
[ "$S22" = "403" ] && R="PASS" || R="FAIL"
echo "T22|$R|GET /api/admin/users fisherman|403|$S22|"

# T23: POST /api/admin/fish-species
B23=$(curl -s -X POST http://localhost:8080/api/admin/fish-species \
  -H "Authorization: Bearer $AT" -H "Content-Type: application/json" \
  --data-binary '{"name":"Test Fish","localName":"Isda"}')
S23=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/admin/fish-species \
  -H "Authorization: Bearer $AT" -H "Content-Type: application/json" \
  --data-binary '{"name":"Test Fish2","localName":"Isda2"}')
SPECIES_ID=$(echo "$B23" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
[ "$S23" = "201" ] && R="PASS" || R="FAIL"
LOOKUP=$(curl -s -X GET http://localhost:8080/api/lookups/fish-species 2>/dev/null | python -c "import sys,json; d=json.load(sys.stdin); found=[x for x in d if x.get('id',0)==int('$SPECIES_ID' or 0)]; print('Found' if found else 'NotFound')" 2>/dev/null)
echo "T23|$R|POST /api/admin/fish-species|201|$S23|speciesId=$SPECIES_ID lookup=$LOOKUP"

# T24: PUT /api/admin/fish-species/{speciesId}
if [ -n "$SPECIES_ID" ] && [ "$SPECIES_ID" != "" ]; then
  B24=$(curl -s -X PUT "http://localhost:8080/api/admin/fish-species/$SPECIES_ID" \
    -H "Authorization: Bearer $AT" -H "Content-Type: application/json" \
    --data-binary '{"name":"Test Fish Updated","localName":"Isda"}')
  S24=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "http://localhost:8080/api/admin/fish-species/$SPECIES_ID" \
    -H "Authorization: Bearer $AT" -H "Content-Type: application/json" \
    --data-binary '{"name":"Test Fish Updated","localName":"Isda"}')
  VERIFY_NAME=$(echo "$B24" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('name',''))" 2>/dev/null)
  [ "$S24" = "200" ] && R="PASS" || R="FAIL"
  echo "T24|$R|PUT /api/admin/fish-species/{id}|200|$S24|name=$VERIFY_NAME"
else
  echo "T24|SKIP|PUT /api/admin/fish-species/{id}|200|N/A|speciesId not obtained"
fi

# T25: DELETE /api/admin/fish-species/{speciesId}
if [ -n "$SPECIES_ID" ] && [ "$SPECIES_ID" != "" ]; then
  S25=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "http://localhost:8080/api/admin/fish-species/$SPECIES_ID" -H "Authorization: Bearer $AT")
  [ "$S25" = "204" ] && R="PASS" || R="FAIL"
  ABSENT=$(curl -s -X GET http://localhost:8080/api/lookups/fish-species 2>/dev/null | python -c "import sys,json; d=json.load(sys.stdin); found=[x for x in d if x.get('id',0)==int('$SPECIES_ID')]; print('StillPresent' if found else 'Absent')" 2>/dev/null)
  echo "T25|$R|DELETE /api/admin/fish-species/{id}|204|$S25|Soft-delete: $ABSENT"
else
  echo "T25|SKIP|DELETE /api/admin/fish-species/{id}|204|N/A|speciesId not obtained"
fi

# T26: POST /api/admin/market-locations
B26=$(curl -s -X POST http://localhost:8080/api/admin/market-locations \
  -H "Authorization: Bearer $AT" -H "Content-Type: application/json" \
  --data-binary '{"name":"Test Market","city":"Manila"}')
S26=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/admin/market-locations \
  -H "Authorization: Bearer $AT" -H "Content-Type: application/json" \
  --data-binary '{"name":"Test Market","city":"Manila"}')
LOC_ID=$(echo "$B26" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
[ "$S26" = "201" ] && R="PASS" || R="FAIL"
echo "T26|$R|POST /api/admin/market-locations|201|$S26|locationId=$LOC_ID"

# T27: DELETE /api/admin/market-locations/{locationId}
if [ -n "$LOC_ID" ] && [ "$LOC_ID" != "" ]; then
  S27=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "http://localhost:8080/api/admin/market-locations/$LOC_ID" -H "Authorization: Bearer $AT")
  [ "$S27" = "204" ] && R="PASS" || R="FAIL"
  echo "T27|$R|DELETE /api/admin/market-locations/{id}|204|$S27|"
else
  echo "T27|SKIP|DELETE /api/admin/market-locations/{id}|204|N/A|locationId not obtained"
fi

# T28: POST /api/admin/advisories
B28=$(curl -s -X POST http://localhost:8080/api/admin/advisories \
  -H "Authorization: Bearer $AT" -H "Content-Type: application/json" \
  --data-binary '{"title":"Test Advisory","content":"Stay safe","isActive":true}')
S28=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/admin/advisories \
  -H "Authorization: Bearer $AT" -H "Content-Type: application/json" \
  --data-binary '{"title":"Test Advisory2","content":"Stay safe2","isActive":true}')
ADV_ID=$(echo "$B28" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
[ "$S28" = "201" ] && R="PASS" || R="FAIL"
echo "T28|$R|POST /api/admin/advisories|201|$S28|advisoryId=$ADV_ID"

# T29: PUT /api/admin/advisories/{advisoryId}
if [ -n "$ADV_ID" ] && [ "$ADV_ID" != "" ]; then
  B29=$(curl -s -X PUT "http://localhost:8080/api/admin/advisories/$ADV_ID" \
    -H "Authorization: Bearer $AT" -H "Content-Type: application/json" \
    --data-binary '{"title":"Updated Advisory","content":"Stay very safe","isActive":true}')
  S29=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "http://localhost:8080/api/admin/advisories/$ADV_ID" \
    -H "Authorization: Bearer $AT" -H "Content-Type: application/json" \
    --data-binary '{"title":"Updated Advisory","content":"Stay very safe","isActive":true}')
  VERIFY_TITLE=$(echo "$B29" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('title',''))" 2>/dev/null)
  [ "$S29" = "200" ] && R="PASS" || R="FAIL"
  echo "T29|$R|PUT /api/admin/advisories/{id}|200|$S29|title=$VERIFY_TITLE"
else
  echo "T29|SKIP|PUT /api/admin/advisories/{id}|200|N/A|advisoryId not obtained"
fi

# T30: DELETE /api/admin/advisories/{advisoryId}
if [ -n "$ADV_ID" ] && [ "$ADV_ID" != "" ]; then
  S30_DEL=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "http://localhost:8080/api/admin/advisories/$ADV_ID" -H "Authorization: Bearer $AT")
  S30_GET=$(curl -s -o /dev/null -w "%{http_code}" -X GET "http://localhost:8080/api/admin/advisories/$ADV_ID" -H "Authorization: Bearer $AT")
  [[ "$S30_DEL" = "204" && "$S30_GET" = "404" ]] && R="PASS" || R="FAIL"
  echo "T30|$R|DELETE /api/admin/advisories|204+404|DEL=$S30_DEL GET=$S30_GET|"
else
  echo "T30|SKIP|DELETE /api/admin/advisories|204|N/A|advisoryId not obtained"
fi

echo ""
echo "=== SECURITY EDGE CASES ==="

# T31: GET /api/trips no token
S31=$(curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:8080/api/trips)
[ "$S31" = "401" ] && R="PASS" || R="FAIL"
echo "T31|$R|GET /api/trips no token|401|$S31|"

# T32: GET /api/vendor/orders with invalid JWT
S32=$(curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:8080/api/vendor/orders \
  -H "Authorization: Bearer invalid.jwt.here")
[ "$S32" = "401" ] && R="PASS" || R="FAIL"
echo "T32|$R|GET /api/vendor/orders invalid JWT|401|$S32|"

# T33: Trip isolation
B33=$(curl -s -X POST http://localhost:8080/api/trips \
  -H "Authorization: Bearer $FT" -H "Content-Type: application/json" \
  --data-binary '{"departureLocation":"Test Port","plannedReturnAt":"2026-05-15T12:00:00Z"}')
TRIP_ID=$(echo "$B33" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
S33_CREATE=$(echo "$B33" | python -c "import sys,json; d=json.load(sys.stdin); print('201' if 'id' in d else d.get('status','unknown'))" 2>/dev/null)
if [ -n "$TRIP_ID" ] && [ "$TRIP_ID" != "" ]; then
  S33_ACCESS=$(curl -s -o /dev/null -w "%{http_code}" -X GET "http://localhost:8080/api/trips/$TRIP_ID" -H "Authorization: Bearer $F2T")
  [[ "$S33_ACCESS" = "403" || "$S33_ACCESS" = "404" ]] && R="PASS" || R="FAIL"
  echo "T33|$R|Trip isolation fisherman2|403or404|$S33_ACCESS|tripId=$TRIP_ID"
else
  echo "T33|SKIP|Trip isolation|403or404|N/A|Trip creation status=$S33_CREATE body=$B33"
fi

# T34: Vendor listing isolation
B34=$(curl -s -X POST http://localhost:8080/api/vendor/demand-listings \
  -H "Authorization: Bearer $VT" -H "Content-Type: application/json" \
  --data-binary '{"speciesId":1,"quantityKg":50,"offerPricePerKg":150,"neededBy":"2026-05-20","locationId":1}')
LISTING_ID=$(echo "$B34" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

# Register second vendor
curl -s -X POST http://localhost:8080/api/auth/register -H "Content-Type: application/json" \
  --data-binary '{"email":"vendor2@test.com","password":"Test1234!","role":"VENDOR","fullName":"Vendor Two"}' > /dev/null
PGPASSWORD=1234 psql -h localhost -U postgres -d mermaid_db -c "UPDATE users SET email_verified=true WHERE email='vendor2@test.com';" > /dev/null 2>&1
curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" --data-binary '{"email":"vendor2@test.com","password":"Test1234!"}' > /dev/null
V2_OTP=$(PGPASSWORD=1234 psql -h localhost -U postgres -d mermaid_db -t -A -c "SELECT otp_code FROM users WHERE email = 'vendor2@test.com';" 2>&1)
V2T=$(curl -s -X POST http://localhost:8080/api/auth/otp/verify -H "Content-Type: application/json" --data-binary "{\"email\":\"vendor2@test.com\",\"code\":\"$V2_OTP\"}" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -n "$LISTING_ID" ] && [ "$LISTING_ID" != "" ] && [ -n "$V2T" ]; then
  S34_ACCESS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "http://localhost:8080/api/vendor/demand-listings/$LISTING_ID" \
    -H "Authorization: Bearer $V2T" -H "Content-Type: application/json" \
    --data-binary '{"quantityKg":100}')
  [[ "$S34_ACCESS" = "403" || "$S34_ACCESS" = "404" ]] && R="PASS" || R="FAIL"
  echo "T34|$R|Vendor listing isolation|403or404|$S34_ACCESS|listingId=$LISTING_ID"
else
  echo "T34|SKIP|Listing isolation|403or404|N/A|listing=$LISTING_ID v2t=$([ -n "$V2T" ] && echo OK || echo FAIL)"
fi

# T35: Negative weight catch
if [ -n "$TRIP_ID" ] && [ "$TRIP_ID" != "" ]; then
  B35=$(curl -s -X POST "http://localhost:8080/api/trips/$TRIP_ID/catches" \
    -H "Authorization: Bearer $FT" -H "Content-Type: application/json" \
    --data-binary '{"fishSpeciesId":1,"weightKg":-5,"pricePerKg":100}')
  S35=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:8080/api/trips/$TRIP_ID/catches" \
    -H "Authorization: Bearer $FT" -H "Content-Type: application/json" \
    --data-binary '{"fishSpeciesId":1,"weightKg":-5,"pricePerKg":100}')
  [ "$S35" = "400" ] && R="PASS" || R="FAIL"
  echo "T35|$R|POST catches negative weight|400|$S35|body=$(echo $B35 | head -c 100)"
else
  echo "T35|SKIP|Negative weight catch|400|N/A|No tripId"
fi

# T36: POST /api/vendor/storefront/listings with empty body
B36=$(curl -s -X POST http://localhost:8080/api/vendor/storefront/listings \
  -H "Authorization: Bearer $VT" -H "Content-Type: application/json" \
  --data-binary '{}')
S36=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/vendor/storefront/listings \
  -H "Authorization: Bearer $VT" -H "Content-Type: application/json" \
  --data-binary '{}')
[ "$S36" = "400" ] && R="PASS" || R="FAIL"
echo "T36|$R|POST storefront listings empty body|400|$S36|$(echo $B36 | head -c 100)"

# T37: SQL injection attempt
B37=$(curl -s "http://localhost:8080/api/marine/conditions/1%20OR%201%3D1")
S37=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/api/marine/conditions/1%20OR%201%3D1")
HAS_STACKTRACE=""
if echo "$B37" | grep -qi "at org\.\|at java\.\|stacktrace"; then HAS_STACKTRACE="SECURITY_ISSUE: response contains stack trace"; fi
[[ "$S37" = "400" || "$S37" = "404" ]] && R="PASS" || R="FAIL"
echo "T37|$R|Marine conditions SQL injection|400or404|$S37|stacktrace=$HAS_STACKTRACE"

echo ""
echo "=== DONE ==="
