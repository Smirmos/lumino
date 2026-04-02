#!/bin/bash
# Lumino AI — Production End-to-End Test
# Usage: ./scripts/production-e2e-test.sh <nestjs-url> <dashboard-url>

NESTJS_URL=${1:-""}
DASHBOARD_URL=${2:-""}

if [ -z "$NESTJS_URL" ] || [ -z "$DASHBOARD_URL" ]; then
  echo "Usage: $0 <nestjs-url> <dashboard-url>"
  echo "Example: $0 https://lumino-production-9339.up.railway.app https://lumino-dashboard-production.up.railway.app"
  exit 1
fi

PASS=0
FAIL=0
RESULTS=()

check() {
  local name="$1"
  local result="$2"
  if [ "$result" = "pass" ]; then
    RESULTS+=("  [PASS] $name")
    PASS=$((PASS + 1))
  else
    RESULTS+=("  [FAIL] $name: $result")
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "Lumino AI Production E2E Test"
echo "NestJS:    $NESTJS_URL"
echo "Dashboard: $DASHBOARD_URL"
echo ""

# 1. NestJS health
status=$(curl -s -o /dev/null -w "%{http_code}" "$NESTJS_URL/health")
[ "$status" = "200" ] && check "NestJS /health returns 200" "pass" || check "NestJS /health" "got $status"

# 2. NestJS health body — service alive
body=$(curl -s "$NESTJS_URL/health")
echo "$body" | grep -q '"status"' && check "NestJS health body valid" "pass" || check "NestJS health body" "unexpected: $body"

# 3. WhatsApp webhook reachable
wa_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$NESTJS_URL/webhooks/whatsapp" -H "Content-Type: application/json" -d '{}')
[ "$wa_status" = "200" ] && check "WhatsApp webhook endpoint reachable" "pass" || check "WhatsApp webhook" "got $wa_status"

# 4. Dashboard login page loads
dash_status=$(curl -s -o /dev/null -w "%{http_code}" "$DASHBOARD_URL/login")
[ "$dash_status" = "200" ] && check "Dashboard /login page accessible" "pass" || check "Dashboard /login" "got $dash_status"

# 5. Dashboard API requires auth
api_status=$(curl -s -o /dev/null -w "%{http_code}" "$DASHBOARD_URL/api/conversations")
[ "$api_status" = "401" ] && check "API /api/conversations requires auth (401)" "pass" || check "API auth protection" "got $api_status (expected 401)"

# 6. Unauthenticated /dashboard redirects to /login
redir=$(curl -s -o /dev/null -w "%{redirect_url}" "$DASHBOARD_URL/dashboard")
echo "$redir" | grep -q "login" && check "Unauthenticated /dashboard redirects to /login" "pass" || check "Dashboard redirect" "redirect to: $redir"

# 7. Dashboard API stats returns 401 (not 500)
stats_status=$(curl -s -o /dev/null -w "%{http_code}" "$DASHBOARD_URL/api/dashboard/stats")
[ "$stats_status" = "401" ] && check "API /api/dashboard/stats returns 401 (not 500)" "pass" || check "API stats auth" "got $stats_status (expected 401)"

# Print results
echo ""
echo "----------------------------------------------------"
for r in "${RESULTS[@]}"; do echo "$r"; done
echo "----------------------------------------------------"
echo "Results: $PASS passed, $FAIL failed"
echo ""
if [ $FAIL -eq 0 ]; then
  echo "ALL CHECKS PASSED — Production is healthy!"
else
  echo "$FAIL checks failed — see above"
fi
echo ""
