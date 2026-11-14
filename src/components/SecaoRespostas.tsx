import { ROTULO_NIVEL, type Nivel } from "@/lib/niveis";

type Opcao = { idpontuacao: number; descricao: string };
type Pergunta = {
  idpergunta: number;
  codigo: string;
  descricao: string;
  descritiva: boolean;
  opcoes: Opcao[];
};
type Etapa = { idetapa: number; descricao: string; perguntas: Pergunta[] };

const seloNivel = (publico: Nivel) =>
  publico === "apf"
    ? "bg-amarelo text-gray-900"
    : publico === "diretor"
      ? "bg-white text-azul"
      : "bg-white/90 text-gray-800";

export function SecaoRespostas({
  etapas,
  respostas,
  publico,
}: {
  etapas: Etapa[];
  respostas: Record<number, string>;
  publico: Nivel;
}) {
  if (!etapas.length) return null;

  return (
    <>
      {etapas.map((et) => (
        <section key={et.idetapa} className="mt-6 overflow-hidden rounded border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b-2 border-amarelo bg-azul p-3 text-white">
            <h2 className="flex-1 text-sm font-semibold">{et.descricao}</h2>
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${seloNivel(publico)}`}>
              {ROTULO_NIVEL[publico]}
            </span>
            <span className="text-xs text-white/90">Somente leitura</span>
          </div>

          <div className="p-3">
            {et.perguntas.map((p) => {
              const valor = respostas[p.idpergunta] ?? "";
              const opcao = p.opcoes.find((o) => String(o.idpontuacao) === valor);
              return (
                <div key={p.idpergunta} className="border-b border-gray-100 py-3 last:border-0">
                  <p className="text-sm font-medium text-gray-900">
                    <span className="text-azul">{p.codigo}</span> — {p.descricao}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap rounded bg-gray-50 px-2 py-1 text-sm text-gray-800">
                    {valor === "" ? (
                      <em className="text-gray-500">Sem resposta</em>
                    ) : p.descritiva ? (
                      valor
                    ) : (
                      (opcao?.descricao ?? valor)
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
