"use client";

import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
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
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
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
  activityEvents,
  chatMessages,
  customers,
  guruMessages,
  guruThreads,
  kpiCards,
  memoryNodes,
  navItems,
  priceData,
  productionData,
  quotePipeline,
  type ViewKey,
} from "@/lib/data";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";

const queryClient = new QueryClient();

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <SalesOS />
    </QueryClientProvider>
  );
}

function SalesOS() {
  const activeView = useUIStore((state) => state.activeView);
  const collapsed = useUIStore((state) => state.collapsed);

  useQuery({
    queryKey: ["live-operating-snapshot"],
    queryFn: async () => ({
      customers,
      activityEvents,
      productionData,
    }),
    refetchInterval: 5000,
  });

  return (
    <main className="relative h-screen overflow-hidden bg-void text-slate-100">
      <AmbientLayer />
      <div className="relative z-10 flex h-full min-w-0">
        <Sidebar />
        {activeView === "guru" ? (
          <GuruPage />
        ) : (
          <>
            <CustomerList className={collapsed ? "hidden xl:flex" : "flex"} />
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

function Sidebar() {
  const activeView = useUIStore((state) => state.activeView);
  const collapsed = useUIStore((state) => state.collapsed);
  const setActiveView = useUIStore((state) => state.setActiveView);
  const toggleCollapsed = useUIStore((state) => state.toggleCollapsed);

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
          ["Production sync", "82% load", "amber"],
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
              {!collapsed && item.badge && (
                <span className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] text-slate-300">{item.badge}</span>
              )}
              {active && <motion.span layoutId="nav-glow" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-cyan" />}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

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

type OwnerTemplate = {
  id: string;
  name: string;
  language: string;
  body: string;
  category: string;
  updatedAt: string;
};

function AgentControls() {
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

function CustomerList({ className }: { className?: string }) {
  const activeCustomerId = useUIStore((state) => state.activeCustomerId);
  const setActiveCustomerId = useUIStore((state) => state.setActiveCustomerId);
  const [search, setSearch] = useState("");
  const filtered = customers.filter((customer) => `${customer.company} ${customer.contact}`.toLowerCase().includes(search.toLowerCase()));

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
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] pl-9 pr-3 text-sm text-slate-100 outline-none transition focus:border-cyan/60 focus:shadow-glow"
            placeholder="Search company, GST, phone..."
          />
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {filtered.map((customer) => {
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
                  {customer.company.slice(0, 2)}
                  <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-ink bg-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <h3 className="line-clamp-1 text-sm font-semibold text-white">{customer.company}</h3>
                    {customer.unread > 0 && <span className="rounded-full bg-cyan px-1.5 text-[10px] font-semibold text-black">{customer.unread}</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{customer.contact}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-300">{customer.last}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={customer.stage.includes("Owner") || customer.stage.includes("Capacity") ? "amber" : customer.stage.includes("Confirmed") ? "green" : "violet"}>
                  {customer.stage}
                </Badge>
                <Badge tone="slate">{customer.language}</Badge>
                <Badge tone={customer.confidence > 90 ? "green" : customer.confidence > 80 ? "cyan" : "red"}>{customer.confidence}% AI</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                <span>{customer.tag}</span>
                <span className="flex items-center gap-1">
                  <CircleDot className="h-3 w-3 text-emerald-300" />
                  typing
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

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

function ChatWorkspace() {
  const activeCustomerId = useUIStore((state) => state.activeCustomerId);
  const customer = customers.find((item) => item.id === activeCustomerId) ?? customers[0];

  return (
    <section className="flex h-full min-w-0 flex-col">
      <div className="glass-strong flex h-20 items-center justify-between border-b border-white/10 px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-white">{customer.company}</h1>
            <Badge tone="cyan">{customer.stage}</Badge>
            <Badge tone={customer.gst ? "green" : "red"}>GST {customer.gst ? "Verified" : "Missing"}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span>{customer.contact}</span>
            <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{customer.phone}</span>
            <span>{customer.city}, {customer.state}</span>
            <span className="flex items-center gap-1"><Languages className="h-3.5 w-3.5" />{customer.language}</span>
          </div>
        </div>
        <div className="hidden items-center gap-3 xl:flex">
          <AgentPill />
          <Badge tone="green">Feasibility: Live check</Badge>
          <Badge tone="cyan">{customer.confidence}% confidence</Badge>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl space-y-5">
          {chatMessages.map((message, index) => (
            <MessageBubble key={`${message.time}-${index}`} message={message} />
          ))}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex max-w-[78%] gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan/30 bg-cyan/10">
              <Bot className="h-4 w-4 text-cyan" />
            </div>
            <div className="scan-line relative overflow-hidden rounded-xl border border-cyan/25 bg-cyan/10 px-4 py-3 text-sm text-cyan shadow-glow">
              Ravi AI is waiting for Guru memory update before sharing meter weight.
            </div>
          </motion.div>
        </div>
      </div>

      <div className="glass-strong border-t border-white/10 p-4">
        <div className="mx-auto flex max-w-4xl items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2">
          <Button variant="ghost" size="icon" aria-label="Attach file"><Paperclip className="h-4 w-4" /></Button>
          <input
            className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-slate-500"
            placeholder="Supervise Ravi, insert owner note, or draft WhatsApp reply..."
          />
          <Button variant="ghost" size="icon" aria-label="Voice note"><Mic className="h-4 w-4" /></Button>
          <Button size="icon" aria-label="Send"><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    </section>
  );
}

function MessageBubble({ message }: { message: (typeof chatMessages)[number] }) {
  if (message.role === "system") {
    return (
      <div className="flex justify-center">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-400">
          {message.text} <span className="text-slate-600">{message.time}</span>
        </div>
      </div>
    );
  }

  const isAI = message.role === "ai";
  return (
    <div className={cn("flex gap-3", isAI ? "justify-start" : "justify-end")}>
      {isAI && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan/30 bg-cyan/10">
          <Bot className="h-4 w-4 text-cyan" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[78%] rounded-2xl border px-4 py-3 text-sm leading-6",
          isAI
            ? "rounded-tl-sm border-cyan/25 bg-gradient-to-br from-cyan/12 to-violet/10 shadow-glow"
            : "rounded-tr-sm border-white/10 bg-white/[0.07]",
        )}
      >
        <p>{message.text}</p>
        <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-slate-500">
          {message.time}
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

function RightIntelligencePanel() {
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
            <p className="text-xs leading-5 text-slate-400">Ravi blocked price and delivery response until deterministic backend and production capacity are available.</p>
          </div>
        </PanelCard>

        <PanelCard title="Quote Pipeline" icon={<FileText className="h-4 w-4 text-violet-200" />}>
          <div className="space-y-3">
            {quotePipeline.map((item, index) => (
              <div key={item} className="flex items-center gap-3">
                <div className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-[10px]", index < 2 ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/[0.04] text-slate-500")}>
                  {index < 2 ? <Check className="h-3 w-3" /> : index + 1}
                </div>
                <span className="text-xs text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </PanelCard>

        <PanelCard title="Production Intelligence" icon={<Factory className="h-4 w-4 text-emerald-300" />}>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Loom use", "82%"],
              ["Today load", "7.4T"],
              ["Available", "1.6T"],
              ["Risk", "Medium"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <div className="text-[11px] text-slate-500">{label}</div>
                <div className="mt-1 text-lg font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>
        </PanelCard>

        <PanelCard title="AI Memory Events" icon={<Database className="h-4 w-4 text-cyan" />}>
          <div className="space-y-3">
            {memoryNodes.slice(0, 4).map((node) => (
              <div key={node.key} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <div className="line-clamp-1 text-xs font-medium text-slate-200">{node.key}</div>
                <div className="mt-1 line-clamp-1 text-xs text-slate-500">{node.value}</div>
              </div>
            ))}
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

function CommandCenter() {
  return (
    <section className="h-full overflow-y-auto p-6">
      <ViewHeader title="AI Command Center" subtitle="Owner-supervised autonomous WhatsApp sales workforce" />
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
            <Badge tone={card.color === "red" ? "red" : card.color === "amber" ? "amber" : card.color === "green" ? "green" : card.color === "violet" ? "violet" : "cyan"} className="mt-3">
              {card.delta}
            </Badge>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <ChartPanel title="Factory Operating Pulse">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={[...productionData]}>
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
              <Area type="monotone" dataKey="loom" stroke="#55e6ff" fill="url(#load)" strokeWidth={2} />
              <Line type="monotone" dataKey="booked" stroke="#8b5cf6" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>

        <div className="glass rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Live Activity Feed</h3>
            <Badge tone="cyan">Streaming</Badge>
          </div>
          <ActivityList />
        </div>
      </div>
    </section>
  );
}

function GuruPage() {
  return (
    <section className="flex h-full min-w-0 flex-1">
      <aside className="glass-strong hidden w-[300px] shrink-0 border-r border-white/10 p-4 lg:block">
        <ViewHeader title="Guru AI" subtitle="Internal learning agent" compact />
        <div className="space-y-2">
          {guruThreads.map((thread) => (
            <button
              key={thread.title}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left text-sm transition",
                thread.active ? "border-violet/40 bg-violet/10 text-white" : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-white",
              )}
            >
              <span>{thread.title}</span>
              <Badge tone={thread.active ? "violet" : "slate"}>{thread.items}</Badge>
            </button>
          ))}
        </div>
      </aside>

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
          <Badge tone="green">Knowledge writer active</Badge>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-4xl space-y-5">
            {guruMessages.map((message, index) => (
              <div key={index} className={cn("flex", message.role === "owner" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[78%] rounded-2xl border px-4 py-3 text-sm leading-6",
                    message.role === "owner"
                      ? "rounded-tr-sm border-white/10 bg-white/[0.07]"
                      : "rounded-tl-sm border-violet/30 bg-gradient-to-br from-violet/15 to-cyan/10 shadow-violet",
                  )}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-strong border-t border-white/10 p-4">
          <div className="mx-auto flex max-w-4xl items-center gap-3 rounded-xl border border-violet/25 bg-violet/10 p-2">
            <input className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-slate-500" placeholder="Teach Guru: meter weights, rules, exceptions, capacity, billing terms..." />
            <Button><Send className="h-4 w-4" />Send to Guru</Button>
          </div>
        </div>
      </div>

      <aside className="glass-strong hidden w-[360px] shrink-0 border-l border-white/10 p-5 xl:block">
        <h2 className="text-sm font-semibold text-white">AI Memory + Learning Events</h2>
        <p className="mt-1 text-xs text-slate-500">Customer-visible memory is separated from internal-only data.</p>
        <div className="mt-5 space-y-3">
          {memoryNodes.slice(0, 5).map((node) => (
            <div key={node.key} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="line-clamp-1 text-xs font-semibold text-white">{node.key}</div>
              <div className="mt-1 text-xs text-slate-400">{node.value}</div>
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

function KnowledgeBasePage() {
  return (
    <section className="h-full overflow-y-auto p-6">
      <ViewHeader title="Knowledge Base" subtitle="AI memory graph for rules, facts, meter weights, billing terms, and production policies" />
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <Search className="h-4 w-4 text-cyan" />
        <input className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500" placeholder="Semantic search memory nodes..." />
        <Badge tone="cyan">128 indexed nodes</Badge>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {memoryNodes.map((node) => (
          <motion.div key={node.key} whileHover={{ y: -2 }} className="glass rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="line-clamp-1 text-sm font-semibold text-white">{node.key}</h3>
                <p className="mt-2 text-sm text-slate-300">{node.value}</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan/20 bg-cyan/10">
                <Database className="h-5 w-5 text-cyan" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="violet">{node.type}</Badge>
              <Badge tone={node.scope === "customer_visible" ? "green" : "amber"}>{node.scope}</Badge>
              <Badge tone="slate">{node.freshness}% verified</Badge>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function ProductionPage() {
  return (
    <section className="h-full overflow-y-auto p-6">
      <ViewHeader title="Production Capacity" subtitle="Delivery promises must come from production capacity rows, never model text" />
      <div className="grid gap-4 lg:grid-cols-4">
        {[
          ["Loom utilization", "82%", Gauge],
          ["Booked today", "7.4T", Factory],
          ["Available capacity", "1.6T", Check],
          ["Delivery risk", "Medium", AlertTriangle],
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
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={[...productionData]}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="booked" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="available" fill="#38ef7d" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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

function PricingEnginePage() {
  const [quantity, setQuantity] = useState(800);
  const computed = useMemo(() => {
    const base = 80;
    const sizePremium = 0;
    const grammageDelta = -1;
    const lamination = 2;
    const color = 0;
    const unit = base + sizePremium + grammageDelta + lamination + color;
    return { unit, total: unit * quantity };
  }, [quantity]);

  return (
    <section className="h-full overflow-y-auto p-6">
      <ViewHeader title="Pricing Engine" subtitle="Deterministic INR/kg calculator. Ravi never invents prices." />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white">Live Quote Simulator</h3>
          <div className="mt-5 space-y-4">
            {[
              ["Base 3.0g price", "INR 80/kg"],
              ["Size premium", "36 inch = INR 0"],
              ["Grammage delta", "4.0g = INR -1"],
              ["Lamination", "Regular = INR +2"],
              ["Color premium", "White = INR 0"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
                <span className="text-slate-400">{label}</span>
                <span className="font-medium text-white">{value}</span>
              </div>
            ))}
            <label className="block text-xs text-slate-500">Quantity KG</label>
            <input
              type="range"
              min="100"
              max="3000"
              step="100"
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className="w-full accent-cyan"
            />
            <div className="rounded-xl border border-cyan/25 bg-cyan/10 p-4">
              <div className="text-xs text-cyan">Computed backend quote</div>
              <div className="mt-2 text-3xl font-semibold text-white">INR {computed.unit}/kg</div>
              <div className="text-sm text-slate-400">Total INR {computed.total.toLocaleString("en-IN")} for {quantity} kg</div>
            </div>
          </div>
        </div>
        <ChartPanel title="Grammage Price Curve">
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={[...priceData]}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis domain={[76, 82]} stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="price" stroke="#55e6ff" strokeWidth={3} dot={{ fill: "#55e6ff" }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>
    </section>
  );
}

function TemplatesPage() {
  const [templateName, setTemplateName] = useState("anjani_fabric_intro_en");
  const [language, setLanguage] = useState("en");
  const [body, setBody] = useState("Hello {{1}}, this is Ravi AI from Anjani Interweave. We manufacture PP woven fabric, laminated fabric and packaging bags. Reply with your fabric requirement.");
  const [phone, setPhone] = useState("919408724777");
  const [salesText, setSalesText] = useState("Hello, this is Ravi AI from Anjani Interweave. Please share your fabric size, grammage, lamination and quantity requirement.");
  const [testText, setTestText] = useState("Customer asks: 36 inch 3.5 gram silver laminated fabric, 800 kg, Patna. Ask next step without giving price.");
  const [status, setStatus] = useState("");
  const [templates, setTemplates] = useState<any[]>([]);
  const ownerTemplates = useQuery<{ templates: OwnerTemplate[] }>({
    queryKey: ["owner-templates"],
    queryFn: async () => {
      const response = await fetch("/api/templates");
      if (!response.ok) throw new Error("Failed to load owner templates");
      return response.json();
    },
  });
  const runtime = useQuery<AgentRuntimeResponse>({
    queryKey: ["agent-runtime-state"],
    queryFn: async () => {
      const response = await fetch("/api/agent/state");
      if (!response.ok) throw new Error("Failed to load agent state");
      return response.json();
    },
    refetchInterval: 8000,
  });

  async function saveLocalTemplate() {
    setStatus("Saving owner template...");
    const response = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: templateName, language, category: "UTILITY", body }),
    });
    const data = await response.json();
    setStatus(data.ok ? "Owner template saved for future Ravi/Guru use." : `Template save error: ${data.error}`);
    await ownerTemplates.refetch();
  }

  function useLocalTemplate(template: OwnerTemplate) {
    setTemplateName(template.name);
    setLanguage(template.language);
    setBody(template.body);
    setSalesText(template.body);
    setStatus(`Loaded owner template: ${template.name}`);
  }

  async function createChakraTemplate() {
    setStatus("Creating template in ChakraHQ...");
    const response = await fetch("/api/chakra/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: templateName, language, category: "UTILITY", body }),
    });
    const data = await response.json();
    setStatus(data.ok ? "Template submitted to ChakraHQ for approval." : `Template error: ${data.error}`);
  }

  async function loadTemplates() {
    setStatus("Loading ChakraHQ templates...");
    const response = await fetch("/api/chakra/templates");
    const data = await response.json();
    const list = Array.isArray(data?.result?.data) ? data.result.data : Array.isArray(data?.result) ? data.result : [];
    setTemplates(list);
    setStatus(data.ok ? `Loaded ${list.length} templates.` : `Template list error: ${data.error}`);
  }

  async function sendSalesMessage() {
    setStatus("Sending sales WhatsApp message...");
    const response = await fetch("/api/chakra/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: phone, text: salesText, mode: "sales" }),
    });
    const data = await response.json();
    setStatus(data.ok ? "Sales message sent through ChakraHQ." : `Send error: ${data.error}`);
  }

  async function testRavi() {
    setStatus("Calling Sarvam for Ravi test...");
    const response = await fetch("/api/sarvam/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona: "ravi", text: testText }),
    });
    const data = await response.json();
    setStatus(data.ok ? `Ravi draft: ${data.content}` : `Sarvam error: ${data.error}`);
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
            <input value={templateName} onChange={(event) => setTemplateName(event.target.value)} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyan/50" placeholder="template_name" />
            <select value={language} onChange={(event) => setLanguage(event.target.value)} className="rounded-lg border border-white/10 bg-ink px-3 py-3 text-sm outline-none focus:border-cyan/50">
              {["en", "hi", "gu", "ta", "te", "kn", "ml"].map((code) => <option key={code}>{code}</option>)}
            </select>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={5} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 text-sm leading-6 outline-none focus:border-cyan/50" />
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
            <input value={phone} onChange={(event) => setPhone(event.target.value)} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyan/50" placeholder="919XXXXXXXXX" />
            <textarea value={salesText} onChange={(event) => setSalesText(event.target.value)} rows={5} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 text-sm leading-6 outline-none focus:border-cyan/50" />
            <Button onClick={sendSalesMessage}><Send className="h-4 w-4" />Send Sales Message</Button>
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white">Test Ravi With Sarvam</h3>
          <div className="mt-4 grid gap-3">
            <textarea value={testText} onChange={(event) => setTestText(event.target.value)} rows={5} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 text-sm leading-6 outline-none focus:border-cyan/50" />
            <Button variant="ghost" onClick={testRavi}><Bot className="h-4 w-4" />Generate Ravi Draft</Button>
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

        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white">ChakraHQ Approved Templates</h3>
          <div className="mt-4 max-h-[260px] space-y-2 overflow-y-auto">
            {templates.length === 0 ? (
              <p className="text-sm text-slate-500">Click List Templates after env keys are configured.</p>
            ) : templates.map((template, index) => (
              <div key={`${template.name ?? index}`} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <div className="text-sm font-medium text-white">{template.name ?? "Unnamed template"}</div>
                <div className="mt-1 text-xs text-slate-500">{template.language ?? template.status ?? "Chakra template"}</div>
              </div>
            ))}
          </div>
        </div>
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

function QuotesPage() {
  return (
    <section className="h-full overflow-y-auto p-6">
      <ViewHeader title="Quotes" subtitle="Owner-supervised quote approval before customer-facing price release" />
      <div className="grid gap-4">
        {customers.slice(0, 5).map((customer, index) => (
          <div key={customer.id} className="glass flex flex-wrap items-center justify-between gap-4 rounded-xl p-5">
            <div>
              <div className="text-sm font-semibold text-white">Quote #{1048 + index} · {customer.company}</div>
              <div className="mt-1 text-xs text-slate-500">36 inch · 3.5g · Regular lamination · {600 + index * 200} kg</div>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={index % 2 ? "amber" : "green"}>{index % 2 ? "Owner review" : "Approved"}</Badge>
              <div className="text-right">
                <div className="text-sm font-semibold text-white">INR {(52000 + index * 18600).toLocaleString("en-IN")}</div>
                <div className="text-xs text-slate-500">Snapshot saved</div>
              </div>
              <Button variant="ghost" size="icon" aria-label="Open quote"><ArrowUpRight className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActivityPage() {
  return (
    <section className="h-full overflow-y-auto p-6">
      <ViewHeader title="Activity Feed" subtitle="Real-time operating log across Ravi, Guru, Chakra, pricing, and production" />
      <div className="glass rounded-xl p-5">
        <ActivityList expanded />
      </div>
    </section>
  );
}

function AnalyticsPage() {
  return (
    <section className="h-full overflow-y-auto p-6">
      <ViewHeader title="Analytics" subtitle="Conversation quality, quote conversion, and operational visibility" />
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanel title="Quote Conversion">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={[...productionData]}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="available" stroke="#38ef7d" fill="#38ef7d33" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white">Language Mix</h3>
          <div className="mt-5 space-y-3">
            {["Hindi 48%", "Tamil 22%", "Gujarati 18%", "English 12%"].map((item, index) => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <div className="text-sm text-slate-200">{item}</div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-cyan" style={{ width: `${[48, 22, 18, 12][index]}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SettingsPage() {
  return (
    <section className="h-full overflow-y-auto p-6">
      <ViewHeader title="Settings" subtitle="System health, v1 scope, and data-local deployment controls" />
      <div className="grid gap-4 xl:grid-cols-2">
        {[
          ["Database", "PostgreSQL local on owner server", Database, "green"],
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

function ActivityList({ expanded = false }: { expanded?: boolean }) {
  const list = expanded ? [...activityEvents, ...activityEvents, ...activityEvents] : activityEvents;
  return (
    <div className="space-y-3">
      {list.map((event, index) => (
        <motion.div
          key={`${event.label}-${index}`}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.03 }}
          className="rounded-xl border border-white/10 bg-white/[0.035] p-4"
        >
          <div className="flex items-start gap-3">
            <span className={cn("mt-1 h-2.5 w-2.5 rounded-full", event.tone === "green" ? "bg-emerald-400" : event.tone === "violet" ? "bg-violet" : event.tone === "amber" ? "bg-amber-300" : event.tone === "cyan" ? "bg-cyan" : "bg-slate-500")} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <h4 className="truncate text-sm font-medium text-white">{event.label}</h4>
                <span className="shrink-0 text-[11px] text-slate-500">{event.time}</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-400">{event.detail}</p>
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
