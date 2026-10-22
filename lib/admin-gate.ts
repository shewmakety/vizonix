import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/admin-session";
import { errorMessage } from "@/lib/errors";
import { supabaseConfigured } from "@/lib/supabase-admin";

export const sponsorStorageProblem =
  "Sponsor storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then apply the sponsor migration.";

export async function loadAdmin<T>(load: () => Promise<T>): Promise<{ data: T | null; problem: string }> {
  if (!supabaseConfigured()) return { data: null, problem: sponsorStorageProblem };
  try {
    return { data: await load(), problem: "" };
  } catch (error) {
    return { data: null, problem: errorMessage(error) };
  }
}

export async function adminSignedIn(): Promise<boolean> {
  const jar = await cookies();
  return verifyAdminSession(jar.get(ADMIN_COOKIE)?.value);
}
