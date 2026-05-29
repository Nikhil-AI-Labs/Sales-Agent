import {
  Activity,
  BadgeIndianRupee,
  BookOpen,
  Bot,
  Brain,
  ChartNoAxesCombined,
  ClipboardList,
  Factory,
  FileText,
  MessageSquareText,
  Settings,
} from "lucide-react";

export type ViewKey =
  | "command"
  | "chats"
  | "guru"
  | "quotes"
  | "production"
  | "pricing"
  | "templates"
  | "knowledge"
  | "activity"
  | "analytics"
  | "settings";

export const navItems = [
  { key: "command", label: "AI Command Center", icon: Bot, badge: "Live" },
  { key: "chats", label: "Customer Chats", icon: MessageSquareText, badge: "9" },
  { key: "guru", label: "Guru AI", icon: Brain, badge: "3" },
  { key: "quotes", label: "Quotes", icon: ClipboardList, badge: "5" },
  { key: "production", label: "Production Capacity", icon: Factory, badge: "82%" },
  { key: "pricing", label: "Pricing Engine", icon: BadgeIndianRupee, badge: "Base 80" },
  { key: "templates", label: "Templates", icon: FileText, badge: "Chakra" },
  { key: "knowledge", label: "Knowledge Base", icon: BookOpen, badge: "128" },
  { key: "activity", label: "Activity Feed", icon: Activity, badge: "28" },
  { key: "analytics", label: "Analytics", icon: ChartNoAxesCombined, badge: "" },
  { key: "settings", label: "Settings", icon: Settings, badge: "" },
] as const;

export const customers = [
  {
    id: "bio-green",
    company: "BIOGREEN POLYBAG PRIVATE LIMITED",
    contact: "Nandan Kumar",
    phone: "+91 93340 77587",
    gst: "10AAGCB8395L1ZD",
    city: "Patna",
    state: "Bihar",
    language: "Hindi",
    stage: "Waiting for Capacity",
    urgency: "High",
    confidence: 91,
    last: "36 inch 3.5g silver laminated ka meter weight confirm kar dijiye.",
    tag: "Guru Requested Info",
    unread: 3,
  },
  {
    id: "kanhaiya",
    company: "M/S KANHAIYA LAL RAM KUMAR",
    contact: "Kanhaiya Lal",
    phone: "+91 94310 83824",
    gst: "10AAIFK2642Q1Z8",
    city: "Muzaffarpur",
    state: "Bihar",
    language: "Hindi",
    stage: "Negotiation",
    urgency: "Medium",
    confidence: 84,
    last: "Rate thoda kam karo, 2 tonne regular white 34 inch lenge.",
    tag: "Price Validation Pending",
    unread: 1,
  },
  {
    id: "vinayaga",
    company: "SHREE VINAYAGA WOVEN BAGS",
    contact: "S. V. Mani",
    phone: "+91 98424 42996",
    gst: "34BMNPM4687D1ZQ",
    city: "Coimbatore",
    state: "Tamil Nadu",
    language: "Tamil",
    stage: "Quote Sent",
    urgency: "Normal",
    confidence: 96,
    last: "Quote PDF received. We will confirm quantity by evening.",
    tag: "Production Verified",
    unread: 0,
  },
  {
    id: "prem",
    company: "PREM POLY BAGS",
    contact: "Premnath",
    phone: "+91 98656 66042",
    gst: "34BZOPP8573P1Z6",
    city: "Madurai",
    state: "Tamil Nadu",
    language: "Tamil",
    stage: "Awaiting Owner Input",
    urgency: "High",
    confidence: 72,
    last: "Natural lamination premium exception requested for repeat order.",
    tag: "AI Thinking",
    unread: 5,
  },
  {
    id: "balajee",
    company: "M/S SHREE BALAJEE PLASTIC BAG",
    contact: "Bablu Saw",
    phone: "+91 70045 78767",
    gst: "20FLRPS9737R1ZT",
    city: "Ranchi",
    state: "Jharkhand",
    language: "Hindi",
    stage: "Order Confirmed",
    urgency: "Low",
    confidence: 98,
    last: "YES. Please process 500 kg 30 inch regular unlaminated.",
    tag: "Quote Accepted",
    unread: 0,
  },
] as const;

