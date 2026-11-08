import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Shell } from "@/components/Shell";
import { FormUsuario } from "@/components/FormUsuario";
import { carregarEu } from "@/lib/eu";
import { criarUsuario } from "./actions";

export const instant = false;

export default async function Usuarios({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  if (!eu.diretor) redirect("/");

  const { erro, ok } = await searchParams;
  const [u, r, c, s] = await Promise.all([
    supabase.from("usuario").select("idusuario, nome, email, linha, idramo, idcargo, idsituacao, idapf, membrogrupo, ativo").order("nome"),
    supabase.from("ramo").select("idramo, nome").order("nome"),
    supabase.from("cargo").select("idcargo, descricao").order("descricao"),
    supabase.from("situacao").select("idsituacao, situacao").order("idsituacao"),
  ]);
  const usuarios = u.data ?? [];
  const ramos = r.data ?? [];
  const cargos = c.data ?? [];
  const situacoes = s.data ?? [];
  const nomeUsuario = new Map(usuarios.map((x) => [x.idusuario, x.nome]));
  const nomeRamo = new Map(ramos.map((x) => [x.idramo, x.nome]));
  const nomeCargo = new Map(cargos.map((x) => [x.idcargo, x.descricao]));
  const nomeSit = new Map(situacoes.map((x) => [x.idsituacao, x.situacao]));

  return (
    <Shell>
      <main className="max-w-4xl p-4">
        <h1 className="text-xl font-semibold text-azul">Cadastro de usuários</h1>

        {erro && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
        {ok && <p className="mt-3 rounded bg-green-50 p-2 text-sm text-green-800">Usuário cadastrado.</p>}

        <FormUsuario
          action={criarUsuario}
          botao="Cadastrar"
          ramos={ramos.map((x) => ({ id: x.idramo, rotulo: x.nome }))}
          cargos={cargos.map((x) => ({ id: x.idcargo, rotulo: x.descricao }))}
          situacoes={situacoes.map((x) => ({ id: x.idsituacao, rotulo: x.situacao }))}
          apfs={usuarios.map((x) => ({ id: x.idusuario, rotulo: x.nome }))}
        />

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-azul text-white">
              <tr>
                {["Nome", "Linha", "Ramo", "Cargo", "Situação", "APF", "Grupo", "Status", ""].map((h) => (
                  <th key={h} className="p-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {usuarios.map((x) => (
                <tr key={x.idusuario}>
                  <td className="p-2">{x.nome}<div className="text-xs text-gray-500">{x.email}</div></td>
                  <td className="p-2">{x.linha}</td>
                  <td className="p-2">{nomeRamo.get(x.idramo) ?? "—"}</td>
                  <td className="p-2">{nomeCargo.get(x.idcargo) ?? "—"}</td>
                  <td className="p-2">{nomeSit.get(x.idsituacao) ?? "—"}</td>
                  <td className="p-2">{nomeUsuario.get(x.idapf) ?? "—"}</td>
                  <td className="p-2">{x.membrogrupo ? "Sim" : "Não"}</td>
                  <td className="p-2">{x.ativo ? "Ativo" : <span className="text-red-700">Inativo</span>}</td>
                  <td className="p-2"><Link href={`/usuarios/${x.idusuario}`} className="text-azul underline">Editar</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </Shell>
  );
}
