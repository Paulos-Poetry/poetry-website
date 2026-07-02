import { supabase, PDF_BUCKET } from "./supabaseClient";

// ---------- Types ----------

export interface Profile {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
}

export interface Comment {
  _id?: string;
  author: string;
  text: string;
  createdAt: Date | string;
  userId?: string | null;
}

export interface Poem {
  _id?: string;
  title: string;
  contentEnglish: string;
  contentGreek: string;
  likes: number;
  comments: Comment[];
  createdAt?: Date | string;
}

export interface Translation {
  _id?: string;
  title: string;
  createdAt: Date | string;
  content?: string | null;
  contentType?: string | null;
  /** Path inside the "pdfs" storage bucket (new uploads) */
  pdfPath?: string | null;
  /** Public URL for the PDF when stored in Supabase Storage */
  pdfUrl?: string | null;
  /** Legacy PDFs stored directly in the database (old migration) */
  pdf_data?: string | null;
}

interface CommentRow {
  id: string;
  author: string;
  text: string;
  created_at: string;
  user_id?: string | null;
}

interface PoemRow {
  id: string;
  title: string;
  content_english: string;
  content_greek: string;
  likes: number | null;
  created_at: string;
  comments?: CommentRow[];
}

interface TranslationRow {
  id: string;
  title: string;
  content?: string | null;
  content_type?: string | null;
  pdf_path?: string | null;
  created_at: string;
}

// ---------- Helpers ----------

// True when the database hasn't had supabase/setup.sql applied yet
// (missing column errors). Lets the public pages keep working either way.
function isMissingColumn(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  return !!e && (e.code === "42703" || /column .* does not exist/i.test(e.message || ""));
}

function publicPdfUrl(pdfPath: string | null | undefined): string | null {
  if (!pdfPath) return null;
  const { data } = supabase.storage.from(PDF_BUCKET).getPublicUrl(pdfPath);
  return data?.publicUrl || null;
}

function mapComment(c: CommentRow): Comment {
  return {
    _id: c.id,
    author: c.author,
    text: c.text,
    createdAt: c.created_at,
    userId: c.user_id ?? null,
  };
}

export class SupabaseService {
  // ---------- Auth (Supabase Auth — secure, server-side password handling) ----------

