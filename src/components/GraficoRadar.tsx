"use client";

import { useState } from "react";

export type EixoRadar = { codigo: string; descricao: string };
export type SerieRadar = { id: string; nome: string; cor: string; valores: number[] };

const TAM = 480;
const CX = TAM / 2;
const CY = TAM / 2;
const RAIO = 150;
const RAIO_ROTULO = 179;
const ANEIS = [20, 40, 60, 80, 100];

function pontos(valores: number[]) {
  return valores.map((valor, i) => {
    const angulo = (Math.PI * 2 * i) / valores.length - Math.PI / 2;
    const raio = (Math.max(0, Math.min(100, valor)) / 100) * RAIO;
    return [CX + Math.cos(angulo) * raio, CY + Math.sin(angulo) * raio] as const;
  });
}

const poligono = (lista: readonly (readonly [number, number])[]) =>
  lista.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/**
 * Radar em SVG puro (sem biblioteca): cada eixo é uma etapa da avaliação e
 * cada polígono é um usuário, em % da nota máxima daquela etapa.
 */
export function GraficoRadar({
  eixos,
  series,
  media,
}: {
  eixos: EixoRadar[];
  series: SerieRadar[];
  media: { nome: string; cor: string; valores: number[] };
}) {
  const [ocultos, setOcultos] = useState<Record<string, boolean>>({});
  const visiveis = series.filter((s) => !ocultos[s.id]);
  const total = eixos.length;

  const alternar = (id: string) =>
    setOcultos((atual) => ({ ...atual, [id]: !atual[id] }));

  const todosOcultos = visiveis.length === 0;
  const alternarTodos = () =>
    setOcultos(
      todosOcultos
        ? {}
        : Object.fromEntries(series.map((s) => [s.id, true])),
    );

  if (total < 3) {
    return (
      <p className="text-sm text-gray-600">
        Esta avaliação tem menos de três etapas pontuadas; o gráfico radar precisa de pelo menos três eixos.
      </p>
    );
  }

  const vertices = ANEIS.map((anel) => poligono(pontos(Array(total).fill(anel))));
  const eixosLinhas = eixos.map((_, i) => {
    const angulo = (Math.PI * 2 * i) / total - Math.PI / 2;
    return { x: CX + Math.cos(angulo) * RAIO, y: CY + Math.sin(angulo) * RAIO };
  });

  return (
    <div>
      <div className="mx-auto w-full max-w-[520px]">
        <svg
          viewBox={`0 0 ${TAM} ${TAM}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Radar com ${total} etapas, ${series.length} associados e a média da avaliação`}
        >
          {vertices.map((pontosAnel, i) => (
            <polygon
              key={ANEIS[i]}
              points={pontosAnel}
              fill={i === vertices.length - 1 ? "#f9fafb" : "none"}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          ))}

          {eixosLinhas.map(({ x, y }, i) => (
            <line key={eixos[i].codigo} x1={CX} y1={CY} x2={x} y2={y} stroke="#e5e7eb" strokeWidth={1} />
          ))}

          {eixos.map((eixo, i) => {
            const angulo = (Math.PI * 2 * i) / total - Math.PI / 2;
            const x = CX + Math.cos(angulo) * RAIO_ROTULO;
            const y = CY + Math.sin(angulo) * RAIO_ROTULO;
            const cos = Math.cos(angulo);
            const ancora = cos > 0.25 ? "start" : cos < -0.25 ? "end" : "middle";
            return (
              <text
                key={eixo.codigo}
                x={x}
                y={y}
                textAnchor={ancora}
                dominantBaseline="middle"
                fontSize={13}
                fontWeight={600}
                fill="#374151"
              >
                {eixo.codigo}
              </text>
            );
          })}

          {[25, 50, 75, 100].map((valor) => (
            <text key={valor} x={CX + 5} y={CY - (valor / 100) * RAIO + 3} fontSize={10} fill="#9ca3af">
              {valor}%
            </text>
          ))}

          {visiveis.map((serie) => (
            <polygon
              key={serie.id}
              points={poligono(pontos(serie.valores))}
              fill={serie.cor}
              fillOpacity={0.08}
              stroke={serie.cor}
              strokeWidth={2}
              strokeLinejoin="round"
            >
              <title>{serie.nome}</title>
            </polygon>
          ))}

          <polygon
            points={poligono(pontos(media.valores))}
            fill={media.cor}
            fillOpacity={0.14}
            stroke={media.cor}
            strokeWidth={3}
            strokeLinejoin="round"
          >
            <title>{media.nome}</title>
          </polygon>
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-500">
          Percentual da nota máxima de cada etapa. Clique no nome para mostrar ou ocultar.
        </p>
        {!!series.length && (
          <button
            type="button"
            onClick={alternarTodos}
            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
          >
            {todosOcultos ? "Mostrar todos" : "Ocultar todos"}
          </button>
        )}
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
        {series.map((serie) => {
          const oculto = !!ocultos[serie.id];
          return (
            <li key={serie.id}>
              <button
                type="button"
                onClick={() => alternar(serie.id)}
                aria-pressed={!oculto}
                className={`flex items-center gap-1.5 rounded px-1 py-0.5 text-sm transition-opacity hover:bg-gray-100 ${
                  oculto ? "opacity-40" : ""
                }`}
              >
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: serie.cor }}
                />
                <span className={oculto ? "text-gray-500 line-through" : "text-gray-800"}>{serie.nome}</span>
              </button>
            </li>
          );
        })}
        <li className="flex items-center gap-1.5 px-1 py-0.5 text-sm">
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-gray-900" />
          <span className="font-semibold text-gray-900">{media.nome}</span>
        </li>
      </ul>
    </div>
  );
}
