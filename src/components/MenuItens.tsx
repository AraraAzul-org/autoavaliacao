"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/", rotulo: "Início", pronto: true, restrito: false },
  { href: "/usuarios", rotulo: "Usuários", pronto: true, restrito: true },
  { href: "/ramos", rotulo: "Ramos", pronto: true, restrito: true },
  { href: "/cargos", rotulo: "Cargos", pronto: true, restrito: true },
  { href: "/situacoes", rotulo: "Situações", pronto: true, restrito: true },
  { href: "/avaliacoes", rotulo: "Avaliações", pronto: true, restrito: true },
  { href: "/perguntas", rotulo: "Questionário", pronto: true, restrito: true },
  { href: "/autoavaliacao", rotulo: "Minhas avaliações", pronto: false, restrito: false },
  { href: "/assessorados", rotulo: "Meus assessorados", pronto: false, restrito: false },
];

export function MenuItens({ diretor }: { diretor: boolean }) {
  const caminho = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b bg-gray-50 p-2 md:w-60 md:shrink-0 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:p-3">
      {ITENS.filter((i) => diretor || !i.restrito).map((i) => {
        const ativo = i.href === "/" ? caminho === "/" : caminho.startsWith(i.href);
        const base = "whitespace-nowrap rounded px-3 py-2 text-sm";
        return i.pronto ? (
          <Link
            key={i.href}
            href={i.href}
            className={`${base} ${ativo ? "bg-azul font-medium text-white" : "text-azul hover:bg-azul/10"}`}
          >
            {i.rotulo}
          </Link>
        ) : (
          <span key={i.href} className={`${base} cursor-not-allowed text-gray-400`} title="Em breve">
            {i.rotulo}
          </span>
        );
      })}
    </nav>
  );
}
