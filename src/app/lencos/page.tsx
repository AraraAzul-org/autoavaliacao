/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";
import { GraficoDistribuicao } from "@/components/GraficoDistribuicao";
import { comFotosAssinadas, dataBR, type Lenco, type LencoComFotos } from "@/lib/lencos";

export const instant = false;

export default async function Lencos({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string; uf?: string }>;
}) {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  if (!eu.acessos.has("lencos") && !eu.acessos.has("lencoscadastro")) redirect("/");

  const params = await searchParams;
  const uf = (params.uf ?? "").trim().slice(0, 2).toUpperCase();
  const podeCadastrar = eu.acessos.has("lencoscadastro");

  const { data } = await supabase
    .from("lenco")
    .select("*")
    .order("data", { ascending: false })
    .order("idlenco", { ascending: false });
  const todos: Lenco[] = (data ?? []) as Lenco[];
  const comFotos: LencoComFotos[] = await Promise.all(
    todos.map((lenco) => comFotosAssinadas(supabase, lenco)),
  );

  const ultimo = comFotos[0];
  const porUF = new Map<string, number>();
  for (const lenco of comFotos) {
    porUF.set(lenco.uf, (porUF.get(lenco.uf) ?? 0) + 1);
  }
  const itensUF = [...porUF.entries()]
    .map(([rotulo, quantidade]) => ({ rotulo, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade || a.rotulo.localeCompare(b.rotulo, "pt-BR"));
  const filtrados = uf ? comFotos.filter((lenco) => lenco.uf === uf) : comFotos;

  return (
    <Shell>
      <main className="w-full p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-azul">Lenços</h1>
            <p className="mt-1 text-sm text-gray-600">
              Registro dos lenços trocados. Clique em uma UF no gráfico para filtrar a listagem.
            </p>
          </div>
          {podeCadastrar && (
            <Link
              href="/lencos/cadastro"
              className="rounded bg-azul px-3 py-1.5 text-sm font-medium text-white hover:bg-azul-escuro"
            >
              Cadastrar lenço
            </Link>
          )}
        </div>

        {params.erro && (
          <p role="alert" className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">
            {params.erro}
          </p>
        )}
        {params.ok && (
          <p role="status" className="mt-3 rounded bg-green-50 p-2 text-sm text-green-800">
            {params.ok}
          </p>
        )}

        <section className="mt-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-azul">Último lenço trocado</h2>
          {!ultimo ? (
            <p className="mt-3 text-sm text-gray-500">Nenhum lenço cadastrado.</p>
          ) : (
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div className="grid grid-cols-2 gap-3">
                <figure className="rounded border border-gray-200 bg-gray-50 p-2 text-center">
                  {ultimo.urlLenco ? (
                    <img src={ultimo.urlLenco} alt="Foto do lenço" className="mx-auto max-h-56 w-full object-contain" />
                  ) : (
                    <div className="flex h-32 items-center justify-center text-xs text-gray-400">Sem foto do lenço</div>
                  )}
                  <figcaption className="mt-1 text-xs text-gray-600">Foto do lenço</figcaption>
                </figure>
                <figure className="rounded border border-gray-200 bg-gray-50 p-2 text-center">
                  {ultimo.urlEntrega ? (
                    <img src={ultimo.urlEntrega} alt="Foto da entrega" className="mx-auto max-h-56 w-full object-contain" />
                  ) : (
                    <div className="flex h-32 items-center justify-center text-xs text-gray-400">Sem foto da entrega</div>
                  )}
                  <figcaption className="mt-1 text-xs text-gray-600">Foto da entrega</figcaption>
                </figure>
              </div>
              <div className="text-sm text-gray-700">
                <p className="text-base font-semibold text-gray-900">
                  Grupo Escoteiro {ultimo.grupoescoteiro} · Lenço nº {ultimo.numero} · {ultimo.uf}
                </p>
                <p className="mt-2"><strong>Escoteiro:</strong> {ultimo.nomeescoteiro}</p>
                <p><strong>No Arara Azul:</strong> {ultimo.nomeescoteiroarara}</p>
                <p className="mt-2"><strong>Atividade:</strong> {ultimo.nomeatividade}</p>
                <p><strong>Data:</strong> {dataBR(ultimo.data)}</p>
                {ultimo.observacao && <p className="mt-2 whitespace-pre-line">{ultimo.observacao}</p>}
                <Link href={`/lencos/${ultimo.idlenco}`} className="mt-3 inline-block text-azul underline">
                  Ver cadastro
                </Link>
              </div>
            </div>
          )}
        </section>

        <section className="mt-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-azul">Lenços por UF</h2>
            <span className="text-xs text-gray-500">{comFotos.length} no total</span>
          </div>
          <div className="mt-3">
            {itensUF.length ? (
              <GraficoDistribuicao
                itens={itensUF}
                hrefPorRotulo={(rotulo) => `/lencos?uf=${encodeURIComponent(rotulo)}`}
                rotuloSelecionado={uf}
                unidade="lenço"
                unidadePlural="lenços"
              />
            ) : (
              <p className="text-sm text-gray-500">Sem dados para o gráfico.</p>
            )}
          </div>
          {uf && (
            <Link href="/lencos" className="mt-3 inline-block text-sm text-azul underline">
              Limpar filtro ({uf})
            </Link>
          )}
        </section>

        <section className="mt-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-azul">
            {uf ? `Lenços de ${uf}` : "Todos os lenços"}
          </h2>
          {!filtrados.length ? (
            <p className="mt-3 rounded border border-gray-200 bg-white p-4 text-sm text-gray-500">
              Nenhum lenço encontrado{uf ? ` para ${uf}` : ""}.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded border border-gray-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-azul text-white">
                  <tr>
                    {["Data", "Grupo", "Nº", "UF", "Escoteiro", "Arara Azul", "Atividade", ""].map((h) => (
                      <th key={h} className="p-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtrados.map((lenco) => (
                    <tr key={lenco.idlenco} className="hover:bg-gray-50/70">
                      <td className="whitespace-nowrap p-2 text-gray-600">{dataBR(lenco.data)}</td>
                      <td className="p-2">{lenco.grupoescoteiro}</td>
                      <td className="p-2">{lenco.numero}</td>
                      <td className="p-2 font-medium">{lenco.uf}</td>
                      <td className="p-2">{lenco.nomeescoteiro}</td>
                      <td className="p-2">{lenco.nomeescoteiroarara}</td>
                      <td className="p-2">{lenco.nomeatividade}</td>
                      <td className="p-2">
                        <Link href={`/lencos/${lenco.idlenco}`} className="whitespace-nowrap text-azul underline">
                          Ver cadastro
                        </Link>
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
