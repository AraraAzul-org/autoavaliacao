"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; rotulo: string };

// Área de cadastros: só a diretoria vê.
const CADASTROS: Item[] = [
  { href: "/usuarios", rotulo: "Usuários" },
  { href: "/ramos", rotulo: "Ramos" },
  { href: "/funcoes", rotulo: "Funções" },
  { href: "/situacoes", rotulo: "Situações" },
  { href: "/avaliacoes", rotulo: "Avaliações" },
  { href: "/perguntas", rotulo: "Questionários" },
];

export function MenuItens({
  diretor,
  parecer,
  resultados,
}: {
  diretor: boolean;
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

  return (
    <nav className="flex gap-1 overflow-x-auto border-b bg-gray-50 p-2 md:w-60 md:shrink-0 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:p-3">
      {ligacao({ href: "/", rotulo: "Início" })}

      {diretor && (
        <div className="flex items-center gap-1 md:mt-2 md:flex-col md:items-stretch md:gap-0.5">
          <span className="whitespace-nowrap px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 md:px-3 md:pb-0.5 md:pt-1">
            Cadastros
          </span>
          {CADASTROS.map((item) => ligacao(item, "md:pl-5"))}
        </div>
      )}

      {diretor && ligacao({ href: "/promessas", rotulo: "Promessas" })}
      {resultados && ligacao({ href: "/resultados", rotulo: "Resultados" })}
      {ligacao({ href: "/minhas-avaliacoes", rotulo: "Minhas avaliações" })}
      {ligacao({ href: "/meus-assessorados", rotulo: "Meus assessorados" })}
      {parecer && ligacao({ href: "/parecer", rotulo: "Parecer" })}
    </nav>
  );
}
