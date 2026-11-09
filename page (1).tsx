import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Cabecalho } from "@/components/Cabecalho";
import { trocarSenha } from "./actions";

export const instant = false;

export default async function TrocarSenha({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  const meta = (data.claims as Record<string, unknown>).app_metadata as { trocar_senha?: boolean } | undefined;
  const obrigatoria = meta?.trocar_senha === true;
  const { erro } = await searchParams;
  const campo = "w-full rounded border border-gray-300 p-2 text-sm";

  return (
    <>
      <Cabecalho />
      <main className="mx-auto max-w-sm p-6">
        <h1 className="text-xl font-semibold text-azul">{obrigatoria ? "Crie a sua senha" : "Alterar minha senha"}</h1>
        {obrigatoria && (
          <p className="mt-1 text-sm text-gray-600">
            Você entrou com uma senha temporária. Defina uma senha só sua para continuar.
          </p>
        )}
        {erro && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
        <form action={trocarSenha} className="mt-4 flex flex-col gap-3">
          <label className="text-sm">Nova senha (mínimo 8 caracteres)
            <input name="nova" type="password" required minLength={8} autoComplete="new-password" className={campo} />
          </label>
          <label className="text-sm">Repita a nova senha
            <input name="confirmar" type="password" required minLength={8} autoComplete="new-password" className={campo} />
          </label>
          <button className="rounded bg-azul p-2 text-white hover:bg-azul-escuro">Salvar senha</button>
        </form>
      </main>
    </>
  );
}
