import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { CADASTROS } from "@/lib/cadastros";
import { Shell } from "@/components/Shell";
import { excluirSimples, salvarSimples } from "@/app/cadastros/actions";

const campo = "rounded border border-gray-300 p-1.5 text-sm";
const btn = "rounded bg-azul px-3 py-1.5 text-sm text-white hover:bg-azul-escuro";

export async function CadastroSimples({
  tabela,
  searchParams,
}: {
  tabela: keyof typeof CADASTROS;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const cfg = CADASTROS[tabela];
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  if (!eu.diretor) redirect("/");

  const { ok, erro } = await searchParams;
  const { data } = await supabase.from(tabela).select("*").order(cfg.chave);
  const linhas = (data ?? []) as Record<string, string | number | boolean>[];

  const Campos = ({ valores }: { valores?: Record<string, string | number | boolean> }) => (
    <>
      {cfg.campos.map((c) =>
        c.tipo === "bool" ? (
          <label key={c.nome} className="flex items-center gap-1 text-sm">
            <input name={c.nome} type="checkbox" defaultChecked={!!valores?.[c.nome]} />
            {c.rotulo}
          </label>
        ) : (
          <input
            key={c.nome}
            name={c.nome}
            required
            placeholder={c.rotulo}
            defaultValue={valores ? String(valores[c.nome]) : ""}
            className={`${campo} min-w-48 flex-1`}
          />
        )
      )}
    </>
  );

  return (
    <Shell>
      <main className="max-w-3xl p-4">
        <h1 className="text-xl font-semibold text-azul">{cfg.titulo}</h1>
        <p className="mt-1 text-sm text-gray-600">{cfg.ajuda}</p>
        {erro && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
        {ok && <p className="mt-3 rounded bg-green-50 p-2 text-sm text-green-800">{ok}</p>}

        <form action={salvarSimples} className="mt-4 flex flex-wrap items-center gap-2 rounded border border-gray-200 border-l-4 border-l-amarelo bg-white p-3">
          <input type="hidden" name="tabela" value={tabela} />
          <Campos />
          <button className={btn}>Adicionar</button>
        </form>

        <ul className="mt-4 divide-y rounded border bg-white">
          {!linhas.length && <li className="p-3 text-sm text-gray-600">Nenhum registro cadastrado.</li>}
          {linhas.map((l) => (
            <li key={String(l[cfg.chave])} className="flex flex-wrap items-start gap-2 p-3">
              <form action={salvarSimples} className="flex flex-1 flex-wrap items-center gap-2">
                <input type="hidden" name="tabela" value={tabela} />
                <input type="hidden" name="id" value={String(l[cfg.chave])} />
                <Campos valores={l} />
                <button className={btn}>Salvar</button>
              </form>
              <details className="text-sm">
                <summary className="cursor-pointer text-red-700 underline">Excluir</summary>
                <form action={excluirSimples} className="mt-1">
                  <input type="hidden" name="tabela" value={tabela} />
                  <input type="hidden" name="id" value={String(l[cfg.chave])} />
                  <button className="rounded bg-red-700 px-2 py-1 text-white">Confirmar exclusão</button>
                </form>
              </details>
            </li>
          ))}
        </ul>
      </main>
    </Shell>
  );
}
