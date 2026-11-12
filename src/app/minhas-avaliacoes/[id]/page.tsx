import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";
import { FormAvaliacao } from "@/components/FormAvaliacao";

export const instant = false;

const hojeSP = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
const dataBR = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

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

        {etapas.length > 0 && (
          <FormAvaliacao
            idavaliacao={id}
            somenteLeitura={somenteLeitura}
            etapas={etapas.flatMap((et) => {
              const daEtapa = perguntas.filter((p) => p.idetapa === et.idetapa);
              if (!daEtapa.length) return [];
              return [
                {
                  idetapa: et.idetapa,
                  descricao: et.descricao,
                  perguntas: daEtapa.map((p) => ({
                    idpergunta: p.idpergunta,
                    codigo: p.codigo,
                    descricao: p.descricao,
                    descritiva: p.descritiva,
                    opcoes: pontuacoes
                      .filter((o) => o.idpergunta === p.idpergunta)
                      .map((o) => ({ idpontuacao: o.idpontuacao, descricao: o.descricao })),
                  })),
                },
              ];
            })}
            respostas={Object.fromEntries(
              perguntas.flatMap((p) => {
                const r = respostaDa.get(p.idpergunta);
                if (!r) return [];
                return [[p.idpergunta, r.idpontuacao != null ? String(r.idpontuacao) : (r.texto ?? "")]];
              }),
            )}
          />
        )}
      </main>
    </Shell>
  );
}
