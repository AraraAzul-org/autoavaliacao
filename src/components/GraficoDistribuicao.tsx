import Link from "next/link";

export type ItemDistribuicao = { rotulo: string; quantidade: number };

export function GraficoDistribuicao({
  itens,
  hrefPorRotulo,
  rotuloSelecionado,
  unidade = "associado",
  unidadePlural = "associados",
}: {
  itens: ItemDistribuicao[];
  hrefPorRotulo?: (rotulo: string) => string;
  rotuloSelecionado?: string;
  unidade?: string;
  unidadePlural?: string;
}) {
  const maximo = Math.max(1, ...itens.map((i) => i.quantidade));

  return (
    <div className="space-y-3">
      {itens.map((i) => {
        const pct = Math.max(2, Math.round((i.quantidade / maximo) * 100));
        const rotuloUnidade = i.quantidade === 1 ? unidade : unidadePlural;
        const selecionado = rotuloSelecionado === i.rotulo;
        const conteudo = (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">{i.rotulo}</span>
              <span className="whitespace-nowrap text-sm text-gray-700">
                {i.quantidade} {rotuloUnidade}
              </span>
            </div>
            <div
              className="mt-1 h-3 overflow-hidden rounded bg-gray-100"
              role="img"
              aria-label={`${i.rotulo}: ${i.quantidade} ${rotuloUnidade}`}
            >
              <div
                className={`h-full rounded ${i.quantidade > 0 ? "bg-azul" : "bg-gray-200"}`}
                style={{ width: i.quantidade > 0 ? `${pct}%` : "0%" }}
              />
            </div>
          </>
        );
        return hrefPorRotulo ? (
          <Link
            key={i.rotulo}
            href={hrefPorRotulo(i.rotulo)}
            className={`block rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/40 ${
              selecionado ? "bg-amarelo-claro ring-1 ring-amarelo" : "hover:bg-gray-50"
            }`}
            aria-current={selecionado ? "true" : undefined}
          >
            {conteudo}
          </Link>
        ) : (
          <div key={i.rotulo}>{conteudo}</div>
        );
      })}
    </div>
  );
}
