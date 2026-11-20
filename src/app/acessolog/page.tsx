import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";

export const instant = false;

const campo = "rounded border border-gray-300 bg-white p-1.5 text-sm";
const btn = "rounded bg-azul px-3 py-1.5 text-sm text-white hover:bg-azul-escuro";

const dataValida = (valor?: string) =>
  valor && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : null;

const dataHoraBR = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

type LogLinha = {
  idacessolog: number;
  datahora: string;
  idusuario: number;
  opcao: string;
};

export default async function Acessolog({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string; usuario?: string }>;
}) {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  if (!eu.dirigente) redirect("/");

  const params = await searchParams;
  const { de, ate, usuario } = params;
  const inicio = dataValida(de);
  const fim = dataValida(ate);
  const filtroUsuario = usuario && /^\d+$/.test(usuario) ? Number(usuario) : null;
  const pesquisou = ["de", "ate", "usuario"].some((k) => k in params);

  const nomesUsuarios = new Map<number, { nome: string; registro: string | null }>();
  let linhas: LogLinha[] = [];

  if (pesquisou) {
    let consulta = supabase
      .from("acessolog")
      .select("idacessolog, datahora, idusuario, opcao")
      .order("datahora", { ascending: false })
      .limit(1000);
    if (inicio) consulta = consulta.gte("datahora", `${inicio}T00:00:00-03:00`);
    if (fim) consulta = consulta.lte("datahora", `${fim}T23:59:59-03:00`);
    if (filtroUsuario) consulta = consulta.eq("idusuario", filtroUsuario);

    const [logs, usuarios] = await Promise.all([
      consulta,
      supabase.from("usuario").select("idusuario, nome, registro").order("nome"),
    ]);
    linhas = (logs.data ?? []) as LogLinha[];
    (usuarios.data ?? []).forEach((u) => {
      nomesUsuarios.set(Number(u.idusuario), {
        nome: String(u.nome),
        registro: u.registro === null ? null : String(u.registro),
      });
    });
  } else {
    const usuarios = await supabase
      .from("usuario")
      .select("idusuario, nome, registro")
      .order("nome");
    (usuarios.data ?? []).forEach((u) => {
      nomesUsuarios.set(Number(u.idusuario), {
        nome: String(u.nome),
        registro: u.registro === null ? null : String(u.registro),
      });
    });
  }

  const listaUsuarios = [...nomesUsuarios.entries()]
    .map(([id, dados]) => ({ id, ...dados }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));

  return (
    <Shell>
      <main className="max-w-5xl p-4">
        <h1 className="text-xl font-semibold text-azul">Log de acesso</h1>
        <p className="mt-1 text-sm text-gray-600">
          Consulta restrita à diretoria. Informe o período e, se quiser, um associado para filtrar.
        </p>

        <form className="mt-4 flex flex-wrap items-end gap-2 rounded border border-gray-200 bg-white p-3">
          <label className="flex flex-col text-sm">
            De
            <input name="de" type="date" defaultValue={inicio ?? ""} className={campo} />
          </label>
          <label className="flex flex-col text-sm">
            Até
            <input name="ate" type="date" defaultValue={fim ?? ""} className={campo} />
          </label>
          <label className="flex min-w-56 flex-1 flex-col text-sm">
            Usuário (opcional)
            <select name="usuario" defaultValue={filtroUsuario === null ? "" : String(filtroUsuario)} className={campo}>
              <option value="">Todos os usuários</option>
              {listaUsuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </label>
          <button className={btn}>Consultar</button>
          {pesquisou && (
            <Link href="/acessolog" className="pb-1.5 text-sm text-azul underline">
              Limpar filtro
            </Link>
          )}
          {pesquisou && (
            <span className="ml-auto rounded bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
              {linhas.length} {linhas.length === 1 ? "registro" : "registros"}
            </span>
          )}
        </form>

        {!pesquisou ? (
          <p className="mt-6 rounded border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Informe o período e clique em Consultar para listar o log de acesso.
          </p>
        ) : !linhas.length ? (
          <p className="mt-6 rounded border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Nenhum acesso encontrado no período selecionado.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 border-l-4 border-l-amarelo bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-2 font-medium">Data e hora</th>
                    <th className="px-4 py-2 font-medium">Usuário</th>
                    <th className="px-4 py-2 font-medium">Registro</th>
                    <th className="px-4 py-2 font-medium">Opção consultada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {linhas.map((l) => {
                    const usuarioLinha = nomesUsuarios.get(Number(l.idusuario));
                    return (
                      <tr key={l.idacessolog}>
                        <td className="whitespace-nowrap px-4 py-2 text-gray-600">{dataHoraBR(l.datahora)}</td>
                        <td className="px-4 py-2 font-medium text-gray-900">
                          {usuarioLinha?.nome ?? `Usuário ${l.idusuario}`}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-gray-600">{usuarioLinha?.registro ?? "—"}</td>
                        <td className="px-4 py-2 text-gray-700">{l.opcao}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </Shell>
  );
}
