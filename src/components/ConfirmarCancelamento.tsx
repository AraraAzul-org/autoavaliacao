"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { cancelarAvaliacao } from "@/app/avaliacoes/actions";

const btnNeutro = "rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50";
const btnPerigo =
  "rounded bg-red-700 px-3 py-1.5 text-sm text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-gray-300";

function Confirmar({ liberado }: { liberado: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || !liberado} className={btnPerigo}>
      {pending ? "Cancelando..." : "Cancelar avaliação"}
    </button>
  );
}

export function ConfirmarCancelamento({
  idavaliacao,
  descricao,
  status,
  participantes,
  respostas,
}: {
  idavaliacao: number;
  descricao: string;
  status: string;
  participantes: number;
  respostas: number;
}) {
  const [aberto, setAberto] = useState(false);
  const [digitado, setDigitado] = useState("");
  const gatilho = useRef<HTMLButtonElement>(null);
  const voltar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    voltar.current?.focus();
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
    setDigitado("");
    gatilho.current?.focus();
  };

  // Com respostas registradas, exige digitar CANCELAR: apagar resposta não tem volta.
  const precisaDigitar = respostas > 0;
  const liberado = !precisaDigitar || digitado.trim().toUpperCase() === "CANCELAR";

  return (
    <>
      <button
        ref={gatilho}
        type="button"
        onClick={() => setAberto(true)}
        className="rounded border border-amber-500 bg-white px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50"
      >
        Cancelar avaliação
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
            aria-labelledby={`cancelar-titulo-${idavaliacao}`}
            className="w-full max-w-md rounded-lg bg-white p-4 text-left shadow-xl"
          >
            <h2 id={`cancelar-titulo-${idavaliacao}`} className="text-base font-semibold text-amber-800">
              Cancelar avaliação
            </h2>
            <p className="mt-2 text-sm text-gray-700">
              <strong>{descricao}</strong>
            </p>
            <p className="mt-2 text-sm text-gray-700">
              Ela volta para <strong>rascunho</strong> e pode ser gerada de novo. O cadastro da avaliação e o
              questionário são mantidos.
            </p>

            <ul className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <li>
                {participantes === 0
                  ? "Nenhuma avaliação individual gerada."
                  : participantes === 1
                    ? "1 avaliação individual será removida."
                    : `${participantes} avaliações individuais serão removidas.`}
              </li>
              <li className="mt-1">
                {respostas === 0
                  ? "Nenhuma resposta registrada até agora."
                  : respostas === 1
                    ? "1 resposta já registrada será apagada."
                    : `${respostas} respostas já registradas serão apagadas.`}
              </li>
              {status === "finalizada" && (
                <li className="mt-1">
                  Esta avaliação está <strong>finalizada</strong> e seria bloqueada fora da fase de desenvolvimento.
                </li>
              )}
            </ul>

            <form action={cancelarAvaliacao} className="mt-4">
              <input type="hidden" name="idavaliacao" value={idavaliacao} />

              {precisaDigitar && (
                <label className="mb-3 block text-sm text-gray-700">
                  <span>
                    Para confirmar, digite <strong>CANCELAR</strong>:
                  </span>
                  <input
                    type="text"
                    value={digitado}
                    onChange={(e) => setDigitado(e.target.value)}
                    autoComplete="off"
                    className="mt-1 w-full rounded border border-gray-300 p-1.5 text-sm"
                  />
                </label>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <button ref={voltar} type="button" onClick={fechar} className={btnNeutro}>
                  Voltar
                </button>
                <Confirmar liberado={liberado} />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
