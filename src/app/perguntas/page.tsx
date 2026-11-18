import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";
import { Voltar } from "@/components/Voltar";
import { NIVEIS, ROTULO_NIVEL, type Nivel } from "@/lib/niveis";
import { excluir, salvarEtapa, salvarPergunta, salvarPontuacao, salvarQuestionario } from "./actions";

export const instant = false;

const campo = "rounded border border-gray-300 p-1.5 text-sm";
const btn = "rounded bg-azul px-3 py-1.5 text-sm text-white hover:bg-azul-escuro";

const seloNivel = (publico: string) =>
  publico === "apf"
    ? "bg-amarelo text-gray-900"
    : publico === "diretor"
      ? "bg-white text-azul"
      : "bg-white/90 text-gray-800";

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

function TipoResposta({ descritiva = false, nome = "tipo" }: { descritiva?: boolean; nome?: string }) {
  return (
    <fieldset className="sm:col-span-3">
      <legend className="text-sm text-gray-600">Tipo de resposta</legend>
      <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" name={nome} value="pontuada" defaultChecked={!descritiva} />
          Pontuada (nota em cada opção)
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name={nome} value="descritiva" defaultChecked={descritiva} />
          Descritiva (texto livre)
        </label>
      </div>
    </fieldset>
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
  if (!eu.podeCadastros) redirect("/");

  const { ok, erro, abrir, q } = await searchParams;

  const [lista, e, p, n] = await Promise.all([
    supabase.from("questionario").select("idquestionario, descricao, ativo").order("idquestionario"),
    supabase
      .from("etapa")
      .select("idetapa, idquestionario, descricao, notaminima, publico, naopontuada")
      .order("idetapa"),
    supabase.from("pergunta").select("idpergunta, codigo, descricao, idetapa, descritiva, selecao").order("codigo"),
    supabase.from("pontuacao").select("idpontuacao, idpergunta, descricao, nota").order("nota"),
  ]);

  const questionarios = lista.data ?? [];
  const todasEtapas = e.data ?? [];
  const todasPerguntas = p.data ?? [];
  const pontuacoes = n.data ?? [];

  const selecionado = q ? (questionarios.find((x) => String(x.idquestionario) === q) ?? null) : null;
  const etapas = selecionado
    ? todasEtapas.filter((x) => x.idquestionario === selecionado.idquestionario)
    : [];
  const perguntasDoSelecionado = new Set(etapas.map((x) => x.idetapa));
  const perguntas = todasPerguntas.filter((x) => perguntasDoSelecionado.has(x.idetapa));

  const questionarioDaEtapa = new Map(todasEtapas.map((x) => [x.idetapa, x.idquestionario]));
  const etapasPorQuestionario = new Map<number, number>();
  todasEtapas.forEach((x) => {
    etapasPorQuestionario.set(x.idquestionario, (etapasPorQuestionario.get(x.idquestionario) ?? 0) + 1);
  });
  const perguntasPorQuestionario = new Map<number, number>();
  todasPerguntas.forEach((x) => {
    const idq = questionarioDaEtapa.get(x.idetapa);
    if (idq == null) return;
    perguntasPorQuestionario.set(idq, (perguntasPorQuestionario.get(idq) ?? 0) + 1);
  });

  if (!selecionado) {
    return (
      <Shell>
        <main className="max-w-4xl p-4">
          <h1 className="text-xl font-semibold text-azul">Questionário</h1>
          <p className="mt-1 text-sm text-gray-600">
            Escolha um questionário para ver e editar as suas etapas, perguntas e opções de resposta.
          </p>
          {erro && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
          {ok && <p className="mt-3 rounded bg-green-50 p-2 text-sm text-green-800">{ok}</p>}

          <section className="mt-4 overflow-hidden rounded border border-gray-200 bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b-2 border-amarelo bg-azul p-3 text-white">
              <h2 className="flex-1 font-semibold">Questionários cadastrados</h2>
              <span className="rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-800">
                {questionarios.length}
              </span>
            </div>

            {!questionarios.length ? (
              <p className="p-4 text-sm text-gray-600">
                Nenhum questionário cadastrado. Crie o primeiro no formulário abaixo.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {questionarios.map((x) => (
                  <li key={x.idquestionario}>
                    <Link
                      href={`/perguntas?q=${x.idquestionario}`}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm hover:bg-azul/5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-azul">{x.descricao}</p>
                        <p className="mt-0.5 text-xs text-gray-600">
                          {etapasPorQuestionario.get(x.idquestionario) ?? 0}{" "}
                          {(etapasPorQuestionario.get(x.idquestionario) ?? 0) === 1 ? "etapa" : "etapas"} ·{" "}
                          {perguntasPorQuestionario.get(x.idquestionario) ?? 0}{" "}
                          {(perguntasPorQuestionario.get(x.idquestionario) ?? 0) === 1 ? "pergunta" : "perguntas"}
                        </p>
                      </div>
                      {!x.ativo && (
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">Inativo</span>
                      )}
                      <span className="text-azul">Abrir →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <details className="mt-4 rounded border border-gray-200 bg-white p-3 text-sm">
            <summary className="cursor-pointer font-medium text-azul">Novo questionário</summary>
            <form action={salvarQuestionario} className="mt-3 flex flex-wrap gap-2">
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
        </main>
      </Shell>
    );
  }

  return (
    <Shell>
      <main className="max-w-4xl p-4">
        <Voltar href="/perguntas" />
        <h1 className="mt-2 text-xl font-semibold text-azul">Questionário</h1>
        <p className="mt-1 text-sm text-gray-600">
          Cada questionário tem as suas próprias etapas, perguntas e opções de resposta. Assim é possível ter vários
          tipos de avaliação ao mesmo tempo.
        </p>
        {erro && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
        {ok && <p className="mt-3 rounded bg-green-50 p-2 text-sm text-green-800">{ok}</p>}

        <section className="mt-4 overflow-hidden rounded border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center gap-3 border-b-2 border-amarelo bg-azul p-3 text-white">
            <h2 className="flex-1 font-semibold">{selecionado.descricao}</h2>
            {!selecionado.ativo && (
              <span className="rounded bg-white px-2 py-0.5 text-xs text-gray-700">Inativo</span>
            )}
            <details className="text-sm text-gray-900">
              <summary className="cursor-pointer text-white underline">Editar</summary>
              <form action={salvarQuestionario} className="mt-1 flex flex-wrap items-center gap-2 rounded bg-white p-2">
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
                <span className="mb-1 text-gray-600">Nota mínima (etapas de associado)</span>
                <input name="notaminima" inputMode="decimal" placeholder="Opcional" className={`${campo} w-28`} />
              </label>
              <label className="flex flex-col text-sm">
                <span className="mb-1 text-gray-600">Perguntas respondidas por</span>
                <select name="publico" defaultValue="usuario" className={campo}>
                  {NIVEIS.map((n) => (
                    <option key={n.valor} value={n.valor}>
                      {n.rotulo}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 pb-1.5 text-sm">
                <input type="checkbox" name="naopontuada" />
                Não pontuada
              </label>
              <button className={btn}>Adicionar etapa</button>
            </form>
            {!etapas.length && (
              <p className="mt-4 text-sm text-gray-600">Nenhuma etapa cadastrada neste questionário.</p>
            )}
          </div>
        </section>

        {etapas.map((et) => {
          const pontua = et.publico === "usuario" && !et.naopontuada;
          return (
          <section key={et.idetapa} className="mt-6 overflow-hidden rounded border border-gray-200 bg-white">
            <div className="flex flex-wrap items-center gap-3 border-b-2 border-amarelo bg-azul p-3 text-white">
              <h2 className="flex-1 font-semibold">
                {et.descricao}
                <span className={`ml-2 rounded px-2 py-0.5 text-xs font-medium ${seloNivel(et.publico)}`}>
                  {ROTULO_NIVEL[et.publico as Nivel] ?? "Associado"}
                </span>
              </h2>
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  pontua ? "bg-green-100 text-green-800" : "bg-amarelo text-gray-900"
                }`}
                title={
                  et.naopontuada
                    ? "Etapa não pontuada: as respostas são registradas, mas não entram na nota."
                    : pontua
                      ? "As respostas desta etapa entram na nota."
                      : "As respostas desta etapa não entram na nota."
                }
              >
                {et.naopontuada ? "Não pontuada" : pontua ? "Pontua" : "Não pontua"}
              </span>
              {et.notaminima != null && (
                <span className="text-xs text-white/90">
                  Nota mínima: {Number(et.notaminima).toLocaleString("pt-BR")}
                </span>
              )}
              <details className="text-sm text-gray-900">
                <summary className="cursor-pointer text-white underline">Editar</summary>
                <form action={salvarEtapa} className="mt-1 flex flex-wrap items-end gap-2 rounded bg-white p-2">
                  <input type="hidden" name="idetapa" value={et.idetapa} />
                  <input type="hidden" name="q" value={selecionado.idquestionario} />
                  <label className="flex flex-col text-sm">
                    <span className="mb-1 text-gray-600">Descrição</span>
                    <input name="descricao" required defaultValue={et.descricao} className={campo} />
                  </label>
                  <label className="flex flex-col text-sm">
                    <span className="mb-1 text-gray-600">Nota mínima (etapas de associado)</span>
                    <input
                      name="notaminima"
                      inputMode="decimal"
                      defaultValue={et.notaminima ?? ""}
                      placeholder="Opcional"
                      className={`${campo} w-28`}
                    />
                  </label>
                  <label className="flex flex-col text-sm">
                    <span className="mb-1 text-gray-600">Perguntas respondidas por</span>
                    <select name="publico" defaultValue={et.publico} className={campo}>
                      {NIVEIS.map((n) => (
                        <option key={n.valor} value={n.valor}>
                          {n.rotulo}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 pb-1.5 text-sm">
                    <input type="checkbox" name="naopontuada" defaultChecked={et.naopontuada} />
                    Não pontuada
                  </label>
                  <button className={btn}>Salvar</button>
                </form>
              </details>
              <div className="rounded bg-white px-2 py-1">
                <Excluir tabela="etapa" id={et.idetapa} q={selecionado.idquestionario} />
              </div>
            </div>

            {perguntas
              .filter((x) => x.idetapa === et.idetapa)
              .map((pe) => {
                const opcoes = pontuacoes.filter((x) => x.idpergunta === pe.idpergunta);
                const semNota = !pontua;
                return (
                  <details key={pe.idpergunta} open={abrir === String(pe.idpergunta)} className="border-b p-3">
                    <summary className="cursor-pointer text-sm">
                      <span className="font-medium text-azul">{pe.codigo}</span> — {pe.descricao}
                      {pe.descritiva ? (
                        <span className="ml-2 rounded bg-amarelo px-1.5 py-0.5 text-xs text-gray-900">
                          Descritiva
                        </span>
                      ) : pe.selecao ? (
                        <span className="ml-2 rounded bg-azul/10 px-1.5 py-0.5 text-xs text-azul">
                          Seleção (legado)
                        </span>
                      ) : (
                        <span className="text-gray-500">
                          {" "}
                          ({opcoes.length} {semNota ? "opções sem nota" : "pontuações"})
                        </span>
                      )}
                    </summary>

                    <form action={salvarPergunta} className="mt-3 grid gap-2 sm:grid-cols-[6rem_1fr_auto]">
                      <input type="hidden" name="idpergunta" value={pe.idpergunta} />
                      <input type="hidden" name="idetapa" value={pe.idetapa} />
                      <input type="hidden" name="q" value={selecionado.idquestionario} />
                      <input name="codigo" required defaultValue={pe.codigo} className={campo} />
                      <input name="descricao" required defaultValue={pe.descricao} className={campo} />
                      <button className={btn}>Salvar pergunta</button>
                      {pe.selecao ? (
                        <>
                          <input type="hidden" name="tipo" value="selecao" />
                          <p className="text-xs text-gray-500 sm:col-span-3">
                            Tipo de resposta: seleção (tipo antigo, não disponível para novas perguntas).
                          </p>
                        </>
                      ) : (
                        <TipoResposta descritiva={pe.descritiva} />
                      )}
                    </form>

                    {pe.descritiva ? (
                      <p className="mt-3 rounded bg-gray-50 p-2 text-sm text-gray-600">
                        Resposta em texto livre: não há opções de resposta.
                      </p>
                    ) : (
                      <>
                        {pe.selecao ? (
                          <p className="mt-3 rounded bg-azul/5 p-2 text-sm text-gray-600">
                            Pergunta de seleção (tipo antigo): as opções de resposta não têm nota.
                          </p>
                        ) : (
                          semNota && (
                            <p className="mt-3 rounded bg-azul/5 p-2 text-sm text-gray-600">
                              {et.naopontuada
                                ? "Etapa não pontuada: as respostas são registradas, mas as opções não entram na nota."
                                : "Esta etapa não pontua: as opções de resposta não entram na nota."}
                            </p>
                          )
                        )}

                        <ul className="mt-3 space-y-2">
                          {opcoes.map((o) => (
                            <li key={o.idpontuacao} className="flex flex-wrap items-start gap-2">
                              <form action={salvarPontuacao} className="flex flex-1 flex-wrap gap-2">
                                <input type="hidden" name="idpontuacao" value={o.idpontuacao} />
                                <input type="hidden" name="idpergunta" value={pe.idpergunta} />
                                <input type="hidden" name="q" value={selecionado.idquestionario} />
                                <input
                                  name="descricao"
                                  required
                                  defaultValue={o.descricao}
                                  className={`${campo} min-w-48 flex-1`}
                                />
                                {pontua && (
                                  <input
                                    name="nota"
                                    required
                                    defaultValue={o.nota == null ? "" : String(o.nota)}
                                    placeholder="Nota"
                                    inputMode="decimal"
                                    className={`${campo} w-24`}
                                    aria-label="Nota"
                                  />
                                )}
                                <button className={btn}>Salvar</button>
                              </form>
                              <Excluir
                                tabela="pontuacao"
                                id={o.idpontuacao}
                                abrir={pe.idpergunta}
                                q={selecionado.idquestionario}
                              />
                            </li>
                          ))}
                        </ul>

                        <form action={salvarPontuacao} className="mt-3 flex flex-wrap gap-2 rounded bg-gray-50 p-2">
                          <input type="hidden" name="idpergunta" value={pe.idpergunta} />
                          <input type="hidden" name="q" value={selecionado.idquestionario} />
                          <input
                            name="descricao"
                            required
                            placeholder={pontua ? "Nova pontuação (texto da resposta)" : "Nova opção de resposta"}
                            className={`${campo} min-w-48 flex-1`}
                          />
                          {pontua && (
                            <input name="nota" required placeholder="Nota" inputMode="decimal" className={`${campo} w-20`} />
                          )}
                          <button className={btn}>{pontua ? "Adicionar pontuação" : "Adicionar opção"}</button>
                        </form>
                      </>
                    )}

                    <div className="mt-3">
                      <Excluir tabela="pergunta" id={pe.idpergunta} q={selecionado.idquestionario} />
                    </div>
                  </details>
                );
              })}

            <form action={salvarPergunta} className="grid gap-2 bg-gray-50 p-3 sm:grid-cols-[6rem_1fr_auto]">
              <input type="hidden" name="idetapa" value={et.idetapa} />
              <input type="hidden" name="q" value={selecionado.idquestionario} />
              <input name="codigo" required placeholder="Código" className={campo} />
              <input name="descricao" required placeholder="Nova pergunta nesta etapa" className={campo} />
              <button className={btn}>Adicionar pergunta</button>
              <TipoResposta />
            </form>
          </section>
          );
        })}
      </main>
    </Shell>
  );
}
