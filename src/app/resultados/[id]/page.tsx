import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";
import { Voltar } from "@/components/Voltar";
import { GraficoRadar, type EixoRadar, type SerieRadar } from "@/components/GraficoRadar";
import { carregarNotasEtapas, formatarNota } from "@/lib/notas";

export const instant = false;

const CORES = [
  "#1d4ed8",
  "#dc2626",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#b45309",
  "#0f766e",
  "#9333ea",
  "#475569",
];

const STATUS: Record<string, { rotulo: string; classe: string }> = {
  pendente: { rotulo: "Não iniciada", classe: "bg-gray-100 text-gray-700" },
  em_andamento: { rotulo: "Em andamento", classe: "bg-amber-100 text-amber-800" },
  concluida: { rotulo: "Concluída", classe: "bg-green-100 text-green-800" },
};

const STATUS_AVALIACAO: Record<string, { rotulo: string; classe: string }> = {
  rascunho: { rotulo: "Rascunho", classe: "bg-gray-100 text-gray-700" },
  aberta: { rotulo: "Aberta", classe: "bg-green-100 text-green-800" },
  finalizada: { rotulo: "Finalizada", classe: "bg-blue-100 text-blue-800" },
};

const dataBR = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

const codigoEtapa = (descricao: string) => {
  const achado = descricao.match(/^\s*(\d{1,2})\s*[-–—.]/);
  return achado ? achado[1].padStart(2, "0") : descricao.slice(0, 2).toUpperCase();
};

type RamoInfo = { nome: string } | null;

type Participacao = { idusuario: number; status: string; dataconclusao: string | null };

type Pessoa = {
  idusuario: number;
  nome: string;
  ramo: RamoInfo | RamoInfo[];
};

