import { createClient } from "@/lib/supabase";

/**
 * Check if a feature flag is enabled
 * @param key - Feature flag key
 * @returns boolean - true if enabled, false otherwise
 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const supabase = createClient();
  const env = process.env.NODE_ENV || "development";

  const { data, error } = await supabase
    .from("feature_flags")
    .select("is_enabled, env_scope")
    .eq("key", key)
    .single();

  if (error || !data) {
    console.warn(`Feature flag "${key}" not found, defaulting to false`);
    return false;
  }

  // Check if flag applies to current environment
  if (data.env_scope !== "all" && data.env_scope !== env) {
    return false;
  }

  return data.is_enabled;
}

/**
 * Get all enabled feature flags for current environment
 */
export async function getEnabledFeatures(): Promise<string[]> {
  const supabase = createClient();
  const env = process.env.NODE_ENV || "development";

  const { data, error } = await supabase
    .from("feature_flags")
    .select("key")
    .eq("is_enabled", true)
    .or(`env_scope.eq.all,env_scope.eq.${env}`);

  if (error || !data) {
    return [];
  }

  return data.map((flag: { key: string }) => flag.key);
}