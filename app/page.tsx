"use client";

import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Bot,
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock3,
  Cpu,
  Database,
  Factory,
  FileText,
  Gauge,
  Languages,
  MessageCircle,
  Mic,
  Paperclip,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  navItems,
  type ViewKey,
} from "@/lib/data";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10000,
    },
  },
});

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <SalesOS />
    </QueryClientProvider>
  );
}

/* ─── Types ─────────────────────────────────────────────────────── */
type AgentRuntimeResponse = {
  state: {
    agentEnabled: boolean;
    raviEnabled: boolean;
    outboundSalesEnabled: boolean;
    autoSendRaviReplies: boolean;
    updatedAt: string;
  };
  config: {
    chakraConfigured: boolean;
    sarvamConfigured: boolean;
    ownerPhoneConfigured: boolean;
    webhookSecretConfigured: boolean;
    chakraApiVersion: string;
    sarvamModel: string;
  };
};

type LiveCustomer = {
  id: string;
  phone: string;
  name: string;
  company: string;
  gst_number: string;
  city: string;
  state: string;
  language: string;
  stage: string;
  last_message: string;
  last_message_at: string;
  message_count: number;
};

type ChatMessage = {
  id: string;
  customer_id: string;
  channel: string;
  role: string;
  content: string;
  created_at: string;
};

type ActivityEvent = {
  id: string;
  event_type: string;
  actor: string;
  customer_name: string;
  customer_company: string;
  payload: Record<string, unknown>;
  created_at: string;
};

type StreamEventHandlers = {
  onDelta?: (content: string) => void;
  onDone?: (data: any) => void;
  onError?: (message: string) => void;
};

