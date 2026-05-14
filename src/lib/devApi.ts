import { supabase } from "@/integrations/supabase/client";

export type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  rate_limit_per_min: number;
  active: boolean;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export type CreatedApiKey = { id: string; prefix: string; secret: string };

export async function listMyApiKeys(): Promise<ApiKeyRow[]> {
  const { data, error } = await supabase.rpc("list_my_api_keys" as any);
  if (error) throw error;
  return (data ?? []) as ApiKeyRow[];
}

export async function createApiKey(name: string, rate_limit_per_min = 60): Promise<CreatedApiKey> {
  const { data, error } = await supabase.rpc("create_api_key" as any, {
    _name: name,
    _scopes: ["sim:read"],
    _rate_limit_per_min: rate_limit_per_min,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as CreatedApiKey;
}

export async function revokeApiKey(id: string) {
  const { error } = await supabase.rpc("revoke_api_key" as any, { _id: id });
  if (error) throw error;
}

export async function getApiUsage24h(keyId: string) {
  const { data, error } = await supabase.rpc("get_my_api_usage_24h" as any, { _key_id: keyId });
  if (error) throw error;
  return (data ?? []) as { minute_bucket: string; count: number }[];
}

export function simApiBaseUrl(): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sim-api`;
}
