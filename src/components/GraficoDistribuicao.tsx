export type ItemDistribuicao = { rotulo: string; quantidade: number };

export function GraficoDistribuicao({ itens }: { itens: ItemDistribuicao[] }) {
  const maximo = Math.max(1, ...itens.map((i) => i.quantidade));

  return (
    <div className="space-y-3">
      {itens.map((i) => {
        const pct = Math.max(2, Math.round((i.quantidade / maximo) * 100));
        return (
          <div key={i.rotulo}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">{i.rotulo}</span>
              <span className="whitespace-nowrap text-sm text-gray-700">
                {i.quantidade} {i.quantidade === 1 ? "usuário" : "usuários"}
              </span>
            </div>
            <div
              className="mt-1 h-3 overflow-hidden rounded bg-gray-100"
              role="img"
              aria-label={`${i.rotulo}: ${i.quantidade} ${i.quantidade === 1 ? "usuário" : "usuários"}`}
            >
              <div
                className={`h-full rounded ${i.quantidade > 0 ? "bg-azul" : "bg-gray-200"}`}
                style={{ width: i.quantidade > 0 ? `${pct}%` : "0%" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
