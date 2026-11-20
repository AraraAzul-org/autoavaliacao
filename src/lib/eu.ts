import type { SupabaseClient } from "@supabase/supabase-js";

type CargoInfo = { descricao: string; avalia: boolean } | null;

export async function carregarSessao(supabase: SupabaseClient) {
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  const email = String(claims.email ?? "").toLowerCase();
  const { data: eu } = await supabase
    .from("usuario")
    .select("idusuario, nome, linha, idramo, membrogrupo, ativo, cargo:cargo(descricao, avalia)")
    .eq("auth_user_id", claims.sub)
    .eq("ativo", true)
    .maybeSingle();
  if (!eu) return { email, eu: null };

  // A tabela de acessos é a única fonte de verdade para menus e rotas.
  const { data: menus } = await supabase
    .from("usuario_menu")
    .select("chave")
    .eq("idusuario", eu.idusuario)
    .eq("liberado", true);
  const acessos = new Set((menus ?? []).map((m) => String(m.chave)));

  const cargo = (Array.isArray(eu.cargo) ? eu.cargo[0] : eu.cargo) as CargoInfo;
  const linha = String(eu.linha ?? "");
  const dirigente = !!cargo?.avalia && linha === "Dirigente";
  const membrogrupo = !!eu.membrogrupo;

  return {
    email,
    eu: {
      idusuario: eu.idusuario as number,
      nome: eu.nome as string,
      linha,
      idramo: (eu.idramo as number | null) ?? null,
      cargo,
      diretor: !!cargo?.avalia,
      // Dirigente de verdade: usado por regras de promessas, não pelo menu.
      dirigente,
      // membrogrupo continua existindo para os demais tratamentos do sistema.
      membrogrupo,
      acessos,
      // Cada item de menu, inclusive os pessoais, vem da tabela de liberações.
      podeJovens: acessos.has("jovens"),
      podeCadastros: acessos.has("usuarios"),
      podeParecer: acessos.has("parecer"),
      podeResultados: acessos.has("resultados"),
      podeLogAcesso: acessos.has("acessolog"),
      escotista: membrogrupo && !acessos.has("resultados"),
    },
  };
}

export async function carregarEu(supabase: SupabaseClient) {
  const sessao = await carregarSessao(supabase);
  return sessao?.eu ?? null;
}
