/**
 * Gerador de PDF mínimo, sem bibliotecas: páginas A4 com Helvetica (normal e
 * negrito) e codificação WinAnsi. Serve para o relatório do PPF, que é um texto
 * simples com títulos e parágrafos.
 */

export type PdfBloco =
  | { tipo: "titulo"; texto: string }
  | { tipo: "secao"; texto: string }
  | { tipo: "negrito"; texto: string }
  | { tipo: "texto"; texto: string }
  | { tipo: "espaco" };

const LARGURA = 595;
const ALTURA = 842;
const MARGEM = 56;
const UTIL = LARGURA - MARGEM * 2;

type Estilo = { tamanho: number; negrito: boolean; antes: number };

const ESTILOS: Record<PdfBloco["tipo"], Estilo> = {
  titulo: { tamanho: 17, negrito: true, antes: 0 },
  secao: { tamanho: 12, negrito: true, antes: 16 },
  negrito: { tamanho: 10, negrito: true, antes: 10 },
  texto: { tamanho: 10, negrito: false, antes: 2 },
  espaco: { tamanho: 10, negrito: false, antes: 8 },
};

// Aproximação da largura média dos caracteres da Helvetica.
const larguraChar = (tamanho: number, negrito: boolean) => tamanho * (negrito ? 0.55 : 0.5);

// Remove o que a codificação WinAnsi não representa e troca aspas/travessões.
const limpar = (texto: string) =>
  texto
    .replace(/\u00a0/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x20-\x7e\u00a0-\u00ff]/g, "?");

const escapar = (texto: string) => texto.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

function quebrar(texto: string, tamanho: number, negrito: boolean): string[] {
  const limite = Math.max(10, Math.floor(UTIL / larguraChar(tamanho, negrito)));
  const linhas: string[] = [];
  let atual = "";

  texto
    .split(/\s+/)
    .filter(Boolean)
    .forEach((palavra) => {
      const teste = atual ? `${atual} ${palavra}` : palavra;
      if (teste.length <= limite) {
        atual = teste;
        return;
      }
      if (atual) linhas.push(atual);
      let resto = palavra;
      while (resto.length > limite) {
        linhas.push(resto.slice(0, limite));
        resto = resto.slice(limite);
      }
      atual = resto;
    });

  if (atual) linhas.push(atual);
  return linhas.length ? linhas : [""];
}

export function gerarPdf(blocos: PdfBloco[]): Uint8Array {
  const paginas: string[][] = [];
  let ops: string[] = [];
  let y = ALTURA - MARGEM;

  const novaPagina = () => {
    if (ops.length) paginas.push(ops);
    ops = [];
    y = ALTURA - MARGEM;
  };

  blocos.forEach((bloco) => {
    const estilo = ESTILOS[bloco.tipo];
    if (bloco.tipo === "espaco") {
      y -= estilo.antes;
      return;
    }

    const texto = limpar(bloco.texto);
    const linhas = quebrar(texto, estilo.tamanho, estilo.negrito);
    const altura = estilo.tamanho * 1.25;

    linhas.forEach((linha, indice) => {
      const espaco = indice === 0 ? estilo.antes : estilo.tamanho * 0.45;
      if (y - espaco - altura < MARGEM) novaPagina();
      y -= espaco + altura;
      ops.push(
        `BT /F${estilo.negrito ? 2 : 1} ${estilo.tamanho} Tf 1 0 0 1 ${MARGEM} ${y.toFixed(1)} Tm (${escapar(linha)}) Tj ET`,
      );
    });
  });

  if (ops.length) paginas.push(ops);
  if (!paginas.length) paginas.push(["BT /F1 10 Tf 1 0 0 1 56 786 Tm () Tj ET"]);

  const total = paginas.length;
  const fontRegular = 3 + total * 2;
  const fontNegrito = 4 + total * 2;
  const objetos: string[] = [];

  objetos.push("<< /Type /Catalog /Pages 2 0 R >>");
  objetos.push(
    `<< /Type /Pages /Kids [${paginas.map((_, i) => `${3 + i * 2} 0 R`).join(" ")}] /Count ${total} >>`,
  );

  paginas.forEach((linhas, i) => {
    const conteudo = linhas.join("\n");
    objetos.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${LARGURA} ${ALTURA}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontNegrito} 0 R >> >> /Contents ${4 + i * 2} 0 R >>`,
    );
    objetos.push(`<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`);
  });

  objetos.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objetos.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  let saida = "%PDF-1.4\n";
  const posicoes: number[] = [];

  objetos.forEach((corpo, i) => {
    posicoes.push(saida.length);
    saida += `${i + 1} 0 obj\n${corpo}\nendobj\n`;
  });

  const inicioXref = saida.length;
  saida += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  posicoes.forEach((posicao) => {
    saida += `${String(posicao).padStart(10, "0")} 00000 n \n`;
  });
  saida += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;

  // A codificação WinAnsi é de um byte por caractere, então o tamanho em
  // caracteres é o tamanho em bytes que o PDF espera.
  const bytes = new Uint8Array(saida.length);
  for (let i = 0; i < saida.length; i += 1) bytes[i] = saida.charCodeAt(i) & 0xff;
  return bytes;
}