async function readEventStream(response: Response, handlers: StreamEventHandlers) {
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || `Request failed with ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Streaming response did not include a body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() || "";

    for (const rawEvent of events) {
      let eventName = "message";
      const dataLines: string[] = [];

      for (const line of rawEvent.split(/\r?\n/)) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
      }

      if (dataLines.length === 0) continue;
      const payloadText = dataLines.join("\n");
      const payload = JSON.parse(payloadText);

      if (eventName === "delta") handlers.onDelta?.(String(payload.content || ""));
      if (eventName === "done") handlers.onDone?.(payload);
      if (eventName === "error") handlers.onError?.(String(payload.error || "Streaming failed"));
    }
  }
}

function visibleLLMText(content: string) {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("The user ")) return content;

  const splitAt = trimmed.indexOf("\n\n");
  if (splitAt === -1) return content;

  return trimmed.slice(splitAt + 2).trimStart();
}

type KnowledgeEntry = {
  id: string;
  key: string;
  value: string;
  type: string;
  scope: string;
  source: string;
  created_at: string;
  updated_at: string;
};

type Quote = {
  id: string;
  customer_id: string;
  enquiry_id: string;
  base_price: number;
  unit_price: number;
  total_amount: number;
  owner_approved: number;
  size_inches: number;
  grammage: number;
  quality: string;
  color: string;
  lamination: string;
  quantity_kg: number;
  delivery_city: string;
  customer_name: string;
  customer_company: string;
  customer_phone: string;
  created_at: string;
};

type DashboardStats = {
  activeConversations: number;
  todayQuotesCount: number;
  todayQuotesAmount: number;
  pendingOwnerInputs: number;
  knowledgeNodes: number;
  loomUtilization: number;
  availableCapacityKg: number;
  bookedKg: number;
  revenuePipeline: number;
  stages: Array<{ stage: string; count: number }>;
  sevenDayProduction: Array<{ day: string; booked: number; available: number; loom: number }>;
};

type OwnerTemplate = {
  id: string;
  name: string;
  language: string;
  body: string;
  category: string;
  updatedAt: string;
};

/* ─── Root App ─────────────────────────────────────────────────── */
function SalesOS() {
  const activeView = useUIStore((state) => state.activeView);
  const collapsed = useUIStore((state) => state.collapsed);

  return (
    <main className="relative h-screen overflow-hidden bg-void text-slate-100">
      <AmbientLayer />
      <div className="relative z-10 flex h-full min-w-0">
        <Sidebar />
        {activeView === "guru" ? (
          <GuruPage />
        ) : (
          <>
            {activeView === "chats" && (
              <CustomerList className={collapsed ? "hidden xl:flex" : "flex"} />
            )}
            <section className="flex min-w-0 flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeView}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.28 }}
                  className="min-w-0 flex-1"
                >
                  <MainView view={activeView} />
                </motion.div>
              </AnimatePresence>
              <RightIntelligencePanel />
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function AmbientLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(85,230,255,0.16),transparent_28%),radial-gradient(circle_at_74%_18%,rgba(139,92,246,0.16),transparent_26%),radial-gradient(circle_at_72%_82%,rgba(56,239,125,0.09),transparent_24%)]" />
      <div className="absolute -left-20 top-1/4 h-80 w-80 rounded-full bg-cyan/5 blur-3xl animate-slow-pan" />
      <div className="absolute right-8 top-10 h-72 w-72 rounded-full bg-violet/10 blur-3xl animate-slow-pan" />
      {Array.from({ length: 28 }).map((_, index) => (
        <motion.span
          key={index}
          className="absolute h-1 w-1 rounded-full bg-cyan/30"
          style={{
            left: `${(index * 37) % 100}%`,
            top: `${(index * 19) % 100}%`,
          }}
          animate={{ opacity: [0.1, 0.9, 0.1], y: [0, -14, 0] }}
          transition={{ duration: 4 + (index % 5), repeat: Infinity, delay: index * 0.12 }}
        />
      ))}
    </div>
  );
}

/* ─── Sidebar ──────────────────────────────────────────────────── */
function Sidebar() {
  const activeView = useUIStore((state) => state.activeView);
  const collapsed = useUIStore((state) => state.collapsed);
  const setActiveView = useUIStore((state) => state.setActiveView);
  const toggleCollapsed = useUIStore((state) => state.toggleCollapsed);

  const { data: statsData } = useQuery<{ ok: boolean; stats: DashboardStats }>({
    queryKey: ["dashboard-stats"],
    queryFn: () => fetch("/api/stats").then((r) => r.json()),
    refetchInterval: 15000,
  });

  const navBadges: Record<string, string> = {
    command: "Live",
    chats: statsData?.stats?.activeConversations?.toString() || "0",
    guru: statsData?.stats?.pendingOwnerInputs?.toString() || "0",
    quotes: statsData?.stats?.todayQuotesCount?.toString() || "0",
    production: statsData?.stats?.loomUtilization ? `${statsData.stats.loomUtilization}%` : "0%",
    pricing: "Base 80",
    templates: "Chakra",
    knowledge: statsData?.stats?.knowledgeNodes?.toString() || "0",
    activity: "Live",
  };

  return (
    <aside
      className={cn(
        "glass-strong z-20 flex h-full shrink-0 flex-col border-r border-white/10 transition-all duration-300",
        collapsed ? "w-[86px]" : "w-[280px]",
      )}
    >
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
        <motion.div
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 shadow-glow"
          animate={{ rotate: [0, 2, -2, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <Sparkles className="h-5 w-5 text-cyan" />
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400 animate-pulse-ring" />
        </motion.div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-xl font-semibold text-ai">ANJANI AI</div>
            <div className="text-xs text-slate-400">Autonomous Sales OS</div>
          </div>
        )}
        <Button variant="ghost" size="icon" className="ml-auto" onClick={toggleCollapsed} aria-label="Toggle sidebar">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <div className="space-y-3 border-b border-white/10 p-4">
        {[
          ["AI system", "Online", "green"],
          ["WhatsApp", "Chakra connected", "cyan"],
          ["Sarvam model", "Ready", "violet"],
          ["Production sync", `${statsData?.stats?.loomUtilization ?? 82}% load`, "amber"],
        ].map(([label, value, tone]) => (
          <div key={label} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
            <span
              className={cn(
                "h-2.5 w-2.5 shrink-0 rounded-full shadow-glow",
                tone === "green" && "bg-emerald-400",
                tone === "cyan" && "bg-cyan",
                tone === "violet" && "bg-violet",
                tone === "amber" && "bg-amber-300",
              )}
            />
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-[11px] uppercase text-slate-500">{label}</div>
                <div className="truncate text-xs text-slate-200">{value}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {!collapsed && <AgentControls />}

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.key;
          const badge = navBadges[item.key] || item.badge;
          return (
            <button
              key={item.key}
              onClick={() => setActiveView(item.key as ViewKey)}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left text-sm transition-all",
                active
                  ? "border-cyan/30 bg-cyan/10 text-white shadow-glow"
                  : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.05] hover:text-white",
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0 transition-colors", active ? "text-cyan" : "text-slate-500 group-hover:text-cyan")} />
              {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
              {!collapsed && badge && (
                <span className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] text-slate-300">{badge}</span>
              )}
              {active && <motion.span layoutId="nav-glow" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-cyan" />}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

/* ─── Agent Controls ───────────────────────────────────────────── */
function AgentControls() {
  const qc = useQueryClient();
  const { data, refetch, isFetching } = useQuery<AgentRuntimeResponse>({
    queryKey: ["agent-runtime-state"],
    queryFn: async () => {
      const response = await fetch("/api/agent/state");
      if (!response.ok) throw new Error("Failed to load agent state");
      return response.json();
    },
    refetchInterval: 8000,
  });

  async function toggle(key: keyof AgentRuntimeResponse["state"]) {
    if (!data) return;
    await fetch("/api/agent/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: !data.state[key] }),
    });
    await refetch();
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  }

  const state = data?.state;
  const config = data?.config;

  return (
    <div className="border-b border-white/10 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Runtime</span>
        <Badge tone={config?.chakraConfigured && config?.sarvamConfigured ? "green" : "amber"}>
          {config?.chakraConfigured && config?.sarvamConfigured ? "Configured" : "Needs env"}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          ["agentEnabled", "Agent"],
          ["raviEnabled", "Ravi standby"],
          ["autoSendRaviReplies", "Auto reply"],
          ["outboundSalesEnabled", "Sales mode"],
        ].map(([key, label]) => {
          const enabled = Boolean(state?.[key as keyof AgentRuntimeResponse["state"]]);
          return (
            <button
              key={key}
              onClick={() => toggle(key as keyof AgentRuntimeResponse["state"])}
              disabled={!state || isFetching}
              className={cn(
                "rounded-lg border px-2 py-2 text-left text-xs transition disabled:opacity-60",
                enabled ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-white",
              )}
            >
              <span className={cn("mb-1 block h-1.5 w-1.5 rounded-full", enabled ? "bg-emerald-300" : "bg-slate-600")} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Customer List (Live from DB) ────────────────────────────── */
function CustomerList({ className }: { className?: string }) {
  const activeCustomerId = useUIStore((state) => state.activeCustomerId);
  const setActiveCustomerId = useUIStore((state) => state.setActiveCustomerId);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<{ ok: boolean; customers: LiveCustomer[] }>({
    queryKey: ["customers", search],
    queryFn: () => fetch(`/api/customers?search=${encodeURIComponent(search)}`).then((r) => r.json()),
    refetchInterval: 6000,
  });

  const customers = data?.customers || [];

  return (
    <section className={cn("glass-strong h-full w-[360px] shrink-0 flex-col border-r border-white/10", className)}>
      <div className="border-b border-white/10 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Customer Chats</h2>
            <p className="text-xs text-slate-500">Ravi AI WhatsApp workspace</p>
          </div>
          <Badge tone="green">Live</Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            id="customer-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] pl-9 pr-3 text-sm text-slate-100 outline-none transition focus:border-cyan/60 focus:shadow-glow"
            placeholder="Search company, GST, phone..."
          />
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {isLoading && (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-cyan" />
          </div>
        )}
        {!isLoading && customers.length === 0 && (
          <div className="py-12 text-center">
            <MessageCircle className="mx-auto mb-3 h-10 w-10 text-slate-600" />
            <p className="text-sm text-slate-500">No customers yet</p>
            <p className="mt-1 text-xs text-slate-600">Customers appear when they WhatsApp Ravi</p>
          </div>
        )}
        {customers.map((customer) => {
          const active = customer.id === activeCustomerId;
          return (
            <motion.button
              key={customer.id}
              onClick={() => setActiveCustomerId(customer.id)}
              whileHover={{ y: -2 }}
              className={cn(
                "relative w-full rounded-xl border p-4 text-left transition-all",
                active ? "border-cyan/40 bg-cyan/10 shadow-glow" : "border-white/10 bg-white/[0.035] hover:border-violet/40 hover:bg-white/[0.06]",
              )}
            >
              <div className="flex gap-3">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan/20 via-violet/20 to-emerald-400/20 text-sm font-semibold">
                  {(customer.company || customer.name || "?").slice(0, 2).toUpperCase()}
                  <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-ink bg-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <h3 className="line-clamp-1 text-sm font-semibold text-white">{customer.company || customer.name}</h3>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{customer.name}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-300">{customer.last_message || "No messages yet"}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge
                  tone={
                    customer.stage === "quoted" ? "violet"
                    : customer.stage === "confirmed" ? "green"
                    : customer.stage === "greeting" ? "cyan"
                    : "amber"
                  }
                >
                  {customer.stage}
                </Badge>
                <Badge tone="slate">{customer.language}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                <span>{customer.phone}</span>
                <span className="flex items-center gap-1">
                  <CircleDot className="h-3 w-3 text-emerald-300" />
                  {customer.message_count} msgs
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Main View Router ─────────────────────────────────────────── */
function MainView({ view }: { view: ViewKey }) {
  if (view === "command") return <CommandCenter />;
  if (view === "quotes") return <QuotesPage />;
  if (view === "production") return <ProductionPage />;
  if (view === "pricing") return <PricingEnginePage />;
  if (view === "templates") return <TemplatesPage />;
  if (view === "knowledge") return <KnowledgeBasePage />;
  if (view === "activity") return <ActivityPage />;
  if (view === "analytics") return <AnalyticsPage />;
  if (view === "settings") return <SettingsPage />;
  return <ChatWorkspace />;
}

/* ─── Chat Workspace ───────────────────────────────────────────── */
function ChatWorkspace() {
  const activeCustomerId = useUIStore((state) => state.activeCustomerId);
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: chatData, isLoading } = useQuery<{ ok: boolean; messages: ChatMessage[]; customer: LiveCustomer }>({
    queryKey: ["chat-messages", activeCustomerId],
    queryFn: () => fetch(`/api/customers/chat?customerId=${activeCustomerId}`).then((r) => r.json()),
    refetchInterval: 4000,
    enabled: Boolean(activeCustomerId),
  });

  const messages = chatData?.messages || [];
  const customer = chatData?.customer;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function sendOwnerNote() {
    if (!draft.trim() || !activeCustomerId || sending) return;
    setSending(true);
    try {
      await fetch("/api/customers/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: activeCustomerId, message: draft, role: "owner" }),
      });
      setDraft("");
      qc.invalidateQueries({ queryKey: ["chat-messages", activeCustomerId] });
    } finally {
      setSending(false);
    }
  }

  if (!activeCustomerId) {
    return (
      <section className="flex h-full items-center justify-center flex-col gap-4">
        <MessageCircle className="h-16 w-16 text-slate-700" />
        <p className="text-slate-500">Select a customer to view chat</p>
      </section>
    );
  }

  return (
    <section className="flex h-full min-w-0 flex-col">
      <div className="glass-strong flex h-20 items-center justify-between border-b border-white/10 px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-white">{customer?.company || customer?.name || "Customer"}</h1>
            <Badge tone="cyan">{customer?.stage || "active"}</Badge>
            <Badge tone={customer?.gst_number ? "green" : "red"}>GST {customer?.gst_number ? "Verified" : "Missing"}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span>{customer?.name}</span>
            <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{customer?.phone}</span>
            <span>{customer?.city}, {customer?.state}</span>
            <span className="flex items-center gap-1"><Languages className="h-3.5 w-3.5" />{customer?.language}</span>
          </div>
        </div>
        <div className="hidden items-center gap-3 xl:flex">
          <AgentPill />
          <Badge tone="green">Ravi AI Active</Badge>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl space-y-5">
          {isLoading && (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-cyan" />
            </div>
          )}
          {messages.map((message) => (
            <LiveMessageBubble key={message.id} message={message} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="glass-strong border-t border-white/10 p-4">
        <div className="mx-auto flex max-w-4xl items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2">
          <Button variant="ghost" size="icon" aria-label="Attach file"><Paperclip className="h-4 w-4" /></Button>
          <input
            id="chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendOwnerNote(); } }}
            className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-slate-500"
            placeholder="Supervise Ravi, insert owner note, or draft WhatsApp reply..."
          />
          <Button variant="ghost" size="icon" aria-label="Voice note"><Mic className="h-4 w-4" /></Button>
          <Button size="icon" aria-label="Send" onClick={sendOwnerNote} disabled={!draft.trim() || sending}>
            {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </section>
  );
}

function LiveMessageBubble({ message }: { message: ChatMessage }) {
  const isOwner = message.role === "owner";
  const isAI = message.role === "assistant";
  const isUser = message.role === "user";

  if (message.role === "system") {
    return (
      <div className="flex justify-center">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-400">
          {message.content} <span className="text-slate-600">{new Date(message.created_at).toLocaleTimeString()}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-3", (isAI || isOwner) ? "justify-start" : "justify-end")}>
      {(isAI || isOwner) && (
        <div className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
          isAI ? "border-cyan/30 bg-cyan/10" : "border-violet/30 bg-violet/10"
        )}>
          {isAI ? <Bot className="h-4 w-4 text-cyan" /> : <Sparkles className="h-4 w-4 text-violet-200" />}
        </div>
      )}
      <div
        className={cn(
          "max-w-[78%] rounded-2xl border px-4 py-3 text-sm leading-6",
          isAI ? "rounded-tl-sm border-cyan/25 bg-gradient-to-br from-cyan/12 to-violet/10 shadow-glow"
          : isOwner ? "rounded-tl-sm border-violet/30 bg-violet/10"
          : "rounded-tr-sm border-white/10 bg-white/[0.07]",
        )}
      >
        {isOwner && <div className="mb-1 text-[10px] font-semibold text-violet-300 uppercase">Owner note</div>}
        <p>{message.content}</p>
        <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-slate-500">
          {new Date(message.created_at).toLocaleTimeString()}
          {isAI && <BadgeCheck className="h-3 w-3 text-cyan" />}
        </div>
      </div>
    </div>
  );
}

function AgentPill() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-cyan/20 bg-cyan/10 px-3 py-2">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-cyan opacity-75 animate-ping" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan" />
      </span>
      <span className="text-xs font-medium text-cyan">Ravi AI active</span>
    </div>
  );
}

/* ─── Right Intelligence Panel ─────────────────────────────────── */
function RightIntelligencePanel() {
  const activeCustomerId = useUIStore((state) => state.activeCustomerId);

  const { data: activityData } = useQuery<{ ok: boolean; events: ActivityEvent[] }>({
    queryKey: ["activity-feed-panel"],
    queryFn: () => fetch("/api/activity?limit=5").then((r) => r.json()),
    refetchInterval: 5000,
  });

  const { data: knowledgeData } = useQuery<{ ok: boolean; knowledge: KnowledgeEntry[] }>({
    queryKey: ["knowledge-panel"],
    queryFn: () => fetch("/api/knowledge?scope=all").then((r) => r.json()),
    refetchInterval: 15000,
  });

  return (
    <aside className="glass-strong hidden h-full w-[340px] shrink-0 flex-col border-l border-white/10 2xl:flex">
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">AI Intelligence</h2>
            <p className="text-xs text-slate-500">Reasoning, pipeline, memory</p>
          </div>
          <Badge tone="green">Alive</Badge>
        </div>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <PanelCard title="Live AI State" icon={<Brain className="h-4 w-4 text-cyan" />}>
          <div className="rounded-lg border border-cyan/20 bg-cyan/10 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-cyan">
              <Zap className="h-4 w-4" />
              Analyzing customer intent
            </div>
            <p className="text-xs leading-5 text-slate-400">
              Ravi blocked price and delivery response until deterministic backend and production capacity are available.
            </p>
          </div>
        </PanelCard>

        <PanelCard title="Recent Activity" icon={<FileText className="h-4 w-4 text-violet-200" />}>
          <div className="space-y-3">
            {(activityData?.events || []).slice(0, 4).map((event) => (
              <div key={event.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <div className="text-xs font-medium text-slate-200">{event.event_type.replace(/_/g, " ")}</div>
                <div className="mt-1 text-xs text-slate-500">{event.customer_company || event.actor}</div>
              </div>
            ))}
            {(!activityData?.events || activityData.events.length === 0) && (
              <p className="text-xs text-slate-500">No activity yet. Start a conversation!</p>
            )}
          </div>
        </PanelCard>

        <PanelCard title="AI Memory Events" icon={<Database className="h-4 w-4 text-cyan" />}>
          <div className="space-y-3">
            {(knowledgeData?.knowledge || []).slice(0, 4).map((node) => (
              <div key={node.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <div className="line-clamp-1 text-xs font-medium text-slate-200">{node.key}</div>
                <div className="mt-1 line-clamp-1 text-xs text-slate-500">{node.value}</div>
              </div>
            ))}
            {(!knowledgeData?.knowledge || knowledgeData.knowledge.length === 0) && (
              <p className="text-xs text-slate-500">Teach Guru via the Guru AI tab to build memory.</p>
            )}
          </div>
        </PanelCard>
      </div>
    </aside>
  );
}

function PanelCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

/* ─── Command Center ───────────────────────────────────────────── */
function CommandCenter() {
  const { data: statsData, isLoading } = useQuery<{ ok: boolean; stats: DashboardStats }>({
    queryKey: ["dashboard-stats"],
    queryFn: () => fetch("/api/stats").then((r) => r.json()),
    refetchInterval: 15000,
  });

  const { data: activityData } = useQuery<{ ok: boolean; events: ActivityEvent[] }>({
    queryKey: ["activity-feed"],
    queryFn: () => fetch("/api/activity?limit=10").then((r) => r.json()),
    refetchInterval: 5000,
  });

  const stats = statsData?.stats;

  const kpiCards = stats
    ? [
        { label: "Active Conversations", value: String(stats.activeConversations), delta: "Last 24h", color: "cyan" },
        { label: "Quotes Today", value: String(stats.todayQuotesCount), delta: `INR ${(stats.todayQuotesAmount / 100000).toFixed(1)}L`, color: "violet" },
        { label: "Production Utilization", value: `${stats.loomUtilization}%`, delta: "Today", color: "green" },
        { label: "Revenue Pipeline", value: `INR ${(stats.revenuePipeline / 100000).toFixed(1)}L`, delta: "30 days", color: "amber" },
        { label: "Knowledge Nodes", value: String(stats.knowledgeNodes), delta: "Learned", color: "cyan" },
        { label: "Pending Owner Inputs", value: String(stats.pendingOwnerInputs), delta: "Need reply", color: stats.pendingOwnerInputs > 0 ? "red" : "green" },
      ]
    : [];

  const productionChartData = stats?.sevenDayProduction || [];

  return (
    <section className="h-full overflow-y-auto p-6">
      <ViewHeader title="AI Command Center" subtitle="Owner-supervised autonomous WhatsApp sales workforce" />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3 2xl:grid-cols-6">
            {kpiCards.map((card, index) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="glass scan-line relative overflow-hidden rounded-xl p-4"
              >
                <div className="text-xs text-slate-500">{card.label}</div>
                <div className="mt-3 text-2xl font-semibold text-white">{card.value}</div>
                <Badge
                  tone={card.color === "red" ? "red" : card.color === "amber" ? "amber" : card.color === "green" ? "green" : card.color === "violet" ? "violet" : "cyan"}
                  className="mt-3"
                >
                  {card.delta}
                </Badge>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <ChartPanel title="Factory Operating Pulse">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={productionChartData}>
                  <defs>
                    <linearGradient id="load" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#55e6ff" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#55e6ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="loom" stroke="#55e6ff" fill="url(#load)" strokeWidth={2} name="Loom %" />
                  <Line type="monotone" dataKey="booked" stroke="#8b5cf6" strokeWidth={2} name="Booked T" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartPanel>

            <div className="glass rounded-xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Live Activity Feed</h3>
                <Badge tone="cyan">Streaming</Badge>
              </div>
              <LiveActivityList events={activityData?.events || []} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

/* ─── Guru Page (Fully Functional) ────────────────────────────── */
function GuruPage() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingMessages, setStreamingMessages] = useState<Array<{ role: string; content: string; created_at: string }>>([]);
  const [toast, setToast] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const ownerPhone = "919408724777";

  const { data: guruData, refetch } = useQuery<{ ok: boolean; messages: Array<{ role: string; content: string; created_at: string }>; pendingEscalations: Array<{ id: string; question: string; customerName: string; customerPhone: string; createdAt: string }> }>({
    queryKey: ["guru-conversation"],
    queryFn: async () => {
      const r = await fetch(`/api/guru/chat?phone=${ownerPhone}`);
      return r.json();
    },
    refetchInterval: sending ? false : 5000,
  });

  const { data: knowledgeData, refetch: refetchKnowledge } = useQuery<{ ok: boolean; knowledge: KnowledgeEntry[] }>({
    queryKey: ["knowledge-all"],
    queryFn: () => fetch("/api/knowledge").then((r) => r.json()),
    refetchInterval: 10000,
  });

  const messages = guruData?.messages || [];
  const displayMessages = sending ? [...messages, ...streamingMessages] : messages;
  const knowledgeNodes = knowledgeData?.knowledge || [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingMessages]);

  async function sendToGuru() {
    if (!message.trim() || sending) return;
    const userText = message.trim();
    setSending(true);
    setMessage("");
    setToast(null);
    setStreamingMessages([
      { role: "user", content: userText, created_at: new Date().toISOString() },
      { role: "assistant", content: "", created_at: new Date().toISOString() },
    ]);
    try {
      const r = await fetch("/api/guru/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, phone: ownerPhone, stream: true }),
      });
      let finalResult: any = null;
      await readEventStream(r, {
        onDelta: (content) => {
          setStreamingMessages((current) => {
            if (current.length === 0) return current;
            const next = [...current];
            const last = next[next.length - 1];
            next[next.length - 1] = { ...last, content: last.content + content };
            return next;
          });
        },
        onDone: (data) => {
          finalResult = data;
        },
        onError: (error) => {
          throw new Error(error);
        },
      });
      if (finalResult?.memoryExtracted) {
        setToast("✅ Guru saved a new memory!");
        refetchKnowledge();
      } else if (finalResult?.escalationResolved) {
        setToast("✅ Escalation resolved! Ravi will now reply to the customer.");
      }
      await refetch();
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setStreamingMessages([]);
    } catch (error) {
      setToast("❌ Failed to send message to Guru");
    } finally {
      setSending(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  async function deleteKnowledge(id: string) {
    await fetch(`/api/knowledge?id=${id}`, { method: "DELETE" });
    refetchKnowledge();
  }

  return (
    <section className="flex h-full min-w-0 flex-1">
      {/* Main chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="glass-strong flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet/40 bg-violet/10 shadow-violet">
                <Brain className="h-5 w-5 text-violet-200" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Owner ↔ Guru AI</h1>
                <p className="text-xs text-slate-500">Learning, quote approvals, production clarification, memory writes</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="green">Knowledge writer active</Badge>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-4xl space-y-5">
            {displayMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Brain className="mb-4 h-12 w-12 text-violet/40" />
                <h3 className="text-lg font-semibold text-white">Start Teaching Guru</h3>
                <p className="mt-2 max-w-md text-sm text-slate-400">
                  Teach Guru about your business - prices, stock, delivery times, your communication style.
                  Guru will learn and guide Ravi to talk exactly like you.
                </p>
                <div className="mt-6 grid gap-2 w-full max-w-md">
                  {[
                    "Meter weight for 36 inch 3.5g unlam is 148 g/m",
                    "I talk casually in Hindi-English mix. I say 'Haan bhai' a lot.",
                    "Minimum order is 500 kg for all sizes",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setMessage(suggestion)}
                      className="rounded-lg border border-violet/25 bg-violet/10 px-4 py-2 text-sm text-violet-200 hover:bg-violet/20 transition text-left"
                    >
                      "{suggestion}"
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              displayMessages.map((msg, index) => (
                <div key={index} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "assistant" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet/30 bg-violet/10 mr-3">
                      <Brain className="h-4 w-4 text-violet-200" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl border px-4 py-3 text-sm leading-6",
                      msg.role === "user"
                        ? "rounded-tr-sm border-white/10 bg-white/[0.07]"
                        : "rounded-tl-sm border-violet/30 bg-gradient-to-br from-violet/15 to-cyan/10 shadow-violet",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.role === "assistant" ? visibleLLMText(msg.content) : msg.content}</p>
                    <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-slate-500">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {toast && (
          <div className="mx-4 mb-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300">
            {toast}
          </div>
        )}

        <div className="glass-strong border-t border-white/10 p-4">
          <div className="mx-auto flex max-w-4xl items-center gap-3 rounded-xl border border-violet/25 bg-violet/10 p-2">
            <input
              id="guru-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendToGuru();
                }
              }}
              disabled={sending}
              className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-slate-500 disabled:opacity-50"
              placeholder="Teach Guru: meter weights, rules, exceptions, capacity, billing terms..."
            />
            <Button onClick={sendToGuru} disabled={!message.trim() || sending}>
              {sending ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                  <Sparkles className="h-4 w-4" />
                </motion.div>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send to Guru
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Right: memory events */}
      <aside className="glass-strong hidden w-[360px] shrink-0 border-l border-white/10 p-5 xl:flex xl:flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white">AI Memory</h2>
            <p className="mt-1 text-xs text-slate-500">Customer-visible vs internal-only data.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetchKnowledge()}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto">
          {knowledgeNodes.length === 0 && (
            <div className="py-8 text-center">
              <Database className="mx-auto mb-3 h-10 w-10 text-slate-700" />
              <p className="text-sm text-slate-500">No memory yet</p>
              <p className="mt-1 text-xs text-slate-600">Start teaching Guru!</p>
            </div>
          )}
          {knowledgeNodes.map((node) => (
            <div key={node.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 group">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-xs font-semibold text-white">{node.key}</div>
                  <div className="mt-1 text-xs text-slate-400">{node.value}</div>
                </div>
                <button
                  onClick={() => deleteKnowledge(node.id)}
                  className="opacity-0 group-hover:opacity-100 transition text-slate-600 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <Badge tone={node.scope === "customer_visible" ? "green" : "amber"}>{node.scope}</Badge>
                <Badge tone="slate">{node.type}</Badge>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}

/* ─── Knowledge Base Page ──────────────────────────────────────── */
function KnowledgeBasePage() {
  const [search, setSearch] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newType, setNewType] = useState("fact");
  const [newScope, setNewScope] = useState("customer_visible");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const qc = useQueryClient();

  const { data, refetch, isLoading } = useQuery<{ ok: boolean; knowledge: KnowledgeEntry[] }>({
    queryKey: ["knowledge-all-page", search],
    queryFn: () => fetch(`/api/knowledge${search ? `?search=${encodeURIComponent(search)}` : ""}`).then((r) => r.json()),
    refetchInterval: 15000,
  });

  const knowledge = data?.knowledge || [];

  async function addKnowledge() {
    if (!newKey || !newValue) return;
    setSaving(true);
    try {
      const r = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newKey, value: newValue, type: newType, scope: newScope, source: "owner" }),
      });
      const result = await r.json();
      if (result.ok) {
        setStatus("Memory saved!");
        setNewKey(""); setNewValue("");
        setShowAdd(false);
        refetch();
        qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      } else {
        setStatus(`Error: ${result.error}`);
      }
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(""), 3000);
    }
  }

  async function deleteEntry(id: string) {
    await fetch(`/api/knowledge?id=${id}`, { method: "DELETE" });
    refetch();
  }

  return (
    <section className="h-full overflow-y-auto p-6">
      <ViewHeader title="Knowledge Base" subtitle="AI memory graph for rules, facts, meter weights, billing terms, and production policies" />
      <div className="mb-5 flex items-center gap-3">
        <div className="flex flex-1 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <Search className="h-4 w-4 text-cyan" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
            placeholder="Search memory nodes..."
          />
          <Badge tone="cyan">{knowledge.length} nodes</Badge>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4" />
          Add Memory
        </Button>
      </div>

      {showAdd && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass mb-5 rounded-xl p-5"
        >
          <h3 className="mb-4 text-sm font-semibold text-white">Add Memory Node</h3>
          <div className="grid gap-3">
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Key (e.g., meter_weight:36:3.5:unlam)"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-cyan/50"
            />
            <input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Value (e.g., 148 g/m)"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-cyan/50"
            />
            <div className="flex gap-3">
              <select value={newType} onChange={(e) => setNewType(e.target.value)} className="rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm outline-none flex-1">
                {["fact", "rule", "table", "template"].map((t) => <option key={t}>{t}</option>)}
              </select>
              <select value={newScope} onChange={(e) => setNewScope(e.target.value)} className="rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm outline-none flex-1">
                {["customer_visible", "internal_only"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <Button onClick={addKnowledge} disabled={!newKey || !newValue || saving}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save Memory
              </Button>
              <Button variant="ghost" onClick={() => setShowAdd(false)}><X className="h-4 w-4" />Cancel</Button>
            </div>
          </div>
          {status && <div className="mt-3 text-sm text-cyan">{status}</div>}
        </motion.div>
      )}

      {isLoading && <div className="flex justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-cyan" /></div>}

      <div className="grid gap-4 xl:grid-cols-2">
        {knowledge.map((node) => (
          <motion.div key={node.id} whileHover={{ y: -2 }} className="glass rounded-xl p-5 group">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-1 text-sm font-semibold text-white">{node.key}</h3>
                <p className="mt-2 text-sm text-slate-300">{node.value}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan/20 bg-cyan/10">
                  <Database className="h-5 w-5 text-cyan" />
                </div>
                <button
                  onClick={() => deleteEntry(node.id)}
                  className="opacity-0 group-hover:opacity-100 transition text-slate-600 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="violet">{node.type}</Badge>
              <Badge tone={node.scope === "customer_visible" ? "green" : "amber"}>{node.scope}</Badge>
              <Badge tone="slate">{node.source}</Badge>
            </div>
          </motion.div>
        ))}
        {knowledge.length === 0 && !isLoading && (
          <div className="col-span-2 py-16 text-center">
            <Database className="mx-auto mb-4 h-12 w-12 text-slate-700" />
            <p className="text-slate-500">No knowledge entries yet</p>
            <p className="mt-1 text-sm text-slate-600">Teach Guru via the Guru AI tab, or add manually above.</p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Production Page ──────────────────────────────────────────── */
function ProductionPage() {
  const today = new Date().toISOString().split("T")[0];
  const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const { data: capData, isLoading } = useQuery<{ ok: boolean; capacity: any[] }>({
    queryKey: ["capacity-7day"],
    queryFn: () => fetch(`/api/capacity?startDate=${today}&endDate=${sevenDaysLater}`).then((r) => r.json()),
    refetchInterval: 30000,
  });

  const { data: statsData } = useQuery<{ ok: boolean; stats: DashboardStats }>({
    queryKey: ["dashboard-stats"],
    queryFn: () => fetch("/api/stats").then((r) => r.json()),
    refetchInterval: 15000,
  });

  const stats = statsData?.stats;
  const capacityByDay = useMemo(() => {
    if (!capData?.capacity) return [];
    const grouped: Record<string, { booked: number; available: number; planned: number }> = {};
    for (const row of capData.capacity as any[]) {
      if (!grouped[row.date]) grouped[row.date] = { booked: 0, available: 0, planned: 0 };
      grouped[row.date].booked += row.booked_kg;
      grouped[row.date].available += row.available_kg;
      grouped[row.date].planned += row.planned_kg;
    }
    return Object.entries(grouped).map(([date, data]) => ({
      day: new Date(date).toLocaleDateString("en-IN", { weekday: "short" }),
      booked: Math.round(data.booked / 1000 * 10) / 10,
      available: Math.round(data.available / 1000 * 10) / 10,
    }));
  }, [capData]);

  return (
    <section className="h-full overflow-y-auto p-6">
      <ViewHeader title="Production Capacity" subtitle="Delivery promises must come from production capacity rows, never model text" />
      <div className="grid gap-4 lg:grid-cols-4">
        {[
          ["Loom utilization", `${stats?.loomUtilization ?? 0}%`, Gauge],
          ["Booked today", `${((stats?.bookedKg ?? 0) / 1000).toFixed(1)}T`, Factory],
          ["Available capacity", `${((stats?.availableCapacityKg ?? 0) / 1000).toFixed(1)}T`, Check],
          ["Delivery risk", stats?.loomUtilization && stats.loomUtilization > 85 ? "High" : "Medium", AlertTriangle],
        ].map(([label, value, Icon]) => (
          <div key={label as string} className="glass rounded-xl p-5">
            <Icon className="h-5 w-5 text-cyan" />
            <div className="mt-4 text-2xl font-semibold text-white">{value as string}</div>
            <div className="text-xs text-slate-500">{label as string}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <ChartPanel title="Seven-Day Load Forecast">
          {isLoading ? (
            <div className="flex h-[320px] items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-cyan" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={capacityByDay}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="booked" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Booked T" />
                <Bar dataKey="available" fill="#38ef7d" radius={[6, 6, 0, 0]} name="Available T" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white">Factory Heatmap</h3>
          <div className="mt-5 grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, index) => (
              <div
                key={index}
                className={cn(
                  "aspect-square rounded-md border border-white/10",
                  index % 9 === 0 ? "bg-red-400/40" : index % 5 === 0 ? "bg-amber-300/40" : index % 3 === 0 ? "bg-cyan/30" : "bg-emerald-400/30",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing Engine Page ──────────────────────────────────────── */
function PricingEnginePage() {
  const [sizeInches, setSizeInches] = useState(36);
  const [grammage, setGrammage] = useState(3.5);
  const [quality, setQuality] = useState("Silver");
  const [color, setColor] = useState("white");
  const [lamination, setLamination] = useState("Regular");
  const [quantity, setQuantity] = useState(800);
  const [livePrice, setLivePrice] = useState<{ unit: number; total: number; breakdown: any } | null>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [basePrice, setBasePrice] = useState(80);
  const [savingBase, setSavingBase] = useState(false);
  const [priceStatus, setPriceStatus] = useState("");
  const qc = useQueryClient();

  const { data: priceConfigData } = useQuery<{ ok: boolean; config: { base_price_3g: number } }>({
    queryKey: ["price-config"],
    queryFn: () => fetch("/api/pricing/config").then((r) => r.json()),
  });

  useEffect(() => {
    if (priceConfigData?.config?.base_price_3g) {
      setBasePrice(priceConfigData.config.base_price_3g);
    }
  }, [priceConfigData]);

  async function calculateLivePrice() {
    setCalculatingPrice(true);
    try {
      const r = await fetch("/api/pricing/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sizeInches, grammage, quality, color, lamination, quantityKg: quantity }),
      });
      const data = await r.json();
      if (data.ok) {
        setLivePrice({
          unit: data.pricing.unitPrice,
          total: data.pricing.totalAmount,
          breakdown: data.pricing,
        });
      }
    } finally {
      setCalculatingPrice(false);
    }
  }

  async function saveBasePrice() {
    setSavingBase(true);
    try {
      const r = await fetch("/api/pricing/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basePrice3g: basePrice, createdBy: "owner", notes: "Updated from dashboard" }),
      });
      const data = await r.json();
      setPriceStatus(data.ok ? "✅ Base price saved!" : `❌ ${data.error}`);
      qc.invalidateQueries({ queryKey: ["price-config"] });
    } finally {
      setSavingBase(false);
      setTimeout(() => setPriceStatus(""), 3000);
    }
  }

  const priceData = [
    { name: "3.0g", price: basePrice },
    { name: "3.5g", price: basePrice },
    { name: "4.0g", price: basePrice - 1 },
    { name: "4.5g", price: basePrice - 1 },
    { name: "5.0g", price: basePrice - 2 },
    { name: "5.5g", price: basePrice - 2 },
  ];

  return (
    <section className="h-full overflow-y-auto p-6">
      <ViewHeader title="Pricing Engine" subtitle="Deterministic INR/kg calculator. Ravi never invents prices." />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          {/* Base Price Control */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white">Set Today's Base Price (3.0g)</h3>
            <div className="mt-4 flex items-center gap-3">
              <input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-cyan/50 w-32"
                min={50}
                max={200}
              />
              <span className="text-sm text-slate-400">INR / kg</span>
              <Button onClick={saveBasePrice} disabled={savingBase}>
                {savingBase ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save
              </Button>
            </div>
            {priceStatus && <p className="mt-2 text-sm text-cyan">{priceStatus}</p>}
          </div>

          {/* Quote Simulator */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white">Live Quote Simulator</h3>
            <div className="mt-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Size (inch)</label>
                  <select value={sizeInches} onChange={(e) => setSizeInches(Number(e.target.value))} className="w-full rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm outline-none">
                    {[12, 14, 16, 17, 19, 24, 26, 28, 30, 32, 34, 36, 40, 42, 48].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Grammage (g)</label>
                  <select value={grammage} onChange={(e) => setGrammage(Number(e.target.value))} className="w-full rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm outline-none">
                    {[3.0, 3.5, 4.0, 4.5, 5.0, 5.5].map((g) => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Quality</label>
                  <select value={quality} onChange={(e) => setQuality(e.target.value)} className="w-full rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm outline-none">
                    {["Janta", "Regular", "Silver", "Gold", "Platinum"].map((q) => <option key={q}>{q}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Lamination</label>
                  <select value={lamination} onChange={(e) => setLamination(e.target.value)} className="w-full rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm outline-none">
                    {["None", "Regular", "Natural"].map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Quantity: {quantity} kg</label>
                <input
                  type="range" min={100} max={5000} step={100} value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full accent-cyan"
                />
              </div>

              <Button className="w-full" onClick={calculateLivePrice} disabled={calculatingPrice}>
                {calculatingPrice ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                Calculate Price from Backend
              </Button>

              {livePrice && (
                <div className="rounded-xl border border-cyan/25 bg-cyan/10 p-4">
                  <div className="text-xs text-cyan">Computed backend quote</div>
                  <div className="mt-2 text-3xl font-semibold text-white">INR {livePrice.unit}/kg</div>
                  <div className="text-sm text-slate-400">Total INR {livePrice.total.toLocaleString("en-IN")} for {quantity} kg</div>
                  <div className="mt-3 space-y-1 text-xs text-slate-500">
                    <div>Base: ₹{livePrice.breakdown.basePrice} | Size: +₹{livePrice.breakdown.sizePremium}</div>
                    <div>Grammage: ₹{livePrice.breakdown.grammageAdjustment} | Lam: +₹{livePrice.breakdown.laminationPremium}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <ChartPanel title="Grammage Price Curve">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={priceData}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis domain={[basePrice - 4, basePrice + 2]} stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="price" stroke="#55e6ff" strokeWidth={3} dot={{ fill: "#55e6ff" }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>
    </section>
  );
}

/* ─── Templates Page ───────────────────────────────────────────── */
function TemplatesPage() {
  const [templateName, setTemplateName] = useState("anjani_fabric_intro_en");
  const [language, setLanguage] = useState("en");
  const [body, setBody] = useState("Hello {{1}}, this is Ravi AI from Anjani Interweave. We manufacture PP woven fabric, laminated fabric and packaging bags. Reply with your fabric requirement.");
  const [phone, setPhone] = useState("919408724777");
  const [salesText, setSalesText] = useState("Hello, this is Ravi AI from Anjani Interweave. Please share your fabric size, grammage, lamination and quantity requirement.");
  const [testText, setTestText] = useState("Customer asks: 36 inch 3.5 gram silver laminated fabric, 800 kg, Patna. Ask next step without giving price.");
  const [raviDraft, setRaviDraft] = useState("");
  const [testingRavi, setTestingRavi] = useState(false);
  const [status, setStatus] = useState("");
  const [chakraTemplates, setChakraTemplates] = useState<any[]>([]);

  const ownerTemplates = useQuery<{ templates: OwnerTemplate[] }>({
    queryKey: ["owner-templates"],
    queryFn: async () => {
      const r = await fetch("/api/templates");
      if (!r.ok) throw new Error("Failed to load owner templates");
      return r.json();
    },
  });

  const runtime = useQuery<AgentRuntimeResponse>({
    queryKey: ["agent-runtime-state"],
    queryFn: async () => {
      const r = await fetch("/api/agent/state");
      if (!r.ok) throw new Error("Failed to load agent state");
      return r.json();
    },
    refetchInterval: 8000,
  });

  function setStatusMsg(msg: string) {
    setStatus(msg);
    setTimeout(() => setStatus(""), 5000);
  }

  async function saveLocalTemplate() {
    setStatusMsg("Saving owner template...");
    const r = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: templateName, language, category: "UTILITY", body }),
    });
    const data = await r.json();
    setStatusMsg(data.ok ? "Owner template saved for future Ravi/Guru use." : `Template save error: ${data.error}`);
    await ownerTemplates.refetch();
  }

  function useLocalTemplate(template: OwnerTemplate) {
    setTemplateName(template.name);
    setLanguage(template.language);
    setBody(template.body);
    setSalesText(template.body);
    setStatusMsg(`Loaded owner template: ${template.name}`);
  }

  async function createChakraTemplate() {
    setStatusMsg("Creating template in ChakraHQ...");
    const r = await fetch("/api/chakra/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: templateName, language, category: "UTILITY", body }),
    });
    const data = await r.json();
    setStatusMsg(data.ok ? "Template submitted to ChakraHQ for approval." : `Template error: ${data.error}`);
  }

  async function loadTemplates() {
    setStatusMsg("Loading ChakraHQ templates...");
    const r = await fetch("/api/chakra/templates");
    const data = await r.json();
    const list = Array.isArray(data?.result?.data) ? data.result.data : Array.isArray(data?.result) ? data.result : [];
    setChakraTemplates(list);
    setStatusMsg(data.ok ? `Loaded ${list.length} templates.` : `Template list error: ${data.error}`);
  }

  async function sendSalesMessage() {
    setStatusMsg("Sending sales WhatsApp message...");
    const r = await fetch("/api/chakra/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: phone, text: salesText, mode: "sales" }),
    });
    const data = await r.json();
    setStatusMsg(data.ok ? "Sales message sent through ChakraHQ." : `Send error: ${data.error}`);
  }

  async function testRavi() {
    setTestingRavi(true);
    setRaviDraft("");
    setStatus("Streaming Ravi draft...");
    try {
      const r = await fetch("/api/sarvam/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona: "ravi", text: testText, stream: true }),
      });

      await readEventStream(r, {
        onDelta: (content) => setRaviDraft((current) => current + content),
        onDone: () => setStatusMsg("Ravi draft generated."),
        onError: (error) => {
          throw new Error(error);
        },
      });
    } catch (error) {
      setStatusMsg(error instanceof Error ? `Sarvam error: ${error.message}` : "Sarvam error");
    } finally {
      setTestingRavi(false);
    }
  }

  return (
    <section className="h-full overflow-y-auto p-6">
      <ViewHeader title="Templates + Agent Actions" subtitle="Create ChakraHQ templates, test Sarvam/Ravi, and send owner-approved sales messages" />
      <div className="mb-5 grid gap-3 lg:grid-cols-4">
        <RuntimeTile label="ChakraHQ" enabled={Boolean(runtime.data?.config.chakraConfigured)} detail={runtime.data?.config.chakraApiVersion ?? "v22.0"} />
        <RuntimeTile label="Sarvam" enabled={Boolean(runtime.data?.config.sarvamConfigured)} detail={runtime.data?.config.sarvamModel ?? "sarvam-105b"} />
        <RuntimeTile label="Ravi" enabled={Boolean(runtime.data?.state.raviEnabled)} detail={runtime.data?.state.autoSendRaviReplies ? "Auto-send on" : "Draft only"} />
        <RuntimeTile label="Sales Send" enabled={Boolean(runtime.data?.state.outboundSalesEnabled)} detail="Manual outbound" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white">Owner Template Builder</h3>
          <div className="mt-4 grid gap-3">
            <input id="template-name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyan/50" placeholder="template_name" />
            <select id="template-lang" value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-lg border border-white/10 bg-ink px-3 py-3 text-sm outline-none focus:border-cyan/50">
              {["en", "hi", "gu", "ta", "te", "kn", "ml"].map((code) => <option key={code}>{code}</option>)}
            </select>
            <textarea id="template-body" value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 text-sm leading-6 outline-none focus:border-cyan/50" />
            <div className="flex gap-3">
              <Button variant="ghost" onClick={saveLocalTemplate}><Check className="h-4 w-4" />Save Local</Button>
              <Button onClick={createChakraTemplate}><FileText className="h-4 w-4" />Submit Template</Button>
              <Button variant="ghost" onClick={loadTemplates}><Search className="h-4 w-4" />List Templates</Button>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white">Outbound Sales Message</h3>
          <p className="mt-1 text-xs text-slate-500">Uses Chakra session message. Server blocks this unless Sales Send is on.</p>
          <div className="mt-4 grid gap-3">
            <input id="sales-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyan/50" placeholder="919XXXXXXXXX" />
            <textarea id="sales-text" value={salesText} onChange={(e) => setSalesText(e.target.value)} rows={5} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 text-sm leading-6 outline-none focus:border-cyan/50" />
            <Button id="send-sales-btn" onClick={sendSalesMessage}><Send className="h-4 w-4" />Send Sales Message</Button>
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white">Test Ravi With Sarvam</h3>
          <div className="mt-4 grid gap-3">
            <textarea id="test-ravi-text" value={testText} onChange={(e) => setTestText(e.target.value)} rows={5} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 text-sm leading-6 outline-none focus:border-cyan/50" />
            <Button id="test-ravi-btn" variant="ghost" onClick={testRavi} disabled={!testText.trim() || testingRavi}>
              {testingRavi ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
              Generate Ravi Draft
            </Button>
            {(raviDraft || testingRavi) && (
              <div className="min-h-24 whitespace-pre-wrap rounded-lg border border-cyan/20 bg-cyan/10 p-4 text-sm leading-6 text-cyan-50">
                {raviDraft || "Waiting for first token..."}
              </div>
            )}
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white">Owner Saved Templates</h3>
          <div className="mt-4 max-h-[260px] space-y-2 overflow-y-auto">
            {(ownerTemplates.data?.templates ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">Save common sales, follow-up, seasonal enquiry, and quote reminder templates here.</p>
            ) : (ownerTemplates.data?.templates ?? []).map((template) => (
              <button key={template.id} onClick={() => useLocalTemplate(template)} className="w-full rounded-lg border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-cyan/40">
                <div className="flex items-center justify-between gap-3">
                  <div className="truncate text-sm font-medium text-white">{template.name}</div>
                  <Badge tone="cyan">{template.language}</Badge>
                </div>
                <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{template.body}</div>
              </button>
            ))}
          </div>
        </div>

        {chakraTemplates.length > 0 && (
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white">ChakraHQ Approved Templates</h3>
            <div className="mt-4 max-h-[260px] space-y-2 overflow-y-auto">
              {chakraTemplates.map((template, index) => (
                <div key={`${template.name ?? index}`} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                  <div className="text-sm font-medium text-white">{template.name ?? "Unnamed template"}</div>
                  <div className="mt-1 text-xs text-slate-500">{template.language ?? template.status ?? "Chakra template"}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {status && <div className="mt-5 rounded-xl border border-cyan/20 bg-cyan/10 p-4 text-sm leading-6 text-cyan">{status}</div>}
    </section>
  );
}

function RuntimeTile({ label, enabled, detail }: { label: string; enabled: boolean; detail: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{label}</span>
        <span className={cn("h-2.5 w-2.5 rounded-full", enabled ? "bg-emerald-300" : "bg-amber-300")} />
      </div>
      <div className="mt-2 text-sm font-semibold text-white">{enabled ? "Ready" : "Off / Missing"}</div>
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
    </div>
  );
}

/* ─── Quotes Page ──────────────────────────────────────────────── */
function QuotesPage() {
  const qc = useQueryClient();
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<{ ok: boolean; quotes: Quote[] }>({
    queryKey: ["quotes"],
    queryFn: () => fetch("/api/quotes").then((r) => r.json()),
    refetchInterval: 10000,
  });

  const quotes = data?.quotes || [];

  async function approveQuote(quoteId: string, approved: boolean) {
    setApprovingId(quoteId);
    try {
      await fetch("/api/quotes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId, approved }),
      });
      refetch();
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <section className="h-full overflow-y-auto p-6">
      <ViewHeader title="Quotes" subtitle="Owner-supervised quote approval before customer-facing price release" />
      {isLoading && <div className="flex justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-cyan" /></div>}
      <div className="grid gap-4">
        {quotes.map((quote) => (
          <div key={quote.id} className="glass flex flex-wrap items-center justify-between gap-4 rounded-xl p-5">
            <div>
              <div className="text-sm font-semibold text-white">
                Quote #{quote.id.slice(0, 8)} · {quote.customer_company || quote.customer_name}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {quote.size_inches}" · {quote.grammage}g · {quote.lamination} lamination · {quote.quantity_kg} kg
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={quote.owner_approved ? "green" : "amber"}>
                {quote.owner_approved ? "Approved" : "Pending approval"}
              </Badge>
              <div className="text-right">
                <div className="text-sm font-semibold text-white">INR {quote.total_amount?.toLocaleString("en-IN")}</div>
                <div className="text-xs text-slate-500">INR {quote.unit_price}/kg</div>
              </div>
              {!quote.owner_approved && (
                <Button
                  onClick={() => approveQuote(quote.id, true)}
                  disabled={approvingId === quote.id}
                  className="bg-emerald-500/20 border-emerald-400/30 hover:bg-emerald-500/30"
                >
                  {approvingId === quote.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Approve
                </Button>
              )}
              <Button variant="ghost" size="icon" aria-label="Open quote"><ArrowUpRight className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        {!isLoading && quotes.length === 0 && (
          <div className="py-16 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-slate-700" />
            <p className="text-slate-500">No quotes yet</p>
            <p className="mt-1 text-sm text-slate-600">Quotes are generated when Ravi completes the slot-filling conversation.</p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Activity Page ────────────────────────────────────────────── */
function ActivityPage() {
  const { data, isLoading, refetch } = useQuery<{ ok: boolean; events: ActivityEvent[] }>({
    queryKey: ["activity-full"],
    queryFn: () => fetch("/api/activity?limit=100").then((r) => r.json()),
    refetchInterval: 5000,
  });

  const events = data?.events || [];

  function getTone(eventType: string): string {
    if (eventType.includes("error") || eventType.includes("fail")) return "red";
    if (eventType.includes("learned") || eventType.includes("memory")) return "green";
    if (eventType.includes("escalat") || eventType.includes("owner")) return "amber";
    if (eventType.includes("ravi") || eventType.includes("response")) return "cyan";
    return "violet";
  }

  return (
    <section className="h-full overflow-y-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <ViewHeader title="Activity Feed" subtitle="Real-time operating log across Ravi, Guru, Chakra, pricing, and production" compact />
        <Button variant="ghost" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
      </div>
      {isLoading && <div className="flex justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-cyan" /></div>}
      <div className="glass rounded-xl p-5">
        <div className="space-y-3">
          {events.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-xl border border-white/10 bg-white/[0.035] p-4"
            >
              <div className="flex items-start gap-3">
                <span className={cn(
                  "mt-1 h-2.5 w-2.5 rounded-full shrink-0",
                  getTone(event.event_type) === "green" ? "bg-emerald-400"
                  : getTone(event.event_type) === "violet" ? "bg-violet"
                  : getTone(event.event_type) === "amber" ? "bg-amber-300"
                  : getTone(event.event_type) === "red" ? "bg-red-400"
                  : "bg-cyan"
                )} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="truncate text-sm font-medium text-white">{event.event_type.replace(/_/g, " ")}</h4>
                    <span className="shrink-0 text-[11px] text-slate-500">{new Date(event.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {event.customer_company || event.actor}
                    {event.payload && Object.keys(event.payload).length > 0 && (
                      <span className="ml-2 text-slate-600">· {JSON.stringify(event.payload).slice(0, 80)}</span>
                    )}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
          {!isLoading && events.length === 0 && (
            <div className="py-12 text-center">
              <Zap className="mx-auto mb-4 h-12 w-12 text-slate-700" />
              <p className="text-slate-500">No activity yet</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─── Analytics Page ───────────────────────────────────────────── */
function AnalyticsPage() {
  const { data: statsData } = useQuery<{ ok: boolean; stats: DashboardStats }>({
    queryKey: ["dashboard-stats"],
    queryFn: () => fetch("/api/stats").then((r) => r.json()),
    refetchInterval: 30000,
  });

  const stats = statsData?.stats;
  const productionData = stats?.sevenDayProduction || [];

  return (
    <section className="h-full overflow-y-auto p-6">
      <ViewHeader title="Analytics" subtitle="Conversation quality, quote conversion, and operational visibility" />
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanel title="7-Day Production Trend">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={productionData}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="available" stroke="#38ef7d" fill="#38ef7d33" name="Available T" />
              <Area type="monotone" dataKey="booked" stroke="#8b5cf6" fill="#8b5cf633" name="Booked T" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white">Customer Stage Breakdown</h3>
          <div className="mt-5 space-y-3">
            {(stats?.stages || []).map((stage) => (
              <div key={stage.stage} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <div className="flex justify-between">
                  <div className="text-sm text-slate-200 capitalize">{stage.stage}</div>
                  <div className="text-sm font-semibold text-white">{stage.count}</div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-cyan"
                    style={{ width: `${Math.min(100, stage.count * 10)}%` }}
                  />
                </div>
              </div>
            ))}
            {(!stats?.stages || stats.stages.length === 0) && (
              <p className="text-sm text-slate-500">No customer data yet. Data builds as Ravi has conversations.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Settings Page ────────────────────────────────────────────── */
function SettingsPage() {
  const [seeding, setSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState("");
  const qc = useQueryClient();

  const { data: healthData, refetch: refetchHealth } = useQuery<{ ok: boolean; health: { healthy: boolean; tables: string[]; issues: string[]; counts: Record<string, number> } }>({
    queryKey: ["db-health"],
    queryFn: () => fetch("/api/db").then((r) => r.json()),
  });

  async function seedTestData() {
    setSeeding(true);
    setSeedStatus("Seeding test data...");
    try {
      const r = await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed" }),
      });
      const data = await r.json();
      setSeedStatus(data.ok ? `✅ Seeded: ${JSON.stringify(data.seeded)}` : `❌ ${data.message}`);
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      refetchHealth();
    } finally {
      setSeeding(false);
      setTimeout(() => setSeedStatus(""), 6000);
    }
  }

  const health = healthData?.health;

  return (
    <section className="h-full overflow-y-auto p-6">
      <ViewHeader title="Settings" subtitle="System health, v1 scope, and data-local deployment controls" />

      {/* Database Health */}
      <div className="mb-6 glass rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Database Health</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", health?.healthy ? "bg-emerald-400" : "bg-red-400")} />
              <span className="text-sm text-white">{health?.healthy ? "Healthy" : "Issues found"}</span>
            </div>
            {health && (
              <div className="mt-2 space-y-1">
                {Object.entries(health.counts).map(([table, count]) => (
                  <div key={table} className="flex justify-between text-xs text-slate-500">
                    <span>{table}</span><span>{count} rows</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-3">
            <Button variant="ghost" onClick={() => refetchHealth()} className="w-full">
              <RefreshCw className="h-4 w-4" />Check Health
            </Button>
            <Button onClick={seedTestData} disabled={seeding} className="w-full">
              {seeding ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              Seed Test Data
            </Button>
            {seedStatus && <p className="text-xs text-cyan">{seedStatus}</p>}
          </div>
        </div>
        {health?.issues && health.issues.length > 0 && (
          <div className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 p-3">
            {health.issues.map((issue, i) => (
              <p key={i} className="text-xs text-red-300">{issue}</p>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {[
          ["Database", "SQLite local on owner server (WAL mode)", Database, "green"],
          ["ChakraHQ", "Customer webhook and owner webhook separated", MessageCircle, "cyan"],
          ["Sarvam", "One model, two prompts: Ravi and Guru", Cpu, "violet"],
          ["Safety", "Price, delivery, meter weight from backend data only", ShieldCheck, "green"],
          ["Lead generation", "Disabled for v1", Bell, "amber"],
          ["Trading agent", "Deferred until sales core is stable", Clock3, "amber"],
        ].map(([title, detail, Icon, tone]) => (
          <div key={title as string} className="glass rounded-xl p-5">
            <Icon className="h-5 w-5 text-cyan" />
            <h3 className="mt-4 text-sm font-semibold text-white">{title as string}</h3>
            <p className="mt-2 text-sm text-slate-400">{detail as string}</p>
            <Badge tone={tone as "green" | "cyan" | "violet" | "amber"} className="mt-4">Configured</Badge>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Shared Components ────────────────────────────────────────── */
function ViewHeader({ title, subtitle, compact = false }: { title: string; subtitle: string; compact?: boolean }) {
  return (
    <div className={cn("mb-6 flex items-start justify-between gap-4", compact && "mb-4")}>
      <div>
        <h1 className={cn("font-semibold text-white", compact ? "text-lg" : "text-2xl")}>{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl p-5">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <Badge tone="cyan">Realtime</Badge>
      </div>
      {children}
    </div>
  );
}

function LiveActivityList({ events }: { events: ActivityEvent[] }) {
  function getTone(eventType: string): string {
    if (eventType.includes("error") || eventType.includes("fail")) return "red";
    if (eventType.includes("learned") || eventType.includes("memory")) return "green";
    if (eventType.includes("escalat") || eventType.includes("owner")) return "amber";
    if (eventType.includes("ravi")) return "cyan";
    return "violet";
  }

  return (
    <div className="space-y-3">
      {events.length === 0 && (
        <p className="text-xs text-slate-500">Waiting for activity...</p>
      )}
      {events.map((event) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-xl border border-white/10 bg-white/[0.035] p-4"
        >
          <div className="flex items-start gap-3">
            <span className={cn(
              "mt-1 h-2.5 w-2.5 rounded-full shrink-0",
              getTone(event.event_type) === "green" ? "bg-emerald-400"
              : getTone(event.event_type) === "violet" ? "bg-violet"
              : getTone(event.event_type) === "amber" ? "bg-amber-300"
              : getTone(event.event_type) === "red" ? "bg-red-400"
              : "bg-cyan"
            )} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <h4 className="truncate text-sm font-medium text-white">{event.event_type.replace(/_/g, " ")}</h4>
                <span className="shrink-0 text-[11px] text-slate-500">{new Date(event.created_at).toLocaleTimeString()}</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-400">{event.customer_company || event.actor}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

const tooltipStyle = {
  background: "rgba(8, 13, 22, 0.95)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  color: "#e5eefc",
};
