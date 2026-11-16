import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";
import { SeletorMes } from "@/components/SeletorMes";
import { anosPromessa, dataBR, MESES, mesAtualBR } from "@/lib/promessa";

export const instant = false;

type Bruto = {
  idusuario: number;
  nome: string;
  datapromessa: string;
  reducaopromessa: number | null;
};

export default async function Promessas({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  if (!eu.diretor) redirect("/");

  // Sempre abre no mês atual; o parâmetro só vale quando o usuário troca o mês.
  const { mes } = await searchParams;
  const pedido = Number(mes);
  const mesEscolhido = Number.isInteger(pedido) && pedido >= 1 && pedido <= 12 ? pedido : mesAtualBR();
  const nomeMes = MESES[mesEscolhido - 1];

  const { data } = await supabase
    .from("usuario")
    .select("idusuario, nome, datapromessa, reducaopromessa")
    .eq("ativo", true)
    .not("datapromessa", "is", null);

  const pessoas = ((data ?? []) as Bruto[])
    .filter((p) => Number(String(p.datapromessa).slice(5, 7)) === mesEscolhido)
    .sort(
      (a, b) =>
        String(a.datapromessa).slice(8, 10).localeCompare(String(b.datapromessa).slice(8, 10)) ||
        a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
    )
    .map((p) => ({ ...p, anos: anosPromessa(p.datapromessa, p.reducaopromessa) }));

  return (
    <Shell>
      <main className="max-w-4xl p-4">
        <h1 className="text-xl font-semibold text-azul">Promessas</h1>
        <p className="mt-1 text-sm text-gray-600">
          Quem fez a promessa escoteira no mês escolhido. A tela sempre abre no mês atual.
        </p>

        <section className="mt-4 overflow-hidden rounded-lg border border-gray-200 border-l-4 border-l-amarelo bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 bg-gray-50/60 px-4 py-2.5">
            <div className="flex-1">
              <SeletorMes valor={mesEscolhido} />
            </div>
            <span className="rounded bg-white px-2 py-0.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
              {pessoas.length} {pessoas.length === 1 ? "pessoa" : "pessoas"} em {nomeMes}
            </span>
          </div>

          {!pessoas.length ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">
              Nenhuma promessa registrada em {nomeMes}.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-2 font-medium">Nome</th>
                    <th className="px-4 py-2 font-medium">Data da promessa</th>
                    <th className="px-4 py-2 font-medium">Redução</th>
                    <th className="px-4 py-2 text-right font-medium">Anos de promessa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pessoas.map((p) => (
                    <tr key={p.idusuario}>
                      <td className="px-4 py-2 font-medium text-gray-900">{p.nome}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-600">{dataBR(p.datapromessa)}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-600">
                        {p.reducaopromessa == null
                          ? "—"
                          : `${p.reducaopromessa} ${p.reducaopromessa === 1 ? "ano" : "anos"}`}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-gray-700">
                        {p.anos === null ? "—" : `${p.anos} ${p.anos === 1 ? "ano" : "anos"}`}
                      </td>
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
