"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";

async function exigirDiretor() {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu?.podeCadastros) redirect("/");
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
  const gerarppf = f.get("gerarppf") === "on";

  if (!descricao) voltar("erro", "Informe a descrição da avaliação.");
  if (!idquestionario) voltar("erro", "Escolha o questionário da avaliação.");
  if (!prazo) voltar("erro", "Informe o prazo da avaliação.");

  const dados = { descricao, idquestionario, prazo, gerarppf };
  const { error } = id
    ? await supabase.from("avaliacao").update(dados).eq("idavaliacao", id)
    : await supabase.from("avaliacao").insert(dados);
  if (error) voltar("erro", mensagem(error));
  voltar("ok", id ? "Avaliação atualizada." : "Avaliação criada como rascunho.");
}

// A avaliação já aberta não muda de descrição, questionário nem prazo, mas a
// diretoria ainda pode ligar ou desligar a geração do PPF.
export async function alternarPpf(f: FormData) {
  const supabase = await exigirDiretor();
  const id = idDe(f, "idavaliacao");
  if (!id) voltar("erro", "Pedido inválido.");

  const gerarppf = f.get("gerarppf") === "on";
  const { error } = await supabase.from("avaliacao").update({ gerarppf }).eq("idavaliacao", id);
  if (error) voltar("erro", mensagem(error));
  voltar("ok", gerarppf ? "Avaliação passa a gerar PPF na conclusão do APF." : "Avaliação não gera mais PPF.");
}

export async function excluirAvaliacao(f: FormData) {
  const supabase = await exigirDiretor();
  const id = idDe(f, "idavaliacao");
  if (!id) voltar("erro", "Pedido inválido.");
  const { error } = await supabase.from("avaliacao").delete().eq("idavaliacao", id);
  if (error) voltar("erro", mensagem(error));
  voltar("ok", "Avaliação excluída, junto com as avaliações individuais geradas.");
}

// Inverso de gerarAvaliacao: apaga as avaliações individuais e as respostas e
// devolve a avaliação para rascunho, mantendo o cadastro e o questionário.
export async function cancelarAvaliacao(f: FormData) {
  const supabase = await exigirDiretor();
  const id = idDe(f, "idavaliacao");
  if (!id) voltar("erro", "Pedido inválido.");

  const { data, error } = await supabase.rpc("cancelar_avaliacao", { p_id: id });
  if (error) voltar("erro", mensagem(error));

  const r = (data ?? {}) as { participantes?: number; respostas?: number };
  const participantes = Number(r.participantes ?? 0);
  const respostas = Number(r.respostas ?? 0);

  if (!participantes && !respostas) {
    voltar("ok", "Avaliação cancelada e de volta a rascunho.");
  }
  const avaliacoes = participantes === 1 ? "1 avaliação individual" : `${participantes} avaliações individuais`;
  const respostasTexto = respostas === 1 ? "1 resposta" : `${respostas} respostas`;
  voltar("ok", `Avaliação cancelada e de volta a rascunho. ${avaliacoes} e ${respostasTexto} foram removidas.`);
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

// Gera (ou completa) a avaliação apenas para os adultos marcados na tela de seleção.
export async function gerarSelecionados(f: FormData) {
  const supabase = await exigirDiretor();
  const id = idDe(f, "idavaliacao");
  const rascunho = f.get("rascunho") === "1";
  const usuarios = f
    .getAll("usuarios")
    .map((x) => Number(x))
    .filter((x) => Number.isInteger(x));

  if (!id) voltar("erro", "Pedido inválido.");
  if (!usuarios.length) voltar("erro", "Selecione ao menos um adulto para gerar a avaliação.");

  const { data, error } = await supabase.rpc("gerar_avaliacao_selecionados", {
    p_id: id,
    p_usuarios: usuarios,
  });
  if (error) voltar("erro", mensagem(error));

  const r = (data ?? {}) as { novos?: number; selecionados?: number };
  const novos = Number(r.novos ?? 0);
  const selecionados = Number(r.selecionados ?? usuarios.length);
  const plural = (n: number) => (n === 1 ? "1 adulto" : `${n} adultos`);

  if (novos === 0) {
    voltar("ok", "Nenhuma nova avaliação: os adultos selecionados já estavam incluídos.");
  }
  if (novos === selecionados) {
    voltar(
      "ok",
      rascunho
        ? `Avaliação aberta. ${plural(novos)} recebeu a avaliação.`
        : `${plural(novos)} incluído${novos === 1 ? "" : "s"} na avaliação.`,
    );
  }
  voltar(
    "ok",
    `${novos} de ${selecionados} adultos ${rascunho ? "receberam a avaliação" : "foram incluídos"}; os demais já estavam incluídos.`,
  );
}
