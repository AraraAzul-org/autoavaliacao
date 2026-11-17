import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";

export const instant = false;

type Pessoa = { idusuario: number; nome: string; linha: string };

export default async function MeusAssessorados() {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");

  const { data } = await supabase
    .from("usuario")
    .select("idusuario, nome, linha")
    .eq("idapf", eu.idusuario)
    .eq("ativo", true)
    .order("nome");

  const pessoas = (data ?? []) as Pessoa[];

  return (
    <Shell>
      <main className="max-w-2xl p-6">
        <h1 className="text-xl font-semibold text-azul">Meus assessorados</h1>
        <p className="mt-1 text-sm text-gray-600">
          Os adultos que você assessora. Clique em um nome para ver as avaliações, o andamento e as notas.
        </p>

        <section className="mt-6 overflow-hidden rounded-lg border border-gray-200 border-l-4 border-l-amarelo bg-white shadow-sm">
          {!pessoas.length ? (
            <p className="px-4 py-4 text-sm text-gray-600">
              Nenhum adulto está vinculado a você como APF. O vínculo é definido no cadastro do adulto, no campo
              “APF (assessor pessoal de formação)”.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {pessoas.map((p) => (
                <li key={p.idusuario}>
                  <Link
                    href={`/meus-assessorados/${p.idusuario}`}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2.5 text-sm hover:bg-azul/5"
                  >
                    <span className="min-w-0">
                      <span className="font-medium text-azul underline">{p.nome}</span>{" "}
                      <span className="text-gray-500">({p.linha})</span>
                    </span>
                    <span className="text-xs text-gray-500">Ver avaliações →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </Shell>
  );
}
