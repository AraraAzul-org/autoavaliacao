import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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

type Nivel = "usuario" | "apf" | "diretor";
type Contagem = Record<Nivel, number>;

type Avaliacao = {
  idavaliacao: number;
  descricao: string;
  prazo: string;
  status: string;
  idquestionario: number;
};

type Participacao = {
  idavaliacaousuario: number;
  status: string;
  dataconclusao: string | null;
  concluiapf: string | null;
  avaliacao: Avaliacao;
};

const vazio = (): Contagem => ({ usuario: 0, apf: 0, diretor: 0 });

export default async function AvaliacoesDoAssessorado({
  params,
}: {
  params: Promise<{ idusuario: string }>;
}) {
  const { idusuario: idTexto } = await params;
  const idusuario = Number(idTexto);
  if (!Number.isInteger(idusuario)) notFound();

  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");

  const { data: pessoa } = await supabase
    .from("usuario")
    .select("idusuario, nome, linha, idapf, cargo:cargo(descricao)")
    .eq("idusuario", idusuario)
    .maybeSingle();
  if (!pessoa) notFound();
  const cargo = Array.isArray(pessoa.cargo) ? pessoa.cargo[0] : pessoa.cargo;

  const { data } = await supabase
    .from("avaliacaousuario")
    .select(
      "idavaliacaousuario, status, dataconclusao, concluiapf, avaliacao:avaliacao(idavaliacao, descricao, prazo, status, idquestionario)",
    )
    .eq("idusuario", idusuario)
    .order("idavaliacaousuario", { ascending: false });

  const avaliacoes = (data ?? [])
    .map((m) => {
      const av = Array.isArray(m.avaliacao) ? m.avaliacao[0] : m.avaliacao;
      return av ? { ...m, avaliacao: av as Avaliacao } : null;
    })
    .filter((m): m is Participacao => !!m)
    .filter((m) => m.avaliacao.status === "aberta" || m.avaliacao.status === "finalizada");

  const questionarios = [...new Set(avaliacoes.map((m) => m.avaliacao.idquestionario))];

  const { data: etapas } = questionarios.length
    ? await supabase.from("etapa").select("idetapa, idquestionario, publico").in("idquestionario", questionarios)
    : { data: [] as { idetapa: number; idquestionario: number; publico: Nivel }[] };

  const idsEtapas = (etapas ?? []).map((e) => e.idetapa);
  const infoDaEtapa = new Map(
    (etapas ?? []).map((e) => [e.idetapa, { idquestionario: e.idquestionario, publico: e.publico as Nivel }]),
  );

  const { data: perguntas } = idsEtapas.length
    ? await supabase.from("pergunta").select("idpergunta, idetapa").in("idetapa", idsEtapas)
    : { data: [] as { idpergunta: number; idetapa: number }[] };

  const infoDaPergunta = new Map(
    (perguntas ?? []).flatMap((p) => {
      const info = infoDaEtapa.get(p.idetapa);
      return info ? [[p.idpergunta, info] as const] : [];
    }),
  );

  const totais = new Map<number, Contagem>();
  (perguntas ?? []).forEach((p) => {
    const info = infoDaPergunta.get(p.idpergunta);
    if (!info) return;
    const t = totais.get(info.idquestionario) ?? vazio();
    t[info.publico] += 1;
    totais.set(info.idquestionario, t);
  });

  const { data: respostas } = await supabase
    .from("resposta")
    .select("idavaliacao, idpergunta")
    .eq("idusuario", idusuario);

  const respondidas = new Map<number, Contagem>();
  (respostas ?? []).forEach((r) => {
    const info = infoDaPergunta.get(r.idpergunta);
    if (!info) return;
    const feitas = respondidas.get(r.idavaliacao) ?? vazio();
    feitas[info.publico] += 1;
    respondidas.set(r.idavaliacao, feitas);
  });

  return (
    <Shell>
      <main className="max-w-3xl p-4">
        <Link href="/meus-assessorados" className="text-sm text-azul underline">
          ← Meus assessorados
        </Link>

        <h1 className="mt-2 text-xl font-semibold text-azul">{pessoa.nome}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {cargo?.descricao ? `${cargo.descricao} · ` : ""}
          {pessoa.linha}
        </p>

        {!avaliacoes.length && (
          <p className="mt-6 rounded border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Nenhuma avaliação disponível para este adulto no momento.
          </p>
        )}

        {avaliacoes.map((m) => {
          const av = m.avaliacao;
          const total = totais.get(av.idquestionario) ?? vazio();
          const feitas = respondidas.get(av.idavaliacao) ?? vazio();
          const vencida = m.status !== "concluida" && av.prazo.slice(0, 10) < hojeSP();
          const chave = vencida ? "vencida" : m.status === "concluida" ? "concluida" : m.status;
          const selo = SELOS[chave] ?? SELOS.pendente;
          const pctUsuario = total.usuario ? Math.round((feitas.usuario / total.usuario) * 100) : 0;
          const pctApf = total.apf ? Math.round((feitas.apf / total.apf) * 100) : 0;
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
                      ? `Usuário concluiu em ${dataBR(m.dataconclusao)}`
                      : vencida
                        ? `Prazo encerrado em ${dataBR(av.prazo)}`
                        : dias === 0
                          ? `Prazo: ${dataBR(av.prazo)} · último dia`
                          : `Prazo: ${dataBR(av.prazo)} · ${dias === 1 ? "falta 1 dia" : `faltam ${dias} dias`}`}
                  </p>
                </div>
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${selo.classe}`}>{selo.rotulo}</span>
                {m.concluiapf && (
                  <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    APF concluído
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4 text-sm text-gray-700">
                <div className="min-w-48 flex-1 space-y-2">
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
                      <span>Usuário</span>
                      <span>
                        {feitas.usuario} de {total.usuario} respondidas
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded bg-gray-200">
                      <div className="h-full rounded bg-azul" style={{ width: `${pctUsuario}%` }} />
                    </div>
                  </div>
                  {total.apf > 0 && (
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
                        <span>APF</span>
                        <span>
                          {feitas.apf} de {total.apf} respondidas
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded bg-gray-200">
                        <div className="h-full rounded bg-azul" style={{ width: `${pctApf}%` }} />
                      </div>
                    </div>
                  )}
                </div>
                <Link
                  href={`/meus-assessorados/${idusuario}/${av.idavaliacao}`}
                  className="rounded bg-azul px-3 py-1.5 text-sm text-white hover:bg-azul-escuro"
                >
                  Ver respostas e responder
                </Link>
              </div>
            </section>
          );
        })}
      </main>
    </Shell>
  );
}
