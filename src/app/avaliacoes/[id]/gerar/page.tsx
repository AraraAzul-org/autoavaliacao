import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";
import { Voltar } from "@/components/Voltar";
import { SelecionarUsuarios, type UsuarioSelecao } from "@/components/SelecionarUsuarios";

export const instant = false;

const dataBR = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

type UsuarioBruto = {
  idusuario: number;
  nome: string;
  idramo: number | null;
  idcargo: number | null;
  membrogrupo: boolean;
};

export default async function GerarAvaliacao({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idTexto } = await params;
  const id = Number(idTexto);
  if (!Number.isInteger(id)) notFound();

  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  if (!eu.diretor) redirect("/");

  const { data: av } = await supabase
    .from("avaliacao")
    .select("idavaliacao, descricao, status, prazo, idquestionario")
    .eq("idavaliacao", id)
    .maybeSingle();

  if (!av) notFound();
  if (av.status === "finalizada") {
    redirect(`/avaliacoes?erro=${encodeURIComponent("Avaliação finalizada: não é possível incluir novos adultos.")}`);
  }

  const [usuarios, ramos, cargos, incluidos, questionario] = await Promise.all([
    supabase
      .from("usuario")
      .select("idusuario, nome, idramo, idcargo, membrogrupo")
      .eq("ativo", true),
    supabase.from("ramo").select("idramo, nome"),
    supabase.from("cargo").select("idcargo, descricao"),
    supabase.from("avaliacaousuario").select("idusuario").eq("idavaliacao", id),
    supabase.from("questionario").select("descricao").eq("idquestionario", av.idquestionario).maybeSingle(),
  ]);

  const nomeRamo = new Map((ramos.data ?? []).map((r) => [r.idramo, r.nome]));
  const nomeCargo = new Map((cargos.data ?? []).map((c) => [c.idcargo, c.descricao]));
  const jaIncluidos = new Set((incluidos.data ?? []).map((x) => Number(x.idusuario)));

  const lista: UsuarioSelecao[] = ((usuarios.data ?? []) as UsuarioBruto[])
    .map((u) => ({
      idusuario: u.idusuario,
      nome: u.nome,
      ramo: (u.idramo != null ? nomeRamo.get(u.idramo) : "") || "—",
      cargo: (u.idcargo != null ? nomeCargo.get(u.idcargo) : "") || "—",
      membrogrupo: u.membrogrupo,
      incluido: jaIncluidos.has(u.idusuario),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));

  const totalIncluidos = jaIncluidos.size;
  const faltam = lista.length - lista.filter((u) => u.incluido).length;
  const rascunho = av.status === "rascunho";

  return (
    <Shell>
      <main className="w-full max-w-5xl p-4 lg:p-6">
        <Voltar href="/avaliacoes" />
        <h1 className="mt-2 text-xl font-semibold text-azul">
          {rascunho ? "Gerar avaliações" : "Incluir novos adultos"}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {av.descricao} · Questionário: <strong>{questionario.data?.descricao ?? "—"}</strong> · Prazo:{" "}
          <strong>{dataBR(av.prazo)}</strong>
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Marque quem deve receber esta avaliação. Nome, ramo, função e se a pessoa é do grupo aparecem para ajudar a
          escolher.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-700">
          <span>
            {totalIncluidos}{" "}
            {totalIncluidos === 1 ? "adulto já incluído" : "adultos já incluídos"}
          </span>
          <span className="text-gray-500">
            {rascunho
              ? "A avaliação passa a aberta assim que você gerar a primeira."
              : `${faltam} ${faltam === 1 ? "adulto ainda sem avaliação" : "adultos ainda sem avaliação"}.`}
          </span>
        </div>

        {!lista.length ? (
          <p className="mt-4 rounded border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Nenhum adulto ativo cadastrado. Cadastre os adultos em Usuários antes de gerar a avaliação.
          </p>
        ) : (
          <SelecionarUsuarios idavaliacao={av.idavaliacao} rascunho={rascunho} usuarios={lista} />
        )}
      </main>
    </Shell>
  );
}
