import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Cabecalho } from "@/components/Cabecalho";

export const instant = false;

type Pessoa = { idusuario: number; nome: string; linha: string };

const ROTULO: Record<string, string> = {
  pendente: "Não preenchida",
  em_andamento: "Em andamento",
  concluida: "Preenchida",
};

export default async function Home() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const email = (auth.user.email ?? "").toLowerCase();

  const { data: eu } = await supabase
    .from("usuario")
    .select("idusuario, nome, cargo:cargo(descricao, avalia)")
    .or(`auth_user_id.eq.${auth.user.id},email.eq.${email}`)
    .maybeSingle();

  if (!eu) {
    return (
      <>
      <Cabecalho diretor={false} />
      <main className="mx-auto max-w-xl p-6">
        <h1 className="text-xl font-semibold text-azul">Acesso não liberado</h1>
        <p className="mt-2 text-sm">O e-mail {email} não está cadastrado. Fale com a diretoria do grupo.</p>
      </main>
      </>
    );
  }

  const cargo = Array.isArray(eu.cargo) ? eu.cargo[0] : eu.cargo;
  const diretor = !!cargo?.avalia;

  const { data: assessorados } = await supabase
    .from("usuario")
    .select("idusuario, nome, linha")
    .eq("idapf", eu.idusuario)
    .order("nome");

  const { data: grupo } = diretor
    ? await supabase
        .from("usuario")
        .select("idusuario, nome, linha")
        .eq("membrogrupo", true)
        .neq("idusuario", eu.idusuario)
        .order("nome")
    : { data: [] as Pessoa[] };

  const { data: avaliacao } = await supabase
    .from("avaliacao")
    .select("idavaliacao, ano")
    .order("ano", { ascending: false })
    .limit(1)
    .maybeSingle();

  const status = new Map<number, string>();
  if (avaliacao) {
    const { data: lista } = await supabase
      .from("avaliacaousuario")
      .select("idusuario, status")
      .eq("idavaliacao", avaliacao.idavaliacao);
    lista?.forEach((l) => status.set(l.idusuario, l.status));
  }

  const Lista = ({ titulo, pessoas }: { titulo: string; pessoas: Pessoa[] | null }) => (
    <section className="mt-6">
      <h2 className="font-semibold">{titulo}</h2>
      {!pessoas?.length ? (
        <p className="mt-2 text-sm text-gray-600">Nenhum adulto para exibir.</p>
      ) : (
        <ul className="mt-2 divide-y rounded border">
          {pessoas.map((p) => (
            <li key={p.idusuario} className="flex justify-between p-3 text-sm">
              <span>{p.nome} <span className="text-gray-500">({p.linha})</span></span>
              <span>{avaliacao ? ROTULO[status.get(p.idusuario) ?? "pendente"] : "—"}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <>
    <Cabecalho diretor={diretor} />
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-semibold text-azul">Olá, {eu.nome}</h1>
      <p className="text-sm text-gray-600">
        {cargo?.descricao} · {avaliacao ? `Avaliação ${avaliacao.ano}` : "Nenhuma avaliação aberta"}
      </p>
      {!!assessorados?.length && <Lista titulo="Meus assessorados" pessoas={assessorados} />}
      {diretor && <Lista titulo="Adultos do grupo" pessoas={grupo} />}
    </main>
    </>
  );
}

