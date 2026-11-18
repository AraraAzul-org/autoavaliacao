import { dataBR, type PpfItem } from "@/lib/ppf";

const campo = "mt-1 w-full rounded border border-gray-300 p-1.5 text-sm";

/**
 * Itens gerados no PPF (perguntas abaixo da nota mínima da etapa).
 * No modo de edição os campos vão dentro do formulário da página; no modo de
 * leitura (visão do APF) mostra apenas o que foi registrado.
 */
export function PpfLista({
  grupos,
  editar,
}: {
  grupos: { etapa: string; itens: PpfItem[] }[];
  editar?: boolean;
}) {
  if (!grupos.length) {
    return (
      <p className="mt-6 rounded border border-gray-200 bg-white p-4 text-sm text-gray-600">
        Nenhuma pergunta ficou abaixo da nota mínima nesta avaliação, então não há itens gerados.
      </p>
    );
  }

  return (
    <>
      {grupos.map((grupo) => (
        <section key={grupo.etapa} className="mt-6 overflow-hidden rounded border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b-2 border-amarelo bg-azul p-3 text-white">
            <h2 className="flex-1 text-sm font-semibold">{grupo.etapa}</h2>
            <span className="text-xs text-white/90">
              {editar ? "Aponte a ação e a data prevista" : "Somente leitura"}
            </span>
          </div>

          <div className="p-3">
            {grupo.itens.map((item) => (
              <div key={item.idppfitem} className="border-b border-gray-100 py-3 last:border-0">
                <p className="text-sm font-medium text-gray-900">
                  <span className="text-azul">{item.codigo}</span> — {item.pergunta}
                </p>
                <p className="mt-1 whitespace-pre-wrap rounded bg-gray-50 px-2 py-1 text-sm text-gray-800">
                  {item.resposta ?? "Sem resposta"}
                </p>

                {editar ? (
                  <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
                    <label className="text-xs text-gray-600">
                      Ação que será realizada
                      <textarea
                        name={`acao_${item.idppfitem}`}
                        rows={2}
                        defaultValue={item.acao ?? ""}
                        className={campo}
                      />
                    </label>
                    <label className="text-xs text-gray-600">
                      Data prevista
                      <input
                        type="date"
                        name={`data_${item.idppfitem}`}
                        defaultValue={item.dataprevista?.slice(0, 10) ?? ""}
                        className={campo}
                      />
                    </label>
                  </div>
                ) : (
                  <dl className="mt-2 grid gap-2 text-sm text-gray-700 sm:grid-cols-[minmax(0,1fr)_10rem]">
                    <div>
                      <dt className="text-xs text-gray-500">Ação que será realizada</dt>
                      <dd className="whitespace-pre-wrap">{item.acao || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Data prevista</dt>
                      <dd>{dataBR(item.dataprevista)}</dd>
                    </div>
                  </dl>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
