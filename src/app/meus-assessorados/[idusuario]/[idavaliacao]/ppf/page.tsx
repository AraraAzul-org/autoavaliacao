import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { Shell } from "@/components/Shell";
import { Voltar } from "@/components/Voltar";
import { PpfLista } from "@/components/PpfLista";
import { STATUS_PPF, agruparPorEtapa, carregarPpf, dataBR } from "@/lib/ppf";

export const instant = false;

export default async function PpfDoAssessorado({
  params,
}: {
  params: Promise<{ idusuario: string; idavaliacao: string }>;
}) {
  const { idusuario: idUsuarioTexto, idavaliacao: idAvaliacaoTexto } = await params;
  const idusuario = Number(idUsuarioTexto);
  const id = Number(idAvaliacaoTexto);
  if (!Number.isInteger(idusuario) || !Number.isInteger(id)) notFound();

  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  if (!eu.acessos.has("meus-assessorados")) redirect("/sem-acesso");

  const [{ data: pessoa }, { data: av }] = await Promise.all([
    supabase.from("usuario").select("idusuario, nome, idapf").eq("idusuario", idusuario).maybeSingle(),
    supabase.from("avaliacao").select("idavaliacao, descricao, prazo, gerarppf").eq("idavaliacao", id).maybeSingle(),
  ]);
  if (!pessoa || !av) notFound();
  // O PPF do assessorado só é visível para o APF dele.
  if (pessoa.idapf !== eu.idusuario) notFound();

  const { data: registro } = await supabase
    .from("ppf")
    .select("idppf")
    .eq("idavaliacao", id)
    .eq("idusuario", idusuario)
    .maybeSingle();

  const ppf = registro ? await carregarPpf(supabase, registro.idppf) : null;
  const grupos = ppf ? agruparPorEtapa(ppf.itens) : [];
  const extras = ppf ? ppf.itens.filter((i) => i.manual) : [];
  const selo = ppf ? (STATUS_PPF[ppf.ppf.status] ?? STATUS_PPF.fechado) : null;

  return (
    <Shell>
      <main className="max-w-3xl p-4">
        <Voltar href={`/meus-assessorados/${idusuario}`} />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-azul">PPF de {pessoa.nome}</h1>
          {selo && <span className={`rounded px-2 py-0.5 text-xs font-medium ${selo.classe}`}>{selo.rotulo}</span>}
        </div>
        <p className="mt-1 text-sm text-gray-600">
          {av.descricao} · Prazo: <strong>{dataBR(av.prazo)}</strong>
          {ppf ? ` · Gerado em ${dataBR(ppf.ppf.datageracao)}` : ""}
        </p>

        <p className="mt-3 rounded bg-gray-100 p-2 text-sm text-gray-700">
          Esta tela é apenas para visualização: o PPF serve de subsídio para a sua conversa com o associado. Quem
          preenche as ações e as datas é o próprio associado.
        </p>

        {!ppf && (
          <p className="mt-6 rounded border border-gray-200 bg-white p-4 text-sm text-gray-600">
            {av.gerarppf
              ? "O PPF ainda não foi gerado. Ele é criado automaticamente quando você conclui a sua etapa do APF."
              : "Esta avaliação não está marcada para gerar PPF."}
          </p>
        )}

        {ppf && (
          <>
            <PpfLista grupos={grupos} />

            {!!extras.length && (
              <section className="mt-6 overflow-hidden rounded border border-gray-200 bg-white">
                <div className="flex flex-wrap items-center gap-2 border-b-2 border-amarelo bg-azul p-3 text-white">
                  <h2 className="flex-1 text-sm font-semibold">Itens adicionados pelo associado</h2>
                  <span className="text-xs text-white/90">Somente leitura</span>
                </div>
                <div className="p-3">
                  {extras.map((item) => (
                    <div key={item.idppfitem} className="border-b border-gray-100 py-3 last:border-0">
                      <p className="whitespace-pre-wrap text-sm text-gray-800">{item.resposta}</p>
                      <p className="mt-1 text-xs text-gray-500">Data prevista: {dataBR(item.dataprevista)}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </Shell>
  );
}
