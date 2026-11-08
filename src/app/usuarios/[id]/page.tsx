import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";
import { FormUsuario } from "@/components/FormUsuario";
import { atualizarUsuario } from "../actions";

export const instant = false;

export default async function EditarUsuario({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id: idTexto } = await params;
  const id = Number(idTexto);
  if (!Number.isInteger(id)) notFound();

  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  if (!eu.diretor) redirect("/");

  const [alvo, u, r, c, s] = await Promise.all([
    supabase.from("usuario").select("*").eq("idusuario", id).maybeSingle(),
    supabase.from("usuario").select("idusuario, nome").neq("idusuario", id).order("nome"),
    supabase.from("ramo").select("idramo, nome").order("nome"),
    supabase.from("cargo").select("idcargo, descricao").order("descricao"),
    supabase.from("situacao").select("idsituacao, situacao").order("idsituacao"),
  ]);
  if (!alvo.data) notFound();
  const { erro } = await searchParams;

  return (
    <Shell>
      <main className="max-w-4xl p-4">
        <Link href="/usuarios" className="text-sm text-azul underline">← Voltar para usuários</Link>
        <h1 className="mt-2 text-xl font-semibold text-azul">Editar usuário</h1>
        {erro && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
        <FormUsuario
          action={atualizarUsuario.bind(null, id)}
          botao="Salvar alterações"
          emailTravado={!!alvo.data.auth_user_id}
          valores={alvo.data}
          ramos={(r.data ?? []).map((x) => ({ id: x.idramo, rotulo: x.nome }))}
          cargos={(c.data ?? []).map((x) => ({ id: x.idcargo, rotulo: x.descricao }))}
          situacoes={(s.data ?? []).map((x) => ({ id: x.idsituacao, rotulo: x.situacao }))}
          apfs={(u.data ?? []).map((x) => ({ id: x.idusuario, rotulo: x.nome }))}
        />
      </main>
    </Shell>
  );
}
