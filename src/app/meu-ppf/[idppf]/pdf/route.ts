import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { agruparPorEtapa, carregarPpf, dataBR, STATUS_PPF } from "@/lib/ppf";
import { gerarPdf, type PdfBloco } from "@/lib/pdf";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ idppf: string }> }) {
  const { idppf: idTexto } = await params;
  const idppf = Number(idTexto);
  if (!Number.isInteger(idppf)) return new NextResponse("PPF inválido.", { status: 400 });

  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) return new NextResponse("Faça login para gerar o relatório.", { status: 401 });

  const ppf = await carregarPpf(supabase, idppf);
  if (!ppf) return new NextResponse("PPF não encontrado.", { status: 404 });
  // O relatório é do próprio associado.
  if (ppf.ppf.idusuario !== eu.idusuario) return new NextResponse("PPF não encontrado.", { status: 404 });

  const grupos = agruparPorEtapa(ppf.itens);
  const extras = ppf.itens.filter((i) => i.manual);
  const selo = STATUS_PPF[ppf.ppf.status] ?? STATUS_PPF.fechado;

  const blocos: PdfBloco[] = [
    { tipo: "titulo", texto: "Plano Pessoal de Formação (PPF)" },
    { tipo: "texto", texto: ppf.usuario?.nome ?? eu.nome },
    { tipo: "texto", texto: `Avaliação: ${ppf.avaliacao?.descricao ?? "—"}` },
    {
      tipo: "texto",
      texto: `Status: ${selo.rotulo} · Gerado em ${dataBR(ppf.ppf.datageracao)}${
        ppf.avaliacao ? ` · Prazo da avaliação: ${dataBR(ppf.avaliacao.prazo)}` : ""
      }`,
    },
    { tipo: "texto", texto: "Perguntas com resposta abaixo da nota mínima e as ações previstas." },
  ];

  grupos.forEach((grupo) => {
    blocos.push({ tipo: "secao", texto: grupo.etapa });
    grupo.itens.forEach((item) => {
      blocos.push({ tipo: "negrito", texto: `${item.codigo ?? ""} — ${item.pergunta ?? ""}`.trim() });
      blocos.push({ tipo: "texto", texto: `Resposta: ${item.resposta ?? "—"}` });
      blocos.push({ tipo: "texto", texto: `Ação que será realizada: ${item.acao || "—"}` });
      blocos.push({ tipo: "texto", texto: `Data prevista: ${dataBR(item.dataprevista)}` });
    });
  });

  if (!grupos.length) {
    blocos.push({ tipo: "texto", texto: "Nenhuma pergunta ficou abaixo da nota mínima nesta avaliação." });
  }

  if (extras.length) {
    blocos.push({ tipo: "secao", texto: "Itens adicionados pelo associado" });
    extras.forEach((item, indice) => {
      blocos.push({ tipo: "negrito", texto: `Item ${indice + 1}` });
      blocos.push({ tipo: "texto", texto: item.resposta ?? "—" });
      blocos.push({ tipo: "texto", texto: `Data prevista: ${dataBR(item.dataprevista)}` });
    });
  }

  const pdf = gerarPdf(blocos);
  // O corpo da resposta viaja como ArrayBuffer puro (o BodyInit do Next não
  // aceita Uint8Array<ArrayBufferLike> na checagem de tipos).
  const corpo = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
  const nome = (ppf.usuario?.nome ?? "associado")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return new NextResponse(corpo, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ppf-${nome || "associado"}-${idppf}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
