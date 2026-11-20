import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";
import { STATUS_PPF, dataBR } from "@/lib/ppf";

export const instant = false;

const STATUS_AVALIACAO: Record<string, { rotulo: string; classe: string }> = {
  rascunho: { rotulo: "Rascunho", classe: "bg-gray-100 text-gray-700" },
  aberta: { rotulo: "Aberta", classe: "bg-green-100 text-green-800" },
  finalizada: { rotulo: "Finalizada", classe: "bg-blue-100 text-blue-800" },
};

type LinhaPpf = {
  idppf: number;
  status: string;
  datageracao: string;
  datafechamento: string | null;
  avaliacao: { descricao: string; prazo: string; status: string } | { descricao: string; prazo: string; status: string }[] | null;
};

export default async function MeuPpf() {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  if (!eu.acessos.has("meu-ppf")) redirect("/sem-acesso");

  const { data } = await supabase
    .from("ppf")
    .select("idppf, status, datageracao, datafechamento, avaliacao:avaliacao(descricao, prazo, status)")
    .eq("idusuario", eu.idusuario)
    .order("status", { ascending: true })
    .order("datageracao", { ascending: false });

  const lista = (data ?? []) as LinhaPpf[];

  const { data: itens } = lista.length
    ? await supabase
        .from("ppfitem")
        .select("idppf")
        .in("idppf", lista.map((l) => l.idppf))
    : { data: [] as { idppf: number }[] };

  const totalPorPpf = new Map<number, number>();
  (itens ?? []).forEach((i) => totalPorPpf.set(i.idppf, (totalPorPpf.get(i.idppf) ?? 0) + 1));

  const abertos = lista.filter((l) => l.status === "aberto").length;

  return (
    <Shell>
      <main className="max-w-3xl p-4">
        <h1 className="text-xl font-semibold text-azul">Meu PPF</h1>
        <p className="mt-1 text-sm text-gray-600">
          O Plano Pessoal de Formação nasce quando o seu APF conclui uma avaliação marcada para gerar PPF. Ele reúne as
          perguntas com resposta abaixo da nota mínima, com a ação que você vai realizar e a data prevista.
        </p>

        {lista.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            {abertos === lista.length
              ? `${abertos} ${abertos === 1 ? "plano aberto" : "planos abertos"}.`
              : `${abertos} de ${lista.length} ${lista.length === 1 ? "plano aberto" : "planos abertos"}, os demais já estão fechados.`}{" "}
            Os planos abertos aparecem primeiro.
          </p>
        )}

        {!lista.length && (
          <p className="mt-6 rounded border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Você ainda não tem PPF. Ele é gerado automaticamente quando o seu APF conclui a avaliação.
          </p>
        )}

        {lista.map((linha) => {
          const av = Array.isArray(linha.avaliacao) ? linha.avaliacao[0] : linha.avaliacao;
          const selo = STATUS_PPF[linha.status] ?? STATUS_PPF.fechado;
          const seloAvaliacao = av ? (STATUS_AVALIACAO[av.status] ?? null) : null;
          const total = totalPorPpf.get(linha.idppf) ?? 0;

          return (
            <section
              key={linha.idppf}
              className="mt-4 overflow-hidden rounded border border-gray-200 border-l-4 border-l-amarelo bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50/60 p-4">
                <h2 className="min-w-0 flex-1 font-semibold text-gray-900">{av?.descricao ?? "Avaliação"}</h2>
                {seloAvaliacao && (
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${seloAvaliacao.classe}`}>
                    {seloAvaliacao.rotulo}
                  </span>
                )}
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${selo.classe}`}>{selo.rotulo}</span>
                <Link
                  href={`/meu-ppf/${linha.idppf}`}
                  className="rounded bg-azul px-3 py-1.5 text-sm font-medium text-white hover:bg-azul-escuro"
                >
                  Abrir PPF
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 p-4 text-sm text-gray-700">
                <span>
                  Gerado em: <strong>{dataBR(linha.datageracao)}</strong>
                </span>
                <span>
                  Prazo da avaliação: <strong>{dataBR(av?.prazo ?? null)}</strong>
                </span>
                <span>
                  {total} {total === 1 ? "item" : "itens"}
                </span>
                {linha.datafechamento && (
                  <span>
                    Fechado em: <strong>{dataBR(linha.datafechamento)}</strong>
                  </span>
                )}
              </div>
            </section>
          );
        })}
      </main>
    </Shell>
  );
}
