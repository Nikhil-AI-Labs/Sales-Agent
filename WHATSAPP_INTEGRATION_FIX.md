# 🔧 WhatsApp Integration Fix - Complete Guide

## 📋 Overview

This guide fixes the WhatsApp customer chat integration by exposing your localhost backend to the internet using Cloudflare Tunnel, allowing ChakraHQ webhooks to reach your application.

---

## 🚨 The Problem

**Root Cause:** ChakraHQ cannot send webhooks to `http://localhost:3000/api/webhook/customer` because:
- Localhost is only accessible on your machine
- ChakraHQ servers are external and need a public URL
- Without webhooks, customer messages never reach your backend
- Without backend receiving messages, Ravi AI cannot respond

**What We Need:** A public HTTPS URL that forwards to your localhost:3000

---

## ✅ The Solution

**Cloudflare Tunnel** - A free tool that creates a secure tunnel from the internet to your localhost.

### What's Been Created for You:

1. ✅ **Debug API Endpoint** (`/api/debug/webhooks`)
   - Shows all webhook events received
   - Lists all customers and their messages
   - Displays agent state and configuration
   - Real-time monitoring

2. ✅ **Visual Debug Dashboard** (`http://localhost:3000/debug`)
   - Beautiful UI for monitoring webhooks
   - Live customer list
   - Recent messages
   - Agent status
   - Auto-refreshes every 5 seconds

3. ✅ **Startup Script** (`start-with-tunnel.bat`)
   - Automatically starts Next.js dev server
   - Starts Cloudflare tunnel
   - Shows your public URL clearly

4. ✅ **Test Script** (`test-webhook-local.bat`)
   - Tests all endpoints locally
   - Verifies setup before going live

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Cloudflared

**Option A - Using winget (Easiest):**
```powershell
winget install --id Cloudflare.cloudflared
```

**Option B - Manual Download:**
1. Go to: https://github.com/cloudflare/cloudflared/releases
2. Download: `cloudflared-windows-amd64.exe`
3. Rename to: `cloudflared.exe`
4. Move to: `C:\Windows\System32` (or any folder in PATH)

**Verify:**
```powershell
cloudflared --version
```

### Step 2: Start Everything

```powershell
cd c:\Users\Nikhil1616\Desktop\Sales_Agent\SALES_AGENT\anjani-ai-sales-os
.\start-with-tunnel.bat
```

**You'll see:**
```
Starting Next.js dev server on port 3000...
Starting Cloudflare tunnel...

Your quick Tunnel has been created! Visit it at:
https://abc-xyz-123.trycloudflare.com
```

**Copy this HTTPS URL!** ⬆️ You'll need it in the next step.

### Step 3: Configure ChakraHQ

1. **Open ChakraHQ Dashboard** (wherever they provide webhook config)

2. **Set these webhook URLs:**
   ```
   Customer Webhook: https://YOUR-TUNNEL-URL/api/webhook/customer
   Owner Webhook:    https://YOUR-TUNNEL-URL/api/webhook/owner
   ```

3. **Set Webhook Secret:** (from your `.env.local` file)
   - Look for `WEBHOOK_SECRET=your_secret_here`
   - Copy that value

4. **Save** the configuration

### Step 4: Test It!

**4.1 - Open Debug Dashboard:**
```
http://localhost:3000/debug
```

You should see:
- ✅ Environment Configuration (all green)
- ✅ Agent State (Ravi Enabled, etc.)
- Empty customers list (normal at first)

**4.2 - Send Test WhatsApp:**
- From phone: **919455281616** (your number)
- To: **+1 (555) 951-8329** (ChakraHQ business number)
- Message: "Hi, I need 18 inch bags"

**4.3 - Watch Debug Dashboard:**

Within seconds, you should see:
- ✅ New webhook event appears
- ✅ New customer (919455281616) in customer list
- ✅ Your message in recent messages
- ✅ Ravi's response message
- ✅ Ravi processes the message

**4.4 - Check WhatsApp:**
- You should receive Ravi AI's response!

**4.5 - Check Frontend:**
```
http://localhost:3000
```
- Click "Chats" in sidebar
- See your customer in the list
- Click to view conversation

---

## 🎯 System Overview

### Architecture Flow

```
WhatsApp Message
    ↓
ChakraHQ Server
    ↓
[Cloudflare Tunnel] → https://xyz.trycloudflare.com
    ↓
[Your Localhost] → http://localhost:3000
    ↓
/api/webhook/customer
    ↓
1. Saves to Database (SQLite)
2. Logs to message-log.json
3. Triggers Ravi AI
    ↓
Ravi AI (Sarvam + Your Prompts)
    ↓
Sends Reply via ChakraHQ API
    ↓
Customer receives WhatsApp reply
```

