# Digital Twin Implementation - Owner's AI Clone

## Vision
Create a digital twin of the owner that talks, thinks, and behaves exactly like him. Customers should NEVER know they're talking to AI.

## Key Principles

### 1. **Ravi = Owner's Digital Presence**
- NOT a chatbot
- NOT an assistant
- IS the owner speaking through WhatsApp
- Uses owner's exact phrases, tone, and style

### 2. **Real-Time Escalation System**
When customer asks about:
- Price → Ravi pauses, asks Guru
- Stock → Ravi pauses, asks Guru
- Delivery → Ravi pauses, asks Guru
- Technical specs → Ravi pauses, asks Guru

Customer sees: "Haan, main check karta hoon" (natural, like owner checking)
Customer NEVER sees: "Let me check the system" (robotic, reveals AI)

### 3. **Guru = Learning & Memory System**
- Learns EVERYTHING from owner
- Stores owner's communication style
- Guides Ravi to talk like owner
- Handles all escalations

## Implementation Status

### ✅ Completed
1. Enhanced system prompts for Ravi and Guru
2. Created `ravi-agent-v2.ts` with escalation detection
3. Escalation types: price, stock, delivery, technical
4. Owner style learning framework

### 🔄 In Progress
1. Connect Ravi V2 to webhook handlers
2. Create Guru API endpoints for UI
3. Implement owner style learning
4. Create escalation dashboard in UI

### ⏳ To Do
1. **Update Webhook Handler** to use Ravi V2
2. **Create Guru Chat API** for UI communication
3. **Implement Owner Learning** - extract style from conversations
4. **Create Escalation UI** - show pending questions for owner
5. **Test Complete Flow** - customer → Ravi → Guru → owner → Guru → Ravi → customer

## How It Works

### Normal Flow (No Escalation)
```
Customer: "Hi, I need 24 inch bags"
↓
Ravi: Detects no critical info needed
↓
Ravi: "Haan bhai, 24 inch bags chahiye? Kya grammage chahiye?"
↓
Customer sees natural conversation
```

### Escalation Flow (Critical Info)
```
Customer: "What's the price for 24 inch Regular?"
↓
Ravi: Detects PRICE query (critical!)
↓
Ravi → Guru: "Need price for 24 inch Regular"
↓
Guru: Checks knowledge base
↓
IF Guru has answer:
  Guru → Ravi: "Price is ₹85/kg, say: 'Haan bhai, 24 inch Regular ka ₹85/kg hai'"
  Ravi → Customer: "Haan bhai, 24 inch Regular ka ₹85/kg hai"
  
IF Guru doesn't have answer:
  Ravi → Customer: "Haan, main check karke batata hoon"
  Guru → Owner (WhatsApp): "Customer asking price for 24 inch Regular"
  Owner → Guru: "₹85/kg hai, customer ko bata do"
  Guru: Learns and stores this
  Guru → Ravi: "Tell customer ₹85/kg in owner's style"
  Ravi → Customer: "Haan bhai, ₹85/kg hai. Order confirm karu?"
```

## Owner Style Learning

### What Guru Learns
1. **Phrases**: "Haan bhai", "Theek hai", "Bilkul", "Ek minute"
2. **Tone**: Casual, friendly, direct
3. **Language Mix**: Hindi-English naturally mixed
4. **Response Pattern**: Short messages, 1-2 questions at a time
5. **Business Knowledge**: Prices, stock, delivery times, specs

### How Guru Learns
```
Owner says: "Bhai, 24 inch Regular ka meter weight 3.2g hai. Customer ko bata dena."

Guru extracts:
- FACT: meter_weight_24inch_regular = 3.2g
- STYLE: Uses "Bhai" casually
- STYLE: Says "bata dena" (just tell them)
- TONE: Direct, no formality

Guru stores:
1. Technical fact in knowledge base
2. Communication style in owner_style table
3. Phrase patterns for Ravi to use
```

## Database Schema Updates Needed

### New Tables

