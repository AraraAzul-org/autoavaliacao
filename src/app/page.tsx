import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarSessao } from "@/lib/eu";
import { Shell } from "@/components/Shell";

export const instant = false;

type Pessoa = { idusuario: number; nome: string; linha: string };

const ROTULO: Record<string, string> = {
  pendente: "Não preenchida",
  em_andamento: "Em andamento",
  concluida: "Preenchida",
};

export default async function Home() {
  const supabase = await createClient();
  const sessao = await carregarSessao(supabase);
  if (!sessao) redirect("/login");
  const { eu, email } = sessao;

  if (!eu) {
    return (
      <Shell>
        <main className="max-w-xl p-6">
          <h1 className="text-xl font-semibold text-azul">Acesso não liberado</h1>
          <p className="mt-2 text-sm">O e-mail {email} não está cadastrado. Fale com a diretoria do grupo.</p>
        </main>
      </Shell>
    );
  }

  const [grupo, avaliacao] = await Promise.all([
    eu.diretor
      ? supabase
          .from("usuario")
          .select("idusuario, nome, linha")
          .eq("membrogrupo", true)
          .eq("ativo", true)
          .neq("idusuario", eu.idusuario)
          .order("nome")
      : Promise.resolve({ data: [] as Pessoa[] }),
    supabase
      .from("avaliacao")
      .select("idavaliacao, descricao")
      .eq("status", "aberta")
      .order("prazo", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const status = new Map<number, string>();
  if (avaliacao.data) {
    const { data: lista } = await supabase
      .from("avaliacaousuario")
      .select("idusuario, status")
      .eq("idavaliacao", avaliacao.data.idavaliacao);
    lista?.forEach((l) => status.set(l.idusuario, l.status));
  }

  const Lista = ({ titulo, pessoas }: { titulo: string; pessoas: Pessoa[] | null }) => (
    <section className="mt-6 overflow-hidden rounded-lg border border-gray-200 border-l-4 border-l-amarelo bg-white shadow-sm">
      <h2 className="border-b border-gray-100 bg-gray-50/60 px-4 py-2.5 text-sm font-semibold text-gray-800">
        {titulo}
      </h2>
      {!pessoas?.length ? (
        <p className="px-4 py-4 text-sm text-gray-600">Nenhum adulto para exibir.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {pessoas.map((p) => (
            <li key={p.idusuario} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
              <span className="min-w-0">
                {p.nome} <span className="text-gray-500">({p.linha})</span>
              </span>
              <span className="text-gray-600">
                {avaliacao.data ? ROTULO[status.get(p.idusuario) ?? "pendente"] : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <Shell>
      <main className="max-w-2xl p-6">
        <h1 className="text-xl font-semibold text-azul">{eu.nome}</h1>
        <p className="text-sm text-gray-600">
          {eu.cargo?.descricao} · {avaliacao.data ? `Avaliação ${avaliacao.data.descricao}` : "Nenhuma avaliação aberta"}
        </p>
        {eu.diretor && <Lista titulo="Adultos do grupo" pessoas={grupo.data} />}
      </main>
    </Shell>
  );
}
