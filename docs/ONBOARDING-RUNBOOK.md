# Lumino AI — Client Onboarding Runbook

## Prerequisites
- Railway NestJS service running and healthy
- Access to Railway Postgres + Redis
- Meta Developer App with WhatsApp Cloud API (for WhatsApp)

## New Client Setup — WhatsApp (Meta Cloud API)

### 1. Create client_configs row
```bash
DATABASE_URL='[railway-postgres-url]' \
WA_PHONE_NUMBER_ID='[from Meta API Setup]' \
TEST_BUSINESS_NAME='[business name]' \
TEST_SERVICES='[list of services with prices]' \
npm run seed:client
```

### 2. Cache routing in Redis
```bash
redis-cli -u '[railway-redis-public-url]' SET phone:[phone_number_id] [client_uuid]
```

### 3. Configure Meta webhook
In Meta Developer Portal → WhatsApp → Configuration:
- Callback URL: `https://lumino-production-9339.up.railway.app/webhooks/whatsapp`
- Verify token: value of `META_VERIFY_TOKEN` env var
- Subscribe to: `messages`

### 4. Set Railway env vars
```
META_ACCESS_TOKEN = [from Meta API Setup → Generate access token]
META_VERIFY_TOKEN = [your chosen verify token]
META_APP_SECRET = [from Meta App Settings → Basic]
ANTHROPIC_API_KEY = [your Anthropic API key]
```

### 5. Run go-live check
```bash
DATABASE_URL='...' REDIS_URL='...' WA_PHONE_NUMBER_ID='...' META_VERIFY_TOKEN='...' \
npm run go-live https://lumino-production-9339.up.railway.app [client-uuid]
```

### 6. Test end-to-end
Send a WhatsApp message to the test number and verify:
- Bot responds in the correct language
- Response contains correct business info
- Conversation appears in Railway Postgres

## Complete New Client Onboarding (Production)

### 1. Create account (5 minutes)
```bash
cd dashboard
DATABASE_URL='postgresql://postgres:pSmWtsyuYcxyjcdILhgfRzOacrdblgqv@hopper.proxy.rlwy.net:53676/railway' \
npx tsx scripts/create-client.ts \
  --email client@business.com \
  --password TempPass2026! \
  --business-name "Business Name" \
  --services "Service A 100, Service B 200" \
  --hours "Sun-Thu 09:00-18:00"
```
Note the Client UUID from output.

### 2. Connect WhatsApp (15 minutes)
In Meta Developer Portal:
- Add their WhatsApp number, get phone_number_id
- Set webhook URL to: `https://lumino-production-9339.up.railway.app/webhooks/whatsapp`

In Railway Redis CLI:
```bash
SET phone:[phone_number_id] [client-uuid]
```

### 3. Verify bot works (5 minutes)
Send a test WhatsApp message to their number.
Expected: Claude reply within 5 seconds.
```bash
./scripts/production-e2e-test.sh \
  https://lumino-production-9339.up.railway.app \
  https://lumino-dashboard-production.up.railway.app
```

### 4. Deliver credentials to client
Send securely (WhatsApp or encrypted email):
- Dashboard URL: https://lumino-dashboard-production.up.railway.app
- Email: [their email]
- Temporary password: [TempPass2026!]
- Attach: CLIENT-ONBOARDING-GUIDE-HE.md (Hebrew clients) or CLIENT-ONBOARDING-GUIDE-EN.md

### 5. Client is live
Bot is active from the moment WhatsApp is connected.
Client can log in, view conversations, and manage settings.

---

## Updating Client Configuration

### Edit business info
```sql
UPDATE client_configs SET services='...' WHERE id='[uuid]';
```
Then invalidate Redis cache:
```bash
redis-cli -u '[redis-url]' DEL config:[client-uuid]
```

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Bot not responding | Check is_active=true, check Redis phone→client mapping |
| Wrong language | Check client_configs.languages field, clear Redis cache |
| No escalation | Test with 'I want a refund', check escalation_keywords |
| Claude timeout | Check ANTHROPIC_API_KEY in Railway, check credit balance |
| Webhook not receiving | Check Meta webhook subscription, verify callback URL |
| "Invalid X-Hub-Signature-256" in logs | META_APP_SECRET doesn't match Meta App Secret |
| "Object with ID 'messages' does not exist" | phoneNumberId not being passed — check code |
| "Credit balance too low" | Add credits at console.anthropic.com |
