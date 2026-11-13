"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { ehNivel, ROTULO_NIVEL, type Nivel } from "@/lib/niveis";

export type EstadoRespostas = { ok?: string; erro?: string };

const hojeSP = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

async function exigirCadastro() {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  return { supabase, eu };
}

// Cada nível tem a sua própria tela; o retorno do formulário volta para ela.
function rota(nivel: Nivel, id: number, idusuario: number) {
  if (nivel === "usuario") return `/minhas-avaliacoes/${id}`;
  if (nivel === "apf") return `/meus-assessorados/${idusuario}/${id}`;
  return `/parecer/${idusuario}/${id}`;
}

function voltar(nivel: Nivel, id: number, idusuario: number, tipo: "ok" | "erro", msg: string): never {
  revalidatePath("/minhas-avaliacoes");
  revalidatePath(`/minhas-avaliacoes/${id}`);
  revalidatePath("/meus-assessorados");
  revalidatePath(`/meus-assessorados/${idusuario}`);
  revalidatePath(`/meus-assessorados/${idusuario}/${id}`);
  revalidatePath("/parecer");
  revalidatePath(`/parecer/${idusuario}/${id}`);
  redirect(`${rota(nivel, id, idusuario)}?${new URLSearchParams({ [tipo]: msg }).toString()}`);
}

// Os triggers e funções do banco escrevem mensagens em português já prontas.
function mensagemBanco(erro?: { code?: string; message?: string }) {
  const m = erro?.message ?? "";
  if (erro?.code === "P0001" && m) return m;
  return "Não foi possível salvar as respostas. Tente novamente.";
}

async function contexto(supabase: SupabaseClient, id: number, idusuario: number) {
  const { data: av } = await supabase
    .from("avaliacao")
    .select("idavaliacao, status, prazo, idquestionario")
    .eq("idavaliacao", id)
    .maybeSingle();
  if (!av) return null;

  const { data: au } = await supabase
    .from("avaliacaousuario")
    .select("idavaliacaousuario, status, datainicio, dataconclusao, concluiapf, concluirdiretor")
    .eq("idavaliacao", id)
    .eq("idusuario", idusuario)
    .maybeSingle();
  if (!au) return null;

  return { av, au };
}

async function podeResponder(
  supabase: SupabaseClient,
  eu: { idusuario: number; podeParecer: boolean },
  nivel: Nivel,
  idusuario: number,
) {
  if (nivel === "usuario") return idusuario === eu.idusuario;
  if (nivel === "apf") {
    const { data } = await supabase.from("usuario").select("idapf").eq("idusuario", idusuario).maybeSingle();
    return data?.idapf === eu.idusuario;
  }
  return eu.podeParecer;
}

// Grava somente as perguntas do nível, sempre no nome do adulto avaliado.
async function gravar(
  supabase: SupabaseClient,
  id: number,
  idusuario: number,
  idquestionario: number,
  nivel: Nivel,
  f: FormData,
): Promise<{ erro?: string; linhas?: number }> {
  const ids = f
    .getAll("pergunta")
    .map((x) => Number(x))
    .filter((x) => Number.isInteger(x));
  if (!ids.length) return { erro: "Pedido inválido." };

  const { data: etapas } = await supabase
    .from("etapa")
    .select("idetapa")
    .eq("idquestionario", idquestionario)
    .eq("publico", nivel);
  const idsEtapas = (etapas ?? []).map((e) => e.idetapa);
  if (!idsEtapas.length) return { erro: `Este questionário não tem perguntas de nível ${ROTULO_NIVEL[nivel]}.` };

  const [{ data: perguntas }, { data: pontuacoes }] = await Promise.all([
    supabase.from("pergunta").select("idpergunta, descritiva").in("idetapa", idsEtapas),
    supabase.from("pontuacao").select("idpontuacao, idpergunta").in("idpergunta", ids),
  ]);

  // Só aceitamos perguntas que realmente pertencem ao nível desta avaliação.
  const daAvaliacao = new Map((perguntas ?? []).map((p) => [p.idpergunta, p]));
  const donoDaPontuacao = new Map((pontuacoes ?? []).map((o) => [o.idpontuacao, o.idpergunta]));
  const linhas: {
    idavaliacao: number;
    idusuario: number;
    idpergunta: number;
    idpontuacao: number | null;
    texto: string | null;
  }[] = [];

  for (const pid of ids) {
    const p = daAvaliacao.get(pid);
    if (!p) continue;

    if (p.descritiva) {
      const texto = String(f.get(`t_${pid}`) ?? "").trim();
      if (!texto) continue;
      if (texto.length > 2000) return { erro: "A resposta descritiva pode ter no máximo 2.000 caracteres." };
      linhas.push({ idavaliacao: id, idusuario, idpergunta: pid, idpontuacao: null, texto });
    } else {
      const valor = Number(f.get(`p_${pid}`));
      if (!Number.isInteger(valor) || donoDaPontuacao.get(valor) !== pid) continue;
      linhas.push({ idavaliacao: id, idusuario, idpergunta: pid, idpontuacao: valor, texto: null });
    }
  }

  if (!linhas.length) return { erro: "Responda ao menos uma pergunta antes de salvar." };

  const { error } = await supabase
    .from("resposta")
    .upsert(linhas, { onConflict: "idavaliacao,idusuario,idpergunta" });
  if (error) return { erro: mensagemBanco(error) };

  return { linhas: linhas.length };
}

