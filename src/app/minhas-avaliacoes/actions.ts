"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";

type Eu = { idusuario: number };

const hojeSP = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

async function exigirCadastro() {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  return { supabase, eu };
}

function voltar(id: number, tipo: "ok" | "erro", msg: string): never {
  revalidatePath("/minhas-avaliacoes");
  revalidatePath(`/minhas-avaliacoes/${id}`);
  redirect(`/minhas-avaliacoes/${id}?${new URLSearchParams({ [tipo]: msg }).toString()}`);
}

// Carrega a avaliação e a participação da própria pessoa nela.
async function contexto(supabase: SupabaseClient, eu: Eu, id: number) {
  const { data: av } = await supabase
    .from("avaliacao")
    .select("idavaliacao, status, prazo, idquestionario")
    .eq("idavaliacao", id)
    .maybeSingle();
  if (!av) return null;

  const { data: au } = await supabase
    .from("avaliacaousuario")
    .select("idavaliacaousuario, status, datainicio")
    .eq("idavaliacao", id)
    .eq("idusuario", eu.idusuario)
    .maybeSingle();
  if (!au) return null;

  return { av, au };
}

export async function salvarEtapa(f: FormData) {
  const { supabase, eu } = await exigirCadastro();
  const id = Number(f.get("idavaliacao"));
  const idetapa = Number(f.get("idetapa"));
  if (!Number.isInteger(id) || !Number.isInteger(idetapa)) redirect("/minhas-avaliacoes");

  const ctx = await contexto(supabase, eu, id);
  if (!ctx) voltar(id, "erro", "Esta avaliação não está disponível para você.");
  const { av, au } = ctx;

  if (au.status === "concluida") voltar(id, "erro", "Esta avaliação já foi concluída.");
  if (av.status !== "aberta" || av.prazo < hojeSP())
    voltar(id, "erro", "O prazo desta avaliação terminou; não é mais possível responder.");

  const ids = f
    .getAll("pergunta")
    .map((x) => Number(x))
    .filter((x) => Number.isInteger(x));
  if (!ids.length) voltar(id, "erro", "Pedido inválido.");

  const [{ data: etapa }, { data: perguntas }, { data: pontuacoes }] = await Promise.all([
    supabase.from("etapa").select("idetapa, idquestionario").eq("idetapa", idetapa).maybeSingle(),
    supabase.from("pergunta").select("idpergunta, descritiva, idetapa").in("idpergunta", ids),
    supabase.from("pontuacao").select("idpontuacao, idpergunta").in("idpergunta", ids),
  ]);

  if (!etapa || etapa.idquestionario !== av.idquestionario) voltar(id, "erro", "Etapa inválida.");

  const daEtapa = new Map((perguntas ?? []).map((p) => [p.idpergunta, p]));
  const donoDaPontuacao = new Map((pontuacoes ?? []).map((o) => [o.idpontuacao, o.idpergunta]));
  const linhas: {
    idavaliacao: number;
    idusuario: number;
    idpergunta: number;
    idpontuacao: number | null;
    texto: string | null;
  }[] = [];

  for (const pid of ids) {
    const p = daEtapa.get(pid);
    if (!p || p.idetapa !== idetapa) continue;

    if (p.descritiva) {
      const texto = String(f.get(`t_${pid}`) ?? "").trim();
      if (!texto) continue;
      if (texto.length > 2000) voltar(id, "erro", "A resposta descritiva pode ter no máximo 2.000 caracteres.");
      linhas.push({ idavaliacao: id, idusuario: eu.idusuario, idpergunta: pid, idpontuacao: null, texto });
    } else {
      const valor = Number(f.get(`p_${pid}`));
      if (!Number.isInteger(valor) || donoDaPontuacao.get(valor) !== pid) continue;
      linhas.push({ idavaliacao: id, idusuario: eu.idusuario, idpergunta: pid, idpontuacao: valor, texto: null });
    }
  }

  if (!linhas.length) voltar(id, "erro", "Responda ao menos uma pergunta desta etapa.");

  const { error } = await supabase
    .from("resposta")
    .upsert(linhas, { onConflict: "idavaliacao,idusuario,idpergunta" });
  if (error) voltar(id, "erro", "Não foi possível salvar as respostas. Tente novamente.");

  if (au.status === "pendente") {
    await supabase
      .from("avaliacaousuario")
      .update({ status: "em_andamento", datainicio: au.datainicio ?? new Date().toISOString() })
      .eq("idavaliacaousuario", au.idavaliacaousuario);
  }

  voltar(id, "ok", "Etapa salva.");
}

export async function concluirAvaliacao(f: FormData) {
  const { supabase, eu } = await exigirCadastro();
  const id = Number(f.get("idavaliacao"));
  if (!Number.isInteger(id)) redirect("/minhas-avaliacoes");

  const ctx = await contexto(supabase, eu, id);
  if (!ctx) voltar(id, "erro", "Esta avaliação não está disponível para você.");
  const { av, au } = ctx;

  if (au.status === "concluida") voltar(id, "erro", "Esta avaliação já foi concluída.");
  if (av.status !== "aberta" || av.prazo < hojeSP())
    voltar(id, "erro", "O prazo desta avaliação terminou.");

  const { data: etapas } = await supabase.from("etapa").select("idetapa").eq("idquestionario", av.idquestionario);
  const idsEtapas = (etapas ?? []).map((e) => e.idetapa);

  const [{ count: total }, { count: respondidas }] = await Promise.all([
    supabase.from("pergunta").select("idpergunta", { count: "exact", head: true }).in("idetapa", idsEtapas),
    supabase
      .from("resposta")
      .select("idresposta", { count: "exact", head: true })
      .eq("idavaliacao", id)
      .eq("idusuario", eu.idusuario),
  ]);

  const faltam = (total ?? 0) - (respondidas ?? 0);
  if (faltam > 0) voltar(id, "erro", `Ainda faltam ${faltam} ${faltam === 1 ? "pergunta" : "perguntas"}.`);

  const { error } = await supabase
    .from("avaliacaousuario")
    .update({ status: "concluida", dataconclusao: new Date().toISOString() })
    .eq("idavaliacaousuario", au.idavaliacaousuario);
  if (error) voltar(id, "erro", "Não foi possível concluir a avaliação.");

  voltar(id, "ok", "Avaliação concluída. Obrigado!");
}
