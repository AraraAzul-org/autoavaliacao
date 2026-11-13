type Opcao = { idpontuacao: number; descricao: string };
type Pergunta = {
  idpergunta: number;
  codigo: string;
  descricao: string;
  descritiva: boolean;
  opcoes: Opcao[];
};
type Etapa = { idetapa: number; descricao: string; perguntas: Pergunta[] };

export function SecaoRespostas({
  etapas,
  respostas,
  titulo,
  nota,
}: {
  etapas: Etapa[];
  respostas: Record<number, string>;
  titulo: string;
  nota?: string;
}) {
  if (!etapas.length) return null;

  return (
    <section className="mt-6 overflow-hidden rounded border border-gray-200 bg-white">
      <div className="border-b-2 border-amarelo bg-gray-100 p-3">
        <h2 className="text-sm font-semibold text-gray-900">{titulo}</h2>
        {nota && <p className="mt-0.5 text-xs text-gray-600">{nota}</p>}
      </div>

      <div className="p-3">
        {etapas.map((et) => (
          <div key={et.idetapa} className="border-b border-gray-100 py-3 last:border-0">
            <h3 className="mb-2 text-sm font-semibold text-azul">{et.descricao}</h3>
            {et.perguntas.map((p) => {
              const valor = respostas[p.idpergunta] ?? "";
              const opcao = p.opcoes.find((o) => String(o.idpontuacao) === valor);
              return (
                <div key={p.idpergunta} className="py-2">
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
        ))}
      </div>
    </section>
  );
}