#### escalations
```sql
CREATE TABLE escalations (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  type TEXT NOT NULL, -- price, stock, delivery, technical
  question TEXT NOT NULL,
  customer_context TEXT,
  status TEXT NOT NULL, -- pending, answered, resolved
  guru_answer TEXT,
  owner_input TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

#### owner_style
```sql
CREATE TABLE owner_style (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL, -- phrase, tone, pattern, greeting, closing
  example TEXT NOT NULL,
  context TEXT,
  frequency INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints Needed

### 1. Guru Chat API
```
POST /api/guru/chat
Body: {
  message: string,
  phone: string (owner's phone)
}
Response: {
  reply: string,
  memoryExtracted: boolean,
  escalationResolved: boolean
}
```

### 2. Escalations API
```
GET /api/escalations
Response: {
  pending: Escalation[],
  resolved: Escalation[]
}

POST /api/escalations/:id/resolve
Body: {
  answer: string
}
```

### 3. Owner Style API
```
GET /api/owner-style
Response: {
  phrases: string[],
  tone: string,
  patterns: string[]
}
```

## UI Updates Needed

### 1. Guru Chat Interface (Already exists, needs connection)
- Connect to `/api/guru/chat`
- Show owner's messages
- Show Guru's responses
- Highlight when Guru learns something new

### 2. Escalation Dashboard (New)
- Show pending escalations from Ravi
- Allow owner to answer
- Show customer context
- Mark as resolved when answered

### 3. Customer Chat (Update)
- Show when Ravi is waiting for Guru
- Show "checking..." status naturally
- Never reveal it's AI

## Testing Plan

### Phase 1: Basic Escalation
1. Customer asks price
2. Ravi detects escalation
3. Guru checks knowledge (empty)
4. Ravi sends holding message
5. Owner sees escalation in UI
6. Owner answers
7. Guru learns
8. Ravi responds to customer

### Phase 2: Learned Response
1. Different customer asks same price
2. Ravi detects escalation
3. Guru checks knowledge (found!)
4. Ravi responds immediately in owner's style
5. No owner input needed

### Phase 3: Style Learning
1. Owner teaches Guru multiple times
2. Guru extracts communication patterns
3. Ravi starts using owner's exact phrases
4. Customer experience becomes indistinguishable from owner

## Success Metrics

1. **Escalation Speed**: < 2 seconds from detection to Guru query
2. **Owner Response Time**: Guru notifies owner within 5 seconds
3. **Learning Accuracy**: 95%+ of owner's phrases captured
4. **Customer Experience**: 0 customers realize it's AI
5. **Knowledge Reuse**: 80%+ of repeat questions answered without owner

## Next Steps

1. **Immediate**: Update webhook to use Ravi V2
2. **Today**: Create Guru chat API
3. **Today**: Add escalation tables to database
4. **Tomorrow**: Build escalation UI
5. **Tomorrow**: Test complete flow
6. **This Week**: Deploy and monitor

## Owner Training Guide

### How to Teach Guru

1. **Be Natural**: Talk to Guru like you talk to customers
2. **Use Your Phrases**: Say "Haan bhai" if that's how you talk
3. **Give Context**: Explain when to use what information
4. **Correct Mistakes**: If Ravi says something wrong, teach Guru the right way
5. **Share Everything**: Prices, stock, delivery, your style, your tone

### Example Training Session

```
Owner: "Guru, jab customer price puche, toh aise bolo: 'Haan bhai, aaj ka rate ₹85/kg hai. Theek hai?'"

Guru learns:
- Price format
- Use "Haan bhai"
- End with "Theek hai?"
- Casual, friendly tone

Next time customer asks price:
Ravi: "Haan bhai, aaj ka rate ₹85/kg hai. Theek hai?"
(Exactly like owner would say)
```

## Critical Rules

1. **NEVER** let customer know it's AI
2. **ALWAYS** escalate critical information
3. **ALWAYS** use owner's exact style
4. **NEVER** make up prices, stock, or delivery dates
5. **ALWAYS** learn from every owner interaction

---

**This is not a chatbot project. This is creating the owner's digital twin.**
