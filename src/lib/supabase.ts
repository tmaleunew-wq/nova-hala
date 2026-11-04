import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface InquiryRecord {
  id?: string;
  order_id: string;
  created_at?: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  params: any;
  total_price: number;
  evaluation_url: string;
  image_data_url?: string;
  status?: string;
}

export async function saveInquiryToSupabase(record: InquiryRecord) {
  if (!supabase) return null;
  try {
    const enrichedParams = {
      ...record.params,
      ...(record.image_data_url ? { _snapshot: record.image_data_url } : {}),
      _status: record.status || record.params?._status || "Nový",
    };
    const { data, error } = await supabase
      .from("inquiries")
      .insert([{
        order_id: record.order_id,
        name: record.name,
        email: record.email,
        phone: record.phone,
        message: record.message,
        params: enrichedParams,
        total_price: record.total_price,
        evaluation_url: record.evaluation_url,
      }])
      .select();

    if (error) {
      console.error("[Supabase] Error inserting inquiry:", error);
      return null;
    }
    return data;
  } catch (err) {
    console.error("[Supabase] Insert error:", err);
    return null;
  }
}

export async function fetchInquiriesFromSupabase(): Promise<InquiryRecord[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Error fetching inquiries:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("[Supabase] Fetch error:", err);
    return [];
  }
}

export async function fetchInquiryByIdFromSupabase(orderId: string): Promise<InquiryRecord | null> {
  if (!supabase || !orderId) return null;
  try {
    const { data, error } = await supabase
      .from("inquiries")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();

    if (error) return null;
    return data || null;
  } catch {
    return null;
  }
}

export async function updateInquiryStatusInSupabase(orderId: string, status: string, currentParams: any) {
  if (!supabase || !orderId) return null;
  try {
    const updatedParams = { ...(currentParams || {}), _status: status };
    const { data, error } = await supabase
      .from("inquiries")
      .update({ params: updatedParams })
      .eq("order_id", orderId)
      .select();
    if (error) {
      console.error("[Supabase] Error updating status:", error);
      return null;
    }
    return data;
  } catch (err) {
    console.error("[Supabase] Status update error:", err);
    return null;
  }
}
