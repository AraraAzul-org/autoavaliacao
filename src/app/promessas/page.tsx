import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";
import { SeletorMes } from "@/components/SeletorMes";
import { anosPromessa, dataBR, fimMesAtualBR, MESES, mesAtualBR } from "@/lib/promessa";
import { calcularJovem, dataPromessaOuAcolhida, RAMO_JOVEM } from "@/lib/jovem";

export const instant = false;

type Adulto = {
  idusuario: number;
  nome: string;
  registro: string | null;
  idramo: number | null;
  datapromessa: string | null;
  deducaopromessa: number | null;
};

type JovemLinha = {
  idjovem: number;
  nome: string;
  registro: string | null;
  idramo: number | null;
  dataacolhida: string | null;
  datapassagemlobinho: string | null;
  datapromessalobinho: string | null;
  deducaolobinho: number | null;
  datapassagemescoteiro: string | null;
  datapromessaescoteiro: string | null;
  deducaoescoteiro: number | null;
  datapassagemsenior: string | null;
  datapromessasenior: string | null;
  deducaosenior: number | null;
  datapassagempioneiro: string | null;
  datapromessapioneiro: string | null;
  deducaopioneiro: number | null;
};

type Linha = {
  tipo: "Adulto" | "Jovem";
  nome: string;
  registro: string | null;
  idramo: number | null;
  data: string | null;
  deducao: number | null;
  anosPromessa: number | null;
  anosNoRamo: number | null;
};

type SemPromessa = {
  tipo: "Adulto" | "Jovem";
  nome: string;
  registro: string | null;
  idramo: number | null;
  situacao: string;
};

const mesDaData = (iso: string | null) => (iso ? Number(String(iso).slice(5, 7)) : null);

const anos = (valor: number | null) =>
  valor === null ? "—" : `${valor} ${valor === 1 ? "ano" : "anos"}`;

const ordenarPorNome = <T extends { nome: string }>(a: T, b: T) =>
  a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });

