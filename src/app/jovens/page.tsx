import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Shell } from "@/components/Shell";
import { FormJovem } from "@/components/FormJovem";
import { carregarEu } from "@/lib/eu";
import { dataBR } from "@/lib/promessa";
import { criarJovem } from "./actions";

export const instant = false;

const campo = "rounded border border-gray-300 bg-white p-1.5 text-sm";

const semAcento = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

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
  searchParams: Promise<{
    erro?: string;
    ok?: string;
    nome?: string;
    inativos?: string;
    buscar?: string;
  }>;
}) {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  if (!eu.membrogrupo) redirect("/");

  const params = await searchParams;
  const { erro, ok } = params;
  const nomeBusca = (params.nome ?? "").trim();
  const mostrarInativos = params.inativos === "1" || params.inativos === "on";
  // A lista só aparece depois que a pessoa clica em Pesquisar.
  const pesquisou = "buscar" in params;

  const r = await supabase.from("ramo").select("idramo, nome").order("nome");
  const ramos = (r.data ?? []) as Array<{ idramo: number; nome: string }>;
  const nomeRamo = new Map(ramos.map((x) => [x.idramo, x.nome]));

  let jovens: Jovem[] = [];
  if (pesquisou) {
    let consulta = supabase.from("jovem").select("*").order("nome");
    if (!mostrarInativos) consulta = consulta.eq("ativo", true);
    const j = await consulta;
    jovens = ((j.data ?? []) as Jovem[]).filter(
      (x) => !nomeBusca || semAcento(x.nome).includes(semAcento(nomeBusca)),
    );
  }

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

        <form method="get" className="mt-6 flex flex-wrap items-end gap-3 rounded border border-gray-200 bg-white p-3">
          <label className="flex min-w-64 flex-1 flex-col text-sm">
            Nome
            <input
              name="nome"
              defaultValue={nomeBusca}
              placeholder="Parte do nome do jovem"
              className={campo}
            />
          </label>
          <label className="flex items-center gap-2 pb-1.5 text-sm text-gray-700">
            <input name="inativos" type="checkbox" value="1" defaultChecked={mostrarInativos} />
            Mostra Inativos
          </label>
          <button className="rounded bg-azul px-3 py-1.5 text-sm text-white hover:bg-azul-escuro">
            Pesquisar
          </button>
          <input type="hidden" name="buscar" value="1" />
          {pesquisou && (
            <Link href="/jovens" className="pb-1.5 text-sm text-azul underline">
              Limpar filtro
            </Link>
          )}
          {pesquisou && (
            <span className="ml-auto rounded bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
              {jovens.length} {jovens.length === 1 ? "jovem" : "jovens"}
            </span>
          )}
        </form>

        {!pesquisou ? (
          <p className="mt-4 rounded border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Informe o nome e clique em Pesquisar para listar os jovens cadastrados. Por padrão, apenas os ativos
            aparecem.
          </p>
        ) : jovens.length === 0 ? (
          <p className="mt-4 rounded border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Nenhum jovem encontrado com esses filtros.
          </p>
        ) : (
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
                {jovens.map((x) => (
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </Shell>
  );
}
