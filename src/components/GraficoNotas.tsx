import { formatarNota } from "@/lib/notas";

export type LinhaGrafico = {
  idusuario: number;
  nome: string;
  ramo: string;
  total: number;
  maximo: number;
};

export function GraficoNotas({ linhas }: { linhas: LinhaGrafico[] }) {
  const maximo = linhas[0]?.maximo ?? 0;

  return (
    <div>
      <p className="text-xs text-gray-500">Escala de 0 a {formatarNota(maximo)}</p>

      <div className="mt-3 space-y-4">
        {linhas.map((l) => {
          const pct = maximo > 0 ? Math.max(2, Math.round((l.total / maximo) * 100)) : 0;
          return (
            <div key={l.idusuario}>
              <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium text-gray-900">{l.nome}</span>
                {l.ramo && <span className="text-xs text-gray-500">{l.ramo}</span>}
                <span className="whitespace-nowrap text-xs text-gray-600">
                  {formatarNota(l.total)} de {formatarNota(maximo)}
                </span>
              </div>
              <div
                className="mt-1 h-3 overflow-hidden rounded bg-gray-100"
                role="img"
                aria-label={`${l.nome}: ${formatarNota(l.total)} de ${formatarNota(maximo)}`}
              >
                <div className="h-full rounded bg-azul" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