export default async function Promessas({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ramo?: string }>;
}) {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  if (!eu.acessos.has("promessas")) redirect("/sem-acesso");

  const { mes, ramo } = await searchParams;
  const pedido = Number(mes);
  const mesEscolhido = Number.isInteger(pedido) && pedido >= 1 && pedido <= 12 ? pedido : mesAtualBR();
  const nomeMes = MESES[mesEscolhido - 1];

  const ramoPedido = ramo ? Number(ramo) : null;
  const ramoEscolhido = eu.dirigente
    ? ramoPedido && Number.isInteger(ramoPedido)
      ? ramoPedido
      : eu.idramo
    : eu.idramo;

  const [adultosBruto, jovensBruto, ramos] = await Promise.all([
    supabase
      .from("usuario")
      .select("idusuario, nome, registro, idramo, datapromessa, deducaopromessa")
      .eq("ativo", true)
      .eq("membrogrupo", true),
    supabase
      .from("jovem")
      .select(
        "idjovem, nome, registro, idramo, dataacolhida, datapassagemlobinho, datapromessalobinho, deducaolobinho, datapassagemescoteiro, datapromessaescoteiro, deducaoescoteiro, datapassagemsenior, datapromessasenior, deducaosenior, datapassagempioneiro, datapromessapioneiro, deducaopioneiro",
      )
      .eq("ativo", true),
    supabase.from("ramo").select("idramo, nome").order("nome"),
  ]);

  const listaRamos = (ramos.data ?? []) as Array<{ idramo: number; nome: string }>;
  const nomeRamo = new Map(listaRamos.map((x) => [x.idramo, x.nome]));

  const fim = fimMesAtualBR();
  const adultos = (adultosBruto.data ?? []) as Adulto[];
  const jovens = (jovensBruto.data ?? []) as JovemLinha[];

  // Grade principal: só quem tem acolhida (filhotes) ou promessa (demais ramos,
  // inclusive diretoria e comissão fiscal) no mês escolhido.
  const linhasAdultos: Linha[] = adultos
    .filter((a) => ramoEscolhido !== null && a.idramo === ramoEscolhido)
    .filter((a) => !!a.datapromessa && mesDaData(a.datapromessa) === mesEscolhido)
    .sort(ordenarPorNome)
    .map((a) => ({
      tipo: "Adulto",
      nome: a.nome,
      registro: a.registro,
      idramo: a.idramo,
      data: a.datapromessa,
      deducao: a.deducaopromessa,
      anosPromessa: a.datapromessa ? anosPromessa(a.datapromessa, a.deducaopromessa) : null,
      // O cadastro de associado não registra a data de passagem para o ramo.
      anosNoRamo: null,
    }));

  const linhasJovens: Linha[] = jovens
    .filter((j) => ramoEscolhido !== null && j.idramo === ramoEscolhido)
    .map((j) => ({ j, calculo: calcularJovem(j, fim), data: dataPromessaOuAcolhida(j) }))
    .filter(({ data }) => !!data && mesDaData(data) === mesEscolhido)
    .sort((a, b) => ordenarPorNome(a.j, b.j))
    .map(({ j, calculo, data }) => ({
      tipo: "Jovem",
      nome: j.nome,
      registro: j.registro,
      idramo: j.idramo,
      data,
      deducao: calculo.deducaoTotal,
      anosPromessa: calculo.anosPromessa,
      anosNoRamo: calculo.anosNoRamo,
    }));

  const linhas = [...linhasAdultos, ...linhasJovens].sort(ordenarPorNome);

  // Visão separada: quem é do ramo do próprio usuário e não tem promessa/acolhida.
  // Não sofre influência do mês nem do ramo selecionados acima.
  const semPromessa: SemPromessa[] = [
    ...adultos
      .filter((a) => eu.idramo !== null && a.idramo === eu.idramo && !a.datapromessa)
      .map((a) => ({
        tipo: "Adulto" as const,
        nome: a.nome,
        registro: a.registro,
        idramo: a.idramo,
        situacao: "Sem promessa",
      })),
    ...jovens
      .filter((j) => eu.idramo !== null && j.idramo === eu.idramo && !dataPromessaOuAcolhida(j))
      .map((j) => ({
        tipo: "Jovem" as const,
        nome: j.nome,
        registro: j.registro,
        idramo: j.idramo,
        situacao: j.idramo === RAMO_JOVEM.filhotes ? "Sem acolhida" : "Sem promessa",
      })),
  ].sort(ordenarPorNome);

  return (
    <Shell>
      <main className="max-w-5xl p-4">
        <h1 className="text-xl font-semibold text-azul">Promessas</h1>
        <p className="mt-1 text-sm text-gray-600">
          Adultos e jovens do ramo {ramoEscolhido === null ? "—" : nomeRamo.get(ramoEscolhido) ?? "—"} com acolhida
          (filhotes) ou promessa (demais ramos) em {nomeMes}. A tela sempre abre no mês atual.
        </p>

        <section className="mt-4 overflow-hidden rounded-lg border border-gray-200 border-l-4 border-l-amarelo bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 bg-gray-50/60 px-4 py-2.5">
            <div className="flex-1">
              <SeletorMes valor={mesEscolhido} extras={ramoEscolhido === null ? {} : { ramo: String(ramoEscolhido) }} />
            </div>
            {eu.dirigente && (
              <form method="get" className="flex items-center gap-2 text-sm">
                <label className="flex items-center gap-2 font-medium text-gray-700">
                  Ramo
                  <select
                    name="ramo"
                    defaultValue={ramoEscolhido === null ? "" : String(ramoEscolhido)}
                    className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-azul focus:outline-none focus:ring-2 focus:ring-azul/20"
                  >
                    <option value="">Selecione</option>
                    {listaRamos.map((r) => (
                      <option key={r.idramo} value={r.idramo}>{r.nome}</option>
                    ))}
                  </select>
                </label>
                <input type="hidden" name="mes" value={mesEscolhido} />
                <button className="rounded bg-azul px-3 py-1.5 text-sm text-white hover:bg-azul-escuro">
                  Filtrar
                </button>
              </form>
            )}
            <span className="rounded bg-white px-2 py-0.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
              {linhas.length} {linhas.length === 1 ? "pessoa" : "pessoas"} em {nomeMes}
            </span>
          </div>

          {!linhas.length ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">
              {ramoEscolhido === null
                ? "Selecione um ramo para ver as promessas."
                : `Nenhuma promessa ou acolhida registrada em ${nomeMes}.`}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-2 font-medium">Nome</th>
                    <th className="px-4 py-2 font-medium">Tipo</th>
                    <th className="px-4 py-2 font-medium">Ramo</th>
                    <th className="px-4 py-2 font-medium">Registro</th>
                    <th className="px-4 py-2 font-medium">Data</th>
                    <th className="px-4 py-2 font-medium">Dedução</th>
                    <th className="px-4 py-2 text-right font-medium">Anos de promessa</th>
                    <th className="px-4 py-2 text-right font-medium">Anos no ramo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {linhas.map((p, indice) => (
                    <tr key={`${p.tipo}-${p.registro ?? p.nome}-${indice}`}>
                      <td className="px-4 py-2 font-medium text-gray-900">{p.nome}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-600">{p.tipo}</td>
                      <td className="px-4 py-2">{p.idramo === null ? "—" : nomeRamo.get(p.idramo) ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-600">{p.registro ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-600">{dataBR(p.data)}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-600">{anos(p.deducao)}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-gray-700">{anos(p.anosPromessa)}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-gray-700">{anos(p.anosNoRamo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8 overflow-hidden rounded-lg border border-gray-200 border-l-4 border-l-azul bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50/60 px-4 py-2.5">
            <h2 className="font-semibold text-azul">Sem promessa / acolhida</h2>
            <p className="mt-0.5 text-xs text-gray-600">
              Pessoas do seu ramo ({eu.idramo === null ? "—" : nomeRamo.get(eu.idramo) ?? "—"}) sem promessa registrada;
              para filhotes, sem acolhida. Esta lista não é afetada pelo mês nem pelo ramo escolhidos acima.
            </p>
          </div>
          {!semPromessa.length ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">
              {eu.idramo === null
                ? "Seu usuário não está vinculado a um ramo."
                : "Ninguém do seu ramo está sem promessa ou acolhida."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-2 font-medium">Nome</th>
                    <th className="px-4 py-2 font-medium">Tipo</th>
                    <th className="px-4 py-2 font-medium">Ramo</th>
                    <th className="px-4 py-2 font-medium">Registro</th>
                    <th className="px-4 py-2 font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {semPromessa.map((p, indice) => (
                    <tr key={`${p.tipo}-${p.registro ?? p.nome}-${indice}`}>
                      <td className="px-4 py-2 font-medium text-gray-900">{p.nome}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-600">{p.tipo}</td>
                      <td className="px-4 py-2">{p.idramo === null ? "—" : nomeRamo.get(p.idramo) ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-600">{p.registro ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-amber-700">{p.situacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </Shell>
  );
}
