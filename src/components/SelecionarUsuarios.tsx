"use client";

import { useMemo, useState } from "react";
import { gerarSelecionados } from "@/app/avaliacoes/actions";

export type UsuarioSelecao = {
  idusuario: number;
  nome: string;
  ramo: string;
  cargo: string;
  membrogrupo: boolean;
  incluido: boolean;
};

const btn =
  "rounded bg-azul px-3 py-1.5 text-sm font-medium text-white hover:bg-azul-escuro disabled:cursor-not-allowed disabled:bg-gray-300";
const btnNeutro =
  "rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400";

export function SelecionarUsuarios({
  idavaliacao,
  rascunho,
  usuarios,
}: {
  idavaliacao: number;
  rascunho: boolean;
  usuarios: UsuarioSelecao[];
}) {
  const [marcados, setMarcados] = useState<Set<number>>(new Set());
  const [filtro, setFiltro] = useState("");

  const lista = useMemo(() => {
    const termo = filtro.trim().toLowerCase();
    if (!termo) return usuarios;
    return usuarios.filter(
      (u) =>
        u.nome.toLowerCase().includes(termo) ||
        u.ramo.toLowerCase().includes(termo) ||
        u.cargo.toLowerCase().includes(termo),
    );
  }, [usuarios, filtro]);

  const disponiveis = usuarios.filter((u) => !u.incluido);
  const todosMarcados = disponiveis.length > 0 && disponiveis.every((u) => marcados.has(u.idusuario));

  const alternar = (id: number) => {
    setMarcados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  };

  const alternarTodos = () => {
    setMarcados(todosMarcados ? new Set() : new Set(disponiveis.map((u) => u.idusuario)));
  };

  const total = marcados.size;

  return (
    <form action={gerarSelecionados} className="mt-4">
      <input type="hidden" name="idavaliacao" value={idavaliacao} />
      <input type="hidden" name="rascunho" value={rascunho ? "1" : "0"} />

      <div className="flex flex-wrap items-center gap-3 rounded-t-lg border border-gray-200 border-b-0 bg-gray-50/70 px-4 py-3">
        <label className="flex min-w-52 flex-1 items-center gap-2 text-sm text-gray-700">
          <span className="sr-only">Filtrar por nome, ramo ou função</span>
          <input
            type="search"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar por nome, ramo ou função"
            className="w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-azul focus:outline-none focus:ring-2 focus:ring-azul/20"
          />
        </label>
        <button type="button" onClick={alternarTodos} className={btnNeutro} disabled={!disponiveis.length}>
          {todosMarcados ? "Desmarcar todos" : "Selecionar todos"}
        </button>
        <span className="rounded bg-white px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
          {total} {total === 1 ? "selecionado" : "selecionados"}
        </span>
      </div>

      <div className="overflow-x-auto border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <th className="w-10 px-3 py-2 font-medium">
                <input
                  type="checkbox"
                  checked={todosMarcados}
                  onChange={alternarTodos}
                  disabled={!disponiveis.length}
                  aria-label="Selecionar todos os adultos que ainda não têm avaliação"
                />
              </th>
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-3 py-2 font-medium">Ramo</th>
              <th className="px-3 py-2 font-medium">Função</th>
              <th className="px-3 py-2 font-medium">Grupo</th>
              <th className="px-3 py-2 font-medium">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!lista.length ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500">
                  Nenhum adulto encontrado com esse filtro.
                </td>
              </tr>
            ) : (
              lista.map((u) => (
                <tr
                  key={u.idusuario}
                  className={u.incluido ? "bg-gray-50/60 text-gray-500" : "hover:bg-azul/5"}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      name="usuarios"
                      value={u.idusuario}
                      checked={u.incluido || marcados.has(u.idusuario)}
                      disabled={u.incluido}
                      onChange={() => alternar(u.idusuario)}
                      aria-label={`Incluir ${u.nome}`}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">{u.nome}</td>
                  <td className="whitespace-nowrap px-3 py-2">{u.ramo}</td>
                  <td className="whitespace-nowrap px-3 py-2">{u.cargo}</td>
                  <td className="whitespace-nowrap px-3 py-2">{u.membrogrupo ? "Sim" : "Não"}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {u.incluido ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Já incluída
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 rounded-b-lg border border-gray-200 border-t-0 bg-gray-50/70 px-4 py-3">
        <p className="mr-auto text-xs text-gray-600">
          Quem já tem avaliação aparece desmarcado para não duplicar. Você pode voltar a esta tela depois para incluir
          mais gente.
        </p>
        <button type="submit" className={btn} disabled={total === 0}>
          {total === 0
            ? "Selecione os adultos"
            : total === 1
              ? "Gerar avaliação para 1 adulto"
              : `Gerar avaliação para ${total} adultos`}
        </button>
      </div>
    </form>
  );
}
