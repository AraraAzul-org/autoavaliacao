import type { SupabaseClient } from "@supabase/supabase-js";

export type NotaAvaliacao = { total: number; maximo: number };

const chave = (idavaliacao: number, idusuario: number) => `${idavaliacao}:${idusuario}`;

export function chaveNota(idavaliacao: number, idusuario: number) {
  return chave(idavaliacao, idusuario);
}

export function formatarNota(valor: number) {
  return Number(valor.toFixed(2)).toLocaleString("pt-BR");
}

type Avaliacao = { idavaliacao: number; idquestionario: number };
type Etapa = { idetapa: number; idquestionario: number };
type Pergunta = { idpergunta: number; idetapa: number; descritiva: boolean; selecao: boolean };
type Pontuacao = { idpontuacao: number; idpergunta: number; nota: number | string | null };

// Soma as notas das opções escolhidas nas perguntas de nível Usuário.
// Perguntas descritivas, de seleção e opções sem nota ficam de fora.
export async function carregarNotas(
  supabase: SupabaseClient,
  avaliacoes: Avaliacao[],
  idsUsuarios: number[],
): Promise<Map<string, NotaAvaliacao>> {
  const notas = new Map<string, NotaAvaliacao>();
  const unicas = [...new Map(avaliacoes.map((a) => [a.idavaliacao, a])).values()];
  const usuarios = [...new Set(idsUsuarios.filter((x) => Number.isInteger(x)))];
  if (!unicas.length || !usuarios.length) return notas;

  unicas.forEach((a) =>
    usuarios.forEach((u) => notas.set(chave(a.idavaliacao, u), { total: 0, maximo: 0 })),
  );

  const questionarios = [...new Set(unicas.map((a) => a.idquestionario))];
  const { data: etapasData } = await supabase
    .from("etapa")
    .select("idetapa, idquestionario")
    .in("idquestionario", questionarios)
    .eq("publico", "usuario");
  const etapas = (etapasData ?? []) as Etapa[];
  const idsEtapas = etapas.map((e) => e.idetapa);
  if (!idsEtapas.length) return notas;

  const { data: perguntasData } = await supabase
    .from("pergunta")
    .select("idpergunta, idetapa, descritiva, selecao")
    .in("idetapa", idsEtapas);
  const perguntas = (perguntasData ?? []) as Pergunta[];
  const idsPerguntas = perguntas.map((p) => p.idpergunta);
  if (!idsPerguntas.length) return notas;

  const [{ data: pontuacoesData }, { data: respostasData }] = await Promise.all([
    supabase.from("pontuacao").select("idpontuacao, idpergunta, nota").in("idpergunta", idsPerguntas),
    supabase
      .from("resposta")
      .select("idavaliacao, idusuario, idpergunta, idpontuacao")
      .in("idavaliacao", unicas.map((a) => a.idavaliacao))
      .in("idusuario", usuarios),
  ]);

  const etapaDa = new Map(etapas.map((e) => [e.idetapa, e]));
  const perguntaDa = new Map(perguntas.map((p) => [p.idpergunta, p]));
  const pontuacaoDa = new Map(
    ((pontuacoesData ?? []) as Pontuacao[]).map((o) => [o.idpontuacao, o]),
  );

  // Maior nota de cada pergunta define o máximo possível da avaliação.
  const maximoPorPergunta = new Map<number, number>();
  pontuacaoDa.forEach((o) => {
    if (o.nota == null) return;
    const n = Number(o.nota);
    if (!Number.isFinite(n)) return;
    maximoPorPergunta.set(o.idpergunta, Math.max(maximoPorPergunta.get(o.idpergunta) ?? 0, n));
  });

  const avaliacoesPorQuestionario = new Map<number, number[]>();
  unicas.forEach((a) => {
    const lista = avaliacoesPorQuestionario.get(a.idquestionario) ?? [];
    lista.push(a.idavaliacao);
    avaliacoesPorQuestionario.set(a.idquestionario, lista);
  });

  perguntas.forEach((p) => {
    const max = maximoPorPergunta.get(p.idpergunta);
    if (max == null) return;
    const etapa = etapaDa.get(p.idetapa);
    if (!etapa) return;
    (avaliacoesPorQuestionario.get(etapa.idquestionario) ?? []).forEach((idavaliacao) => {
      usuarios.forEach((idusuario) => {
        const nota = notas.get(chave(idavaliacao, idusuario));
        if (nota) nota.maximo += max;
      });
    });
  });

  (respostasData ?? []).forEach((r) => {
    const p = perguntaDa.get(Number(r.idpergunta));
    if (!p || p.descritiva || p.selecao) return;
    const o = r.idpontuacao != null ? pontuacaoDa.get(Number(r.idpontuacao)) : null;
    if (!o || o.nota == null) return;
    const n = Number(o.nota);
    if (!Number.isFinite(n)) return;
    const nota = notas.get(chave(Number(r.idavaliacao), Number(r.idusuario)));
    if (nota) nota.total += n;
  });

  return notas;
}
