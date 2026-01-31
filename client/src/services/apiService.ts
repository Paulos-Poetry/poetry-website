import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

// Supabase client setup
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types based on your REAL data structure
export interface Translation {
  id?: string;
  _id?: string; // MongoDB ObjectId as string
  title: string;
  createdAt: Date | string; // Can be Date object or ISO string
  created_at?: Date | string; // Supabase naming convention
  pdf_data?: string | Buffer; // Base64 string or Buffer
  content?: string;
  contentType?: string;
  content_type?: string;
}

export interface Poem {
  id?: string;
  _id?: string; // MongoDB ObjectId as string
  title: string;
  contentEnglish: string; // HTML content from React Quill
  content_english?: string; // Supabase naming
  contentGreek: string; // HTML content from React Quill
  content_greek?: string; // Supabase naming
  likes: number;
  comments: Comment[];
  createdAt?: Date | string;
  created_at?: Date | string;
  __v?: number; // MongoDB version key
}

export interface Comment {
  id?: string;
  _id?: string;
  author: string;
  text: string;
  createdAt: Date | string;
  created_at?: Date | string;
  poem_id?: string;
}

// Supabase API service
export class SupabaseService {
  // Auth: sign up a new user using poetry_users table (client-side, not secure for production)
  static async signUp(username: string, email: string, password: string) {
    // Check if user already exists
    const { data: existing, error: selectError } = await supabase
      .from('poetry_users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (selectError) {
      console.error('Supabase select error (signUp):', selectError);
      throw selectError;
    }
    if (existing) throw new Error('User already exists');

    // Hash password in browser (not secure for production)
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    // Insert new user
    const { data, error } = await supabase
      .from('poetry_users')
      .insert([{ username, email, password_hash: hash }])
      .select()
      .maybeSingle();
    if (error) {
      console.error('Supabase insert error (signUp):', error);
      throw error;
    }
    return data;
  }

  // Sign in using poetry_users table (client-side, not secure for production)
  static async signIn(email: string, password: string) {
    // Fetch user by email
    const { data: user, error } = await supabase
      .from('poetry_users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) {
      console.error('Supabase select error (signIn):', error);
      throw error;
    }
    if (!user) throw new Error('Invalid credentials');

    // Compare password hash in browser
    const match = bcrypt.compareSync(password, user.password_hash);
    if (!match) throw new Error('Invalid credentials');
    return user;
  }

  // Note: profile storage in poetry_users is intentionally disabled in this app.

  // Translations
  static async getAllTranslations(): Promise<Translation[]> {
    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    // Transform to match current interface
  return (data as Translation[]).map(item => {
      // Convert binary PDF data to base64 for consistent handling
      let pdfData = item.pdf_data;
      if (pdfData && typeof pdfData !== 'string') {
        // Convert Uint8Array/Buffer to base64 string
        const uint8Array = new Uint8Array(pdfData);
        const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
        pdfData = btoa(binaryString);
      }

      return {
        _id: item.id,
        title: item.title,
        createdAt: item.created_at, // Keep as string/Date - let component handle conversion
        content: item.content,
        pdf_data: pdfData
      } as Translation;
    });
  }

  static async getTranslationById(id: string): Promise<Translation> {
    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Translation not found');

    // Convert binary PDF data to base64 for consistent handling
    let pdfData = data.pdf_data;
    if (pdfData && typeof pdfData !== 'string') {
      try {
        // Convert Uint8Array/Buffer to base64 string
        const uint8Array = new Uint8Array(pdfData);
        const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
        pdfData = btoa(binaryString);
      } catch (error) {
        console.error('Error converting PDF to base64:', error);
        pdfData = null; // Reset to null if conversion fails
      }
    }

    return {
      _id: data.id,
      title: data.title,
      createdAt: data.created_at, // Keep as string/Date - let component handle conversion
      content: data.content,
      pdf_data: pdfData
    };
  }

  // Poems
  static async getAllPoems(): Promise<Poem[]> {
    const { data, error } = await supabase
      .from('poems')
      .select(`
        *,
        comments (
          id,
          author,
          text,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(poem => ({
      _id: poem.id,
      title: poem.title,
      contentEnglish: poem.content_english,
      contentGreek: poem.content_greek,
      likes: poem.likes,
      createdAt: poem.created_at, // Keep as string/Date
      comments: poem.comments?.map((comment: Comment) => ({
        _id: comment.id,
        author: comment.author,
        text: comment.text,
        createdAt: comment.created_at // Keep as string/Date
      })) || []
    }));
  }

  static async getPoemById(id: string): Promise<Poem> {
    const { data, error } = await supabase
      .from('poems')
      .select(`
        *,
        comments (
          id,
          author,
          text,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return {
      _id: data.id,
      title: data.title,
      contentEnglish: data.content_english,
      contentGreek: data.content_greek,
      likes: data.likes,
      createdAt: data.created_at, // Keep as string/Date
      comments: data.comments?.map((comment: Comment) => ({
        _id: comment.id,
        author: comment.author,
        text: comment.text,
        createdAt: comment.created_at // Keep as string/Date
      })) || []
    };
  }

  static async addComment(poemId: string, author: string, text: string): Promise<Comment> {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        poem_id: poemId,
        author,
        text
      })
      .select()
      .single();

    if (error) throw error;

    return {
      _id: data.id,
      author: data.author,
      text: data.text,
      createdAt: data.created_at // Keep as string/Date
    };
  }

