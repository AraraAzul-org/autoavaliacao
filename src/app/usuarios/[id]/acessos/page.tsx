import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";
import { Voltar } from "@/components/Voltar";
import { FormAcessos } from "@/components/FormAcessos";

export const instant = false;

export default async function AcessosUsuario({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { id: idTexto } = await params;
  const id = Number(idTexto);
  if (!Number.isInteger(id)) notFound();

  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  if (!eu.acessos.has("usuarios")) redirect("/");

  const [alvo, usuarios, acessos] = await Promise.all([
    supabase.from("usuario").select("idusuario, nome, email").eq("idusuario", id).maybeSingle(),
    supabase.from("usuario").select("idusuario, nome, email").order("nome"),
    supabase.from("usuario_menu").select("chave").eq("idusuario", id).eq("liberado", true),
  ]);
  if (!alvo.data) notFound();

  const liberados = (acessos.data ?? []).map((item) => String(item.chave));
  const protegidos =
    id === eu.idusuario ? ["usuarios", "acessolog"].filter((chave) => eu.acessos.has(chave)) : [];
  const { erro, ok } = await searchParams;

  return (
    <Shell>
      <main className="max-w-4xl p-4">
        <Voltar href={`/usuarios/${id}`} />
        <h1 className="mt-2 text-xl font-semibold text-azul">Liberação de menus</h1>
        <p className="mt-1 text-sm text-gray-600">
          Marque os menus que <strong>{alvo.data.nome}</strong> pode acessar. O menu e as rotas do sistema
          seguem exatamente estas liberações.
        </p>
        {erro && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
        {ok && <p className="mt-3 rounded bg-green-50 p-2 text-sm text-green-800">{ok}</p>}

        <FormAcessos
          key={id}
          usuarios={(usuarios.data ?? []).map((usuario) => ({
            idusuario: Number(usuario.idusuario),
            nome: String(usuario.nome),
            email: String(usuario.email),
          }))}
          idusuario={id}
          liberados={liberados}
          protegidos={protegidos}
        />
      </main>
    </Shell>
  );
}
