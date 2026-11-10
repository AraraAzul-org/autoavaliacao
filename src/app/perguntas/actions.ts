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

function voltar(tipo: "ok" | "erro", msg: string, abrir?: string | null): never {
  const q = new URLSearchParams({ [tipo]: msg });
  if (abrir) q.set("abrir", abrir);
  revalidatePath("/perguntas");
  redirect(`/perguntas?${q.toString()}`);
}

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const idDe = (f: FormData, k: string) => (f.get(k) ? Number(f.get(k)) : null);
const falha = (code?: string) =>
  code === "23503" ? "Não é possível excluir: há itens ou respostas vinculados." : "Não foi possível salvar. Confira os dados.";

export async function salvarEtapa(f: FormData) {
  const supabase = await exigirDiretor();
  const id = idDe(f, "idetapa");
  const descricao = texto(f, "descricao");
  if (!descricao) voltar("erro", "Informe a descrição da etapa.");
  const { error } = id
    ? await supabase.from("etapa").update({ descricao }).eq("idetapa", id)
    : await supabase.from("etapa").insert({ descricao });
  if (error) voltar("erro", falha(error.code));
  voltar("ok", "Etapa salva.");
}

export async function salvarPergunta(f: FormData) {
  const supabase = await exigirDiretor();
  const id = idDe(f, "idpergunta");
  const dados = {
    codigo: texto(f, "codigo"),
    descricao: texto(f, "descricao"),
    idetapa: idDe(f, "idetapa"),
    descritiva: f.get("descritiva") === "on",
  };
  if (!dados.codigo || !dados.descricao || !dados.idetapa) voltar("erro", "Informe código, descrição e etapa.");

  if (id) {
    const { data: atual } = await supabase.from("pergunta").select("descritiva").eq("idpergunta", id).maybeSingle();
    if (atual && atual.descritiva !== dados.descritiva) {
      const { count: respostas } = await supabase
        .from("resposta").select("idresposta", { count: "exact", head: true }).eq("idpergunta", id);
      if (respostas) voltar("erro", "Esta pergunta já tem respostas; não é possível mudar o tipo.", String(id));
      if (dados.descritiva) {
        const { count: opcoes } = await supabase
          .from("pontuacao").select("idpontuacao", { count: "exact", head: true }).eq("idpergunta", id);
        if (opcoes) voltar("erro", "Exclua as pontuações antes de tornar a pergunta descritiva.", String(id));
      }
    }
  }

  const { data, error } = id
    ? await supabase.from("pergunta").update(dados).eq("idpergunta", id).select("idpergunta")
    : await supabase.from("pergunta").insert(dados).select("idpergunta");
  if (error) voltar("erro", falha(error.code));
  voltar("ok", "Pergunta salva.", String(data?.[0]?.idpergunta ?? id));
}

export async function salvarPontuacao(f: FormData) {
  const supabase = await exigirDiretor();
  const id = idDe(f, "idpontuacao");
  const idpergunta = idDe(f, "idpergunta");
  const nota = Number(texto(f, "nota").replace(",", "."));
  const descricao = texto(f, "descricao");
  if (!idpergunta || !descricao || texto(f, "nota") === "" || Number.isNaN(nota))
    voltar("erro", "Informe a descrição e uma nota numérica.", String(idpergunta));
  const { data: pergunta } = await supabase.from("pergunta").select("descritiva").eq("idpergunta", idpergunta).maybeSingle();
  if (pergunta?.descritiva) voltar("erro", "Pergunta descritiva não tem pontuações.", String(idpergunta));
  const { error } = id
    ? await supabase.from("pontuacao").update({ descricao, nota }).eq("idpontuacao", id)
    : await supabase.from("pontuacao").insert({ idpergunta, descricao, nota });
  if (error) voltar("erro", falha(error.code), String(idpergunta));
  voltar("ok", "Pontuação salva.", String(idpergunta));
}

const CHAVES: Record<string, string> = { etapa: "idetapa", pergunta: "idpergunta", pontuacao: "idpontuacao" };

export async function excluir(f: FormData) {
  const supabase = await exigirDiretor();
  const tabela = texto(f, "tabela");
  const chave = CHAVES[tabela];
  const id = idDe(f, "id");
  const abrir = texto(f, "abrir") || null;
  if (!chave || !id) voltar("erro", "Pedido inválido.");
  const { error } = await supabase.from(tabela).delete().eq(chave, id);
  if (error) voltar("erro", falha(error.code), abrir);
  voltar("ok", "Item excluído.", tabela === "pontuacao" ? abrir : null);
}
