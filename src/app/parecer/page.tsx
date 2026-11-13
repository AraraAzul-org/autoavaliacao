import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";

export const instant = false;

const hojeSP = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
const dataBR = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

type Cargo = { descricao: string };
type Pessoa = { idusuario: number; nome: string; linha: string; cargo: Cargo | Cargo[] | null };
type Avaliacao = { idavaliacao: number; descricao: string; prazo: string; status: string; idquestionario: number };
type Individual = {
  idavaliacaousuario: number;
  idusuario: number;
  idavaliacao: number;
  status: string;
  concluiapf: string | null;
  concluirdiretor: string | null;
  usuario: Pessoa | Pessoa[] | null;
  avaliacao: Avaliacao | Avaliacao[] | null;
};
type Normal = {
  idavaliacaousuario: number;
  status: string;
  concluiapf: string | null;
  concluirdiretor: string | null;
  usuario: { idusuario: number; nome: string; linha: string; cargo: Cargo | null };
  avaliacao: Avaliacao;
};

function normalizar(i: Individual): Normal | null {
  const u = Array.isArray(i.usuario) ? i.usuario[0] : i.usuario;
  const a = Array.isArray(i.avaliacao) ? i.avaliacao[0] : i.avaliacao;
  if (!u || !a) return null;
  return {
    idavaliacaousuario: i.idavaliacaousuario,
    status: i.status,
    concluiapf: i.concluiapf,
    concluirdiretor: i.concluirdiretor,
    usuario: {
      idusuario: u.idusuario,
      nome: u.nome,
      linha: u.linha,
      cargo: Array.isArray(u.cargo) ? (u.cargo[0] ?? null) : u.cargo,
    },
    avaliacao: a,
  };
}

const selo = (ok: boolean) => (ok ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700");

export default async function Parecer() {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  if (!eu.podeParecer) redirect("/");

  const { data: etapasDiretor } = await supabase.from("etapa").select("idquestionario").eq("publico", "diretor");
  const questionarios = [...new Set((etapasDiretor ?? []).map((e) => e.idquestionario))];

  if (!questionarios.length) {
    return (
      <Shell>
        <main className="max-w-3xl p-4">
          <h1 className="text-xl font-semibold text-azul">Parecer</h1>
          <p className="mt-3 rounded border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Nenhum questionário tem etapa de nível Diretor. Cadastre uma etapa com “Perguntas respondidas por:
            Diretor” para o parecer aparecer aqui.
          </p>
        </main>
      </Shell>
    );
  }

  const { data: avaliacoesData } = await supabase
    .from("avaliacao")
    .select("idavaliacao, descricao, prazo, status, idquestionario")
    .in("idquestionario", questionarios)
    .in("status", ["aberta", "finalizada"])
    .order("prazo", { ascending: true });
  const avaliacoes = (avaliacoesData ?? []) as Avaliacao[];
  const ids = avaliacoes.map((a) => a.idavaliacao);

  const { data: individuaisData } = ids.length
    ? await supabase
        .from("avaliacaousuario")
        .select(
          "idavaliacaousuario, idusuario, idavaliacao, status, concluiapf, concluirdiretor, usuario:usuario(idusuario, nome, linha, cargo:cargo(descricao)), avaliacao:avaliacao(idavaliacao, descricao, prazo, status, idquestionario)",
        )
        .in("idavaliacao", ids)
        .order("idusuario")
    : { data: [] as Individual[] };

  const individuais = ((individuaisData ?? []) as Individual[])
    .map(normalizar)
    .filter((x): x is Normal => !!x);

  const porAvaliacao = new Map<number, Normal[]>();
  individuais.forEach((i) => {
    const lista = porAvaliacao.get(i.avaliacao.idavaliacao) ?? [];
    lista.push(i);
    porAvaliacao.set(i.avaliacao.idavaliacao, lista);
  });

  return (
    <Shell>
      <main className="max-w-4xl p-4">
        <h1 className="text-xl font-semibold text-azul">Parecer</h1>
        <p className="mt-1 text-sm text-gray-600">
          Avaliações com etapa de nível Diretor. Você vê as respostas do usuário e do APF e registra o parecer da
          direção. A conclusão da direção só é liberada depois que o usuário e o APF concluírem.
        </p>

        {!avaliacoes.length && (
          <p className="mt-6 rounded border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Nenhuma avaliação aberta ou finalizada com etapa de nível Diretor.
          </p>
        )}

        {avaliacoes.map((av) => {
          const lista = (porAvaliacao.get(av.idavaliacao) ?? []).sort((a, b) =>
            a.usuario.nome.localeCompare(b.usuario.nome, "pt-BR"),
          );
          const vencida = av.prazo.slice(0, 10) < hojeSP();
          const situacao = av.status === "finalizada" ? "Finalizada" : vencida ? "Prazo vencido" : "Aberta";

          return (
            <section key={av.idavaliacao} className="mt-6 overflow-hidden rounded border border-gray-200 bg-white">
              <div className="flex flex-wrap items-center gap-3 border-b-2 border-amarelo bg-azul p-3 text-white">
                <h2 className="flex-1 font-semibold">{av.descricao}</h2>
                <span className="text-xs text-white/90">Prazo: {dataBR(av.prazo)}</span>
                <span className="rounded bg-white px-2 py-0.5 text-xs font-medium text-gray-800">{situacao}</span>
              </div>

              {!lista.length ? (
                <p className="p-4 text-sm text-gray-600">Nenhuma avaliação individual gerada nesta avaliação.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {lista.map((i) => (
                    <li key={i.idavaliacaousuario}>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900">{i.usuario.nome}</p>
                          <p className="text-xs text-gray-600">
                            {i.usuario.cargo?.descricao ? `${i.usuario.cargo.descricao} · ` : ""}
                            {i.usuario.linha}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1.5 text-xs">
                          <span className={`rounded px-2 py-0.5 font-medium ${selo(i.status === "concluida")}`}>
                            Usuário {i.status === "concluida" ? "concluiu" : "pendente"}
                          </span>
                          <span className={`rounded px-2 py-0.5 font-medium ${selo(!!i.concluiapf)}`}>
                            APF {i.concluiapf ? "concluiu" : "pendente"}
                          </span>
                          <span className={`rounded px-2 py-0.5 font-medium ${selo(!!i.concluirdiretor)}`}>
                            Direção {i.concluirdiretor ? "concluiu" : "pendente"}
                          </span>
                        </div>

                        <Link
                          href={`/parecer/${i.usuario.idusuario}/${i.avaliacao.idavaliacao}`}
                          className="rounded bg-azul px-3 py-1.5 text-xs text-white hover:bg-azul-escuro"
                        >
                          {i.concluirdiretor ? "Ver parecer" : "Dar parecer"}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </main>
    </Shell>
  );
}
