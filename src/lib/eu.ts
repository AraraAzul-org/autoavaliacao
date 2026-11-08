import type { SupabaseClient } from "@supabase/supabase-js";

export async function carregarEu(supabase: SupabaseClient) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const email = (auth.user.email ?? "").toLowerCase();
  const { data: eu } = await supabase
    .from("usuario")
    .select("idusuario, nome, idcargo")
    .or(`auth_user_id.eq.${auth.user.id},email.eq.${email}`)
    .maybeSingle();
  if (!eu) return null;
  const { data: cargo } = eu.idcargo
    ? await supabase.from("cargo").select("descricao, avalia").eq("idcargo", eu.idcargo).maybeSingle()
    : { data: null };
  return { ...eu, cargo, diretor: !!cargo?.avalia };
}
