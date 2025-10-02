import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

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
  // Translations
  static async getAllTranslations(): Promise<Translation[]> {
    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform to match current interface
    return data.map(item => {
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
      };
    });
  }

  static async getTranslationById(id: string): Promise<Translation> {
    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

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
}

// Heroku API service (your existing API calls)
export class HerokuService {
  private static getBaseUrl(): string {
    return import.meta.env.VITE_ADDRESS || 'https://paulospoetry.com';
  }

  static async getAllTranslations(): Promise<Translation[]> {
    const response = await axios.get(`${this.getBaseUrl()}/translations/all`);
    return response.data;
  }

  static async getTranslationById(id: string) {
    // Your existing PDF streaming logic
    const response = await axios.get(`${this.getBaseUrl()}/translations/stream/${id}`, {
      responseType: 'blob',
    });
    return response;
  }

  static async getTranslationInfo(id: string): Promise<Translation> {
    const response = await axios.get(`${this.getBaseUrl()}/translations/info/${id}`);
    return response.data;
  }

  static async getAllPoems(): Promise<Poem[]> {
    const response = await axios.get(`${this.getBaseUrl()}/poetry`);
    return response.data;
  }

  static async getPoemById(id: string): Promise<Poem> {
    const response = await axios.get(`${this.getBaseUrl()}/poetry/${id}`);
    return response.data;
  }

  static async addComment(poemId: string, author: string, text: string): Promise<Comment> {
    const response = await axios.post(`${this.getBaseUrl()}/poetry/${poemId}/comments`, {
      author,
      text
    });
    return response.data;
  }

  static async deleteComment(poemId: string, commentId: string): Promise<void> {
    await axios.delete(`${this.getBaseUrl()}/poetry/${poemId}/comments/${commentId}`);
  }
}