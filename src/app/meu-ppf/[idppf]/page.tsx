import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";
import { Voltar } from "@/components/Voltar";
import { PpfLista } from "@/components/PpfLista";
import { STATUS_PPF, agruparPorEtapa, carregarPpf, dataBR } from "@/lib/ppf";
import { adicionarItem, editarItem, salvarItens } from "../actions";

export const instant = false;

const campo = "mt-1 w-full rounded border border-gray-300 p-1.5 text-sm";

export default async function MeuPpfDetalhe({
  params,
  searchParams,
}: {
  params: Promise<{ idppf: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { idppf: idTexto } = await params;
  const idppf = Number(idTexto);
  if (!Number.isInteger(idppf)) notFound();

  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");

  const ppf = await carregarPpf(supabase, idppf);
  if (!ppf) notFound();
  // Cada pessoa vê e edita apenas o próprio PPF.
  if (ppf.ppf.idusuario !== eu.idusuario) notFound();

  const { ok, erro } = await searchParams;
  const aberto = ppf.ppf.status === "aberto";
  const selo = STATUS_PPF[ppf.ppf.status] ?? STATUS_PPF.fechado;
  const grupos = agruparPorEtapa(ppf.itens);
  const extras = ppf.itens.filter((i) => i.manual);

  return (
    <Shell>
      <main className="max-w-3xl p-4">
        <Voltar href="/meu-ppf" />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-azul">{ppf.avaliacao?.descricao ?? "PPF"}</h1>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${selo.classe}`}>{selo.rotulo}</span>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          {ppf.usuario?.nome ?? eu.nome} · Gerado em <strong>{dataBR(ppf.ppf.datageracao)}</strong>
          {ppf.avaliacao ? ` · Prazo da avaliação: ${dataBR(ppf.avaliacao.prazo)}` : ""}
          {ppf.ppf.datafechamento ? ` · Fechado em ${dataBR(ppf.ppf.datafechamento)}` : ""}
        </p>

        {erro && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
        {ok && <p className="mt-3 rounded bg-green-50 p-2 text-sm text-green-800">{ok}</p>}

        <p className="mt-3 rounded bg-gray-100 p-2 text-sm text-gray-700">
          {aberto
            ? "Estas são as perguntas com resposta abaixo da nota mínima. Escreva a ação que será realizada e a data prevista de cada uma."
            : "Este PPF está fechado e disponível apenas para consulta."}
        </p>

        {aberto && grupos.length > 0 ? (
          <form action={salvarItens} className="mt-2">
            <input type="hidden" name="idppf" value={idppf} />
            <PpfLista grupos={grupos} editar />
            <button className="mt-4 rounded bg-azul px-3 py-1.5 text-sm text-white hover:bg-azul-escuro">
              Salvar PPF
            </button>
          </form>
        ) : (
          <PpfLista grupos={grupos} />
        )}

        <section className="mt-6 overflow-hidden rounded border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b-2 border-amarelo bg-azul p-3 text-white">
            <h2 className="flex-1 text-sm font-semibold">Itens adicionados por mim</h2>
            <span className="text-xs text-white/90">Estes itens podem ser excluídos</span>
          </div>

          <div className="p-3">
            {!extras.length && (
              <p className="text-sm text-gray-600">Nenhum item adicionado. Use o formulário abaixo para incluir.</p>
            )}

            {extras.map((item) =>
              aberto ? (
                <form key={item.idppfitem} action={editarItem} className="border-b border-gray-100 py-3 last:border-0">
                  <input type="hidden" name="idppf" value={idppf} />
                  <input type="hidden" name="idppfitem" value={item.idppfitem} />
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
                    <label className="text-xs text-gray-600">
                      Descrição
                      <textarea
                        name="descricao"
                        rows={2}
                        required
                        defaultValue={item.resposta ?? ""}
                        className={campo}
                      />
                    </label>
                    <label className="text-xs text-gray-600">
                      Data prevista
                      <input
                        type="date"
                        name="dataprevista"
                        defaultValue={item.dataprevista?.slice(0, 10) ?? ""}
                        className={campo}
                      />
                    </label>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      name="intencao"
                      value="salvar"
                      className="rounded bg-azul px-3 py-1 text-sm text-white hover:bg-azul-escuro"
                    >
                      Salvar item
                    </button>
                    <button
                      name="intencao"
                      value="excluir"
                      className="rounded border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                    >
                      Excluir
                    </button>
                  </div>
                </form>
              ) : (
                <div key={item.idppfitem} className="border-b border-gray-100 py-3 last:border-0">
                  <p className="whitespace-pre-wrap text-sm text-gray-800">{item.resposta}</p>
                  <p className="mt-1 text-xs text-gray-500">Data prevista: {dataBR(item.dataprevista)}</p>
                </div>
              ),
            )}

            {aberto && (
              <form action={adicionarItem} className="mt-4 border-t border-gray-100 pt-3">
                <input type="hidden" name="idppf" value={idppf} />
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
                  <label className="text-xs text-gray-600">
                    Novo item (descrição)
                    <textarea name="descricao" rows={2} required className={campo} />
                  </label>
                  <label className="text-xs text-gray-600">
                    Data prevista
                    <input type="date" name="dataprevista" className={campo} />
                  </label>
                </div>
                <button className="mt-2 rounded border border-azul px-3 py-1 text-sm text-azul hover:bg-azul/10">
                  Incluir item
                </button>
              </form>
            )}
          </div>
        </section>

        <div className="mt-6 flex flex-wrap items-center gap-2 rounded border border-gray-200 bg-white p-4">
          <p className="min-w-0 flex-1 text-sm text-gray-700">
            Relatório do PPF em PDF para envio no paxtu100.
          </p>
          <Link
            href={`/meu-ppf/${idppf}/pdf`}
            prefetch={false}
            className="rounded bg-azul px-3 py-1.5 text-sm font-medium text-white hover:bg-azul-escuro"
          >
            Gerar relatório em PDF
          </Link>
        </div>
      </main>
    </Shell>
  );
}
