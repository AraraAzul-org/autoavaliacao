import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";
import { FormAvaliacao } from "@/components/FormAvaliacao";
import { SecaoRespostas } from "@/components/SecaoRespostas";

export const instant = false;

const hojeSP = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
const dataBR = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

const SELOS: Record<string, { rotulo: string; classe: string }> = {
  concluida: { rotulo: "APF concluído", classe: "bg-green-100 text-green-800" },
  vencida: { rotulo: "Prazo vencido", classe: "bg-red-100 text-red-800" },
  em_andamento: { rotulo: "Em andamento", classe: "bg-amber-100 text-amber-900" },
  pendente: { rotulo: "Não iniciada", classe: "bg-gray-100 text-gray-700" },
};

type Nivel = "usuario" | "apf" | "diretor";
type EtapaBase = { idetapa: number; descricao: string; publico: Nivel };
type PerguntaBase = {
  idpergunta: number;
  codigo: string;
  descricao: string;
  idetapa: number;
  descritiva: boolean;
};
type PontuacaoBase = { idpontuacao: number; idpergunta: number; descricao: string; nota: number };

export default async function RespostasDoAssessorado({
  params,
  searchParams,
}: {
  params: Promise<{ idusuario: string; idavaliacao: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { idusuario: idUsuarioTexto, idavaliacao: idAvaliacaoTexto } = await params;
  const idusuario = Number(idUsuarioTexto);
  const id = Number(idAvaliacaoTexto);
  if (!Number.isInteger(idusuario) || !Number.isInteger(id)) notFound();

  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");

  const { ok, erro } = await searchParams;

  const [{ data: pessoa }, { data: av }] = await Promise.all([
    supabase.from("usuario").select("idusuario, nome, linha, idapf").eq("idusuario", idusuario).maybeSingle(),
    supabase
      .from("avaliacao")
      .select("idavaliacao, descricao, prazo, status, idquestionario")
      .eq("idavaliacao", id)
      .maybeSingle(),
  ]);
  if (!pessoa || !av) notFound();
  // Esta tela é do APF do adulto avaliado.
  if (pessoa.idapf !== eu.idusuario) notFound();

  const { data: au } = await supabase
    .from("avaliacaousuario")
    .select("status, datainicio, dataconclusao, concluiapf, concluirdiretor")
    .eq("idavaliacao", id)
    .eq("idusuario", idusuario)
    .maybeSingle();
  if (!au) notFound();

  const { data: etapasData } = await supabase
    .from("etapa")
    .select("idetapa, descricao, publico")
    .eq("idquestionario", av.idquestionario)
    .order("idetapa");
  const etapas = (etapasData ?? []) as EtapaBase[];
  const idsEtapas = etapas.map((e) => e.idetapa);

  const { data: perguntasData } = idsEtapas.length
    ? await supabase
        .from("pergunta")
        .select("idpergunta, codigo, descricao, idetapa, descritiva")
        .in("idetapa", idsEtapas)
        .order("codigo")
    : { data: [] as PerguntaBase[] };
  const perguntas = (perguntasData ?? []) as PerguntaBase[];
  const idsPerguntas = perguntas.map((p) => p.idpergunta);

  const { data: pontuacoesData } = idsPerguntas.length
    ? await supabase
        .from("pontuacao")
        .select("idpontuacao, idpergunta, descricao, nota")
        .in("idpergunta", idsPerguntas)
        .order("nota")
    : { data: [] as PontuacaoBase[] };
  const pontuacoes = (pontuacoesData ?? []) as PontuacaoBase[];

  const { data: respostasData } = await supabase
    .from("resposta")
    .select("idpergunta, idpontuacao, texto")
    .eq("idavaliacao", id)
    .eq("idusuario", idusuario);
  const respostaDa = new Map((respostasData ?? []).map((r) => [r.idpergunta, r]));

  const montarEtapas = (nivel: Nivel) =>
    etapas
      .filter((et) => et.publico === nivel)
      .flatMap((et) => {
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
      });

  const etapasUsuario = montarEtapas("usuario");
  const etapasApf = montarEtapas("apf");

  const respostas = Object.fromEntries(
    perguntas.flatMap((p) => {
      const r = respostaDa.get(p.idpergunta);
      if (!r) return [];
      return [[p.idpergunta, r.idpontuacao != null ? String(r.idpontuacao) : (r.texto ?? "")]];
    }),
  );

  const aberta = av.status === "aberta" && av.prazo.slice(0, 10) >= hojeSP();
  const concluido = au.concluiapf != null;
  const somenteLeitura = concluido || !aberta;
  const vencida = !concluido && av.prazo.slice(0, 10) < hojeSP();
  const chave = concluido ? "concluida" : vencida ? "vencida" : au.status;
  const selo = SELOS[chave] ?? SELOS.pendente;

  const doApf = etapasApf.flatMap((e) => e.perguntas);
  const total = doApf.length;
  const feitas = doApf.filter((p) => respostaDa.has(p.idpergunta)).length;
  const pct = total ? Math.round((feitas / total) * 100) : 0;

  const bloqueioConclusao =
    !somenteLeitura && au.status !== "concluida"
      ? "O usuário ainda não concluiu a avaliação. O APF só pode concluir depois do usuário."
      : null;

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
          {concluido && au.concluiapf ? ` · APF concluído em ${dataBR(au.concluiapf)}` : ""}
        </p>

        {total > 0 && (
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded bg-gray-200">
              <div className="h-full rounded bg-azul" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-600">
              Etapa do APF: {feitas} de {total} {total === 1 ? "pergunta respondida" : "perguntas respondidas"}
            </p>
          </div>
        )}

        {erro && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
        {ok && <p className="mt-3 rounded bg-green-50 p-2 text-sm text-green-800">{ok}</p>}

        <p className="mt-3 rounded bg-gray-100 p-2 text-sm text-gray-700">
          {concluido
            ? "A etapa do APF foi concluída e está disponível apenas para consulta."
            : !aberta
              ? vencida
                ? `O prazo desta avaliação terminou em ${dataBR(av.prazo)}. As respostas já enviadas continuam disponíveis para consulta.`
                : "Esta avaliação não está mais aberta para respostas."
              : "Você está vendo as respostas do usuário e pode responder as perguntas do APF."}
        </p>

        <SecaoRespostas
          etapas={etapasUsuario}
          respostas={respostas}
          titulo="Respostas do usuário"
          nota="Somente leitura."
        />

        {!etapasApf.length && (
          <p className="mt-6 text-sm text-gray-600">Este questionário não tem perguntas para o APF.</p>
        )}

        {etapasApf.length > 0 && (
          <FormAvaliacao
            idavaliacao={id}
            idusuario={idusuario}
            nivel="apf"
            somenteLeitura={somenteLeitura}
            bloqueioConclusao={bloqueioConclusao}
            etapas={etapasApf}
            respostas={respostas}
          />
        )}
      </main>
    </Shell>
  );
}
