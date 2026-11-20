"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ITENS_MENU, MENU_GRUPOS } from "@/lib/menu";
import { salvarAcessos } from "@/app/usuarios/[id]/acessos/actions";

type Usuario = { idusuario: number; nome: string; email: string };

export function FormAcessos({
  usuarios,
  idusuario,
  liberados,
  protegidos,
}: {
  usuarios: Usuario[];
  idusuario: number;
  liberados: string[];
  protegidos: string[];
}) {
  const router = useRouter();
  const [selecionado, setSelecionado] = useState(String(idusuario));
  const [pending, startTransition] = useTransition();

  const campo = "w-full rounded border border-gray-300 bg-white p-2 text-sm";

  return (
    <div className="mt-5">
      <label className="block text-sm font-medium text-gray-700">
        Associado
        <select
          value={selecionado}
          disabled={pending}
          onChange={(event) => {
            const valor = event.target.value;
            setSelecionado(valor);
            startTransition(() => router.push(`/usuarios/${valor}/acessos`));
          }}
          className={campo}
        >
          {usuarios.map((usuario) => (
            <option key={usuario.idusuario} value={usuario.idusuario}>
              {usuario.nome} — {usuario.email}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-1 text-xs text-gray-500">
        Troque o associado para ajustar as liberações dele. As alterações só valem depois de salvar.
      </p>

      <form action={salvarAcessos} className="mt-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <input type="hidden" name="idusuario" value={selecionado} />

        {MENU_GRUPOS.map((grupo) => {
          const itens = ITENS_MENU.filter((item) => item.grupo === grupo);
          if (!itens.length) return null;
          return (
            <fieldset key={grupo} className="mt-4 border-t border-gray-100 pt-4 first:mt-0 first:border-0 first:pt-0">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-azul">{grupo}</legend>
              <div className="mt-1 grid gap-1 sm:grid-cols-2">
                {itens.map((item) => {
                  const fixo = protegidos.includes(item.chave);
                  return (
                    <label
                      key={item.chave}
                      className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
                        fixo ? "bg-gray-50 text-gray-500" : "hover:bg-azul/5"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="acessos"
                        value={item.chave}
                        defaultChecked={liberados.includes(item.chave)}
                        disabled={fixo}
                        className="size-4 rounded border-gray-300 accent-azul"
                      />
                      {fixo && <input type="hidden" name="acessos" value={item.chave} />}
                      <span>{item.rotulo}</span>
                      {fixo && <span className="ml-auto text-xs">(mantido)</span>}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}

        <button
          type="submit"
          disabled={pending}
          className="mt-5 rounded bg-azul px-4 py-2 text-sm font-medium text-white hover:bg-azul-escuro disabled:opacity-60"
        >
          Salvar liberações
        </button>
      </form>
    </div>
  );
}
