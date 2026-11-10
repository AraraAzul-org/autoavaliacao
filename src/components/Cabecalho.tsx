import Image from "next/image";
import Link from "next/link";

export function Cabecalho() {
  return (
    <header className="border-b-4 border-amarelo bg-azul text-white">
      <div className="flex items-center gap-3 p-3">
        <Image src="/logo.png" alt="Grupo Escoteiro Arara Azul" width={46} height={53} priority />
        <span className="flex-1 font-semibold">Autoavaliação de Adultos</span>
        <Link href="/trocar-senha" className="text-sm underline">Minha senha</Link>
        <form action="/auth/signout" method="post">
          <button className="text-sm underline">Sair</button>
        </form>
      </div>
    </header>
  );
}
