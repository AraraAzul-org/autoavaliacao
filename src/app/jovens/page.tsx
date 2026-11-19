import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Shell } from "@/components/Shell";
import { FormJovem } from "@/components/FormJovem";
import { carregarEu } from "@/lib/eu";
import { dataBR } from "@/lib/promessa";
import { criarJovem } from "./actions";

export const instant = false;

type Jovem = {
  idjovem: number;
  registro: string;
  nome: string;
  idramo: number | null;
  datanascimento: string | null;
  ativo: boolean;
  datainativacao: string | null;
};

export default async function Jovens({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  if (!eu.podeCadastros) redirect("/");

  const { erro, ok } = await searchParams;
  const [j, r] = await Promise.all([
    supabase.from("jovem").select("*").order("nome"),
    supabase.from("ramo").select("idramo, nome").order("nome"),
  ]);
  const jovens = (j.data ?? []) as Jovem[];
  const ramos = (r.data ?? []) as Array<{ idramo: number; nome: string }>;
  const nomeRamo = new Map(ramos.map((x) => [x.idramo, x.nome]));

  return (
    <Shell>
      <main className="w-full p-4">
        <h1 className="text-xl font-semibold text-azul">Cadastro de jovens</h1>

        {erro && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
        {ok && (
          <p className="mt-3 rounded bg-green-50 p-2 text-sm text-green-800">
            {ok === "criado" ? "Jovem cadastrado." : "Dados salvos."}
          </p>
        )}

        <FormJovem
          action={criarJovem}
          botao="Cadastrar"
          ramos={ramos.map((x) => ({ id: x.idramo, rotulo: x.nome }))}
        />

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-azul text-white">
              <tr>
                {["Nome", "Registro", "Ramo", "Nascimento", "Status", ""].map((h) => (
                  <th key={h} className="p-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {!jovens.length ? (
                <tr>
                  <td colSpan={6} className="p-4 text-sm text-gray-600">
                    Nenhum jovem cadastrado.
                  </td>
                </tr>
              ) : (
                jovens.map((x) => (
                  <tr key={x.idjovem}>
                    <td className="p-2">{x.nome}</td>
                    <td className="whitespace-nowrap p-2 text-gray-600">{x.registro}</td>
                    <td className="p-2">{nomeRamo.get(x.idramo ?? 0) ?? "—"}</td>
                    <td className="whitespace-nowrap p-2 text-gray-600">{dataBR(x.datanascimento)}</td>
                    <td className="p-2">
                      {x.ativo ? (
                        "Ativo"
                      ) : (
                        <span className="text-red-700">
                          Inativo
                          {x.datainativacao && (
                            <span className="block text-xs font-normal text-gray-600">
                              em {dataBR(x.datainativacao)}
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="p-2">
                      <Link href={`/jovens/${x.idjovem}`} className="text-azul underline">Editar</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </Shell>
  );
}
