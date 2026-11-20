"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; rotulo: string };

// Jovens fica fora deste grupo: todos os associados do grupo têm acesso.
// Os demais cadastros continuam restritos a quem tem acessocadastros ou cargo de diretor.
const CADASTROS: Item[] = [
  { href: "/usuarios", rotulo: "Associados" },
  { href: "/ramos", rotulo: "Ramos" },
  { href: "/funcoes", rotulo: "Funções" },
  { href: "/situacoes", rotulo: "Situações" },
  { href: "/avaliacoes", rotulo: "Avaliações" },
  { href: "/perguntas", rotulo: "Questionários" },
];

const MEUS_ASSESSORADOS: Item = { href: "/meus-assessorados", rotulo: "Meus assessorados" };

export function MenuItens({
  membrogrupo,
  cadastros,
  parecer,
  resultados,
}: {
  membrogrupo: boolean;
  cadastros: boolean;
  parecer: boolean;
  resultados: boolean;
}) {
  const caminho = usePathname();
  const base = "whitespace-nowrap rounded px-3 py-2 text-sm";

  const ligacao = (item: Item, extra = "") => {
    const ativo = item.href === "/" ? caminho === "/" : caminho.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`${base} ${extra} ${ativo ? "bg-azul font-medium text-white" : "text-azul hover:bg-azul/10"}`}
      >
        {item.rotulo}
      </Link>
    );
  };

  // O grupo nasce fechado. Se a pessoa estiver dentro de um cadastro, ele abre
  // sozinho para mostrar onde ela está; clicar no título abre e fecha.
  const dentroDeCadastros = CADASTROS.some(
    (i) => caminho === i.href || caminho.startsWith(`${i.href}/`),
  );
  const [escolha, setEscolha] = useState<boolean | null>(null);
  const aberto = escolha ?? dentroDeCadastros;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b bg-gray-50 p-2 md:w-60 md:shrink-0 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:p-3">
      {!membrogrupo ? (
        // Quem não pertence ao grupo enxerga apenas Meus assessorados.
        ligacao(MEUS_ASSESSORADOS)
      ) : (
        <>
          {ligacao({ href: "/", rotulo: "Início" })}
          {ligacao({ href: "/jovens", rotulo: "Jovens" })}

          {cadastros && (
            <div className="flex items-center gap-1 md:mt-2 md:flex-col md:items-stretch md:gap-0.5">
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
                  {CADASTROS.map((item) => ligacao(item, "md:pl-5"))}
                </div>
              )}
            </div>
          )}

          {ligacao({ href: "/promessas", rotulo: "Promessas" })}
          {resultados && ligacao({ href: "/resultados", rotulo: "Resultados" })}
          {ligacao({ href: "/minhas-avaliacoes", rotulo: "Minhas avaliações" })}
          {ligacao({ href: "/meu-ppf", rotulo: "Meu PPF" })}
          {ligacao(MEUS_ASSESSORADOS)}
          {parecer && ligacao({ href: "/parecer", rotulo: "Parecer" })}
        </>
      )}
    </nav>
  );
}