### Key Files

**Backend:**
- `/app/api/webhook/customer/route.ts` - Receives ChakraHQ webhooks
- `/app/api/webhook/owner/route.ts` - Receives owner messages
- `/app/api/debug/webhooks/route.ts` - Debug endpoint
- `/app/api/customers/route.ts` - Customer list API
- `/app/api/customers/chat/route.ts` - Chat messages API
- `/lib/server/webhook.ts` - Webhook processing logic
- `/lib/server/ravi-agent.ts` - Ravi AI logic

**Frontend:**
- `/app/page.tsx` - Main dashboard with customer list
- `/app/debug/page.tsx` - Debug monitoring dashboard

**Data:**
- `/data/sales_agent.db` - SQLite database
- `/data/runtime/message-log.json` - Webhook event log
- `/data/runtime/agent-state.json` - Agent runtime state

**Scripts:**
- `start-with-tunnel.bat` - Start everything
- `test-webhook-local.bat` - Test endpoints

---

## 🔍 Monitoring & Debugging

### Debug Dashboard (Recommended)
```
http://localhost:3000/debug
```

**Features:**
- 🟢 Real-time status indicators
- 📊 Customer list with message counts
- 💬 Recent messages from all customers
- 📝 Webhook event log with payloads
- ⚙️ Agent state (Ravi enabled, auto-reply, etc.)
- 🔄 Auto-refresh every 5 seconds

### Debug API Endpoint
```
https://YOUR-TUNNEL-URL/api/debug/webhooks
```

Returns JSON with:
```json
{
  "ok": true,
  "debug": {
    "webhookLog": [...],
    "customers": [...],
    "recentMessages": [...],
    "agentState": {...},
    "environment": {...},
    "timestamp": "2026-06-01T12:00:00.000Z"
  }
}
```

### Check Raw Files

**Message Log:**
```powershell
type data\runtime\message-log.json
```

**Agent State:**
```powershell
type data\runtime\agent-state.json
```

**Database Query:**
```powershell
sqlite3 data\sales_agent.db "SELECT * FROM customers;"
sqlite3 data\sales_agent.db "SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT 10;"
```

---

## ⚙️ Configuration

### Enable All Agent Features

In the frontend at `http://localhost:3000`:

1. Look at the sidebar **"Runtime"** section
2. Enable all switches:
   - ✅ Agent
   - ✅ Ravi standby
   - ✅ Auto reply
   - ✅ Sales mode (optional)

Or use the API:
```powershell
curl -X POST http://localhost:3000/api/agent/state `
  -H "Content-Type: application/json" `
  -d '{
    "agentEnabled": true,
    "raviEnabled": true,
    "autoSendRaviReplies": true,
    "outboundSalesEnabled": true
  }'
```

### Environment Variables

Check your `.env.local`:
```ini
# ChakraHQ
CHAKRA_API_KEY=your_api_key
CHAKRA_BUSINESS_NUMBER=15559518329  # +1 (555) 951-8329
CHAKRA_API_VERSION=v1

# Sarvam AI
SARVAM_API_KEY=your_sarvam_key

# Owner
OWNER_PHONE=919455281616

# Security
WEBHOOK_SECRET=your_webhook_secret
```

All values should be set. The debug dashboard shows which are configured.

---

## 🐛 Troubleshooting

### Issue: "cloudflared not found"

**Solution:**
1. Install using winget: `winget install --id Cloudflare.cloudflared`
2. Close and reopen PowerShell
3. Verify: `cloudflared --version`
4. If still not found, manually download and add to PATH

---

### Issue: Tunnel starts but webhooks not received

