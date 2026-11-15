import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";
import { Voltar } from "@/components/Voltar";
import { GraficoNotas, type LinhaGrafico } from "@/components/GraficoNotas";
import { carregarNotas, chaveNota, formatarNota } from "@/lib/notas";

export const instant = false;

const dataBR = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

type RamoInfo = { nome: string } | null;
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

  const { data: concluidas } = await supabase
    .from("avaliacaousuario")
    .select("idusuario, dataconclusao")
    .eq("idavaliacao", id)
    .eq("status", "concluida");

  const ids = (concluidas ?? []).map((c) => c.idusuario);

  const { data: pessoas } = ids.length
    ? await supabase.from("usuario").select("idusuario, nome, ramo:ramo(nome)").in("idusuario", ids)
    : { data: [] as Pessoa[] };

  const notas = await carregarNotas(
    supabase,
    [{ idavaliacao: id, idquestionario: av.idquestionario }],
    ids,
  );

  const linhas: LinhaGrafico[] = ((pessoas ?? []) as Pessoa[])
    .map((p) => {
      const ramo = (Array.isArray(p.ramo) ? p.ramo[0] : p.ramo) as RamoInfo;
      const nota = notas.get(chaveNota(id, p.idusuario));
      return {
        idusuario: p.idusuario,
        nome: p.nome,
        ramo: ramo?.nome ?? "",
        total: nota?.total ?? 0,
        maximo: nota?.maximo ?? 0,
      };
    })
    .filter((l) => l.maximo > 0)
    .sort(
      (a, b) =>
        (a.ramo || "\uffff").localeCompare(b.ramo || "\uffff", "pt-BR", { sensitivity: "base" }) ||
        a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
    );

  const nomeQuestionario = (questionario ?? []).find((q) => q.idquestionario === av.idquestionario)?.descricao;
  const ultima = (concluidas ?? [])
    .map((c) => c.dataconclusao)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1);

  return (
    <Shell>
      <main className="max-w-3xl p-4">
        <Voltar href="/resultados" />

        <h1 className="mt-2 text-xl font-semibold text-azul">{av.descricao}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {nomeQuestionario ?? "Questionário"} · Prazo: {dataBR(av.prazo)} · {ids.length}{" "}
          {ids.length === 1 ? "resposta concluída" : "respostas concluídas"}
          {ultima ? ` · Última conclusão: ${dataBR(ultima)}` : ""}
        </p>

        {!ids.length && (
          <p className="mt-6 rounded border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Nenhum usuário concluiu esta avaliação ainda.
          </p>
        )}

        {!!ids.length && !linhas.length && (
          <p className="mt-6 rounded border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Esta avaliação não tem perguntas pontuadas no nível do usuário; por isso não há nota para exibir.
          </p>
        )}

        {!!linhas.length && (
          <>
            <section className="mt-6 overflow-hidden rounded border border-gray-200 bg-white">
              <div className="flex flex-wrap items-center gap-2 border-b-2 border-amarelo bg-azul p-3 text-white">
                <h2 className="flex-1 text-sm font-semibold">Pontuações por usuário</h2>
                <span className="rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-800">
                  {linhas.length} {linhas.length === 1 ? "usuário" : "usuários"}
                </span>
              </div>
              <div className="p-4">
                <GraficoNotas linhas={linhas} />
              </div>
            </section>

            <section className="mt-6 overflow-hidden rounded border border-gray-200 bg-white">
              <div className="flex flex-wrap items-center gap-2 border-b-2 border-amarelo bg-azul p-3 text-white">
                <h2 className="flex-1 text-sm font-semibold">Usuários e notas</h2>
                <span className="text-xs text-white/90">Ordenado por ramo e nome</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-2 font-medium">Ramo</th>
                      <th className="px-4 py-2 font-medium">Usuário</th>
                      <th className="px-4 py-2 text-right font-medium">Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {linhas.map((l) => {
                      const pct = l.maximo > 0 ? Math.round((l.total / l.maximo) * 100) : 0;
                      return (
                        <tr key={l.idusuario}>
                          <td className="whitespace-nowrap px-4 py-2 text-gray-600">{l.ramo || "—"}</td>
                          <td className="px-4 py-2 font-medium text-gray-900">{l.nome}</td>
                          <td className="whitespace-nowrap px-4 py-2 text-right text-gray-800">
                            {formatarNota(l.total)} de {formatarNota(l.maximo)}
                            <span className="ml-1 text-xs text-gray-500">({pct}%)</span>
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
