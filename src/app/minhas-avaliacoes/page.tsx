import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";

export const instant = false;

const hojeSP = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

const dataBR = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

function diasAte(prazo: string) {
  const hoje = new Date(`${hojeSP()}T00:00:00Z`).getTime();
  const fim = new Date(`${prazo.slice(0, 10)}T00:00:00Z`).getTime();
  return Math.round((fim - hoje) / 86_400_000);
}

type Selo = { rotulo: string; classe: string };

const SELOS: Record<string, Selo> = {
  concluida: { rotulo: "Concluída", classe: "bg-green-100 text-green-800" },
  vencida: { rotulo: "Prazo vencido", classe: "bg-red-100 text-red-800" },
  em_andamento: { rotulo: "Em andamento", classe: "bg-amber-100 text-amber-900" },
  pendente: { rotulo: "Não iniciada", classe: "bg-gray-100 text-gray-700" },
};

type Avaliacao = {
  idavaliacao: number;
  descricao: string;
  prazo: string;
  status: string;
  idquestionario: number;
};

type Minha = {
  idavaliacaousuario: number;
  status: string;
  dataconclusao: string | null;
  avaliacao: Avaliacao | Avaliacao[] | null;
};

export default async function MinhasAvaliacoes() {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");

  const { data } = await supabase
    .from("avaliacaousuario")
    .select(
      "idavaliacaousuario, status, dataconclusao, avaliacao:avaliacao(idavaliacao, descricao, prazo, status, idquestionario)",
    )
    .eq("idusuario", eu.idusuario)
    .order("idavaliacaousuario", { ascending: false });

  const minhas = (data ?? [])
    .map((m) => {
      const av = Array.isArray(m.avaliacao) ? m.avaliacao[0] : m.avaliacao;
      return av ? { ...m, avaliacao: av as Avaliacao } : null;
    })
    .filter((m): m is Minha & { avaliacao: Avaliacao } => !!m)
    .filter((m) => m.avaliacao.status === "aberta" || m.avaliacao.status === "finalizada");

  const questionarios = [...new Set(minhas.map((m) => m.avaliacao.idquestionario))];

  const { data: etapas } = questionarios.length
    ? await supabase
        .from("etapa")
        .select("idetapa, idquestionario")
        .in("idquestionario", questionarios)
        .eq("publico", "usuario")
    : { data: [] as { idetapa: number; idquestionario: number }[] };

  const idsEtapas = (etapas ?? []).map((e) => e.idetapa);
  const questionarioDaEtapa = new Map((etapas ?? []).map((e) => [e.idetapa, e.idquestionario]));

  const { data: perguntas } = idsEtapas.length
    ? await supabase.from("pergunta").select("idpergunta, idetapa").in("idetapa", idsEtapas)
    : { data: [] as { idpergunta: number; idetapa: number }[] };

  const questionarioDaPergunta = new Map(
    (perguntas ?? []).map((p) => [p.idpergunta, questionarioDaEtapa.get(p.idetapa)]),
  );

  const totalPorQuestionario = new Map<number, number>();
  (perguntas ?? []).forEach((p) => {
    const q = questionarioDaPergunta.get(p.idpergunta);
    if (q != null) totalPorQuestionario.set(q, (totalPorQuestionario.get(q) ?? 0) + 1);
  });

  const { data: respostas } = await supabase
    .from("resposta")
    .select("idavaliacao, idpergunta")
    .eq("idusuario", eu.idusuario);

  const respondidas = new Map<number, number>();
  (respostas ?? []).forEach((r) => {
    const q = questionarioDaPergunta.get(r.idpergunta);
    if (q == null) return;
    const av = minhas.find((m) => m.avaliacao.idavaliacao === r.idavaliacao);
    if (av && av.avaliacao.idquestionario === q) {
      respondidas.set(r.idavaliacao, (respondidas.get(r.idavaliacao) ?? 0) + 1);
    }
  });

  return (
    <Shell>
      <main className="max-w-3xl p-4">
        <h1 className="text-xl font-semibold text-azul">Minhas avaliações</h1>
        <p className="mt-1 text-sm text-gray-600">As avaliações abertas para você.</p>

        {!minhas.length && (
          <p className="mt-6 rounded border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Nenhuma avaliação disponível no momento.
          </p>
        )}

        {minhas.map((m) => {
          const av = m.avaliacao;
          const total = totalPorQuestionario.get(av.idquestionario) ?? 0;
          const feitas = respondidas.get(av.idavaliacao) ?? 0;
          const vencida = m.status !== "concluida" && av.prazo.slice(0, 10) < hojeSP();
          const chave = vencida ? "vencida" : m.status === "concluida" ? "concluida" : m.status;
          const selo = SELOS[chave] ?? SELOS.pendente;
          const pct = total ? Math.round((feitas / total) * 100) : 0;
          const dias = diasAte(av.prazo);

          return (
            <section
              key={m.idavaliacaousuario}
              className="mt-4 overflow-hidden rounded border border-gray-200 border-l-4 border-l-amarelo bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-start gap-3 border-b border-gray-100 bg-gray-50/60 p-4">
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-gray-900">{av.descricao}</h2>
                  <p className="mt-0.5 text-sm text-gray-600">
                    {m.status === "concluida" && m.dataconclusao
                      ? `Concluída em ${dataBR(m.dataconclusao)}`
                      : vencida
                        ? `Prazo encerrado em ${dataBR(av.prazo)}`
                        : dias === 0
                          ? `Prazo: ${dataBR(av.prazo)} · último dia`
                          : `Prazo: ${dataBR(av.prazo)} · ${dias === 1 ? "falta 1 dia" : `faltam ${dias} dias`}`}
                  </p>
                </div>
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${selo.classe}`}>{selo.rotulo}</span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4 text-sm text-gray-700">
                <div className="min-w-40 flex-1">
                  <div className="h-2 overflow-hidden rounded bg-gray-200">
                    <div className="h-full rounded bg-azul" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    {feitas} de {total} {total === 1 ? "pergunta respondida" : "perguntas respondidas"}
                  </p>
                </div>
                <Link
                  href={`/minhas-avaliacoes/${av.idavaliacao}`}
                  className="rounded bg-azul px-3 py-1.5 text-sm text-white hover:bg-azul-escuro"
                >
                  {m.status === "concluida" ? "Ver respostas" : feitas ? "Continuar" : "Responder"}
                </Link>
              </div>
            </section>
          );
        })}
      </main>
    </Shell>
  );
}
