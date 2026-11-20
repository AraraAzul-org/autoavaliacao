"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ITENS_MENU, MENU_GRUPOS, type ItemMenu } from "@/lib/menu";

export function MenuItens({ acessos }: { acessos: string[] }) {
  const caminho = usePathname();
  const base = "whitespace-nowrap rounded px-3 py-2 text-sm";
  const liberados = ITENS_MENU.filter((item) => acessos.includes(item.chave));

  const ligacao = (item: ItemMenu, extra = "") => {
    const ativo = item.href === "/" ? caminho === "/" : caminho.startsWith(item.href);
    return (
      <Link
        key={item.chave}
        href={item.href}
        className={`${base} ${extra} ${ativo ? "bg-azul font-medium text-white" : "text-azul hover:bg-azul/10"}`}
      >
        {item.rotulo}
      </Link>
    );
  };

  const cadastros = liberados.filter((item) => item.grupo === "Cadastros");
  // O grupo nasce fechado. Se a pessoa estiver dentro de um cadastro, ele abre
  // sozinho para mostrar onde ela está; clicar no título abre e fecha.
  const dentroDeCadastros = cadastros.some(
    (item) => caminho === item.href || caminho.startsWith(`${item.href}/`),
  );
  const [escolha, setEscolha] = useState<boolean | null>(null);
  const aberto = escolha ?? dentroDeCadastros;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b bg-gray-50 p-2 md:w-60 md:shrink-0 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:p-3">
      {MENU_GRUPOS.map((grupo) => {
        const itens = liberados.filter((item) => item.grupo === grupo);
        if (!itens.length) return null;

        if (grupo === "Cadastros") {
          return (
            <div key={grupo} className="flex items-center gap-1 md:mt-2 md:flex-col md:items-stretch md:gap-0.5">
              <button
                type="button"
                onClick={() => setEscolha(!aberto)}
                aria-expanded={aberto}
                aria-controls="menu-cadastros"
                className={`${base} flex shrink-0 items-center gap-1.5 ${
                  dentroDeCadastros ? "font-medium text-azul" : "text-azul"
                } hover:bg-azul/10`}
              >
                <span
                  aria-hidden="true"
                  className={`text-[10px] transition-transform ${aberto ? "rotate-90" : ""}`}
                >
                  ▶
                </span>
                Cadastros
              </button>
              {aberto && (
                <div id="menu-cadastros" className="flex gap-1 md:flex-col md:gap-0.5">
                  {cadastros.map((item) => ligacao(item, "md:pl-5"))}
                </div>
              )}
            </div>
          );
        }

        return (
          <div key={grupo} className="flex gap-1 md:mt-2 md:flex-col md:gap-0.5">
            {itens.map((item) => ligacao(item))}
          </div>
        );
      })}
      {!liberados.length && (
        <span className="px-3 py-2 text-sm text-gray-500">Nenhum menu liberado.</span>
      )}
    </nav>
  );
}
