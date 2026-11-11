import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { CADASTROS } from "@/lib/cadastros";
import { Shell } from "@/components/Shell";
import { excluirSimples, salvarSimples } from "@/app/cadastros/actions";

const campo =
  "w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-azul focus:outline-none focus:ring-2 focus:ring-azul/20";
const rotulo = "text-[11px] font-medium uppercase tracking-wide text-gray-600";
const btn =
  "rounded bg-azul px-3 py-1.5 text-sm font-medium text-white hover:bg-azul-escuro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/40 focus-visible:ring-offset-1";
const iconBtn =
  "inline-flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 [&::-webkit-details-marker]:hidden";

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
  const campoNome = cfg.campos.find((c) => c.tipo === "texto")?.nome ?? cfg.chave;

  const Campos = ({ valores }: { valores?: Record<string, string | number | boolean> }) => (
    <>
      {cfg.campos.map((c) =>
        c.tipo === "bool" ? (
          <label key={c.nome} className="flex items-center gap-2 self-end pb-1.5 text-sm text-gray-700">
            <input
              name={c.nome}
              type="checkbox"
              defaultChecked={!!valores?.[c.nome]}
              className="size-4 rounded border-gray-300 accent-azul"
            />
            {c.rotulo}
          </label>
        ) : (
          <label key={c.nome} className="flex min-w-48 flex-1 flex-col gap-1">
            <span className={rotulo}>{c.rotulo}</span>
            <input
              name={c.nome}
              required
              autoComplete="off"
              defaultValue={valores ? String(valores[c.nome]) : ""}
              className={campo}
            />
          </label>
        )
      )}
    </>
  );

  return (
    <Shell>
      <main className="max-w-3xl p-4">
        <h1 className="text-xl font-semibold text-azul">{cfg.titulo}</h1>
        <p className="mt-1 text-sm text-gray-600">{cfg.ajuda}</p>
        {erro && (
          <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}
        {ok && (
          <p role="status" className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            {ok}
          </p>
        )}

        <form
          action={salvarSimples}
          className="mt-5 flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 border-l-4 border-l-amarelo bg-white p-4 shadow-sm"
        >
          <input type="hidden" name="tabela" value={tabela} />
          <Campos />
          <button className={btn}>Adicionar</button>
        </form>

        <ul className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-sm">
          {!linhas.length && (
            <li className="px-4 py-8 text-center text-sm text-gray-500">Nenhum registro cadastrado.</li>
          )}
          {linhas.map((l) => (
            <li
              key={String(l[cfg.chave])}
              className="linha-cadastro group flex flex-wrap items-center gap-2 px-3 py-2.5 transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-gray-50/70 focus-within:bg-gray-50/70"
            >
              <form action={salvarSimples} className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
                <input type="hidden" name="tabela" value={tabela} />
                <input type="hidden" name="id" value={String(l[cfg.chave])} />
                <Campos valores={l} />
                <button className={`${btn} acoes-linha`}>Salvar</button>
              </form>
              <details className="relative">
                <summary
                  className={`${iconBtn} acoes-linha`}
                  aria-label={`Excluir ${String(l[campoNome])}`}
                  title="Excluir (clique novamente para cancelar)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="size-4 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.7]"
                  >
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" />
                  </svg>
                </summary>
                <form
                  action={excluirSimples}
                  className="absolute right-0 z-20 mt-1 w-60 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
                >
                  <input type="hidden" name="tabela" value={tabela} />
                  <input type="hidden" name="id" value={String(l[cfg.chave])} />
                  <p className="text-xs leading-snug text-gray-600">
                    Excluir <strong className="text-gray-900">“{String(l[campoNome])}”</strong>? Não é possível desfazer.
                  </p>
                  <div className="mt-2.5 flex justify-end">
                    <button className="rounded bg-red-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                      Confirmar exclusão
                    </button>
                  </div>
                </form>
              </details>
            </li>
          ))}
        </ul>
      </main>
    </Shell>
  );
}
