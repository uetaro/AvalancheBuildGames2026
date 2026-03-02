// Staff profile routes — from staff_mobile
import { Hono } from "npm:hono";
import { getAuthUser, createServiceClient } from "./_shared.ts";

const AVATAR_BUCKET = "make-c253248c-avatars";

async function ensureAvatarBucket() {
  const supabase = createServiceClient();
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b: any) => b.name === AVATAR_BUCKET)) {
    const { error } = await supabase.storage.createBucket(AVATAR_BUCKET, { public: false });
    if (error) console.log(`Failed to create avatar bucket: ${error.message}`);
  }
}

ensureAvatarBucket().catch((err) => console.log(`Avatar bucket init error: ${err}`));

const profile = new Hono();

// GET /my-profile
profile.get("/my-profile", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth)
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);

    const supabase = createServiceClient();

    const { data: { user: authUser }, error: authErr } = await supabase.auth.admin.getUserById(auth.userId);
    if (authErr || !authUser)
      return c.json({ error_code: "INTERNAL_ERROR", message: `Failed to get user info: ${authErr?.message}` }, 500);

    const { data: members, error: memberErr } = await supabase
      .from("company_member")
      .select("company_member_id, company_id, member_role, member_status, display_name_override, job_title, public_profile_json, visibility_scope, version, updated_at")
      .eq("user_id", auth.userId)
      .eq("member_status", "active")
      .limit(1);

    if (memberErr)
      return c.json({ error_code: "INTERNAL_ERROR", message: `Member query error: ${memberErr.message}` }, 500);

    const member = members && members.length > 0 ? members[0] : null;
    let companyName: string | null = null;
    if (member) {
      const { data: companyData } = await supabase
        .from("company")
        .select("company_name")
        .eq("company_id", member.company_id)
        .single();
      companyName = companyData?.company_name || null;
    }

    const displayName =
      member?.display_name_override ||
      authUser.user_metadata?.name ||
      authUser.user_metadata?.full_name ||
      authUser.email?.split("@")[0] ||
      "(No Name)";

    let avatarUrl: string | null = null;
    const { data: avatarFiles } = await supabase.storage
      .from(AVATAR_BUCKET)
      .list(auth.userId, { limit: 1, search: "avatar" });
    if (avatarFiles && avatarFiles.length > 0) {
      const file = avatarFiles.find((f: any) => f.name.startsWith("avatar"));
      if (file) {
        const { data: signedData } = await supabase.storage
          .from(AVATAR_BUCKET)
          .createSignedUrl(`${auth.userId}/${file.name}`, 3600);
        avatarUrl = signedData?.signedUrl || null;
      }
    }

    return c.json({
      user_id: auth.userId,
      email: authUser.email || "",
      display_name: displayName,
      auth_name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || null,
      avatar_url: avatarUrl,
      has_company: !!member,
      company_member: member
        ? {
            company_member_id: member.company_member_id,
            company_id: member.company_id,
            company_name: companyName,
            member_role: member.member_role,
            display_name_override: member.display_name_override || "",
            job_title: member.job_title || "",
            public_profile_json: member.public_profile_json || {},
            visibility_scope: member.visibility_scope || "company",
            version: member.version,
            updated_at: member.updated_at,
          }
        : null,
    }, 200);
  } catch (err) {
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

// PUT /my-profile
profile.put("/my-profile", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth)
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);

    const body = await c.req.json();
    const { expected_version, display_name_override, job_title, public_profile_json, visibility_scope } = body;

    if (expected_version === undefined || expected_version === null)
      return c.json({ error_code: "VALIDATION_ERROR", message: "expected_version is required" }, 400);
    if (display_name_override !== undefined && (typeof display_name_override !== "string" || display_name_override.length > 50))
      return c.json({ error_code: "VALIDATION_ERROR", message: "display_name_override must be a string up to 50 characters" }, 400);
    if (job_title !== undefined && (typeof job_title !== "string" || job_title.length > 50))
      return c.json({ error_code: "VALIDATION_ERROR", message: "job_title must be a string up to 50 characters" }, 400);
    if (visibility_scope !== undefined && !["company", "group", "platform"].includes(visibility_scope))
      return c.json({ error_code: "VALIDATION_ERROR", message: "visibility_scope must be company, group, or platform" }, 400);

    const supabase = createServiceClient();

    const { data: members, error: memberErr } = await supabase
      .from("company_member")
      .select("company_member_id, version")
      .eq("user_id", auth.userId)
      .eq("member_status", "active")
      .limit(1);

    if (memberErr)
      return c.json({ error_code: "INTERNAL_ERROR", message: `Member query error: ${memberErr.message}` }, 500);
    if (!members || members.length === 0)
      return c.json({ error_code: "FORBIDDEN", message: "No active company membership found" }, 403);

    const member = members[0];
    const updateData: Record<string, any> = {
      version: member.version + 1,
      updated_at: new Date().toISOString(),
    };
    if (display_name_override !== undefined) updateData.display_name_override = display_name_override || null;
    if (job_title !== undefined) updateData.job_title = job_title || null;
    if (public_profile_json !== undefined) updateData.public_profile_json = public_profile_json;
    if (visibility_scope !== undefined) updateData.visibility_scope = visibility_scope;

    const { data: updated, error: updateErr } = await supabase
      .from("company_member")
      .update(updateData)
      .eq("company_member_id", member.company_member_id)
      .eq("version", expected_version)
      .select("company_member_id, version, updated_at")
      .maybeSingle();

    if (updateErr)
      return c.json({ error_code: "INTERNAL_ERROR", message: `Update failed: ${updateErr.message}` }, 500);
    if (!updated)
      return c.json({ error_code: "VERSION_CONFLICT", message: "Profile was modified elsewhere. Please refresh and try again." }, 409);

    return c.json({ company_member_id: updated.company_member_id, version: updated.version, updated_at: updated.updated_at }, 200);
  } catch (err) {
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

// POST /my-profile/avatar
profile.post("/my-profile/avatar", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth)
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);

    const supabase = createServiceClient();
    const formData = await c.req.formData();
    const file = formData.get("avatar");

    if (!file || !(file instanceof File))
      return c.json({ error_code: "VALIDATION_ERROR", message: "avatar file is required" }, 400);

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type))
      return c.json({ error_code: "VALIDATION_ERROR", message: "Only JPEG, PNG, WebP, and GIF images are allowed" }, 400);
    if (file.size > 5 * 1024 * 1024)
      return c.json({ error_code: "VALIDATION_ERROR", message: "File size must be under 5MB" }, 400);

    const extMap: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
    const ext = extMap[file.type] || "jpg";
    const storagePath = `${auth.userId}/avatar.${ext}`;

    const { data: existingFiles } = await supabase.storage
      .from(AVATAR_BUCKET)
      .list(auth.userId, { limit: 10, search: "avatar" });
    if (existingFiles && existingFiles.length > 0) {
      const toDelete = existingFiles
        .filter((f: any) => f.name.startsWith("avatar"))
        .map((f: any) => `${auth.userId}/${f.name}`);
      if (toDelete.length > 0) await supabase.storage.from(AVATAR_BUCKET).remove(toDelete);
    }

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadErr } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: true });

    if (uploadErr)
      return c.json({ error_code: "INTERNAL_ERROR", message: `Upload failed: ${uploadErr.message}` }, 500);

    const { data: signedData } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(storagePath, 3600);

    return c.json({ avatar_url: signedData?.signedUrl || null, path: storagePath }, 200);
  } catch (err) {
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

// DELETE /my-profile/avatar
profile.delete("/my-profile/avatar", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth)
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);

    const supabase = createServiceClient();
    const { data: existingFiles } = await supabase.storage
      .from(AVATAR_BUCKET)
      .list(auth.userId, { limit: 10, search: "avatar" });

    if (existingFiles && existingFiles.length > 0) {
      const toDelete = existingFiles
        .filter((f: any) => f.name.startsWith("avatar"))
        .map((f: any) => `${auth.userId}/${f.name}`);
      if (toDelete.length > 0) {
        const { error: removeErr } = await supabase.storage.from(AVATAR_BUCKET).remove(toDelete);
        if (removeErr)
          return c.json({ error_code: "INTERNAL_ERROR", message: `Delete failed: ${removeErr.message}` }, 500);
      }
    }

    return c.json({ success: true }, 200);
  } catch (err) {
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

export default profile;
