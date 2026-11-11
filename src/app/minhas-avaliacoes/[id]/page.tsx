import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";
import { concluirAvaliacao, salvarEtapa } from "../actions";

export const instant = false;

const hojeSP = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
const dataBR = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const btn = "rounded bg-azul px-3 py-1.5 text-sm text-white hover:bg-azul-escuro disabled:cursor-not-allowed disabled:bg-gray-300";

export default async function ResponderAvaliacao({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { id: idTexto } = await params;
  const id = Number(idTexto);
  if (!Number.isInteger(id)) notFound();

  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");

  const { ok, erro } = await searchParams;

  const { data: av } = await supabase
    .from("avaliacao")
    .select("idavaliacao, descricao, prazo, status, idquestionario")
    .eq("idavaliacao", id)
    .maybeSingle();
  if (!av) notFound();

  const { data: au } = await supabase
    .from("avaliacaousuario")
    .select("status, dataconclusao")
    .eq("idavaliacao", id)
    .eq("idusuario", eu.idusuario)
    .maybeSingle();
  if (!au) notFound();

  const { data: etapasData } = await supabase
    .from("etapa")
    .select("idetapa, descricao")
    .eq("idquestionario", av.idquestionario)
    .order("idetapa");
  const etapas = etapasData ?? [];
  const idsEtapas = etapas.map((e) => e.idetapa);

  const { data: perguntasData } = idsEtapas.length
    ? await supabase
        .from("pergunta")
        .select("idpergunta, codigo, descricao, idetapa, descritiva")
        .in("idetapa", idsEtapas)
        .order("codigo")
    : { data: [] as { idpergunta: number; codigo: string; descricao: string; idetapa: number; descritiva: boolean }[] };
  const perguntas = perguntasData ?? [];
  const idsPerguntas = perguntas.map((p) => p.idpergunta);

  const { data: pontuacoesData } = idsPerguntas.length
    ? await supabase
        .from("pontuacao")
        .select("idpontuacao, idpergunta, descricao, nota")
        .in("idpergunta", idsPerguntas)
        .order("nota")
    : { data: [] as { idpontuacao: number; idpergunta: number; descricao: string; nota: number }[] };
  const pontuacoes = pontuacoesData ?? [];

  const { data: respostasData } = await supabase
    .from("resposta")
    .select("idpergunta, idpontuacao, texto")
    .eq("idavaliacao", id)
    .eq("idusuario", eu.idusuario);
  const respostaDa = new Map((respostasData ?? []).map((r) => [r.idpergunta, r]));

  const concluida = au.status === "concluida";
  const vencida = av.prazo.slice(0, 10) < hojeSP();
  const somenteLeitura = concluida || av.status !== "aberta" || vencida;

  const total = perguntas.length;
  const feitas = perguntas.filter((p) => respostaDa.has(p.idpergunta)).length;
  const pct = total ? Math.round((feitas / total) * 100) : 0;

  return (
    <Shell>
      <main className="max-w-3xl p-4">
        <Link href="/minhas-avaliacoes" className="text-sm text-azul underline">
          ← Minhas avaliações
        </Link>

        <h1 className="mt-2 text-xl font-semibold text-azul">{av.descricao}</h1>
        <p className="mt-1 text-sm text-gray-600">
          Prazo: <strong>{dataBR(av.prazo)}</strong>
          {concluida && au.dataconclusao ? ` · concluída em ${dataBR(au.dataconclusao)}` : ""}
        </p>

        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded bg-gray-200">
            <div className="h-full rounded bg-azul" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-gray-600">
            {feitas} de {total} {total === 1 ? "pergunta respondida" : "perguntas respondidas"}
          </p>
        </div>

        {erro && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
        {ok && <p className="mt-3 rounded bg-green-50 p-2 text-sm text-green-800">{ok}</p>}

        {somenteLeitura && (
          <p className="mt-3 rounded bg-gray-100 p-2 text-sm text-gray-700">
            {concluida
              ? "Esta avaliação foi concluída e está disponível apenas para consulta."
              : vencida
                ? `O prazo desta avaliação terminou em ${dataBR(av.prazo)}. As respostas já enviadas continuam disponíveis para consulta.`
                : "Esta avaliação não está mais aberta para respostas."}
          </p>
        )}

        {!etapas.length && <p className="mt-6 text-sm text-gray-600">Este questionário ainda não tem perguntas.</p>}

        {etapas.map((et) => {
          const daEtapa = perguntas.filter((p) => p.idetapa === et.idetapa);
          if (!daEtapa.length) return null;
          const feitasEtapa = daEtapa.filter((p) => respostaDa.has(p.idpergunta)).length;

          return (
            <section key={et.idetapa} className="mt-6 overflow-hidden rounded border border-gray-200 bg-white">
              <div className="flex flex-wrap items-center gap-2 border-b-2 border-amarelo bg-azul p-3 text-white">
                <h2 className="flex-1 text-sm font-semibold">{et.descricao}</h2>
                <span className="text-xs text-white/90">
                  {feitasEtapa} de {daEtapa.length}
                </span>
              </div>

              <form action={salvarEtapa} className="p-3">
                <input type="hidden" name="idavaliacao" value={id} />
                <input type="hidden" name="idetapa" value={et.idetapa} />

                {daEtapa.map((p) => {
                  const resp = respostaDa.get(p.idpergunta);
                  const opcoes = pontuacoes.filter((o) => o.idpergunta === p.idpergunta);
                  return (
                    <div key={p.idpergunta} className="border-b border-gray-100 py-3 last:border-0">
                      <input type="hidden" name="pergunta" value={p.idpergunta} />
                      <p className="text-sm font-medium text-gray-900">
                        <span className="text-azul">{p.codigo}</span> — {p.descricao}
                      </p>

                      {p.descritiva ? (
                        <textarea
                          name={`t_${p.idpergunta}`}
                          maxLength={2000}
                          rows={3}
                          disabled={somenteLeitura}
                          defaultValue={resp?.texto ?? ""}
                          placeholder={somenteLeitura ? "Sem resposta" : "Escreva sua resposta"}
                          className="mt-2 w-full rounded border border-gray-300 p-2 text-sm disabled:bg-gray-50 disabled:text-gray-700"
                        />
                      ) : (
                        <div className="mt-2 space-y-1">
                          {opcoes.map((o) => (
                            <label key={o.idpontuacao} className="flex items-start gap-2 text-sm text-gray-800">
                              <input
                                type="radio"
                                name={`p_${p.idpergunta}`}
                                value={o.idpontuacao}
                                disabled={somenteLeitura}
                                defaultChecked={resp?.idpontuacao === o.idpontuacao}
                                className="mt-0.5"
                              />
                              <span>{o.descricao}</span>
                            </label>
                          ))}
                          {!opcoes.length && <p className="text-sm text-red-700">Pergunta sem opções de resposta.</p>}
                        </div>
                      )}
                    </div>
                  );
                })}

                {!somenteLeitura && (
                  <div className="mt-3 flex justify-end">
                    <button className={btn}>Salvar etapa</button>
                  </div>
                )}
              </form>
            </section>
          );
        })}

        {!somenteLeitura && total > 0 && (
          <form action={concluirAvaliacao} className="mt-6 flex flex-wrap items-center gap-3 rounded border border-gray-200 bg-white p-3">
            <input type="hidden" name="idavaliacao" value={id} />
            <p className="min-w-48 flex-1 text-sm text-gray-600">
              {feitas < total
                ? `Faltam ${total - feitas} ${total - feitas === 1 ? "pergunta" : "perguntas"} para concluir. Você pode salvar e voltar depois.`
                : "Tudo respondido. Ao concluir, a avaliação não poderá mais ser alterada."}
            </p>
            <button disabled={feitas < total} className={btn}>
              Concluir avaliação
            </button>
          </form>
        )}
      </main>
    </Shell>
  );
}
