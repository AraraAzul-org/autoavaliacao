import Link from "next/link";

export default function SemAcesso() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 p-6">
      <h1 className="text-xl font-semibold text-azul">Nenhum menu liberado</h1>
      <p className="text-sm text-gray-600">
        Seu cadastro ainda não tem liberações de menu. Fale com a diretoria do grupo.
      </p>
      <Link href="/auth/signout" className="mt-2 text-sm text-azul underline">
        Sair da conta
      </Link>
    </main>
  );
}
