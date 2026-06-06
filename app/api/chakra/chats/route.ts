import { NextResponse } from "next/server";
import { getConfig } from "@/lib/server/config";

export const runtime = "nodejs";

/**
 * GET /api/chakra/chats - List all ChakraHQ conversations
 * Uses correct ChakraHQ API: POST https://api.chakrahq.com/v1/ext/chat
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "25");
  const search = url.searchParams.get("search") || "";

  const config = getConfig();

  if (!config.chakraApiKey) {
    return NextResponse.json({ ok: false, error: "CHAKRA_API_KEY not set" }, { status: 500 });
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.chakraApiKey}`,
    "Content-Type": "application/json",
  };

  try {
    const body: Record<string, unknown> = {
      orderField: "createdAt",
      orderDirection: "desc",
      limit,
      page,
    };
    if (search) {
      body.search = search;
    }

    const res = await fetch("https://api.chakrahq.com/v1/ext/chat", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        status: res.status,
        error: data?.message || data?._errors?.[0] || `ChakraHQ error ${res.status}`,
        raw: data,
      });
    }

    // Normalize ChakraHQ response format: { _data: [], _meta: {} }
    const chats = data?._data ?? data?.data ?? data?.chats ?? data ?? [];
    const meta = data?._meta ?? {};

    return NextResponse.json({
      ok: true,
      chats: Array.isArray(chats) ? chats : [],
      meta,
      total: meta?.total ?? (Array.isArray(chats) ? chats.length : 0),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
