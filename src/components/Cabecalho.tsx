import Image from "next/image";
import Link from "next/link";

export function Cabecalho({ diretor }: { diretor: boolean }) {
  return (
    <header className="border-b-4 border-amarelo bg-azul text-white">
      <div className="mx-auto flex max-w-4xl items-center gap-3 p-3">
        <Image src="/logo.png" alt="Grupo Escoteiro Arara Azul" width={40} height={46} priority />
        <span className="flex-1 font-semibold">Autoavaliação de Adultos</span>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:underline">Início</Link>
          {diretor && <Link href="/usuarios" className="hover:underline">Usuários</Link>}
          <form action="/auth/signout" method="post">
            <button className="underline">Sair</button>
          </form>
        </nav>
      </div>
    </header>
  );
}
