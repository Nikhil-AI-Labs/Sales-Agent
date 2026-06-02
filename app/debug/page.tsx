"use client";

import { useQuery } from "@tanstack/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Database, MessageCircle, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const queryClient = new QueryClient();

export default function DebugPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <DebugDashboard />
    </QueryClientProvider>
  );
}

function DebugDashboard() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["debug-webhooks"],
    queryFn: () => fetch("/api/debug/webhooks").then((r) => r.json()),
    refetchInterval: 5000,
  });

  const debug = data?.debug;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Webhook Debug Dashboard</h1>
            <p className="mt-1 text-sm text-slate-400">Monitor ChakraHQ webhooks and system status</p>
          </div>
          <Button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
        )}

        {!isLoading && debug && (
          <div className="space-y-6">
            {/* Environment Status */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                <h2 className="text-xl font-semibold">Environment Configuration</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <StatusCard
                  label="ChakraHQ API"
                  status={debug.environment.chakraConfigured}
                />
                <StatusCard
                  label="Sarvam AI"
                  status={debug.environment.sarvamConfigured}
                />
                <StatusCard
                  label="Owner Phone"
                  status={debug.environment.ownerPhone !== "not set"}
                  value={debug.environment.ownerPhone}
                />
                <StatusCard
                  label="Webhook Secret"
                  status={debug.environment.webhookSecret === "***set***"}
                  value={debug.environment.webhookSecret}
                />
              </div>
            </div>

            {/* Agent State */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-violet-400" />
                <h2 className="text-xl font-semibold">Agent Runtime State</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <StatusCard
                  label="Agent Enabled"
                  status={debug.agentState.agentEnabled}
                />
                <StatusCard
                  label="Ravi Enabled"
                  status={debug.agentState.raviEnabled}
                />
                <StatusCard
                  label="Auto Send Replies"
                  status={debug.agentState.autoSendRaviReplies}
                />
                <StatusCard
                  label="Outbound Sales"
                  status={debug.agentState.outboundSalesEnabled}
                />
              </div>
              {debug.agentState.updatedAt && (
                <p className="mt-3 text-xs text-slate-500">
                  Last updated: {new Date(debug.agentState.updatedAt).toLocaleString()}
                </p>
              )}
            </div>

            {/* Customers */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="mb-4 flex items-center gap-2">
                <Database className="h-5 w-5 text-cyan-400" />
                <h2 className="text-xl font-semibold">Customers ({debug.customers.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-700">
                    <tr>
                      <th className="pb-2 text-left font-semibold text-slate-300">Phone</th>
                      <th className="pb-2 text-left font-semibold text-slate-300">Name</th>
                      <th className="pb-2 text-left font-semibold text-slate-300">Company</th>
                      <th className="pb-2 text-left font-semibold text-slate-300">Stage</th>
                      <th className="pb-2 text-right font-semibold text-slate-300">Messages</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {debug.customers.map((customer: any) => (
                      <tr key={customer.id} className="hover:bg-slate-700/30">
                        <td className="py-2 text-slate-300">{customer.phone}</td>
                        <td className="py-2 text-slate-200">{customer.name}</td>
                        <td className="py-2 text-slate-200">{customer.company || "-"}</td>
                        <td className="py-2">
                          <Badge
                            tone={
                              customer.stage === "quoted" ? "violet" :
                              customer.stage === "confirmed" ? "green" :
                              customer.stage === "greeting" ? "cyan" : "slate"
                            }
                          >
                            {customer.stage}
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          <span className="text-slate-400">
                            {customer.total_messages} total
                            {" "}({customer.user_messages} user, {customer.ai_messages} AI)
                          </span>
                        </td>
                      </tr>
                    ))}
                    {debug.customers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          No customers yet. Send a WhatsApp message to the business number to create one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Messages */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="mb-4 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-emerald-400" />
                <h2 className="text-xl font-semibold">Recent Messages ({debug.recentMessages.length})</h2>
              </div>
              <div className="space-y-3">
                {debug.recentMessages.slice(0, 10).map((msg: any) => (
                  <div key={msg.id} className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-200">
                          {msg.customer_name} ({msg.customer_phone})
                        </span>
                        <Badge tone={msg.role === "user" ? "cyan" : msg.role === "assistant" ? "violet" : "slate"}>
                          {msg.role}
                        </Badge>
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">{msg.content}</p>
                  </div>
                ))}
                {debug.recentMessages.length === 0 && (
                  <p className="py-8 text-center text-slate-500">
                    No messages yet. Start a conversation via WhatsApp!
                  </p>
                )}
              </div>
            </div>

            {/* Webhook Log */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-amber-400" />
                <h2 className="text-xl font-semibold">Webhook Events ({debug.webhookLog.length})</h2>
              </div>
              <div className="space-y-3">
                {debug.webhookLog.map((event: any) => (
                  <div key={event.id} className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <Badge
                        tone={
                          event.type === "ravi_processed" ? "green" :
                          event.type === "customer_inbound" ? "cyan" :
                          event.type.includes("error") ? "red" : "amber"
                        }
                      >
                        {event.type}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {new Date(event.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <pre className="overflow-x-auto text-xs text-slate-400">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  </div>
                ))}
                {debug.webhookLog.length === 0 && (
                  <p className="py-8 text-center text-slate-500">
                    No webhook events logged yet. Send a message to trigger webhooks.
                  </p>
                )}
              </div>
            </div>

            {/* Timestamp */}
            <div className="text-center text-xs text-slate-500">
              Last updated: {new Date(debug.timestamp).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function StatusCard({ label, status, value }: { label: string; status: boolean; value?: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        {status ? (
          <CheckCircle className="h-4 w-4 text-emerald-400" />
        ) : (
          <XCircle className="h-4 w-4 text-red-400" />
        )}
      </div>
      {value && (
        <p className="text-sm text-slate-200">{value}</p>
      )}
      {!value && (
        <p className={`text-sm font-semibold ${status ? "text-emerald-400" : "text-red-400"}`}>
          {status ? "Configured" : "Not Set"}
        </p>
      )}
    </div>
  );
}
