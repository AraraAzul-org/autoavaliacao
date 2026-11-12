import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";
import { FormAvaliacao } from "@/components/FormAvaliacao";

export const instant = false;

const hojeSP = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
const dataBR = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

const SELOS: Record<string, { rotulo: string; classe: string }> = {
  concluida: { rotulo: "Concluída", classe: "bg-green-100 text-green-800" },
  vencida: { rotulo: "Prazo vencido", classe: "bg-red-100 text-red-800" },
  em_andamento: { rotulo: "Em andamento", classe: "bg-amber-100 text-amber-900" },
  pendente: { rotulo: "Não iniciada", classe: "bg-gray-100 text-gray-700" },
};

export default async function RespostasDoAssessorado({
  params,
}: {
  params: Promise<{ idusuario: string; idavaliacao: string }>;
}) {
  const { idusuario: idUsuarioTexto, idavaliacao: idAvaliacaoTexto } = await params;
  const idusuario = Number(idUsuarioTexto);
  const id = Number(idAvaliacaoTexto);
  if (!Number.isInteger(idusuario) || !Number.isInteger(id)) notFound();

  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");

  const [{ data: pessoa }, { data: av }] = await Promise.all([
    supabase.from("usuario").select("idusuario, nome, linha").eq("idusuario", idusuario).maybeSingle(),
    supabase
      .from("avaliacao")
      .select("idavaliacao, descricao, prazo, status, idquestionario")
      .eq("idavaliacao", id)
      .maybeSingle(),
  ]);
  if (!pessoa || !av) notFound();

  const { data: au } = await supabase
    .from("avaliacaousuario")
    .select("status, datainicio, dataconclusao")
    .eq("idavaliacao", id)
    .eq("idusuario", idusuario)
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
    .eq("idusuario", idusuario);
  const respostaDa = new Map((respostasData ?? []).map((r) => [r.idpergunta, r]));

  const concluida = au.status === "concluida";
  const vencida = !concluida && av.prazo.slice(0, 10) < hojeSP();
  const chave = vencida ? "vencida" : au.status;
  const selo = SELOS[chave] ?? SELOS.pendente;

  const total = perguntas.length;
  const feitas = perguntas.filter((p) => respostaDa.has(p.idpergunta)).length;
  const pct = total ? Math.round((feitas / total) * 100) : 0;

  return (
    <Shell>
      <main className="max-w-3xl p-4">
        <Link href={`/meus-assessorados/${idusuario}`} className="text-sm text-azul underline">
          ← {pessoa.nome}
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="flex-1 text-xl font-semibold text-azul">{av.descricao}</h1>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${selo.classe}`}>{selo.rotulo}</span>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          {pessoa.nome} · Prazo: <strong>{dataBR(av.prazo)}</strong>
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

        <p className="mt-3 rounded bg-gray-100 p-2 text-sm text-gray-700">
          {concluida
            ? "Esta avaliação foi concluída e está disponível apenas para consulta."
            : vencida
              ? `O prazo desta avaliação terminou em ${dataBR(av.prazo)}. As respostas já enviadas continuam disponíveis para consulta.`
              : "Somente leitura: você está vendo as respostas deste adulto como APF."}
        </p>

        {!etapas.length && <p className="mt-6 text-sm text-gray-600">Este questionário ainda não tem perguntas.</p>}

        {etapas.length > 0 && (
          <FormAvaliacao
            idavaliacao={id}
            somenteLeitura
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
