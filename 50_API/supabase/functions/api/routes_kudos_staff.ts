// Kudos routes (staff receiving kudos) — from staff_mobile
import { Hono } from "npm:hono";
import { getAuthUser, createServiceClient } from "./_shared.ts";

const kudosStaff = new Hono();

// GET /my-kudos — 自分が受領したKudos一覧
kudosStaff.get("/my-kudos", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth)
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);

    const supabase = createServiceClient();

    const { data: members, error: memberErr } = await supabase
      .from("company_member")
      .select("company_member_id, company_id")
      .eq("user_id", auth.userId)
      .eq("member_status", "active")
      .limit(1);

    if (memberErr)
      return c.json({ error_code: "INTERNAL_ERROR", message: `Member query error: ${memberErr.message}` }, 500);
    if (!members || members.length === 0)
      return c.json({ error_code: "FORBIDDEN", message: "No active company membership found" }, 403);

    const myMemberId = members[0].company_member_id;

    const statusParam = c.req.query("status") || "";
    const fromParam = c.req.query("from") || "";
    const toParam = c.req.query("to") || "";
    const limitParam = parseInt(c.req.query("limit") || "30", 10);
    const cursorParam = c.req.query("cursor") || "";
    const limit = Math.min(Math.max(limitParam || 30, 1), 100);

    const validStatuses = ["pending", "confirmed", "rejected"];
    let statusFilter: string[] = [];
    if (statusParam) {
      statusFilter = statusParam.split(",").map((s) => s.trim()).filter(Boolean);
      const invalid = statusFilter.find((s) => !validStatuses.includes(s));
      if (invalid)
        return c.json({ error_code: "VALIDATION_ERROR", message: `Invalid status: ${invalid}` }, 400);
    }

    let query = supabase
      .from("kudos")
      .select(`
        kudos_id, kudos_status, category, message_text, points_awarded,
        created_at, confirmed_at, stay_id, company_id,
        company:company_id ( company_name )
      `)
      .eq("receiver_company_member_id", myMemberId)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (statusFilter.length > 0) query = query.in("kudos_status", statusFilter);
    if (fromParam) query = query.gte("created_at", fromParam);
    if (toParam) {
      const toDate = new Date(toParam);
      toDate.setDate(toDate.getDate() + 1);
      query = query.lt("created_at", toDate.toISOString());
    }
    if (cursorParam) query = query.lt("created_at", cursorParam);

    const { data: kudosData, error: kudosErr } = await query;
    if (kudosErr)
      return c.json({ error_code: "INTERNAL_ERROR", message: `Kudos query error: ${kudosErr.message}` }, 500);

    const items = (kudosData || []).slice(0, limit).map((k: any) => ({
      kudos_id: k.kudos_id,
      kudos_status: k.kudos_status,
      category: k.category || "Other",
      message_preview: k.message_text ? k.message_text.substring(0, 80) : "",
      points_awarded: k.points_awarded || 0,
      created_at: k.created_at,
      confirmed_at: k.confirmed_at,
      stay_id: k.stay_id,
      company_name: k.company?.company_name || null,
    }));

    const hasMore = (kudosData || []).length > limit;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].created_at : null;

    const summaryPromises = validStatuses.map(async (status) => {
      const { count, error } = await supabase
        .from("kudos")
        .select("*", { count: "exact", head: true })
        .eq("receiver_company_member_id", myMemberId)
        .eq("kudos_status", status);
      return { status, count: error ? 0 : (count || 0) };
    });
    const summaryResults = await Promise.all(summaryPromises);
    const summary: Record<string, number> = {};
    for (const r of summaryResults) summary[r.status] = r.count;

    return c.json({ items, next_cursor: nextCursor, summary }, 200);
  } catch (err) {
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

// GET /my-kudos/:id — 単一Kudos詳細
kudosStaff.get("/my-kudos/:id", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth)
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);

    const kudosId = c.req.param("id");
    const supabase = createServiceClient();

    const { data: members, error: memberErr } = await supabase
      .from("company_member")
      .select("company_member_id")
      .eq("user_id", auth.userId)
      .eq("member_status", "active")
      .limit(1);

    if (memberErr || !members || members.length === 0)
      return c.json({ error_code: "FORBIDDEN", message: "No active company membership found" }, 403);

    const myMemberId = members[0].company_member_id;

    const { data: kudos, error: kudosErr } = await supabase
      .from("kudos")
      .select(`
        kudos_id, kudos_status, category, message_text, points_awarded,
        created_at, confirmed_at, stay_id, company_id, receiver_company_member_id,
        company:company_id ( company_name )
      `)
      .eq("kudos_id", kudosId)
      .maybeSingle();

    if (kudosErr)
      return c.json({ error_code: "INTERNAL_ERROR", message: `Query error: ${kudosErr.message}` }, 500);
    if (!kudos)
      return c.json({ error_code: "NOT_FOUND", message: "Kudos not found" }, 404);
    if (kudos.receiver_company_member_id !== myMemberId)
      return c.json({ error_code: "FORBIDDEN", message: "This kudos does not belong to you" }, 403);

    const { data: receipt } = await supabase
      .from("chain_receipt")
      .select("receipt_status, tx_hash, anchor_hash, created_at")
      .eq("kudos_id", kudosId)
      .maybeSingle();

    const proof = receipt
      ? {
          receipt_status: receipt.receipt_status,
          tx_hash: receipt.tx_hash,
          anchor_hash: receipt.anchor_hash,
          created_at: receipt.created_at,
        }
      : null;

    return c.json({
      kudos_id: kudos.kudos_id,
      kudos_status: kudos.kudos_status,
      category: kudos.category || "Other",
      message_text: kudos.message_text || "",
      points_awarded: kudos.points_awarded || 0,
      created_at: kudos.created_at,
      confirmed_at: kudos.confirmed_at,
      stay_id: kudos.stay_id,
      company_name: kudos.company?.company_name || null,
      proof,
    }, 200);
  } catch (err) {
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

export default kudosStaff;
