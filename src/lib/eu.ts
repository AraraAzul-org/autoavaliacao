import type { SupabaseClient } from "@supabase/supabase-js";

type CargoInfo = { descricao: string; avalia: boolean } | null;

export async function carregarSessao(supabase: SupabaseClient) {
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  const email = String(claims.email ?? "").toLowerCase();
  const { data: eu } = await supabase
    .from("usuario")
    .select("idusuario, nome, cargo:cargo(descricao, avalia)")
    .eq("auth_user_id", claims.sub)
    .maybeSingle();
  if (!eu) return { email, eu: null };
  const cargo = (Array.isArray(eu.cargo) ? eu.cargo[0] : eu.cargo) as CargoInfo;
  return {
    email,
    eu: { idusuario: eu.idusuario as number, nome: eu.nome as string, cargo, diretor: !!cargo?.avalia },
  };
}

export async function carregarEu(supabase: SupabaseClient) {
  const sessao = await carregarSessao(supabase);
  return sessao?.eu ?? null;
}
