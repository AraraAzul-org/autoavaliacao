import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Shell } from "@/components/Shell";
import { FormUsuario } from "@/components/FormUsuario";
import { carregarEu } from "@/lib/eu";
import { criarUsuario } from "./actions";

export const instant = false;

const campo = "rounded border border-gray-300 bg-white p-1.5 text-sm";
const btn = "rounded bg-azul px-3 py-1.5 text-sm text-white hover:bg-azul-escuro";

const dataBR = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));

export default async function Usuarios({
  searchParams,
}: {
  searchParams: Promise<{
    erro?: string;
    ok?: string;
    ramo?: string;
    linha?: string;
    cargo?: string;
    situacao?: string;
  }>;
}) {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  if (!eu.acessos.has("usuarios")) redirect("/");

  const { erro, ok, ramo, linha, cargo, situacao } = await searchParams;
  const [u, r, c, s] = await Promise.all([
    supabase.from("usuario").select("idusuario, nome, email, registro, linha, idramo, idcargo, idsituacao, idapf, membrogrupo, ativo, acessocadastros, datainativacao, idusuarioinativacao").order("nome"),
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

  // Filtros da lista: vazios mostram todos. São lidos da URL para a tela
  // continuar funcionando sem JavaScript.
  const ramoEscolhido = ramo ? Number(ramo) : null;
  const cargoEscolhido = cargo ? Number(cargo) : null;
  const situacaoEscolhida = situacao ? Number(situacao) : null;
  const linhaEscolhida = linha === "Escotista" || linha === "Dirigente" ? linha : null;
  const temFiltro = !!(ramoEscolhido || cargoEscolhido || situacaoEscolhida || linhaEscolhida);

  const filtrados = usuarios.filter(
    (x) =>
      (!ramoEscolhido || x.idramo === ramoEscolhido) &&
      (!cargoEscolhido || x.idcargo === cargoEscolhido) &&
      (!situacaoEscolhida || x.idsituacao === situacaoEscolhida) &&
      (!linhaEscolhida || x.linha === linhaEscolhida),
  );

  return (
    <Shell>
      <main className="w-full p-4">
        <h1 className="text-xl font-semibold text-azul">Cadastro de associados</h1>

        {erro && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
        {ok && (
          <p className="mt-3 rounded bg-green-50 p-2 text-sm text-green-800">
            {ok === "criado" ? "Associado cadastrado." : "Dados salvos."}
          </p>
        )}

        <FormUsuario
          action={criarUsuario}
          botao="Salvar e ir aos acessos"
          pedirSenha
          ramos={ramos.map((x) => ({ id: x.idramo, rotulo: x.nome }))}
          cargos={cargos.map((x) => ({ id: x.idcargo, rotulo: x.descricao }))}
          situacoes={situacoes.map((x) => ({ id: x.idsituacao, rotulo: x.situacao }))}
          apfs={usuarios.map((x) => ({ id: x.idusuario, rotulo: x.nome }))}
        />

        <form className="mt-6 flex flex-wrap items-end gap-2 rounded border border-gray-200 bg-white p-3">
          <label className="flex flex-col text-sm">Ramo
            <select name="ramo" defaultValue={ramo ?? ""} className={campo}>
              <option value="">Todos</option>
              {ramos.map((x) => (
                <option key={x.idramo} value={x.idramo}>{x.nome}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm">Linha de atuação
            <select name="linha" defaultValue={linha ?? ""} className={campo}>
              <option value="">Todas</option>
              <option>Escotista</option>
              <option>Dirigente</option>
            </select>
          </label>
          <label className="flex flex-col text-sm">Função
            <select name="cargo" defaultValue={cargo ?? ""} className={campo}>
              <option value="">Todas</option>
              {cargos.map((x) => (
                <option key={x.idcargo} value={x.idcargo}>{x.descricao}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm">Situação
            <select name="situacao" defaultValue={situacao ?? ""} className={campo}>
              <option value="">Todas</option>
              {situacoes.map((x) => (
                <option key={x.idsituacao} value={x.idsituacao}>{x.situacao}</option>
              ))}
            </select>
          </label>
          <button className={btn}>Filtrar</button>
          {temFiltro && (
            <Link href="/usuarios" className="pb-1.5 text-sm text-azul underline">
              Limpar filtro
            </Link>
          )}
          <span className="ml-auto rounded bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
            {filtrados.length} de {usuarios.length} {usuarios.length === 1 ? "associado" : "associados"}
          </span>
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-azul text-white">
              <tr>
                {["Nome", "Registro", "Linha", "Ramo", "Função", "Situação", "APF", "Grupo", "Acessos", "Status", ""].map((h) => (
                  <th key={h} className="p-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {!filtrados.length ? (
                <tr>
                  <td colSpan={11} className="p-4 text-sm text-gray-600">
                    {temFiltro ? "Nenhum associado com esses filtros." : "Nenhum associado cadastrado."}
                  </td>
                </tr>
              ) : (
                filtrados.map((x) => (
                  <tr key={x.idusuario}>
                    <td className="p-2">{x.nome}<div className="text-xs text-gray-500">{x.email}</div></td>
                    <td className="whitespace-nowrap p-2 text-gray-600">{x.registro ?? "—"}</td>
                    <td className="p-2">{x.linha}</td>
                    <td className="p-2">{nomeRamo.get(x.idramo) ?? "—"}</td>
                    <td className="p-2">{nomeCargo.get(x.idcargo) ?? "—"}</td>
                    <td className="p-2">{nomeSit.get(x.idsituacao) ?? "—"}</td>
                    <td className="p-2">{nomeUsuario.get(x.idapf) ?? "—"}</td>
                    <td className="p-2">{x.membrogrupo ? "Sim" : "Não"}</td>
                    <td className="p-2">
                      <Link href={`/usuarios/${x.idusuario}/acessos`} className="text-azul underline">
                        Definir
                      </Link>
                    </td>
                    <td className="p-2">
                      {x.ativo ? (
                        "Ativo"
                      ) : (
                        <span className="text-red-700">
                          Inativo
                          {x.datainativacao && (
                            <span className="block text-xs font-normal text-gray-600">
                              em {dataBR(x.datainativacao)} por{" "}
                              {nomeUsuario.get(x.idusuarioinativacao ?? 0) ?? "—"}
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="p-2"><Link href={`/usuarios/${x.idusuario}`} className="text-azul underline">Editar</Link></td>
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
