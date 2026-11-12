"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";

async function exigirDiretor() {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu?.diretor) redirect("/");
  return supabase;
}

function voltar(tipo: "ok" | "erro", msg: string): never {
  revalidatePath("/avaliacoes");
  redirect(`/avaliacoes?${new URLSearchParams({ [tipo]: msg }).toString()}`);
}

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const idDe = (f: FormData, k: string) => (f.get(k) ? Number(f.get(k)) : null);

// Os triggers do banco já explicam as travas em português; aproveitamos a mensagem.
function mensagem(erro?: { code?: string; message?: string }) {
  const m = erro?.message ?? "";
  // P0001 é o código de RAISE EXCEPTION: as funções e triggers do banco
  // escrevem mensagens em português já prontas para o usuário.
  if (erro?.code === "P0001" && m) return m;
  if (/finalizada|preparação|status/.test(m)) return m;
  if (erro?.code === "23503") return "O questionário escolhido não existe mais. Recarregue a página.";
  if (erro?.code === "23502") return "Preencha descrição, questionário e prazo.";
  return "Não foi possível salvar. Confira os dados.";
}

export async function salvarAvaliacao(f: FormData) {
  const supabase = await exigirDiretor();
  const id = idDe(f, "idavaliacao");
  const descricao = texto(f, "descricao");
  const idquestionario = idDe(f, "idquestionario");
  const prazo = texto(f, "prazo");

  if (!descricao) voltar("erro", "Informe a descrição da avaliação.");
  if (!idquestionario) voltar("erro", "Escolha o questionário da avaliação.");
  if (!prazo) voltar("erro", "Informe o prazo da avaliação.");

  const dados = { descricao, idquestionario, prazo };
  const { error } = id
    ? await supabase.from("avaliacao").update(dados).eq("idavaliacao", id)
    : await supabase.from("avaliacao").insert(dados);
  if (error) voltar("erro", mensagem(error));
  voltar("ok", id ? "Avaliação atualizada." : "Avaliação criada como rascunho.");
}

export async function excluirAvaliacao(f: FormData) {
  const supabase = await exigirDiretor();
  const id = idDe(f, "idavaliacao");
  if (!id) voltar("erro", "Pedido inválido.");
  const { error } = await supabase.from("avaliacao").delete().eq("idavaliacao", id);
  if (error) voltar("erro", mensagem(error));
  voltar("ok", "Avaliação excluída.");
}

// Abre a avaliação e cria a avaliação de cada adulto ativo do grupo.
// Quem já tem avaliação nesta pesquisa não é duplicado.
export async function gerarAvaliacao(f: FormData) {
  const supabase = await exigirDiretor();
  const id = idDe(f, "idavaliacao");
  if (!id) voltar("erro", "Pedido inválido.");

  const { data, error } = await supabase.rpc("gerar_avaliacao", { p_id: id });
  if (error) voltar("erro", mensagem(error));

  const novos = Number(data ?? 0);
  if (novos === 0) voltar("ok", "Nenhuma nova avaliação: todos os adultos ativos já estavam incluídos.");
  voltar("ok", novos === 1 ? "Avaliação aberta. 1 adulto recebeu a avaliação." : `Avaliação aberta. ${novos} adultos receberam a avaliação.`);
}
