"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { excluirAvaliacao } from "@/app/avaliacoes/actions";

const btnNeutro = "rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50";
const btnPerigo =
  "rounded bg-red-700 px-3 py-1.5 text-sm text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-gray-300";

function Confirmar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPerigo}>
      {pending ? "Excluindo..." : "Excluir definitivamente"}
    </button>
  );
}

export function ConfirmarExclusao({
  idavaliacao,
  descricao,
  participantes,
}: {
  idavaliacao: number;
  descricao: string;
  participantes: number;
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

  return (
    <>
      <button
        ref={gatilho}
        type="button"
        onClick={() => setAberto(true)}
        className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
      >
        Excluir
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
            aria-labelledby={`excluir-titulo-${idavaliacao}`}
            className="w-full max-w-md rounded-lg bg-white p-4 text-left shadow-xl"
          >
            <h2 id={`excluir-titulo-${idavaliacao}`} className="text-base font-semibold text-red-700">
              Excluir avaliação
            </h2>
            <p className="mt-2 text-sm text-gray-700">
              <strong>{descricao}</strong>
            </p>
            <p className="mt-2 text-sm text-gray-700">
              Esta ação apaga a avaliação e tudo que está ligado a ela. Não é possível desfazer.
            </p>

            <ul className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <li>
                {participantes === 0
                  ? "Nenhuma avaliação individual gerada."
                  : participantes === 1
                    ? "1 avaliação individual será apagada."
                    : `${participantes} avaliações individuais serão apagadas.`}
              </li>
              <li className="mt-1">Nenhuma resposta registrada: a exclusão está liberada.</li>
            </ul>

            <form action={excluirAvaliacao} className="mt-4 flex flex-wrap justify-end gap-2">
              <input type="hidden" name="idavaliacao" value={idavaliacao} />
              <button ref={cancelar} type="button" onClick={fechar} className={btnNeutro}>
                Cancelar
              </button>
              <Confirmar />
            </form>
          </div>
        </div>
      )}
    </>
  );
}
