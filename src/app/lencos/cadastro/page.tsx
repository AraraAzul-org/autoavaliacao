import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";
import { Voltar } from "@/components/Voltar";
import { FormLenco } from "@/components/FormLenco";
import { criarLenco } from "../actions";

export const instant = false;

export default async function CadastrarLenco({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  if (!eu.acessos.has("lencoscadastro")) redirect("/");

  const { erro, ok } = await searchParams;

  return (
    <Shell>
      <main className="max-w-4xl p-4">
        <Voltar href="/lencos" />
        <h1 className="mt-2 text-xl font-semibold text-azul">Cadastrar lenço</h1>
        <p className="mt-1 text-sm text-gray-600">
          Preencha os dados da troca e envie as fotos do lenço e da entrega.
        </p>
        {erro && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
        {ok && <p className="mt-3 rounded bg-green-50 p-2 text-sm text-green-800">{ok}</p>}
        <FormLenco action={criarLenco} botao="Cadastrar lenço" />
      </main>
    </Shell>
  );
}
