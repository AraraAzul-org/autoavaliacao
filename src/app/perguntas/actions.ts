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

function voltar(tipo: "ok" | "erro", msg: string, abrir?: string | null, q?: string | null): never {
  const p = new URLSearchParams({ [tipo]: msg });
  if (abrir) p.set("abrir", abrir);
  if (q) p.set("q", q);
  revalidatePath("/perguntas");
  redirect(`/perguntas?${p.toString()}`);
}

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const idDe = (f: FormData, k: string) => (f.get(k) ? Number(f.get(k)) : null);
const falha = (code?: string) =>
  code === "23503" ? "Não é possível excluir: há itens ou respostas vinculados." : "Não foi possível salvar. Confira os dados.";

export async function salvarQuestionario(f: FormData) {
  const supabase = await exigirDiretor();
  const id = idDe(f, "idquestionario");
  const descricao = texto(f, "descricao");
  const ativo = f.get("ativo") === "on";
  const q = texto(f, "q") || null;
  if (!descricao) voltar("erro", "Informe a descrição do questionário.", null, id ? String(id) : q);

  if (id) {
    const { error } = await supabase.from("questionario").update({ descricao, ativo }).eq("idquestionario", id);
    if (error) voltar("erro", falha(error.code), null, String(id));
    voltar("ok", "Questionário salvo.", null, String(id));
  }

  const { data, error } = await supabase
    .from("questionario")
    .insert({ descricao, ativo })
    .select("idquestionario");
  if (error) voltar("erro", falha(error.code), null, q);
  voltar("ok", "Questionário criado.", null, String(data?.[0]?.idquestionario ?? q ?? ""));
}

export async function salvarEtapa(f: FormData) {
  const supabase = await exigirDiretor();
  const id = idDe(f, "idetapa");
  const idquestionario = idDe(f, "idquestionario");
  const descricao = texto(f, "descricao");
  const q = texto(f, "q") || (idquestionario ? String(idquestionario) : null);
  if (!descricao) voltar("erro", "Informe a descrição da etapa.", null, q);
  if (!id && !idquestionario) voltar("erro", "Escolha o questionário da etapa.", null, q);
  const { error } = id
    ? await supabase.from("etapa").update({ descricao }).eq("idetapa", id)
    : await supabase.from("etapa").insert({ descricao, idquestionario });
  if (error) voltar("erro", falha(error.code), null, q);
  voltar("ok", "Etapa salva.", null, q);
}

export async function salvarPergunta(f: FormData) {
  const supabase = await exigirDiretor();
  const id = idDe(f, "idpergunta");
  const q = texto(f, "q") || null;
  const dados = {
    codigo: texto(f, "codigo"),
    descricao: texto(f, "descricao"),
    idetapa: idDe(f, "idetapa"),
    descritiva: f.get("descritiva") === "on",
  };
  if (!dados.codigo || !dados.descricao || !dados.idetapa) voltar("erro", "Informe código, descrição e etapa.", null, q);

  if (id) {
    const { data: atual } = await supabase.from("pergunta").select("descritiva").eq("idpergunta", id).maybeSingle();
    if (atual && atual.descritiva !== dados.descritiva) {
      const { count: respostas } = await supabase
        .from("resposta").select("idresposta", { count: "exact", head: true }).eq("idpergunta", id);
      if (respostas) voltar("erro", "Esta pergunta já tem respostas; não é possível mudar o tipo.", String(id), q);
      if (dados.descritiva) {
        const { count: opcoes } = await supabase
          .from("pontuacao").select("idpontuacao", { count: "exact", head: true }).eq("idpergunta", id);
        if (opcoes) voltar("erro", "Exclua as pontuações antes de tornar a pergunta descritiva.", String(id), q);
      }
    }
  }

  const { data, error } = id
    ? await supabase.from("pergunta").update(dados).eq("idpergunta", id).select("idpergunta")
    : await supabase.from("pergunta").insert(dados).select("idpergunta");
  if (error) voltar("erro", falha(error.code), null, q);
  voltar("ok", "Pergunta salva.", String(data?.[0]?.idpergunta ?? id), q);
}

export async function salvarPontuacao(f: FormData) {
  const supabase = await exigirDiretor();
  const id = idDe(f, "idpontuacao");
  const idpergunta = idDe(f, "idpergunta");
  const q = texto(f, "q") || null;
  const nota = Number(texto(f, "nota").replace(",", "."));
  const descricao = texto(f, "descricao");
  if (!idpergunta || !descricao || texto(f, "nota") === "" || Number.isNaN(nota))
    voltar("erro", "Informe a descrição e uma nota numérica.", String(idpergunta), q);
  const { data: pergunta } = await supabase.from("pergunta").select("descritiva").eq("idpergunta", idpergunta).maybeSingle();
  if (pergunta?.descritiva) voltar("erro", "Pergunta descritiva não tem pontuações.", String(idpergunta), q);
  const { error } = id
    ? await supabase.from("pontuacao").update({ descricao, nota }).eq("idpontuacao", id)
    : await supabase.from("pontuacao").insert({ idpergunta, descricao, nota });
  if (error) voltar("erro", falha(error.code), String(idpergunta), q);
  voltar("ok", "Pontuação salva.", String(idpergunta), q);
}

const CHAVES: Record<string, string> = {
  questionario: "idquestionario",
  etapa: "idetapa",
  pergunta: "idpergunta",
  pontuacao: "idpontuacao",
};

export async function excluir(f: FormData) {
  const supabase = await exigirDiretor();
  const tabela = texto(f, "tabela");
  const chave = CHAVES[tabela];
  const id = idDe(f, "id");
  const abrir = texto(f, "abrir") || null;
  const q = texto(f, "q") || null;
  if (!chave || !id) voltar("erro", "Pedido inválido.", null, q);
  const { error } = await supabase.from(tabela).delete().eq(chave, id);
  if (error) voltar("erro", falha(error.code), abrir, q);
  if (tabela === "questionario") voltar("ok", "Questionário excluído.");
  voltar("ok", "Item excluído.", tabela === "pontuacao" ? abrir : null, q);
}