  static async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
  }

  // Poem CRUD operations
  static async createPoem(poem: { title: string; contentEnglish: string; contentGreek: string }): Promise<Poem> {
    const { data, error } = await supabase
      .from('poems')
      .insert({
        title: poem.title,
        content_english: poem.contentEnglish,
        content_greek: poem.contentGreek,
        likes: 0
      })
      .select()
      .single();

    if (error) throw error;

    return {
      _id: data.id,
      title: data.title,
      contentEnglish: data.content_english,
      contentGreek: data.content_greek,
      likes: data.likes,
      createdAt: data.created_at,
      comments: []
    };
  }

  static async updatePoem(id: string, poem: { title: string; contentEnglish: string; contentGreek: string }): Promise<Poem> {
    const { data, error } = await supabase
      .from('poems')
      .update({
        title: poem.title,
        content_english: poem.contentEnglish,
        content_greek: poem.contentGreek,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      _id: data.id,
      title: data.title,
      contentEnglish: data.content_english,
      contentGreek: data.content_greek,
      likes: data.likes,
      createdAt: data.created_at,
      comments: []
    };
  }

  static async deletePoem(id: string): Promise<void> {
    const { error } = await supabase
      .from('poems')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Translation CRUD operations
  static async createTranslation(formData: FormData): Promise<Translation> {
    const title = formData.get('title') as string;
    const date = formData.get('date') as string;
    const pdfFile = formData.get('pdf') as File;

    let pdfBase64: string | null = null;
    if (pdfFile) {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
      pdfBase64 = btoa(binaryString);
    }

    const { data, error } = await supabase
      .from('translations')
      .insert({
        title,
        pdf_data: pdfBase64,
        content_type: 'application/pdf',
        created_at: date || new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return {
      _id: data.id,
      title: data.title,
      createdAt: data.created_at,
      pdf_data: data.pdf_data,
      contentType: data.content_type
    };
  }

  static async updateTranslation(id: string, formData: FormData): Promise<Translation> {
    const title = formData.get('title') as string;
    const date = formData.get('date') as string;
    const pdfFile = formData.get('pdf') as File | null;

    const updateData: Record<string, unknown> = {
      title,
      updated_at: new Date().toISOString()
    };

    if (date) {
      updateData.created_at = date;
    }

    if (pdfFile && pdfFile.size > 0) {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
      updateData.pdf_data = btoa(binaryString);
    }

    const { data, error } = await supabase
      .from('translations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      _id: data.id,
      title: data.title,
      createdAt: data.created_at,
      pdf_data: data.pdf_data,
      contentType: data.content_type
    };
  }

  static async deleteTranslation(id: string): Promise<void> {
    const { error } = await supabase
      .from('translations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // User management operations
  static async getAllUsers(): Promise<Array<{ _id: string; username: string; email: string; isAdmin: boolean }>> {
    const { data, error } = await supabase
      .from('poetry_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(user => ({
      _id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.is_admin || false
    }));
  }

  static async deleteUser(id: string): Promise<void> {
    const { error } = await supabase
      .from('poetry_users')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async makeUserAdmin(id: string): Promise<void> {
    const { error } = await supabase
      .from('poetry_users')
      .update({ is_admin: true })
      .eq('id', id);

    if (error) throw error;
  }

  static async removeUserAdmin(id: string): Promise<void> {
    const { error } = await supabase
      .from('poetry_users')
      .update({ is_admin: false })
      .eq('id', id);

    if (error) throw error;
  }

  // Like poem
  static async likePoem(id: string): Promise<number> {
    // First get current likes
    const { data: poem, error: fetchError } = await supabase
      .from('poems')
      .select('likes')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const newLikes = (poem.likes || 0) + 1;

    const { error: updateError } = await supabase
      .from('poems')
      .update({ likes: newLikes })
      .eq('id', id);

    if (updateError) throw updateError;

    return newLikes;
  }
}