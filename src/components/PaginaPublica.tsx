import Image from "next/image";
import Link from "next/link";

export function PaginaPublica({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b-4 border-amarelo bg-azul text-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 p-3">
          <Image src="/logo.png" alt="Grupo Escoteiro Arara Azul" width={46} height={53} />
          <span className="flex-1 font-semibold">Autoavaliação de Adultos · Arara Azul</span>
          <Link href="/login" className="text-sm underline">Entrar</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-6 text-sm leading-relaxed">
        <h1 className="text-2xl font-semibold text-azul">{titulo}</h1>
        <p className="mt-1 text-gray-500">Última atualização: 9 de novembro de 2026</p>
        <div className="mt-4 space-y-4 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-azul [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
        <nav className="mt-8 flex gap-4 border-t pt-4 text-azul underline">
          <Link href="/privacidade">Política de Privacidade</Link>
          <Link href="/termos">Termos de Uso</Link>
        </nav>
      </main>
    </div>
  );
}