**Check:**
1. ✅ Tunnel URL is correct in ChakraHQ dashboard
2. ✅ URL ends with `/api/webhook/customer` (no trailing slash)
3. ✅ Webhook secret matches `.env.local`
4. ✅ Tunnel is still running (don't close the window)

**Test:**
```powershell
# From another terminal
curl https://YOUR-TUNNEL-URL/api/webhook/customer?hub.challenge=test
```

Should return: `test`

---

### Issue: Webhooks received but customer not appearing

**Check Debug Dashboard:**
1. Go to `http://localhost:3000/debug`
2. Look at "Webhook Events" - do you see `customer_inbound`?
3. Look at "Customers" - is the phone number there?

**Check Database:**
```powershell
sqlite3 data\sales_agent.db "SELECT * FROM customers WHERE phone = '919455281616';"
```

**Check Frontend API:**
```
http://localhost:3000/api/customers
```

Should return JSON with customers array.

---

### Issue: Customer appears but Ravi doesn't respond

**Check Agent State in Debug Dashboard:**
- ✅ Agent Enabled: Should be green
- ✅ Ravi Enabled: Should be green
- ✅ Auto Send Replies: Should be green

**Check Webhook Log for:**
- `ravi_processed` events (means Ravi ran)
- `ravi_skipped_disabled` events (means Ravi is off)

**Check Environment:**
- ✅ ChakraHQ API: Should be green
- ✅ Sarvam AI: Should be green

**Manual Test:**
```powershell
curl -X POST http://localhost:3000/api/agent/state `
  -H "Content-Type: application/json" `
  -d '{"raviEnabled": true, "autoSendRaviReplies": true}'
```

---

### Issue: Tunnel URL changes every restart

**This is normal for free tunnels!**

Each time you run `start-with-tunnel.bat`, you get a new random URL.

**Solutions:**

**Option A - Update ChakraHQ each time:**
1. Copy new tunnel URL
2. Update ChakraHQ webhook config
3. Takes 30 seconds

**Option B - Use persistent tunnel (requires Cloudflare account):**
```powershell
# One-time setup
cloudflared tunnel login
cloudflared tunnel create anjani-sales
cloudflared tunnel route dns anjani-sales anjani-sales.yourdomain.com
cloudflared tunnel run anjani-sales
```

This gives you a permanent URL that never changes.

---

### Issue: Port 3000 already in use

**Find what's using it:**
```powershell
netstat -ano | findstr :3000
```

**Kill the process:**
```powershell
taskkill /PID <PID_NUMBER> /F
```

Or change the port in `package.json`:
```json
{
  "scripts": {
    "dev": "next dev -p 3001"
  }
}
```

Then update the tunnel:
```powershell
cloudflared tunnel --url http://localhost:3001
```

---

## 📊 Testing Checklist

### ✅ Basic Connectivity

- [ ] `cloudflared --version` works
- [ ] `npm run dev` starts without errors
- [ ] `start-with-tunnel.bat` shows tunnel URL
- [ ] Can access `http://localhost:3000`
- [ ] Can access `http://localhost:3000/debug`

### ✅ Webhook Configuration

- [ ] ChakraHQ has correct customer webhook URL
- [ ] ChakraHQ has correct owner webhook URL
- [ ] Webhook secret matches `.env.local`
- [ ] Test challenge works: `curl https://YOUR-TUNNEL-URL/api/webhook/customer?hub.challenge=test`

### ✅ Environment

- [ ] Debug dashboard shows ChakraHQ: Configured ✅
- [ ] Debug dashboard shows Sarvam AI: Configured ✅
- [ ] Debug dashboard shows Owner Phone: Set ✅
- [ ] Debug dashboard shows Webhook Secret: Set ✅

### ✅ Agent State

- [ ] Agent Enabled: ✅
- [ ] Ravi Enabled: ✅
- [ ] Auto Send Replies: ✅
- [ ] Sales mode: ✅ (optional)

### ✅ Message Flow

- [ ] Send WhatsApp from 919455281616 to +1 (555) 951-8329
- [ ] Webhook event appears in debug dashboard
- [ ] Customer appears in customers list
- [ ] Message appears in recent messages
- [ ] `ravi_processed` event appears in webhook log
- [ ] Ravi's response appears in messages
- [ ] WhatsApp reply received on phone

### ✅ Frontend

- [ ] Customer appears in sidebar customer list
- [ ] Can click customer to view chat
- [ ] Messages display correctly
- [ ] Can send owner notes from frontend

---

## 🎓 Understanding the Flow

### 1. Customer Sends WhatsApp
- Phone: 919455281616
- To: +1 (555) 951-8329
- Message: "Hi, I need bags"

### 2. ChakraHQ Receives
- ChakraHQ WhatsApp Business API receives the message
- Looks up webhook URL for your account
- Sends POST request to: `https://your-tunnel.trycloudflare.com/api/webhook/customer`

### 3. Tunnel Forwards
- Cloudflare tunnel receives HTTPS request
- Forwards to localhost: `http://localhost:3000/api/webhook/customer`

### 4. Backend Processes
```typescript
// /app/api/webhook/customer/route.ts
1. Receives webhook payload
2. Verifies signature (security)
3. Calls handleCustomerInbound()
4. Extracts phone, name, message
5. Creates/updates customer in database
6. Saves message to chat_messages table
7. Logs event to message-log.json
8. Checks if Ravi is enabled
9. If yes, calls Ravi AI
```

### 5. Ravi AI Processes
```typescript
// /lib/server/ravi-agent.ts
1. Loads customer context
2. Loads conversation history
3. Loads knowledge base
4. Calls Sarvam AI with system prompt
5. Gets AI response
6. Saves response to database
7. If autoSendRaviReplies is ON, sends via ChakraHQ API
8. Logs the result
```

### 6. Reply Sent
- Ravi's response goes to ChakraHQ API
- ChakraHQ sends WhatsApp message
- Customer receives reply

### 7. Frontend Updates
- Customer list query runs every 6 seconds
- Fetches `/api/customers` - sees new customer
- Displays in sidebar
- When clicked, fetches `/api/customers/chat?customerId=X`
- Shows full conversation

---

## 🔐 Security Notes

### Webhook Signature Verification
The backend verifies every webhook using HMAC-SHA256:
```typescript
const signature = request.headers.get("x-chakra-signature-256");
// Verifies payload matches signature
```

This prevents fake webhooks from unauthorized sources.

### Environment Variables
Keep your `.env.local` secure:
- Never commit to git (.gitignore should exclude it)
- Never share API keys
- Use different secrets for dev/production

### Tunnel Security
Cloudflare tunnels are secure:
- Traffic is encrypted (HTTPS)
- Only forwards to your specified localhost port
- You control what's exposed

---

## 📚 Additional Resources

### Files You Should Know

**For Customizing Ravi:**
- `/lib/server/prompts.ts` - Ravi's personality and instructions
- `/lib/server/ravi-agent.ts` - Ravi's logic

**For Customizing UI:**
- `/app/page.tsx` - Main dashboard
- `/components/ui/` - UI components

**For API Changes:**
- `/app/api/` - All API routes

### Useful Commands

**Start development:**
```powershell
.\start-with-tunnel.bat
```

**Test locally:**
```powershell
.\test-webhook-local.bat
```

**Check logs:**
```powershell
type dev-server.log
type dev-server.err.log
```

**View database:**
```powershell
sqlite3 data\sales_agent.db
.tables
SELECT * FROM customers;
SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT 10;
.exit
```

**Reset everything:**
```powershell
# Stop server (Ctrl+C in terminal)
Remove-Item data\sales_agent.db
Remove-Item data\runtime\message-log.json
npm run dev  # Recreates fresh database
```

---

## ✨ What's Next?

Once you have messages flowing:

1. **Test different scenarios:**
   - Price inquiries
   - Product specifications
   - Order placement
   - Delivery questions

2. **Monitor Ravi's responses:**
   - Check if they're accurate
   - Adjust prompts if needed
   - Add to knowledge base

3. **Use owner mode:**
   - Send owner notes from frontend
   - Guide Ravi's responses
   - Test escalation flow

4. **Scale up:**
   - Share business number with real customers
   - Monitor in debug dashboard
   - Review conversations regularly

---

## 🆘 Still Having Issues?

**Quick Diagnostics:**

1. **Open Debug Dashboard:** `http://localhost:3000/debug`
2. **Check all status indicators** - what's red?
3. **Send test message** - does it appear in webhook log?
4. **Check Recent Messages** - are messages being saved?
5. **Check Agent State** - are all flags green?

**Common Fixes:**

- **Nothing works:** Restart `start-with-tunnel.bat`
- **Tunnel works, webhooks don't:** Check ChakraHQ URL config
- **Webhooks work, Ravi doesn't:** Check agent state switches
- **Ravi responds but doesn't send:** Enable "Auto reply" switch

**Debug Steps:**

1. Visit `http://localhost:3000/debug`
2. Take screenshot of all sections
3. Send test WhatsApp message
4. Refresh debug page
5. See what changed (or didn't)
6. Check the webhook log section for errors

---

## 🎉 Success!

When everything works, you should see:

✅ Tunnel running with HTTPS URL
✅ ChakraHQ webhooks configured
✅ Debug dashboard showing green indicators
✅ Customer appears after sending WhatsApp
✅ Ravi processes message automatically
✅ Reply sent via WhatsApp
✅ Conversation visible in frontend
✅ Owner can monitor and intervene

**You now have a fully functional WhatsApp AI sales agent! 🚀**

---

## 📞 Quick Reference

| Item | Value |
|------|-------|
| **ChakraHQ Business Number** | +1 (555) 951-8329 |
| **Test/Owner Phone** | 919455281616 |
| **Local Frontend** | http://localhost:3000 |
| **Debug Dashboard** | http://localhost:3000/debug |
| **Customer Webhook** | `https://YOUR-TUNNEL-URL/api/webhook/customer` |
| **Owner Webhook** | `https://YOUR-TUNNEL-URL/api/webhook/owner` |
| **Debug API** | `https://YOUR-TUNNEL-URL/api/debug/webhooks` |
| **Database** | `data/sales_agent.db` |
| **Message Log** | `data/runtime/message-log.json` |
| **Agent State** | `data/runtime/agent-state.json` |
| **Start Script** | `.\start-with-tunnel.bat` |

---

**Good luck! 🍀**
