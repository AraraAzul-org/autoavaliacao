import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarSessao } from "@/lib/eu";
import { Shell } from "@/components/Shell";
import { GraficoDistribuicao, type ItemDistribuicao } from "@/components/GraficoDistribuicao";
import { tempoDesde } from "@/lib/tempo";

export const instant = false;

const SEM_SITUACAO = "Sem situação";

// Ordem fixa das situações no gráfico da Home. Situações fora desta lista
// (e "Sem situação") vão para o fim, em ordem alfabética.
const ORDEM_SITUACOES = [
  "Formação não iniciada",
  "Curso Preliminar",
  "Nível Preliminar",
  "Curso Intermediário",
  "Nível Intermediário",
  "Curso Avançado",
  "Nível Avançado",
];

const posicaoSituacao = (rotulo: string) => {
  const indice = ORDEM_SITUACOES.findIndex(
    (s) => s.localeCompare(rotulo, "pt-BR", { sensitivity: "base" }) === 0,
  );
  if (indice >= 0) return indice;
  return rotulo === SEM_SITUACAO ? ORDEM_SITUACOES.length : ORDEM_SITUACOES.length + 1;
};

const dataBR = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

type PessoaBruta = { idusuario: number; nome: string; idsituacao: number | null; datasituacao: string | null };
type Pessoa = { idusuario: number; nome: string; situacao: string; datasituacao: string | null };

export default async function Home() {
  const supabase = await createClient();
  const sessao = await carregarSessao(supabase);
  if (!sessao) redirect("/login");
  const { eu, email } = sessao;

  if (!eu) {
    return (
      <Shell>
        <main className="max-w-xl p-6">
          <h1 className="text-xl font-semibold text-azul">Acesso não liberado</h1>
          <p className="mt-2 text-sm">O e-mail {email} não está cadastrado. Fale com a diretoria do grupo.</p>
        </main>
      </Shell>
    );
  }

  const [pessoasBrutas, situacoes, avaliacao] = await Promise.all([
    eu.podeResultados
      ? supabase.from("usuario").select("idusuario, nome, idsituacao, datasituacao").eq("ativo", true)
      : Promise.resolve({ data: [] as PessoaBruta[] }),
    eu.podeResultados
      ? supabase.from("situacao").select("idsituacao, situacao")
      : Promise.resolve({ data: [] as { idsituacao: number; situacao: string }[] }),
    supabase
      .from("avaliacao")
      .select("idavaliacao, descricao")
      .eq("status", "aberta")
      .order("prazo", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const nomeSituacao = new Map((situacoes.data ?? []).map((s) => [s.idsituacao, s.situacao]));

  const pessoas: Pessoa[] = ((pessoasBrutas.data ?? []) as PessoaBruta[])
    .map((p) => ({
      idusuario: p.idusuario,
      nome: p.nome,
      situacao: (p.idsituacao != null ? nomeSituacao.get(p.idsituacao) : "") ?? "",
      datasituacao: p.datasituacao,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));

  const contagem = new Map<string, number>();
  pessoas.forEach((p) => contagem.set(p.situacao, (contagem.get(p.situacao) ?? 0) + 1));
  const itens: ItemDistribuicao[] = [...contagem.entries()]
    .map(([rotulo, quantidade]) => ({ rotulo: rotulo || SEM_SITUACAO, quantidade }))
    .sort(
      (a, b) =>
        posicaoSituacao(a.rotulo) - posicaoSituacao(b.rotulo) ||
        a.rotulo.localeCompare(b.rotulo, "pt-BR", { sensitivity: "base" }),
    );

  return (
    <Shell>
      <main className="w-full p-4 lg:p-6">
        <h1 className="text-xl font-semibold text-azul">{eu.nome}</h1>
        <p className="text-sm text-gray-600">
          {eu.cargo?.descricao} · {avaliacao.data ? `Avaliação ${avaliacao.data.descricao}` : "Nenhuma avaliação aberta"}
        </p>

        {eu.podeResultados && (
          <div className="mt-6 grid items-start gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center gap-2 border-b-2 border-amarelo bg-azul p-3 text-white">
                <h2 className="flex-1 text-sm font-semibold">Associados por situação</h2>
                <span className="rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-800">
                  {pessoas.length} {pessoas.length === 1 ? "associado" : "associados"}
                </span>
              </div>
              <div className="p-4">
                {!itens.length ? (
                  <p className="text-sm text-gray-600">Nenhum associado cadastrado.</p>
                ) : (
                  <GraficoDistribuicao itens={itens} />
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-gray-200 border-l-4 border-l-amarelo bg-white shadow-sm">
              <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50/60 px-4 py-2.5">
                <h2 className="flex-1 text-sm font-semibold text-gray-800">Associados e situação</h2>
                <span className="text-xs text-gray-500">Ordenado por nome</span>
              </div>
              {!pessoas.length ? (
                <p className="px-4 py-4 text-sm text-gray-600">Nenhum associado cadastrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                        <th className="px-4 py-2 font-medium">Situação</th>
                        <th className="px-4 py-2 font-medium">Associado</th>
                        <th className="px-4 py-2 font-medium">Data</th>
                        <th className="px-4 py-2 text-right font-medium">Tempo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pessoas.map((p) => (
                        <tr key={p.idusuario}>
                          <td className="whitespace-nowrap px-4 py-2 text-gray-700">{p.situacao || SEM_SITUACAO}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">{p.nome}</td>
                          <td className="whitespace-nowrap px-4 py-2 text-gray-600">{dataBR(p.datasituacao)}</td>
                          <td className="whitespace-nowrap px-4 py-2 text-right text-gray-700">
                            {tempoDesde(p.datasituacao)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </Shell>
  );
}
