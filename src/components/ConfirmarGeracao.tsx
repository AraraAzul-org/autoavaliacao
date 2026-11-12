"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { gerarAvaliacao } from "@/app/avaliacoes/actions";

const btn = "rounded bg-azul px-3 py-1.5 text-sm text-white hover:bg-azul-escuro disabled:cursor-not-allowed disabled:bg-gray-300";
const btnNeutro = "rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50";

function Confirmar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btn}>
      {pending ? "Gerando..." : "Confirmar geração"}
    </button>
  );
}

export function ConfirmarGeracao({
  idavaliacao,
  rascunho,
  semPerguntas,
}: {
  idavaliacao: number;
  rascunho: boolean;
  semPerguntas: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const gatilho = useRef<HTMLButtonElement>(null);
  const cancelar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    cancelar.current?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("keydown", aoTeclar);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = "";
    };
  }, [aberto]);

  const fechar = () => {
    setAberto(false);
    gatilho.current?.focus();
  };

  if (semPerguntas && rascunho) {
    return (
      <div className="ml-auto text-right">
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded border border-gray-300 px-2 py-1 text-xs text-gray-400"
        >
          Gerar avaliações
        </button>
        <p className="mt-1 max-w-72 text-xs text-red-700">
          O questionário escolhido não tem perguntas. Cadastre as perguntas em Questionário antes de gerar.
        </p>
      </div>
    );
  }

  const titulo = rascunho ? "Gerar avaliações" : "Incluir novos adultos";

  return (
    <div className="ml-auto">
      <button
        ref={gatilho}
        type="button"
        onClick={() => setAberto(true)}
        className="rounded border border-azul px-2 py-1 text-xs font-medium text-azul hover:bg-azul/10"
      >
        {titulo}
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) fechar();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`gerar-titulo-${idavaliacao}`}
            className="w-full max-w-md rounded-lg bg-white p-4 text-left shadow-xl"
          >
            <h2 id={`gerar-titulo-${idavaliacao}`} className="text-base font-semibold text-azul">
              {titulo}
            </h2>
            <p className="mt-2 text-sm text-gray-700">
              {rascunho
                ? "A avaliação fica aberta e cada adulto ativo do grupo recebe a sua. As perguntas vêm do questionário escolhido."
                : "Inclui somente quem ainda não tem avaliação nesta pesquisa."}
            </p>
            <form action={gerarAvaliacao} className="mt-4 flex flex-wrap justify-end gap-2">
              <input type="hidden" name="idavaliacao" value={idavaliacao} />
              <button ref={cancelar} type="button" onClick={fechar} className={btnNeutro}>
                Cancelar
              </button>
              <Confirmar />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
