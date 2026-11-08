import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Cabecalho } from "@/components/Cabecalho";
import { criarUsuario } from "./actions";

export const instant = false;

const campo = "w-full rounded border border-gray-300 p-2 text-sm";

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
    supabase.from("usuario").select("idusuario, nome, email, linha, idramo, idcargo, idsituacao, idapf, membrogrupo").order("nome"),
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
    <>
      <Cabecalho diretor />
      <main className="mx-auto max-w-4xl p-4">
        <h1 className="text-xl font-semibold text-azul">Cadastro de usuários</h1>

        {erro && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
        {ok && <p className="mt-3 rounded bg-green-50 p-2 text-sm text-green-800">Usuário cadastrado.</p>}

        <form action={criarUsuario} className="mt-4 grid gap-3 rounded border-l-4 border-amarelo bg-amarelo-claro p-4 sm:grid-cols-2">
          <label className="text-sm">Nome *
            <input name="nome" required className={campo} />
          </label>
          <label className="text-sm">E-mail *
            <input name="email" type="email" required className={campo} />
          </label>
          <label className="text-sm">Linha de atuação *
            <select name="linha" required defaultValue="" className={campo}>
              <option value="" disabled>Selecione</option>
              <option>Escotista</option>
              <option>Dirigente</option>
            </select>
          </label>
          <label className="text-sm">Ramo
            <select name="idramo" defaultValue="" className={campo}>
              <option value="">—</option>
              {ramos.map((x) => <option key={x.idramo} value={x.idramo}>{x.nome}</option>)}
            </select>
          </label>
          <label className="text-sm">Cargo
            <select name="idcargo" defaultValue="" className={campo}>
              <option value="">—</option>
              {cargos.map((x) => <option key={x.idcargo} value={x.idcargo}>{x.descricao}</option>)}
            </select>
          </label>
          <label className="text-sm">Situação
            <select name="idsituacao" defaultValue="" className={campo}>
              <option value="">—</option>
              {situacoes.map((x) => <option key={x.idsituacao} value={x.idsituacao}>{x.situacao}</option>)}
            </select>
          </label>
          <label className="text-sm">Data da situação
            <input name="datasituacao" type="date" className={campo} />
          </label>
          <label className="text-sm">APF (assessor pessoal de formação)
            <select name="idapf" defaultValue="" className={campo}>
              <option value="">—</option>
              {usuarios.map((x) => <option key={x.idusuario} value={x.idusuario}>{x.nome}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input name="membrogrupo" type="checkbox" defaultChecked />
            Faz parte do grupo (desmarque para APF de outro grupo)
          </label>
          <button className="rounded bg-azul p-2 text-white hover:bg-azul-escuro sm:col-span-2">Cadastrar</button>
        </form>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-azul text-white">
              <tr>
                {["Nome", "Linha", "Ramo", "Cargo", "Situação", "APF", "Grupo"].map((h) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
