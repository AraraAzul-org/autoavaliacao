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
// Os triggers do banco escrevem mensagens em português já prontas para o usuário.
function falha(erro?: { code?: string; message?: string }) {
  const m = erro?.message ?? "";
  if (erro?.code === "P0001" && m) return m;
  if (erro?.code === "23503") return "Não é possível excluir: há itens ou respostas vinculados.";
  return "Não foi possível salvar. Confira os dados.";
}

export async function salvarQuestionario(f: FormData) {
  const supabase = await exigirDiretor();
  const id = idDe(f, "idquestionario");
  const descricao = texto(f, "descricao");
  const ativo = f.get("ativo") === "on";
  const q = texto(f, "q") || null;
  if (!descricao) voltar("erro", "Informe a descrição do questionário.", null, id ? String(id) : q);

  if (id) {
    const { error } = await supabase.from("questionario").update({ descricao, ativo }).eq("idquestionario", id);
    if (error) voltar("erro", falha(error), null, String(id));
    voltar("ok", "Questionário salvo.", null, String(id));
  }

  const { data, error } = await supabase
    .from("questionario")
    .insert({ descricao, ativo })
    .select("idquestionario");
  if (error) voltar("erro", falha(error), null, q);
  voltar("ok", "Questionário criado.", null, String(data?.[0]?.idquestionario ?? q ?? ""));
}

export async function salvarEtapa(f: FormData) {
  const supabase = await exigirDiretor();
  const id = idDe(f, "idetapa");
  const idquestionario = idDe(f, "idquestionario");
  const descricao = texto(f, "descricao");
  const q = texto(f, "q") || (idquestionario ? String(idquestionario) : null);
  const publico = texto(f, "publico");
  const naopontuada = f.get("naopontuada") === "on";
  if (!descricao) voltar("erro", "Informe a descrição da etapa.", null, q);
  if (!["usuario", "apf", "diretor"].includes(publico))
    voltar("erro", "Escolha quem responde as perguntas desta etapa.", null, q);
  if (!id && !idquestionario) voltar("erro", "Escolha o questionário da etapa.", null, q);
  // Etapas não pontuadas e as que não são respondidas pelos usuários não entram na nota.
  const pontua = publico === "usuario" && !naopontuada;
  const notaTexto = texto(f, "notaminima");
  const notaminima = pontua && notaTexto !== "" ? Number(notaTexto.replace(",", ".")) : null;
  if (notaminima != null && Number.isNaN(notaminima))
    voltar("erro", "Informe uma nota mínima numérica.", null, q);
  const dados = { descricao, notaminima, publico, naopontuada };
  const { error } = id
    ? await supabase.from("etapa").update(dados).eq("idetapa", id)
    : await supabase.from("etapa").insert({ ...dados, idquestionario });
  if (error) voltar("erro", falha(error), null, q);
  voltar("ok", "Etapa salva.", null, q);
}

export async function salvarPergunta(f: FormData) {
  const supabase = await exigirDiretor();
  const id = idDe(f, "idpergunta");
  const q = texto(f, "q") || null;
  const tipo = texto(f, "tipo") || "pontuada";
  if (!["pontuada", "selecao", "descritiva"].includes(tipo))
    voltar("erro", "Escolha o tipo de resposta da pergunta.", id ? String(id) : null, q);
  // "Seleção" saiu do cadastro; o valor só é aceito para não converter perguntas antigas desse tipo.
  if (tipo === "selecao" && !id) voltar("erro", "Escolha o tipo de resposta da pergunta.", null, q);
  const dados = {
    codigo: texto(f, "codigo"),
    descricao: texto(f, "descricao"),
    idetapa: idDe(f, "idetapa"),
    descritiva: tipo === "descritiva",
    selecao: tipo === "selecao",
  };
  if (!dados.codigo || !dados.descricao || !dados.idetapa) voltar("erro", "Informe código, descrição e etapa.", null, q);

  if (id) {
    const { data: atual } = await supabase
      .from("pergunta")
      .select("descritiva, selecao")
      .eq("idpergunta", id)
      .maybeSingle();
    if (atual && (atual.descritiva !== dados.descritiva || atual.selecao !== dados.selecao)) {
      const { count: respostas } = await supabase
        .from("resposta").select("idresposta", { count: "exact", head: true }).eq("idpergunta", id);
      if (respostas) voltar("erro", "Esta pergunta já tem respostas; não é possível mudar o tipo.", String(id), q);
      const { count: opcoes } = await supabase
        .from("pontuacao").select("idpontuacao", { count: "exact", head: true }).eq("idpergunta", id);
      if (opcoes) voltar("erro", "Exclua as opções de resposta antes de mudar o tipo.", String(id), q);
    }
  }

  const { data, error } = id
    ? await supabase.from("pergunta").update(dados).eq("idpergunta", id).select("idpergunta")
    : await supabase.from("pergunta").insert(dados).select("idpergunta");
  if (error) voltar("erro", falha(error), null, q);
  voltar("ok", "Pergunta salva.", String(data?.[0]?.idpergunta ?? id), q);
}

export async function salvarPontuacao(f: FormData) {
  const supabase = await exigirDiretor();
  const id = idDe(f, "idpontuacao");
  const idpergunta = idDe(f, "idpergunta");
  const q = texto(f, "q") || null;
  const descricao = texto(f, "descricao");
  const { data: pergunta } = await supabase
    .from("pergunta")
    .select("descritiva, idetapa")
    .eq("idpergunta", idpergunta ?? 0)
    .maybeSingle();
  if (pergunta?.descritiva) voltar("erro", "Pergunta descritiva não tem pontuações.", String(idpergunta), q);

  const { data: etapa } = pergunta?.idetapa
    ? await supabase
        .from("etapa")
        .select("publico, naopontuada")
        .eq("idetapa", pergunta.idetapa)
        .maybeSingle()
    : { data: null };
  const pontua = etapa?.publico === "usuario" && !etapa?.naopontuada;

  const notaTexto = texto(f, "nota");
  let nota: number | null = null;
  if (pontua) {
    if (notaTexto === "") voltar("erro", "Informe a nota da pontuação.", String(idpergunta), q);
    const numero = Number(notaTexto.replace(",", "."));
    if (Number.isNaN(numero)) voltar("erro", "A nota deve ser numérica.", String(idpergunta), q);
    nota = numero;
  }
  if (!idpergunta || !descricao) voltar("erro", "Informe a descrição da opção.", String(idpergunta), q);

  // Em etapa que não pontua, a nota já gravada é preservada: se a etapa voltar
  // a pontuar, as notas antigas continuam valendo.
  const { error } = id
    ? await supabase
        .from("pontuacao")
        .update(pontua ? { descricao, nota } : { descricao })
        .eq("idpontuacao", id)
    : await supabase.from("pontuacao").insert({ idpergunta, descricao, nota });
  if (error) voltar("erro", falha(error), String(idpergunta), q);
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
  if (error) voltar("erro", falha(error), abrir, q);
  if (tabela === "questionario") voltar("ok", "Questionário excluído.");
  voltar("ok", "Item excluído.", tabela === "pontuacao" ? abrir : null, q);
}
