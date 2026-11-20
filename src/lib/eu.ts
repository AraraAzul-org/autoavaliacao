import type { SupabaseClient } from "@supabase/supabase-js";

type CargoInfo = { descricao: string; avalia: boolean } | null;

export async function carregarSessao(supabase: SupabaseClient) {
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  const email = String(claims.email ?? "").toLowerCase();
  const { data: eu } = await supabase
    .from("usuario")
    .select("idusuario, nome, linha, idramo, acessocadastros, membrogrupo, ativo, cargo:cargo(descricao, avalia)")
    .eq("auth_user_id", claims.sub)
    .eq("ativo", true)
    .maybeSingle();
  if (!eu) return { email, eu: null };
  const cargo = (Array.isArray(eu.cargo) ? eu.cargo[0] : eu.cargo) as CargoInfo;
  const linha = String(eu.linha ?? "");
  const dirigente = !!cargo?.avalia && linha === "Dirigente";
  const membrogrupo = !!eu.membrogrupo;
  const podeCadastros = !!cargo?.avalia || !!eu.acessocadastros;
  const podeResultados = dirigente;

  return {
    email,
    eu: {
      idusuario: eu.idusuario as number,
      nome: eu.nome as string,
      linha,
      idramo: (eu.idramo as number | null) ?? null,
      cargo,
      diretor: !!cargo?.avalia,
      // Dirigente de verdade: tem permissão de avaliação e atua na linha Dirigente.
      dirigente,
      membrogrupo,
      // Jovens é liberado para todo associado ativo do grupo.
      podeJovens: membrogrupo,
      // A área de Cadastros é liberada pelo checkbox do cadastro do associado;
      // quem tem função de diretor continua entrando normalmente.
      podeCadastros,
      // O menu Parecer é só para quem avalia e é dirigente.
      podeParecer: dirigente,
      // A tela de resultados segue a mesma regra: avalia e é dirigente.
      podeResultados,
      // Escotista do grupo: membro ativo sem permissão de resultados.
      escotista: membrogrupo && !podeResultados,
    },
  };
}

export async function carregarEu(supabase: SupabaseClient) {
  const sessao = await carregarSessao(supabase);
  return sessao?.eu ?? null;
}
