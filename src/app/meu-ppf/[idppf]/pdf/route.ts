import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { agruparPorEtapa, carregarPpf, dataBR, STATUS_PPF } from "@/lib/ppf";
import { gerarPdf, type PdfBloco } from "@/lib/pdf";
import { LOGO_PPF_BASE64, LOGO_PPF_ALTURA, LOGO_PPF_LARGURA } from "@/lib/logoPpf";

// O logotipo vai embutido no código como base64 (JPEG) para o relatório não
// depender de rede nem do sistema de arquivos na Vercel.
function logoPpf() {
  const binario = atob(LOGO_PPF_BASE64);
  const dados = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) dados[i] = binario.charCodeAt(i);
  return dados;
}

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

  const blocos: PdfBloco[] = [];

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

  const pdf = gerarPdf({
    titulo: "Plano Pessoal de Formação (PPF)",
    informacoes: [
      ppf.usuario?.nome ?? eu.nome,
      `Avaliação: ${ppf.avaliacao?.descricao ?? "—"}`,
      `Status: ${selo.rotulo}  ·  Prazo da avaliação: ${dataBR(ppf.avaliacao?.prazo ?? null)}  ·  Gerado em ${dataBR(
        ppf.ppf.datageracao,
      )}`,
    ],
    logo: { dados: logoPpf(), largura: LOGO_PPF_LARGURA, altura: LOGO_PPF_ALTURA },
    blocos,
    rodape: (pagina) => `Página: ${pagina}`,
  });
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