// Salva as respostas do nível (usuário, APF ou diretor) e, quando pedido,
// conclui aquela etapa. A conclusão é sequencial: usuário -> APF -> direção.
export async function salvarRespostas(_anterior: EstadoRespostas, f: FormData): Promise<EstadoRespostas> {
  const { supabase, eu } = await exigirCadastro();

  const id = Number(f.get("idavaliacao"));
  const idusuario = Number(f.get("idusuario"));
  const nivelTexto = String(f.get("nivel") ?? "");
  if (!Number.isInteger(id) || !Number.isInteger(idusuario) || !ehNivel(nivelTexto)) {
    return { erro: "Pedido inválido." };
  }
  const nivel: Nivel = nivelTexto;

  if (!(await podeResponder(supabase, eu, nivel, idusuario))) {
    return { erro: "Você não pode responder esta avaliação." };
  }

  const ctx = await contexto(supabase, id, idusuario);
  if (!ctx) return { erro: "Esta avaliação não está disponível." };
  const { av, au } = ctx;

  if (nivel === "usuario" && au.status === "concluida") return { erro: "Esta avaliação já foi concluída." };
  if (nivel === "apf" && au.concluiapf) return { erro: "A etapa do APF já foi concluída." };
  if (nivel === "diretor" && au.concluirdiretor) return { erro: "O parecer da direção já foi concluído." };

  if (av.status !== "aberta" || av.prazo < hojeSP())
    return { erro: "O prazo desta avaliação terminou; não é mais possível responder." };

  const gravou = await gravar(supabase, id, idusuario, av.idquestionario, nivel, f);
  if (gravou.erro) return { erro: gravou.erro };

  if (nivel === "usuario" && au.status === "pendente") {
    await supabase
      .from("avaliacaousuario")
      .update({ status: "em_andamento", datainicio: au.datainicio ?? new Date().toISOString() })
      .eq("idavaliacaousuario", au.idavaliacaousuario);
  }

  if (String(f.get("intencao") ?? "salvar") !== "concluir") {
    revalidatePath(rota(nivel, id, idusuario));
    return { ok: "Respostas salvas." };
  }

  const { data: etapasNivel } = await supabase
    .from("etapa")
    .select("idetapa")
    .eq("idquestionario", av.idquestionario)
    .eq("publico", nivel);
  const idsEtapasNivel = (etapasNivel ?? []).map((e) => e.idetapa);

  const [{ data: perguntasNivel }, { data: respostasNivel }] = await Promise.all([
    idsEtapasNivel.length
      ? supabase.from("pergunta").select("idpergunta").in("idetapa", idsEtapasNivel)
      : Promise.resolve({ data: [] as { idpergunta: number }[] }),
    supabase.from("resposta").select("idpergunta").eq("idavaliacao", id).eq("idusuario", idusuario),
  ]);

  const doNivel = new Set((perguntasNivel ?? []).map((p) => p.idpergunta));
  const total = doNivel.size;
  if (!total) return { erro: `Este questionário não tem perguntas de nível ${ROTULO_NIVEL[nivel]}.` };

  const respondidas = (respostasNivel ?? []).filter((r) => doNivel.has(r.idpergunta)).length;
  const faltam = total - respondidas;
  if (faltam > 0) {
    return {
      erro: `Respostas salvas, mas ainda faltam ${faltam} ${faltam === 1 ? "pergunta" : "perguntas"} para concluir.`,
    };
  }

  if (nivel === "apf" && au.status !== "concluida")
    return { erro: "Respostas salvas, mas o APF só pode concluir depois que o usuário concluir a avaliação." };
  if (nivel === "diretor" && !au.concluiapf)
    return { erro: "Respostas salvas, mas a direção só pode concluir depois que o APF concluir a avaliação." };

  const { error } = await supabase.rpc("concluir_nivel", {
    p_idavaliacao: id,
    p_idusuario: idusuario,
    p_nivel: nivel,
  });
  if (error) return { erro: mensagemBanco(error) };

  const msg =
    nivel === "usuario"
      ? "Avaliação concluída. Obrigado!"
      : nivel === "apf"
        ? "Etapa do APF concluída."
        : "Parecer da direção concluído.";
  voltar(nivel, id, idusuario, "ok", msg);
}