export const chatMessages = [
  { role: "customer", text: "Namaste Ravi ji, 36 inch silver laminated fabric chahiye. 3.5 gram, 800 kg.", time: "10:18" },
  { role: "ai", text: "Noted. Size 36 inch, 3.5g, Silver quality, laminated, 800 kg. City Patna confirm kar dijiye?", time: "10:19" },
  { role: "customer", text: "Patna. Meter weight kya hoga laminated ka?", time: "10:21" },
  { role: "system", text: "Knowledge lookup failed: meter_weight:36:3.5:silver:regular_lam", time: "10:21" },
  { role: "ai", text: "Yeh exact detail main production reference se confirm karke batata hoon. Price aur delivery bhi backend approval ke baad hi share karunga.", time: "10:22" },
  { role: "system", text: "Guru requested clarification from owner", time: "10:22" },
] as const;

export const guruThreads = [
  { title: "Meter weight gaps", items: 6, active: true },
  { title: "Quote approvals", items: 5, active: false },
  { title: "Production calendar", items: 4, active: false },
  { title: "Pricing exceptions", items: 8, active: false },
  { title: "PI and GST terms", items: 3, active: false },
] as const;

export const guruMessages = [
  { role: "guru", text: "Meter weight for 36 inch, 3.5g Silver regular-laminated fabric is missing. Customer: BIOGREEN POLYBAG, Bihar." },
  { role: "owner", text: "Save it as 148 g/m. Customer visible." },
  { role: "guru", text: "Saved to knowledge base: meter_weight:36:3.5:silver:regular_lam = 148 g/m. Ravi can now answer the customer." },
  { role: "guru", text: "I also found 3 pending quote approvals where base price is using today's 3.0g rate: INR 80/kg." },
] as const;

export const activityEvents = [
  { label: "Ravi generated quote draft", detail: "Prem Poly Bags, 16 inch full color natural lamination", time: "10:32", tone: "cyan" },
  { label: "Guru learned new rule", detail: "12-15 inch premium remains INR 15/kg unless owner overrides", time: "10:28", tone: "green" },
  { label: "Capacity verified", detail: "34 inch 2,000 kg feasible in next 9 production days", time: "10:26", tone: "violet" },
  { label: "Owner input required", detail: "Meter weight missing for 36 inch Silver laminated", time: "10:22", tone: "amber" },
  { label: "WhatsApp inbound", detail: "Tamil message from Shree Vinayaga Woven Bags", time: "10:14", tone: "slate" },
] as const;

export const memoryNodes = [
  { key: "meter_weight:36:3.5:silver:regular_lam", value: "148 g/m", type: "fact", scope: "customer_visible", freshness: 100 },
  { key: "price_rule:size:16_17", value: "+INR 10/kg premium", type: "rule", scope: "customer_visible", freshness: 100 },
  { key: "price_rule:lamination:natural", value: "+INR 5/kg premium", type: "rule", scope: "customer_visible", freshness: 98 },
  { key: "billing:hsn_code_pp_fabric", value: "Owner confirmation pending", type: "fact", scope: "internal_only", freshness: 34 },
  { key: "policy:delivery_promise", value: "Only from production_capacity rows", type: "rule", scope: "internal_only", freshness: 100 },
  { key: "product:fibc:4_loop", value: "500-2000 kg load range, 5:1/6:1 safety factor", type: "fact", scope: "customer_visible", freshness: 92 },
] as const;

export const kpiCards = [
  { label: "Active Conversations", value: "18", delta: "+4", color: "cyan" },
  { label: "Quotes Today", value: "11", delta: "INR 8.7L", color: "violet" },
  { label: "Production Utilization", value: "82%", delta: "+6%", color: "green" },
  { label: "Revenue Pipeline", value: "INR 31.4L", delta: "5 hot deals", color: "amber" },
  { label: "AI Confidence", value: "94%", delta: "2 low", color: "cyan" },
  { label: "Pending Owner Inputs", value: "7", delta: "3 urgent", color: "red" },
] as const;

export const productionData = [
  { day: "Thu", loom: 76, booked: 58, available: 18 },
  { day: "Fri", loom: 84, booked: 71, available: 13 },
  { day: "Sat", loom: 91, booked: 86, available: 5 },
  { day: "Sun", loom: 62, booked: 43, available: 19 },
  { day: "Mon", loom: 88, booked: 73, available: 15 },
  { day: "Tue", loom: 79, booked: 65, available: 14 },
  { day: "Wed", loom: 82, booked: 69, available: 13 },
] as const;

export const priceData = [
  { name: "3.0g", price: 80 },
  { name: "3.5g", price: 80 },
  { name: "4.0g", price: 79 },
  { name: "4.5g", price: 79 },
  { name: "5.0g", price: 78 },
  { name: "5.5g", price: 78 },
] as const;

export const quotePipeline = [
  "Qualification complete",
  "Pricing engine triggered",
  "Owner approval pending",
  "Capacity verified",
  "Quote generated",
] as const;
