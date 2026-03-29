#!/bin/bash
RAILWAY_URL=${1:-"https://lumino-production-9339.up.railway.app"}

echo "Testing liveness endpoint..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/health")
if [ "$response" = "200" ]; then
  echo "  Liveness check passed (200)"
else
  echo "  Liveness check failed (got $response)"
fi

echo ""
echo "Testing readiness endpoint..."
body=$(curl -s "$RAILWAY_URL/health/ready")
ready_status=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])" 2>/dev/null)
db_status=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['services']['database'])" 2>/dev/null)
redis_status=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['services']['redis'])" 2>/dev/null)

if [ "$ready_status" = "ok" ]; then echo "  Readiness: ok"; else echo "  Readiness: DEGRADED"; fi
if [ "$db_status" = "ok" ]; then echo "  Database:  ok"; else echo "  Database:  FAILED"; fi
if [ "$redis_status" = "ok" ]; then echo "  Redis:     ok"; else echo "  Redis:     FAILED"; fi

echo ""
echo "Full response:"
echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