  static async signUp(username: string, email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) throw error;
    // If email confirmation is enabled in Supabase, there is no session yet.
    return { user: data.user, needsEmailConfirmation: !data.session };
  }

  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  }

  static async signOut() {
    await supabase.auth.signOut();
  }

  static async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, email, is_admin")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    if (!data) return null;
    return {
      id: data.id,
      username: data.username,
      email: data.email,
      isAdmin: !!data.is_admin,
    };
  }

  // Verify admin passcode — secure server-side RPC; promotes the caller only.
  static async verifyAdminPasscode(
    userId: string,
    passcode: string
  ): Promise<{ success: boolean; message: string }> {
    const { data, error } = await supabase.rpc("verify_admin_passcode", {
      user_id: userId,
      provided_passcode: passcode,
    });
    if (error) {
      console.error("Error verifying admin passcode:", error);
      throw new Error("Failed to verify passcode");
    }
    return data as { success: boolean; message: string };
  }

  // ---------- Poems ----------

  static async getAllPoems(): Promise<Poem[]> {
    let res = await supabase
      .from("poems")
      .select(
        `id, title, content_english, content_greek, likes, created_at,
         comments ( id, author, text, created_at, user_id )`
      )
      .order("created_at", { ascending: false });
    if (res.error && isMissingColumn(res.error)) {
      res = (await supabase
        .from("poems")
        .select(
          `id, title, content_english, content_greek, likes, created_at,
           comments ( id, author, text, created_at )`
        )
        .order("created_at", { ascending: false })) as unknown as typeof res;
    }
    if (res.error) throw res.error;
    const data = (res.data || []) as unknown as PoemRow[];

    return data.map((poem) => ({
      _id: poem.id,
      title: poem.title,
      contentEnglish: poem.content_english,
      contentGreek: poem.content_greek,
      likes: poem.likes ?? 0,
      createdAt: poem.created_at,
      comments: ((poem.comments as CommentRow[]) || []).map(mapComment),
    }));
  }

  static async getPoemById(id: string): Promise<Poem> {
    let res = await supabase
      .from("poems")
      .select(
        `id, title, content_english, content_greek, likes, created_at,
         comments ( id, author, text, created_at, user_id )`
      )
      .eq("id", id)
      .single();
    if (res.error && isMissingColumn(res.error)) {
      res = (await supabase
        .from("poems")
        .select(
          `id, title, content_english, content_greek, likes, created_at,
           comments ( id, author, text, created_at )`
        )
        .eq("id", id)
        .single()) as unknown as typeof res;
    }
    if (res.error) throw res.error;
    const data = res.data as unknown as PoemRow;

    return {
      _id: data.id,
      title: data.title,
      contentEnglish: data.content_english,
      contentGreek: data.content_greek,
      likes: data.likes ?? 0,
      createdAt: data.created_at,
      comments: ((data.comments as CommentRow[]) || []).map(mapComment),
    };
  }

  static async createPoem(poem: {
    title: string;
    contentEnglish: string;
    contentGreek: string;
  }): Promise<Poem> {
    const { data, error } = await supabase
      .from("poems")
      .insert({
        title: poem.title,
        content_english: poem.contentEnglish,
        content_greek: poem.contentGreek,
        likes: 0,
      })
      .select()
      .single();
    if (error) throw error;

    return {
      _id: data.id,
      title: data.title,
      contentEnglish: data.content_english,
      contentGreek: data.content_greek,
      likes: data.likes ?? 0,
      createdAt: data.created_at,
      comments: [],
    };
  }

  static async updatePoem(
    id: string,
    poem: { title: string; contentEnglish: string; contentGreek: string }
  ): Promise<Poem> {
    const { data, error } = await supabase
      .from("poems")
      .update({
        title: poem.title,
        content_english: poem.contentEnglish,
        content_greek: poem.contentGreek,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    return {
      _id: data.id,
      title: data.title,
      contentEnglish: data.content_english,
      contentGreek: data.content_greek,
      likes: data.likes ?? 0,
      createdAt: data.created_at,
      comments: [],
    };
  }

  static async deletePoem(id: string): Promise<void> {
    const { error } = await supabase.from("poems").delete().eq("id", id);
    if (error) throw error;
  }

  // Atomic like counter via RPC (works for anonymous visitors too)
  static async likePoem(id: string): Promise<number> {
    const { data, error } = await supabase.rpc("increment_likes", {
      poem_uuid: id,
    });
    if (error) throw error;
    return data as number;
  }

  // ---------- Comments ----------

  static async addComment(poemId: string, author: string, text: string): Promise<Comment> {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) throw new Error("You must be logged in to comment");

    const { data, error } = await supabase
      .from("comments")
      .insert({ poem_id: poemId, author, text, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return mapComment(data as CommentRow);
  }

  static async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) throw error;
  }

  // ---------- Translations ----------
  // List queries deliberately EXCLUDE pdf_data so landing pages stay fast
  // (legacy PDFs are ~1 MB per row).

  static async getAllTranslations(): Promise<Translation[]> {
    let res = await supabase
      .from("translations")
      .select("id, title, content, content_type, pdf_path, created_at")
      .order("created_at", { ascending: false });
    if (res.error && isMissingColumn(res.error)) {
      res = (await supabase
        .from("translations")
        .select("id, title, content, content_type, created_at")
        .order("created_at", { ascending: false })) as unknown as typeof res;
    }
    if (res.error) throw res.error;
    const data = (res.data || []) as unknown as TranslationRow[];

    return data.map((item) => ({
      _id: item.id,
      title: item.title,
      createdAt: item.created_at,
      content: item.content,
      contentType: item.content_type,
      pdfPath: item.pdf_path,
      pdfUrl: publicPdfUrl(item.pdf_path),
    }));
  }

  static async getTranslationById(id: string): Promise<Translation> {
    // First fetch metadata only; pull heavy pdf_data ONLY for legacy rows
    // that have no storage file.
    let res = await supabase
      .from("translations")
      .select("id, title, content, content_type, pdf_path, created_at")
      .eq("id", id)
      .single();
    if (res.error && isMissingColumn(res.error)) {
      res = (await supabase
        .from("translations")
        .select("id, title, content, content_type, created_at")
        .eq("id", id)
        .single()) as unknown as typeof res;
    }
    if (res.error) throw res.error;
    const data = res.data as unknown as TranslationRow;

    const result: Translation = {
      _id: data.id,
      title: data.title,
      createdAt: data.created_at,
      content: data.content,
      contentType: data.content_type,
      pdfPath: data.pdf_path,
      pdfUrl: publicPdfUrl(data.pdf_path),
    };

    if (!result.pdfUrl) {
      const { data: withPdf, error: pdfError } = await supabase
        .from("translations")
        .select("pdf_data")
        .eq("id", id)
        .single();
      if (!pdfError && withPdf?.pdf_data) {
        result.pdf_data = withPdf.pdf_data as string;
      }
    }
    return result;
  }

  static async createTranslation(input: {
    title: string;
    date?: string;
    file?: File | null;
  }): Promise<Translation> {
    let pdfPath: string | null = null;

    if (input.file && input.file.size > 0) {
      pdfPath = `${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from(PDF_BUCKET)
        .upload(pdfPath, input.file, { contentType: "application/pdf" });
      if (uploadError) throw uploadError;
    }

    const { data, error } = await supabase
      .from("translations")
      .insert({
        title: input.title,
        pdf_path: pdfPath,
        content_type: pdfPath ? "application/pdf" : "text/plain",
        created_at: input.date ? new Date(input.date).toISOString() : new Date().toISOString(),
      })
      .select("id, title, content, content_type, pdf_path, created_at")
      .single();

    if (error) {
      // Don't leave an orphaned file behind if the row insert failed
      if (pdfPath) {
        await supabase.storage.from(PDF_BUCKET).remove([pdfPath]);
      }
      throw error;
    }

    return {
      _id: data.id,
      title: data.title,
      createdAt: data.created_at,
      contentType: data.content_type,
      pdfPath: data.pdf_path,
      pdfUrl: publicPdfUrl(data.pdf_path),
    };
  }

  static async updateTranslation(
    id: string,
    input: { title: string; date?: string; file?: File | null }
  ): Promise<Translation> {
    const updateData: Record<string, unknown> = { title: input.title };
    if (input.date) updateData.created_at = new Date(input.date).toISOString();

    let newPdfPath: string | null = null;
    let oldPdfPath: string | null = null;

    if (input.file && input.file.size > 0) {
      const { data: existing } = await supabase
        .from("translations")
        .select("pdf_path")
        .eq("id", id)
        .single();
      oldPdfPath = existing?.pdf_path ?? null;

      newPdfPath = `${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from(PDF_BUCKET)
        .upload(newPdfPath, input.file, { contentType: "application/pdf" });
      if (uploadError) throw uploadError;

      updateData.pdf_path = newPdfPath;
      updateData.pdf_data = null; // replacing a legacy in-database PDF
      updateData.content_type = "application/pdf";
    }

    const { data, error } = await supabase
      .from("translations")
      .update(updateData)
      .eq("id", id)
      .select("id, title, content, content_type, pdf_path, created_at")
      .single();

    if (error) {
      if (newPdfPath) await supabase.storage.from(PDF_BUCKET).remove([newPdfPath]);
      throw error;
    }

    // Clean up the replaced storage file (best effort)
    if (newPdfPath && oldPdfPath && oldPdfPath !== newPdfPath) {
      await supabase.storage.from(PDF_BUCKET).remove([oldPdfPath]);
    }

    return {
      _id: data.id,
      title: data.title,
      createdAt: data.created_at,
      contentType: data.content_type,
      pdfPath: data.pdf_path,
      pdfUrl: publicPdfUrl(data.pdf_path),
    };
  }

  static async deleteTranslation(id: string): Promise<void> {
    const { data: existing } = await supabase
      .from("translations")
      .select("pdf_path")
      .eq("id", id)
      .single();

    const { error } = await supabase.from("translations").delete().eq("id", id);
    if (error) throw error;

    if (existing?.pdf_path) {
      await supabase.storage.from(PDF_BUCKET).remove([existing.pdf_path]);
    }
  }

  // ---------- User management (admin dashboard) ----------

  static async getAllUsers(): Promise<
    Array<{ _id: string; username: string; email: string; isAdmin: boolean }>
  > {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, email, is_admin, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;

    return (data || []).map((user) => ({
      _id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: !!user.is_admin,
    }));
  }

  static async deleteUser(id: string): Promise<void> {
    const { data, error } = await supabase.rpc("admin_delete_user", {
      target_user_id: id,
    });
    if (error) throw error;
    const result = data as { success: boolean; message: string };
    if (!result.success) throw new Error(result.message);
  }

  static async makeUserAdmin(id: string): Promise<void> {
    const { data, error } = await supabase.rpc("set_user_admin", {
      target_user_id: id,
      make_admin: true,
    });
    if (error) throw error;
    const result = data as { success: boolean; message: string };
    if (!result.success) throw new Error(result.message);
  }

  static async removeUserAdmin(id: string): Promise<void> {
    const { data, error } = await supabase.rpc("set_user_admin", {
      target_user_id: id,
      make_admin: false,
    });
    if (error) throw error;
    const result = data as { success: boolean; message: string };
    if (!result.success) throw new Error(result.message);
  }
}

export { supabase };
