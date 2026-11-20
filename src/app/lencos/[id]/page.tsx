/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";
import { Voltar } from "@/components/Voltar";
import { FormLenco } from "@/components/FormLenco";
import { comFotosAssinadas, dataBR, type Lenco } from "@/lib/lencos";
import { atualizarLenco, excluirLenco } from "../actions";

export const instant = false;

export default async function DetalheLenco({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { id: texto } = await params;
  const id = Number(texto);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  if (!eu.acessos.has("lencos") && !eu.acessos.has("lencoscadastro")) redirect("/");

  const { data } = await supabase.from("lenco").select("*").eq("idlenco", id).maybeSingle();
  if (!data) notFound();
  const lenco = await comFotosAssinadas(supabase, data as Lenco);
  const podeEditar = eu.acessos.has("lencoscadastro");
  const { erro, ok } = await searchParams;

  return (
    <Shell>
      <main className="max-w-4xl p-4">
        <Voltar href={`/lencos?uf=${encodeURIComponent(lenco.uf)}`} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-azul">Cadastro do lenço</h1>
            <p className="mt-1 text-sm text-gray-600">
              Grupo Escoteiro {lenco.grupoescoteiro} · Lenço nº {lenco.numero} · {lenco.uf} · {dataBR(lenco.data)}
            </p>
          </div>
          <Link href="/lencos" className="text-sm text-azul underline">
            Voltar para Lenços
          </Link>
        </div>

        {erro && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
        {ok && <p className="mt-3 rounded bg-green-50 p-2 text-sm text-green-800">{ok}</p>}

        <section className="mt-5 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm sm:grid-cols-2">
          <p><strong>Escoteiro:</strong> {lenco.nomeescoteiro}</p>
          <p><strong>No Arara Azul:</strong> {lenco.nomeescoteiroarara}</p>
          <p className="sm:col-span-2"><strong>Atividade:</strong> {lenco.nomeatividade}</p>
          {lenco.observacao && (
            <p className="sm:col-span-2 whitespace-pre-line"><strong>Observação:</strong> {lenco.observacao}</p>
          )}
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2">
          <figure className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-center">
            {lenco.urlLenco ? (
              <img src={lenco.urlLenco} alt="Foto do lenço" className="mx-auto max-h-72 w-full object-contain" />
            ) : (
              <div className="flex h-40 items-center justify-center text-xs text-gray-400">Sem foto do lenço</div>
            )}
            <figcaption className="mt-1 text-xs text-gray-600">Foto do lenço</figcaption>
          </figure>
          <figure className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-center">
            {lenco.urlEntrega ? (
              <img src={lenco.urlEntrega} alt="Foto da entrega" className="mx-auto max-h-72 w-full object-contain" />
            ) : (
              <div className="flex h-40 items-center justify-center text-xs text-gray-400">Sem foto da entrega</div>
            )}
            <figcaption className="mt-1 text-xs text-gray-600">Foto da entrega</figcaption>
          </figure>
        </section>

        {podeEditar && (
          <>
            <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-azul">Editar cadastro</h2>
            <FormLenco action={atualizarLenco.bind(null, id)} valores={lenco} botao="Salvar alterações" />
            <form action={excluirLenco.bind(null, id)} className="mt-4">
              <button
                type="submit"
                className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              >
                Excluir cadastro
              </button>
            </form>
          </>
        )}
      </main>
    </Shell>
  );
}
