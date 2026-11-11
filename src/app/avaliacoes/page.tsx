import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";
import { excluirAvaliacao, salvarAvaliacao } from "./actions";

export const instant = false;

const campo = "rounded border border-gray-300 p-1.5 text-sm";
const btn = "rounded bg-azul px-3 py-1.5 text-sm text-white hover:bg-azul-escuro";

const STATUS: Record<string, { rotulo: string; classe: string }> = {
  rascunho: { rotulo: "Rascunho", classe: "text-gray-700" },
  aberta: { rotulo: "Aberta", classe: "text-green-800" },
  finalizada: { rotulo: "Finalizada", classe: "text-azul" },
};

const dataBR = (iso: string) => iso.split("-").reverse().join("/");

export default async function Avaliacoes({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  if (!eu.diretor) redirect("/");

  const { ok, erro } = await searchParams;

  const [q, a, g] = await Promise.all([
    supabase.from("questionario").select("idquestionario, descricao, ativo").order("descricao"),
    supabase
      .from("avaliacao")
      .select("idavaliacao, descricao, prazo, status, datageracao, idquestionario")
      .order("prazo", { ascending: false }),
    supabase.from("avaliacaousuario").select("idavaliacao"),
  ]);

  const questionarios = q.data ?? [];
  const avaliacoes = a.data ?? [];
  const nomeQuestionario = new Map(questionarios.map((x) => [x.idquestionario, x.descricao]));
  const geradas = new Map<number, number>();
  g.data?.forEach((x) => geradas.set(x.idavaliacao, (geradas.get(x.idavaliacao) ?? 0) + 1));

  const Campos = ({ valores }: { valores?: typeof avaliacoes[number] }) => (
    <>
      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="text-gray-600">Descrição</span>
        <input
          name="descricao"
          required
          placeholder="Ex.: Autoavaliação 2026"
          defaultValue={valores?.descricao ?? ""}
          className={campo}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-gray-600">Questionário</span>
        <select name="idquestionario" required defaultValue={valores ? String(valores.idquestionario) : ""} className={campo}>
          <option value="" disabled>
            Escolha o questionário
          </option>
          {questionarios.map((x) => (
            <option key={x.idquestionario} value={x.idquestionario}>
              {x.descricao}
              {x.ativo ? "" : " (inativo)"}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-gray-600">Prazo</span>
        <input name="prazo" type="date" required defaultValue={valores?.prazo ?? ""} className={campo} />
      </label>
    </>
  );

  return (
    <Shell>
      <main className="max-w-4xl p-4">
        <h1 className="text-xl font-semibold text-azul">Avaliações</h1>
        <p className="mt-1 text-sm text-gray-600">
          Cada avaliação usa um questionário e tem um prazo. Ela nasce como <strong>rascunho</strong>; as
          avaliações dos adultos só são criadas no passo de geração.
        </p>
        {erro && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
        {ok && <p className="mt-3 rounded bg-green-50 p-2 text-sm text-green-800">{ok}</p>}

        <details className="mt-4 rounded border border-gray-200 bg-white p-3 text-sm">
          <summary className="cursor-pointer text-azul underline">Nova avaliação</summary>
          {!questionarios.length ? (
            <p className="mt-3 text-gray-600">
              Cadastre um questionário antes de criar uma avaliação.
            </p>
          ) : (
            <form action={salvarAvaliacao} className="mt-3 grid gap-2 sm:grid-cols-2">
              <Campos />
              <div className="sm:col-span-2">
                <button className={btn}>Criar avaliação</button>
              </div>
            </form>
          )}
        </details>

        {!avaliacoes.length && (
          <p className="mt-6 text-sm text-gray-600">Nenhuma avaliação cadastrada. Crie a primeira acima.</p>
        )}

        {avaliacoes.map((av) => {
          const st = STATUS[av.status] ?? STATUS.rascunho;
          const total = geradas.get(av.idavaliacao) ?? 0;
          const rascunho = av.status === "rascunho";
          return (
            <section key={av.idavaliacao} className="mt-6 overflow-hidden rounded border border-gray-200 bg-white">
              <div className="flex flex-wrap items-center gap-3 border-b-2 border-amarelo bg-azul p-3 text-white">
                <h2 className="flex-1 font-semibold">{av.descricao}</h2>
                <span className={`rounded bg-white px-2 py-0.5 text-xs font-medium ${st.classe}`}>{st.rotulo}</span>
                {rascunho && (
                  <details className="text-sm text-gray-900">
                    <summary className="cursor-pointer text-white underline">Editar</summary>
                    <form action={salvarAvaliacao} className="mt-1 grid gap-2 rounded bg-white p-2 sm:grid-cols-2">
                      <input type="hidden" name="idavaliacao" value={av.idavaliacao} />
                      <Campos valores={av} />
                      <div className="sm:col-span-2">
                        <button className={btn}>Salvar</button>
                      </div>
                    </form>
                  </details>
                )}
                {rascunho && (
                  <div className="rounded bg-white px-2 py-1">
                    <details className="text-sm">
                      <summary className="cursor-pointer text-red-700 underline">Excluir</summary>
                      <form action={excluirAvaliacao} className="mt-1">
                        <input type="hidden" name="idavaliacao" value={av.idavaliacao} />
                        <button className="rounded bg-red-700 px-2 py-1 text-white">Confirmar exclusão</button>
                      </form>
                    </details>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 p-3 text-sm text-gray-700">
                <span>
                  Questionário: <strong>{nomeQuestionario.get(av.idquestionario) ?? "—"}</strong>
                </span>
                <span>
                  Prazo: <strong>{dataBR(av.prazo)}</strong>
                </span>
                <span>
                  {total} {total === 1 ? "avaliação gerada" : "avaliações geradas"}
                </span>
                <button
                  disabled
                  title="Em breve"
                  className="ml-auto cursor-not-allowed rounded border border-gray-300 px-2 py-1 text-xs text-gray-400"
                >
                  Gerar avaliações
                </button>
              </div>
            </section>
          );
        })}
      </main>
    </Shell>
  );
}
