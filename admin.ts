import { createClient } from "@supabase/supabase-js";

// Uso exclusivo em Server Actions: a chave de serviço nunca vai para o navegador.
export function createAdminClient() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const temChaveDeServico = () => !!process.env.SUPABASE_SERVICE_ROLE_KEY;
