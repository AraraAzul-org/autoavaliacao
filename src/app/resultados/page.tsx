import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";

export const instant = false;

const STATUS: Record<string, string> = {
  rascunho: "Rascunho",
  aberta: "Aberta",
  finalizada: "Finalizada",
};

const dataBR = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

type Avaliacao = {
  idavaliacao: number;
  descricao: string;
  prazo: string;
  status: string;
  datageracao: string | null;
  datafinalizacao: string | null;
  idquestionario: number;
};

export default async function Resultados() {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  if (!eu.podeResultados) redirect("/");

  const { data: concluidas } = await supabase
    .from("avaliacaousuario")
    .select("idavaliacao, dataconclusao")
    .eq("status", "concluida");

  const porAvaliacao = new Map<number, { total: number; ultima: string | null }>();
  (concluidas ?? []).forEach((c) => {
    const atual = porAvaliacao.get(c.idavaliacao) ?? { total: 0, ultima: null };
    atual.total += 1;
    const quando = c.dataconclusao ?? null;
    if (quando && (!atual.ultima || quando > atual.ultima)) atual.ultima = quando;
    porAvaliacao.set(c.idavaliacao, atual);
  });

  const ids = [...porAvaliacao.keys()];
  const [{ data: lista }, { data: questionarios }] = await Promise.all([
    ids.length
      ? supabase
          .from("avaliacao")
          .select("idavaliacao, descricao, prazo, status, datageracao, datafinalizacao, idquestionario")
          .in("idavaliacao", ids)
      : Promise.resolve({ data: [] as Avaliacao[] }),
    supabase.from("questionario").select("idquestionario, descricao"),
  ]);

  const nomeQuestionario = new Map((questionarios ?? []).map((q) => [q.idquestionario, q.descricao]));

  const avaliacoes = ((lista ?? []) as Avaliacao[])
    .map((a) => ({
      ...a,
      concluidos: porAvaliacao.get(a.idavaliacao)?.total ?? 0,
      ultima: porAvaliacao.get(a.idavaliacao)?.ultima ?? null,
    }))
    .sort((a, b) => {
      const ordemA = a.ultima ?? a.datafinalizacao ?? a.datageracao ?? "";
      const ordemB = b.ultima ?? b.datafinalizacao ?? b.datageracao ?? "";
      return ordemB.localeCompare(ordemA) || b.idavaliacao - a.idavaliacao;
    });

  return (
    <Shell>
      <main className="max-w-3xl p-4">
        <h1 className="text-xl font-semibold text-azul">Resultados</h1>
        <p className="mt-1 text-sm text-gray-600">
          As avaliações com respostas concluídas, da mais recente para a mais antiga. Abra uma avaliação para ver o
          gráfico das pontuações e a lista dos usuários.
        </p>

        {!avaliacoes.length && (
          <p className="mt-6 rounded border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Nenhuma avaliação com respostas concluídas ainda.
          </p>
        )}

        {avaliacoes.map((av) => (
          <Link
            key={av.idavaliacao}
            href={`/resultados/${av.idavaliacao}`}
            className="mt-4 block overflow-hidden rounded border border-gray-200 border-l-4 border-l-amarelo bg-white shadow-sm transition-colors hover:border-azul"
          >
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50/60 p-4">
              <h2 className="min-w-0 flex-1 font-semibold text-gray-900">{av.descricao}</h2>
              <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                {av.concluidos} {av.concluidos === 1 ? "concluída" : "concluídas"}
              </span>
              <span className="text-sm font-medium text-azul">Ver gráfico →</span>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 p-4 text-sm text-gray-700">
              <span>
                Questionário: <strong>{nomeQuestionario.get(av.idquestionario) ?? "—"}</strong>
              </span>
              <span>
                Prazo: <strong>{dataBR(av.prazo)}</strong>
              </span>
              {av.ultima && (
                <span>
                  Última conclusão: <strong>{dataBR(av.ultima)}</strong>
                </span>
              )}
              <span className="text-xs text-gray-500">{STATUS[av.status] ?? av.status}</span>
            </div>
          </Link>
        ))}
      </main>
    </Shell>
  );
}
