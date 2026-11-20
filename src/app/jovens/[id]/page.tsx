import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";
import { Voltar } from "@/components/Voltar";
import { FormJovem } from "@/components/FormJovem";
import { atualizarJovem } from "../actions";

export const instant = false;

export default async function EditarJovem({
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
  if (!eu.acessos.has("jovens")) redirect("/");

  const [alvo, r] = await Promise.all([
    supabase.from("jovem").select("*").eq("idjovem", id).maybeSingle(),
    supabase.from("ramo").select("idramo, nome").order("nome"),
  ]);
  if (!alvo.data) notFound();
  const { erro, ok } = await searchParams;

  return (
    <Shell>
      <main className="max-w-4xl p-4">
        <Voltar href="/jovens" />
        <h1 className="mt-2 text-xl font-semibold text-azul">Editar jovem</h1>
        {erro && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
        {ok && <p className="mt-3 rounded bg-green-50 p-2 text-sm text-green-800">Dados salvos.</p>}
        <FormJovem
          action={atualizarJovem.bind(null, id)}
          botao="Salvar alterações"
          valores={alvo.data}
          ramos={(r.data ?? []).map((x) => ({ id: x.idramo, rotulo: x.nome }))}
        />
      </main>
    </Shell>
  );
}
