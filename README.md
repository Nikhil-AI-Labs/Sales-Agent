## Anjani AI Sales OS

This app connects WhatsApp, ChakraHQ, Sarvam, Ravi AI, Guru AI, and the local database.

### How The System Works

1. A customer sends a WhatsApp message to the ChakraHQ business number, for example `+1 (555) 951-8329`.
2. ChakraHQ forwards that inbound message to this Next.js backend webhook.
3. The customer webhook route is:
   `POST /api/webhook/customer`
4. The backend extracts the customer phone number, name, message text, and message id.
5. Ravi checks runtime state:
   - `agentEnabled` must be `true`
   - `raviEnabled` must be `true`
   - `autoSendRaviReplies` must be `true` if you want WhatsApp replies to be sent automatically
6. Ravi stores the customer message in SQLite.
7. Ravi uses Sarvam and the local knowledge base to generate the reply.
8. If the reply can be sent, the backend calls ChakraHQ `/messages` and sends the WhatsApp response back to the customer.
9. If Ravi does not know a critical business fact, it creates a Guru escalation and sends a short holding reply such as: `Haan, main check karke abhi batata hoon.`
10. Guru learns from the owner and stores reusable memory in the knowledge base.

### Required Environment Variables

Set these in `.env.local`:

```env
CHAKRA_API_KEY=...
CHAKRA_PLUGIN_ID=...
CHAKRA_WABA_ID=...
CHAKRA_PHONE_ID=...
CHAKRA_API_VERSION=v22.0

SARVAM_API_KEY=...
SARVAM_MODEL=sarvam-105b

PRODUCTION_TEAM_PHONE=919455281616
DATABASE_URL=sqlite:///data/sales_agent.db
CHAKRA_WEBHOOK_SECRET=
```

`PRODUCTION_TEAM_PHONE` is the owner/team number. It is not the ChakraHQ business number. Customers message the ChakraHQ business number; the owner/team number is used for internal Guru/owner workflows.

### ChakraHQ Webhook Setup

The backend must be publicly reachable by ChakraHQ. A local browser URL like `http://localhost:3000` or a private LAN URL will not work for real WhatsApp webhooks unless ChakraHQ can reach it.

Configure ChakraHQ customer webhook URL:

```text
https://YOUR_PUBLIC_DOMAIN/api/webhook/customer
```

Configure owner webhook URL only if you are routing owner messages separately:

```text
https://YOUR_PUBLIC_DOMAIN/api/webhook/owner
```

For local testing, expose the app with a tunnel such as ngrok or Cloudflare Tunnel, then put the tunnel HTTPS URL in ChakraHQ.

### Runtime Switches

The app stores runtime switches in:

```text
data/runtime/agent-state.json
```

For Ravi to reply automatically to inbound WhatsApp messages, this file should contain:

```json
{
  "agentEnabled": true,
  "raviEnabled": true,
  "outboundSalesEnabled": false,
  "autoSendRaviReplies": true
}
```

`outboundSalesEnabled` only controls manual outbound sales messages. It is intentionally separate from inbound customer replies.

### Debugging No WhatsApp Reply

Check these in order:

1. Open `data/runtime/message-log.json`.
2. If there is no `customer_inbound` entry for your real phone message, ChakraHQ is not reaching this backend. Fix the public webhook URL.
3. If there is `ravi_skipped_disabled`, enable `agentEnabled` and `raviEnabled`.
4. If there is `ravi_processed` but no WhatsApp reply, check for `ravi_whatsapp_send_failed`.
5. If `ravi_whatsapp_send_failed` appears, the issue is in Chakra credentials, phone id, plugin id, or the session message window.
6. If Sarvam fails, check `SARVAM_API_KEY` and `SARVAM_MODEL`.

Useful local endpoints:

```text
GET  /api/test/status
POST /api/test/webhook
GET  /api/agent/state
POST /api/agent/state
```

Example simulated customer webhook:

```json
{
  "type": "customer",
  "phone": "919455281616",
  "name": "Test Customer",
  "text": "What is the price of 24 inch regular bags?"
}
```

Send that to:

```text
POST /api/test/webhook
```

If the simulated webhook works but real WhatsApp does not, the backend code is working and the remaining issue is ChakraHQ webhook delivery or public URL configuration.

The Target is to move from stock to sale to MADE TO ORDER BASIS , the agent has to enquire from the client there requirement across grammage , sizes , color and quantity , also enquire about the seasonal requirement.
FABRIC SALE IS BASICALLY BASED ON THE FOLLOWING PARAMETERS
**Size in inches** ( our preferred are ) =  36 > 35 > 34 upto 24 ( highest production based ) and 22 > 20 > upto 12 ( lowest production , higher in value terms ) (19 Inches includes a Premium of 1₹ per kg)(16' & 17' Inches a premium of 10₹ per kg)(12' & 15' inch premium of 15₹ per kg)
**Grammage ( Highest Denier First )** =  5.0 Gram (1067 denier)  > 4.5 Gram (960 denier) > 4.0 Gram (854 denier) > 3.5 Gram (747 denier) > 3.0 Gram (640 denier), If price of 3.0 gram is x then price for 3.5 gram and 3.25 gram and 3.75 gram remain same also then price of 4.0 gram and 4.25 gram and 4.5 gram and 4.75 gram is (x-1₹) , 5 gram and 5.25 gram and 5.5 gram and 5.75 gram is (x-2₹)
**Quality ( Market Terminologies )** = Janta / Regular / Silver / Gold / Platinum , they are based on strength and elongation of the same for which a seperate sheet has been attached for reference , The Meter weight of the unlaminated and laminated fabric per size per grammage and per qualtiy type is also attached for reference , Client usually asks for meter weight of fabric for both laminated and unlaminated fabric a sheet for reference has been attached ,The unit of measurement is in KG and accordingly the format for BILL GENERATION is attached for reference.For the delivery time we need to cross reference the data from the production detailed page which we already have.
Also the **Fabric is Sold Mainly in white color** and also in different colors as per clients request ( for half white and half coloured cheqeured fabric we charge a premium of 5₹ per kg and for full colored fabric we charge a premium of 7₹ per kg)
The Fabric is also sold **mainly in unlaminated form** and also sold with lamination as per client request and specification ( there are two qualities of lamination mainly regular lamination for which we charge a premium of 2₹ and also natural lamination for which we charge a premium of 5₹ per kg ) 
The Current daily price will be shared by me to the agent and then accordingly it has to proceed further till the time it doesnt know how to compute the prices
There are multiple ways of making the sale to a customer by enquiring different details like **Quality wise** ( same quality type means less inventory , less downtime and increased efficiency ) , **Size Wise** ( where same sizes are sold so to lower inventory ) ,  **Grammage wise** ( heavier denier means higher output ) and **finaly region wise** ( to acoomodate more clients in same region so as to lower the transport cost).
**ALSO THE SALES AGENT HAS TO A FLIPSIDE BACKEND WHICH IS A TRADING AGENT WHICH WILL PROCURE THE SAME ABOVE FROM OTHER MANUFACTURERS AS PER THE CLIENTS REQUIREMENT OF FABRIC ( mandatory condition is to make sure our order book is complete for the next 30 days) , THE IDEA IS TO TAKE STOCK FROM OTHER MANUFACTURERS AND SELL THEM FROM OUR END.**
GENERATE LEADS FROM EXISTING DATA AND INDIA MART AND OTHER SIMILAR PORTALS AS WELL