export default async function ResultadoAvaliacao({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idTexto } = await params;
  const id = Number(idTexto);
  if (!Number.isInteger(id)) notFound();

  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  if (!eu.podeResultados) redirect("/");

  const [{ data: av }, { data: questionario }] = await Promise.all([
    supabase
      .from("avaliacao")
      .select("idavaliacao, descricao, prazo, status, datageracao, datafinalizacao, idquestionario")
      .eq("idavaliacao", id)
      .maybeSingle(),
    supabase.from("questionario").select("idquestionario, descricao"),
  ]);
  if (!av) notFound();

  const { data: participacoesData } = await supabase
    .from("avaliacaousuario")
    .select("idusuario, status, dataconclusao")
    .eq("idavaliacao", id)
    .order("idusuario", { ascending: true });

  const participacoes = (participacoesData ?? []) as Participacao[];
  const ids = participacoes.map((p) => p.idusuario);

  const [{ data: pessoasData }, { data: respostasData }, notasEtapas] = await Promise.all([
    ids.length
      ? supabase.from("usuario").select("idusuario, nome, ramo:ramo(nome)").in("idusuario", ids)
      : Promise.resolve({ data: [] as Pessoa[] }),
    ids.length
      ? supabase.from("resposta").select("idusuario").eq("idavaliacao", id).in("idusuario", ids)
      : Promise.resolve({ data: [] as { idusuario: number }[] }),
    carregarNotasEtapas(supabase, { idavaliacao: id, idquestionario: av.idquestionario }, ids),
  ]);

  const respostasPorUsuario = new Map<number, number>();
  (respostasData ?? []).forEach((r) => {
    respostasPorUsuario.set(r.idusuario, (respostasPorUsuario.get(r.idusuario) ?? 0) + 1);
  });

  const linhas = ((pessoasData ?? []) as Pessoa[])
    .map((p) => {
      const ramo = (Array.isArray(p.ramo) ? p.ramo[0] : p.ramo) as RamoInfo;
      const participacao = participacoes.find((x) => x.idusuario === p.idusuario);
      const etapas = notasEtapas.porUsuario.get(p.idusuario) ?? [];
      const total = etapas.reduce((soma, e) => soma + e.total, 0);
      const maximo = etapas.reduce((soma, e) => soma + e.maximo, 0);
      return {
        idusuario: p.idusuario,
        nome: p.nome,
        ramo: ramo?.nome ?? "",
        status: participacao?.status ?? "pendente",
        dataconclusao: participacao?.dataconclusao ?? null,
        respostas: respostasPorUsuario.get(p.idusuario) ?? 0,
        etapas,
        total,
        maximo,
        percentual: maximo > 0 ? (total / maximo) * 100 : 0,
      };
    })
    .sort(
      (a, b) =>
        (a.ramo || "\uffff").localeCompare(b.ramo || "\uffff", "pt-BR", { sensitivity: "base" }) ||
        a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
    );

  const eixos: EixoRadar[] = notasEtapas.etapas.map((e) => ({
    codigo: codigoEtapa(e.descricao),
    descricao: e.descricao,
  }));

  const series: SerieRadar[] = linhas.map((l, indice) => ({
    id: String(l.idusuario),
    nome: l.nome,
    cor: CORES[indice % CORES.length],
    valores: l.etapas.map((e) => e.percentual),
  }));

  const responderam = linhas.filter((l) => l.respostas > 0);
  const maximo = linhas[0]?.maximo ?? 0;
  const mediaPontos = responderam.length
    ? responderam.reduce((soma, l) => soma + l.total, 0) / responderam.length
    : 0;
  const mediaPct = maximo > 0 ? (mediaPontos / maximo) * 100 : 0;

  const mediaEtapas = notasEtapas.etapas.map((etapa) => {
    const valores = responderam
      .map((l) => l.etapas.find((e) => e.idetapa === etapa.idetapa)?.percentual ?? 0)
      .filter((v) => Number.isFinite(v));
    return {
      ...etapa,
      codigo: codigoEtapa(etapa.descricao),
      percentual: valores.length ? valores.reduce((soma, v) => soma + v, 0) / valores.length : 0,
    };
  });

  const nomeQuestionario = (questionario ?? []).find((q) => q.idquestionario === av.idquestionario)?.descricao;
  const seloAvaliacao = STATUS_AVALIACAO[av.status] ?? null;
  const ultima = linhas
    .map((l) => l.dataconclusao)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1);

  return (
    <Shell>
      <main className="w-full max-w-5xl p-4">
        <Voltar href="/resultados" />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-azul">{av.descricao}</h1>
          {seloAvaliacao && (
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${seloAvaliacao.classe}`}>
              {seloAvaliacao.rotulo}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-600">
          {nomeQuestionario ?? "Questionário"} · Gerada em {dataBR(av.datageracao)} · Prazo: {dataBR(av.prazo)} ·{" "}
          {linhas.length} {linhas.length === 1 ? "participante" : "participantes"}
          {ultima ? ` · Última conclusão: ${dataBR(ultima)}` : ""}
        </p>

        {!linhas.length && (
          <p className="mt-6 rounded border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Nenhum associado participa desta avaliação.
          </p>
        )}

        {!!linhas.length && !eixos.length && (
          <p className="mt-6 rounded border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Esta avaliação não tem etapas pontuadas no nível do associado; por isso não há nota para exibir no radar.
          </p>
        )}

        {!!eixos.length && (
          <>
            <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
              <section className="overflow-hidden rounded border border-gray-200 bg-white">
                <div className="flex flex-wrap items-center gap-2 border-b-2 border-amarelo bg-azul p-3 text-white">
                  <h2 className="flex-1 text-sm font-semibold">Pontuações por associado</h2>
                  <span className="rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-800">
                    {linhas.length} {linhas.length === 1 ? "associado" : "associados"}
                  </span>
                </div>
                <div className="p-4">
                  <GraficoRadar
                    eixos={eixos}
                    series={series}
                    media={{ nome: "Média da avaliação", cor: "#111827", valores: mediaEtapas.map((e) => e.percentual) }}
                  />
                </div>
              </section>

              <section className="overflow-hidden rounded border border-gray-200 bg-white">
                <div className="border-b-2 border-amarelo bg-azul p-3 text-white">
                  <h2 className="text-sm font-semibold">Média da avaliação</h2>
                </div>
                <div className="p-4">
                  <p className="text-3xl font-semibold text-azul">
                    {responderam.length ? `${Math.round(mediaPct)}%` : "—"}
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    {responderam.length ? (
                      <>
                        <strong>{formatarNota(mediaPontos)}</strong> de <strong>{formatarNota(maximo)}</strong> pontos
                      </>
                    ) : (
                      "Nenhuma resposta registrada ainda."
                    )}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Média de {responderam.length}{" "}
                    {responderam.length === 1 ? "pessoa que já respondeu" : "pessoas que já responderam"}
                    {linhas.length !== responderam.length ? `, de ${linhas.length} participantes` : ""}.
                  </p>

                  <table className="mt-4 w-full text-left text-sm">
                    <thead>
                      <tr className="border-b text-xs uppercase tracking-wide text-gray-500">
                        <th className="py-1.5 font-medium">Etapa</th>
                        <th className="py-1.5 text-right font-medium">Média</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {mediaEtapas.map((etapa) => (
                        <tr key={etapa.idetapa}>
                          <td className="py-1.5 pr-2">
                            <span className="font-medium text-gray-900">{etapa.codigo}</span>{" "}
                            <span className="text-xs text-gray-600">
                              {etapa.descricao.replace(/^\s*\d{1,2}\s*[-–—.]\s*/, "")}
                            </span>
                          </td>
                          <td className="whitespace-nowrap py-1.5 text-right font-medium text-gray-800">
                            {Math.round(etapa.percentual)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <section className="mt-6 overflow-hidden rounded border border-gray-200 bg-white">
              <div className="flex flex-wrap items-center gap-2 border-b-2 border-amarelo bg-azul p-3 text-white">
                <h2 className="flex-1 text-sm font-semibold">Associados e notas</h2>
                <span className="text-xs text-white/90">Ordenado por ramo e nome</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-2 font-medium">Ramo</th>
                      <th className="px-4 py-2 font-medium">Associado</th>
                      <th className="px-4 py-2 font-medium">Situação</th>
                      <th className="px-4 py-2 text-right font-medium">Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {linhas.map((l) => {
                      const selo = STATUS[l.status] ?? { rotulo: l.status, classe: "bg-gray-100 text-gray-700" };
                      return (
                        <tr key={l.idusuario}>
                          <td className="whitespace-nowrap px-4 py-2 text-gray-600">{l.ramo || "—"}</td>
                          <td className="px-4 py-2 font-medium text-gray-900">{l.nome}</td>
                          <td className="whitespace-nowrap px-4 py-2">
                            <span className={`rounded px-2 py-0.5 text-xs font-medium ${selo.classe}`}>{selo.rotulo}</span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-right text-gray-800">
                            {formatarNota(l.total)} de {formatarNota(l.maximo)}
                            <span className="ml-1 text-xs text-gray-500">({Math.round(l.percentual)}%)</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </Shell>
  );
}
