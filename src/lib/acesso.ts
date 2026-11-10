import type { SupabaseClient } from "@supabase/supabase-js";

type Resposta = { ok: boolean; erro?: string };

// Chama a Edge Function "gerir-acesso" do Supabase com a sessão de quem está logado.
// A chave de serviço fica só dentro do Supabase; este app nunca a recebe.
export async function gerirAcesso(
  supabase: SupabaseClient,
  corpo: { acao: "definir_senha"; idusuario: number; senha: string } | { acao: "limpar_troca" }
): Promise<Resposta> {
  const { data, error } = await supabase.functions.invoke("gerir-acesso", { body: corpo });
  if (error || !data) return { ok: false, erro: "Não foi possível falar com o serviço de acesso." };
  return data as Resposta;
}
