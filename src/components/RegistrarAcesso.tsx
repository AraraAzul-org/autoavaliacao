"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { registrarAcesso } from "@/app/acessolog/actions";
import { rotuloAcesso } from "@/lib/acessolog";

/** Registra uma entrada por consulta (mudança de página), sem duplicar no StrictMode. */
export function RegistrarAcesso() {
  const caminho = usePathname();
  const ultimo = useRef<string | null>(null);

  useEffect(() => {
    if (!caminho || ultimo.current === caminho) return;
    ultimo.current = caminho;
    void registrarAcesso(rotuloAcesso(caminho)).catch(() => {
      // Log é auditoria: uma falha não pode quebrar a consulta do usuário.
    });
  }, [caminho]);

  return null;
}
