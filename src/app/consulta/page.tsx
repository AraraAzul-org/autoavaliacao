import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";

export const instant = false;

const campo = "rounded border border-gray-300 bg-white p-1.5 text-sm";
const btn = "rounded bg-azul px-3 py-1.5 text-sm text-white hover:bg-azul-escuro";

const STATUS: Record<string, { rotulo: string; classe: string }> = {
  rascunho: { rotulo: "Rascunho", classe: "bg-gray-100 text-gray-700" },
  aberta: { rotulo: "Aberta", classe: "bg-green-100 text-green-800" },
  finalizada: { rotulo: "Finalizada", classe: "bg-blue-100 text-blue-800" },
};

const dataBR = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

const semAcento = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const dataValida = (valor?: string) =>
  valor && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : null;

type Avaliacao = {
  idavaliacao: number;
  descricao: string;
  prazo: string;
  status: string;
  datageracao: string | null;
  datafinalizacao: string | null;
  idquestionario: number;
};

export default async function Consulta({
  searchParams,
}: {
  searchParams: Promise<{ avaliacao?: string; de?: string; ate?: string }>;
}) {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  if (!eu.podeResultados) redirect("/");

  const params = await searchParams;
  const { avaliacao: texto, de, ate } = params;
  const busca = (texto ?? "").trim();
  const inicio = dataValida(de);
  const fim = dataValida(ate);

  // A tela abre sem carregar avaliação nenhuma: só lista depois que a pessoa
  // pesquisa (nome e/ou período).
  const pesquisou = ["avaliacao", "de", "ate"].some((k) => k in params);

  const vazia = {
    lista: [] as Avaliacao[],
    questionarios: [] as { idquestionario: number; descricao: string }[],
    participacoes: [] as { idavaliacao: number; status: string }[],
  };

  const [lista, questionarios, participacoes] = pesquisou
    ? await Promise.all([
        supabase
          .from("avaliacao")
          .select("idavaliacao, descricao, prazo, status, datageracao, datafinalizacao, idquestionario")
          .order("idavaliacao", { ascending: false }),
        supabase.from("questionario").select("idquestionario, descricao"),
        supabase.from("avaliacaousuario").select("idavaliacao, status"),
      ])
    : [vazia.lista, vazia.questionarios, vazia.participacoes];

  const nomeQuestionario = new Map((questionarios ?? []).map((q) => [q.idquestionario, q.descricao]));

  const contagem = new Map<number, { total: number; concluidas: number }>();
  (participacoes ?? []).forEach((p) => {
    const atual = contagem.get(p.idavaliacao) ?? { total: 0, concluidas: 0 };
    atual.total += 1;
    if (p.status === "concluida") atual.concluidas += 1;
    contagem.set(p.idavaliacao, atual);
  });

  const todas = (lista ?? []).map((a) => ({
    ...a,
    participantes: contagem.get(a.idavaliacao)?.total ?? 0,
    concluidas: contagem.get(a.idavaliacao)?.concluidas ?? 0,
    geradaEm: a.datageracao ? a.datageracao.slice(0, 10) : null,
  }));

  // O período é comparado com o intervalo da avaliação: da geração até o prazo.
  const avaliacoes = todas.filter((a) => {
    if (busca && !semAcento(a.descricao).includes(semAcento(busca))) return false;
    if (inicio && a.prazo < inicio) return false;
    if (fim && (a.geradaEm ?? a.prazo) > fim) return false;
    return true;
  });

  const temFiltro = pesquisou;

  return (
    <Shell>
      <main className="max-w-4xl p-4">
        <h1 className="text-xl font-semibold text-azul">Consulta</h1>
        <p className="mt-1 text-sm text-gray-600">
          Pesquise as avaliações pelo nome ou pelo período. Abra uma avaliação para ver o gráfico radar com as
          pontuações de todos os usuários e a média da avaliação.
        </p>

        <form className="mt-4 flex flex-wrap items-end gap-2 rounded border border-gray-200 bg-white p-3">
          <label className="flex min-w-56 flex-1 flex-col text-sm">
            Avaliação
            <input
              name="avaliacao"
              defaultValue={busca}
              placeholder="Parte do nome da avaliação"
              className={campo}
            />
          </label>
          <label className="flex flex-col text-sm">
            De
            <input name="de" type="date" defaultValue={inicio ?? ""} className={campo} />
          </label>
          <label className="flex flex-col text-sm">
            Até
            <input name="ate" type="date" defaultValue={fim ?? ""} className={campo} />
          </label>
          <button className={btn}>Consultar</button>
          {temFiltro && (
            <Link href="/consulta" className="pb-1.5 text-sm text-azul underline">
              Limpar filtro
            </Link>
          )}
          {pesquisou && (
            <span className="ml-auto rounded bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
              {avaliacoes.length} de {todas.length} {todas.length === 1 ? "avaliação" : "avaliações"}
            </span>
          )}
        </form>
        <p className="mt-2 text-xs text-gray-500">
          O período considera a data de geração e o prazo de cada avaliação.
        </p>

        {!avaliacoes.length && (
          <p className="mt-6 rounded border border-gray-200 bg-white p-4 text-sm text-gray-600">
            {pesquisou
              ? "Nenhuma avaliação encontrada com esses filtros."
              : "Informe o nome da avaliação ou o período e clique em Consultar para ver os resultados."}
          </p>
        )}

        {avaliacoes.map((av) => {
          const selo = STATUS[av.status] ?? { rotulo: av.status, classe: "bg-gray-100 text-gray-700" };
          return (
            <Link
              key={av.idavaliacao}
              href={`/consulta/${av.idavaliacao}`}
              className="mt-4 block overflow-hidden rounded border border-gray-200 border-l-4 border-l-amarelo bg-white shadow-sm transition-colors hover:border-azul"
            >
              <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50/60 p-4">
                <h2 className="min-w-0 flex-1 font-semibold text-gray-900">{av.descricao}</h2>
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${selo.classe}`}>{selo.rotulo}</span>
                <span className="text-sm font-medium text-azul">Ver radar →</span>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 p-4 text-sm text-gray-700">
                <span>
                  Questionário: <strong>{nomeQuestionario.get(av.idquestionario) ?? "—"}</strong>
                </span>
                <span>
                  Gerada em: <strong>{dataBR(av.geradaEm)}</strong>
                </span>
                <span>
                  Prazo: <strong>{dataBR(av.prazo)}</strong>
                </span>
                <span>
                  Concluídas:{" "}
                  <strong>
                    {av.concluidas} de {av.participantes}
                  </strong>
                </span>
              </div>
            </Link>
          );
        })}
      </main>
    </Shell>
  );
}
