import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";
import { excluir, salvarEtapa, salvarPergunta, salvarPontuacao, salvarQuestionario } from "./actions";

export const instant = false;

const campo = "rounded border border-gray-300 p-1.5 text-sm";
const btn = "rounded bg-azul px-3 py-1.5 text-sm text-white hover:bg-azul-escuro";

function Excluir({ tabela, id, abrir, q }: { tabela: string; id: number; abrir?: number; q?: number }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-red-700 underline">Excluir</summary>
      <form action={excluir} className="mt-1">
        <input type="hidden" name="tabela" value={tabela} />
        <input type="hidden" name="id" value={id} />
        {abrir && <input type="hidden" name="abrir" value={abrir} />}
        {q && <input type="hidden" name="q" value={q} />}
        <button className="rounded bg-red-700 px-2 py-1 text-white">Confirmar exclusão</button>
      </form>
    </details>
  );
}

export default async function Perguntas({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string; abrir?: string; q?: string }>;
}) {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  if (!eu.diretor) redirect("/");

  const { ok, erro, abrir, q } = await searchParams;

  const lista = await supabase
    .from("questionario")
    .select("idquestionario, descricao, ativo")
    .order("idquestionario");
  const questionarios = lista.data ?? [];
  const selecionado = questionarios.find((x) => String(x.idquestionario) === q) ?? questionarios[0] ?? null;

  const etapas = selecionado
    ? ((await supabase
        .from("etapa")
        .select("idetapa, descricao, notaminima, etapaapf")
        .eq("idquestionario", selecionado.idquestionario)
        .order("idetapa")).data ?? [])
    : [];

  const [p, n] = await Promise.all([
    supabase.from("pergunta").select("idpergunta, codigo, descricao, idetapa, descritiva").order("codigo"),
    supabase.from("pontuacao").select("idpontuacao, idpergunta, descricao, nota").order("nota"),
  ]);
  const perguntas = p.data ?? [];
  const pontuacoes = n.data ?? [];

  return (
    <Shell>
      <main className="max-w-4xl p-4">
        <h1 className="text-xl font-semibold text-azul">Questionário</h1>
        <p className="mt-1 text-sm text-gray-600">
          Cada questionário tem as suas próprias etapas, perguntas e pontuações. Assim é possível ter vários
          tipos de avaliação ao mesmo tempo.
        </p>
        {erro && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
        {ok && <p className="mt-3 rounded bg-green-50 p-2 text-sm text-green-800">{ok}</p>}

        <div className="mt-4 flex flex-wrap items-end gap-3 rounded border border-gray-200 bg-white p-3">
          <form method="get" className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col text-sm">
              <span className="mb-1 text-gray-600">Questionário</span>
              <select
                name="q"
                defaultValue={selecionado ? String(selecionado.idquestionario) : ""}
                className={campo}
              >
                {questionarios.map((x) => (
                  <option key={x.idquestionario} value={x.idquestionario}>
                    {x.descricao}
                    {x.ativo ? "" : " (inativo)"}
                  </option>
                ))}
              </select>
            </label>
            <button className={btn}>Abrir</button>
          </form>
          <details className="text-sm">
            <summary className="cursor-pointer text-azul underline">Novo questionário</summary>
            <form action={salvarQuestionario} className="mt-2 flex flex-wrap gap-2">
              <input type="hidden" name="ativo" value="on" />
              <input
                name="descricao"
                required
                placeholder="Ex.: Avaliação de Liderança"
                className={`${campo} min-w-56 flex-1`}
              />
              <button className={btn}>Criar questionário</button>
            </form>
          </details>
        </div>

        {!questionarios.length && (
          <p className="mt-6 text-sm text-gray-600">Nenhum questionário cadastrado. Crie o primeiro acima.</p>
        )}

        {selecionado && (
          <section className="mt-6 overflow-hidden rounded border border-gray-200 bg-white">
            <div className="flex flex-wrap items-center gap-3 border-b-2 border-amarelo bg-azul p-3 text-white">
              <h2 className="flex-1 font-semibold">{selecionado.descricao}</h2>
              {!selecionado.ativo && (
                <span className="rounded bg-white px-2 py-0.5 text-xs text-gray-700">Inativo</span>
              )}
              <details className="text-sm text-gray-900">
                <summary className="cursor-pointer text-white underline">Editar</summary>
                <form
                  action={salvarQuestionario}
                  className="mt-1 flex flex-wrap items-center gap-2 rounded bg-white p-2"
                >
                  <input type="hidden" name="idquestionario" value={selecionado.idquestionario} />
                  <input name="descricao" required defaultValue={selecionado.descricao} className={campo} />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="ativo" defaultChecked={selecionado.ativo} />
                    Ativo
                  </label>
                  <button className={btn}>Salvar</button>
                </form>
              </details>
              <div className="rounded bg-white px-2 py-1">
                <Excluir tabela="questionario" id={selecionado.idquestionario} />
              </div>
            </div>

            <div className="p-3">
              <form action={salvarEtapa} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="idquestionario" value={selecionado.idquestionario} />
                <input type="hidden" name="q" value={selecionado.idquestionario} />
                <label className="flex min-w-48 flex-1 flex-col text-sm">
                  <span className="mb-1 text-gray-600">Nova etapa</span>
                  <input name="descricao" required placeholder="Ex.: Comprometimento" className={campo} />
                </label>
                <label className="flex flex-col text-sm">
                  <span className="mb-1 text-gray-600">Nota mínima</span>
                  <input
                    name="notaminima"
                    inputMode="decimal"
                    placeholder="Opcional"
                    className={`${campo} w-28`}
                  />
                </label>
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <input type="checkbox" name="etapaapf" />
                  Etapa para APF
                </label>
                <button className={btn}>Adicionar etapa</button>
              </form>
              {!etapas.length && (
                <p className="mt-4 text-sm text-gray-600">Nenhuma etapa cadastrada neste questionário.</p>
              )}
            </div>
          </section>
        )}

        {etapas.map((et) => (
          <section key={et.idetapa} className="mt-6 overflow-hidden rounded border border-gray-200 bg-white">
            <div className="flex flex-wrap items-center gap-3 border-b-2 border-amarelo bg-azul p-3 text-white">
              <h2 className="flex-1 font-semibold">
                {et.descricao}
                {et.etapaapf && (
                  <span className="ml-2 rounded bg-amarelo px-2 py-0.5 text-xs font-medium text-gray-900">
                    Etapa para APF
                  </span>
                )}
              </h2>
              {et.notaminima != null && (
                <span className="text-xs text-white/90">
                  Nota mínima: {Number(et.notaminima).toLocaleString("pt-BR")}
                </span>
              )}
              <details className="text-sm text-gray-900">
                <summary className="cursor-pointer text-white underline">Editar</summary>
                <form action={salvarEtapa} className="mt-1 flex flex-wrap items-end gap-2 rounded bg-white p-2">
                  <input type="hidden" name="idetapa" value={et.idetapa} />
                  {selecionado && <input type="hidden" name="q" value={selecionado.idquestionario} />}
                  <label className="flex flex-col text-sm">
                    <span className="mb-1 text-gray-600">Descrição</span>
                    <input name="descricao" required defaultValue={et.descricao} className={campo} />
                  </label>
                  <label className="flex flex-col text-sm">
                    <span className="mb-1 text-gray-600">Nota mínima</span>
                    <input
                      name="notaminima"
                      inputMode="decimal"
                      defaultValue={et.notaminima ?? ""}
                      placeholder="Opcional"
                      className={`${campo} w-28`}
                    />
                  </label>
                  <label className="flex items-center gap-2 pb-2 text-sm">
                    <input type="checkbox" name="etapaapf" defaultChecked={!!et.etapaapf} />
                    Etapa para APF
                  </label>
                  <button className={btn}>Salvar</button>
                </form>
              </details>
              <div className="rounded bg-white px-2 py-1">
                <Excluir tabela="etapa" id={et.idetapa} q={selecionado?.idquestionario} />
              </div>
            </div>

            {perguntas.filter((x) => x.idetapa === et.idetapa).map((pe) => {
              const opcoes = pontuacoes.filter((x) => x.idpergunta === pe.idpergunta);
              return (
                <details key={pe.idpergunta} open={abrir === String(pe.idpergunta)} className="border-b p-3">
                  <summary className="cursor-pointer text-sm">
                    <span className="font-medium text-azul">{pe.codigo}</span> — {pe.descricao}
                    {pe.descritiva ? (
                      <span className="ml-2 rounded bg-amarelo px-1.5 py-0.5 text-xs text-gray-900">Descritiva</span>
                    ) : (
                      <span className="text-gray-500"> ({opcoes.length} pontuações)</span>
                    )}
                  </summary>

                  <form action={salvarPergunta} className="mt-3 grid gap-2 sm:grid-cols-[6rem_1fr_auto]">
                    <input type="hidden" name="idpergunta" value={pe.idpergunta} />
                    <input type="hidden" name="idetapa" value={pe.idetapa} />
                    {selecionado && <input type="hidden" name="q" value={selecionado.idquestionario} />}
                    <input name="codigo" required defaultValue={pe.codigo} className={campo} />
                    <input name="descricao" required defaultValue={pe.descricao} className={campo} />
                    <button className={btn}>Salvar pergunta</button>
                    <label className="flex items-center gap-2 text-sm sm:col-span-3">
                      <input name="descritiva" type="checkbox" defaultChecked={pe.descritiva} />
                      Resposta descritiva (texto livre, sem pontuação)
                    </label>
                  </form>

                  {pe.descritiva ? (
                    <p className="mt-3 rounded bg-gray-50 p-2 text-sm text-gray-600">
                      Resposta em texto livre: não há pontuações para esta pergunta.
                    </p>
                  ) : (
                    <>
                  <ul className="mt-3 space-y-2">
                    {opcoes.map((o) => (
                      <li key={o.idpontuacao} className="flex flex-wrap items-start gap-2">
                        <form action={salvarPontuacao} className="flex flex-1 flex-wrap gap-2">
                          <input type="hidden" name="idpontuacao" value={o.idpontuacao} />
                          <input type="hidden" name="idpergunta" value={pe.idpergunta} />
                          {selecionado && <input type="hidden" name="q" value={selecionado.idquestionario} />}
                          <input name="descricao" required defaultValue={o.descricao} className={`${campo} min-w-48 flex-1`} />
                          <input name="nota" required defaultValue={String(o.nota)} inputMode="decimal" className={`${campo} w-20`} aria-label="Nota" />
                          <button className={btn}>Salvar</button>
                        </form>
                        <Excluir tabela="pontuacao" id={o.idpontuacao} abrir={pe.idpergunta} q={selecionado?.idquestionario} />
                      </li>
                    ))}
                  </ul>

                  <form action={salvarPontuacao} className="mt-3 flex flex-wrap gap-2 rounded bg-gray-50 p-2">
                    <input type="hidden" name="idpergunta" value={pe.idpergunta} />
                    {selecionado && <input type="hidden" name="q" value={selecionado.idquestionario} />}
                    <input name="descricao" required placeholder="Nova pontuação (texto da resposta)" className={`${campo} min-w-48 flex-1`} />
                    <input name="nota" required placeholder="Nota" inputMode="decimal" className={`${campo} w-20`} />
                    <button className={btn}>Adicionar pontuação</button>
                  </form>

                    </>
                  )}

                  <div className="mt-3">
                    <Excluir tabela="pergunta" id={pe.idpergunta} q={selecionado?.idquestionario} />
                  </div>
                </details>
              );
            })}

            <form action={salvarPergunta} className="grid gap-2 bg-gray-50 p-3 sm:grid-cols-[6rem_1fr_auto]">
              <input type="hidden" name="idetapa" value={et.idetapa} />
              {selecionado && <input type="hidden" name="q" value={selecionado.idquestionario} />}
              <input name="codigo" required placeholder="Código" className={campo} />
              <input name="descricao" required placeholder="Nova pergunta nesta etapa" className={campo} />
              <button className={btn}>Adicionar pergunta</button>
              <label className="flex items-center gap-2 text-sm sm:col-span-3">
                <input name="descritiva" type="checkbox" />
                Resposta descritiva (texto livre, sem pontuação)
              </label>
            </form>
          </section>
        ))}
      </main>
    </Shell>
  );
}
