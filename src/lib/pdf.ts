/**
 * Gerador de PDF mínimo, sem bibliotecas: páginas A4 com Helvetica (normal e
 * negrito), codificação WinAnsi e um cabeçalho fixo (logotipo, título
 * centralizado e informações) repetido em todas as páginas, com o número da
 * página no rodapé. Serve para o relatório do PPF, que é texto simples.
 */

export type PdfBloco =
  | { tipo: "secao"; texto: string }
  | { tipo: "negrito"; texto: string }
  | { tipo: "texto"; texto: string }
  | { tipo: "espaco" };

export type PdfLogo = { dados: Uint8Array; largura: number; altura: number };

export type PdfDocumento = {
  titulo: string;
  informacoes: string[];
  logo?: PdfLogo;
  blocos: PdfBloco[];
  rodape?: (pagina: number, total: number) => string;
};

const LARGURA = 595;
const ALTURA = 842;
const MARGEM = 56;
const UTIL = LARGURA - MARGEM * 2;

// Cabeçalho e rodapé.
const LOGO_ALTURA = 50;
const TITULO_TAMANHO = 17;
const INFO_TAMANHO = 9.5;
const INFO_ENTRELINHA = 12.5;
const RODAPE_Y = 40;
const RODAPE_TAMANHO = 9;

type Estilo = { tamanho: number; negrito: boolean; antes: number };

const ESTILOS: Record<PdfBloco["tipo"], Estilo> = {
  secao: { tamanho: 12, negrito: true, antes: 16 },
  negrito: { tamanho: 10, negrito: true, antes: 10 },
  texto: { tamanho: 10, negrito: false, antes: 2 },
  espaco: { tamanho: 10, negrito: false, antes: 8 },
};

// Remove o que a codificação WinAnsi não representa e troca aspas/travessões.
const limpar = (texto: string) =>
  texto
    .replace(/\u00a0/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x20-\x7e\u00a0-\u00ff]/g, "?");

// Largura de cada caractere (32 a 126) em milésimos de "em", nas métricas
// padrão da Helvetica e da Helvetica-Bold. Serve para centralizar e quebrar as
// linhas com precisão (a aproximação por largura média deixava o texto torto).
const LARGURAS_NORMAL = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833,
  722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556,
  556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334,
  260, 334, 584,
];

const LARGURAS_NEGRITO = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833,
  722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611,
  556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389,
  280, 389, 584,
];

const larguraChar = (caractere: string, negrito: boolean) => {
  const tabela = negrito ? LARGURAS_NEGRITO : LARGURAS_NORMAL;
  const codigo = caractere.codePointAt(0) ?? 32;
  if (codigo >= 32 && codigo <= 126) return tabela[codigo - 32];
  // Nas acentuadas vale a largura da letra base (á = a, ç = c, ã = a...).
  const base = caractere.normalize("NFD").charCodeAt(0);
  if (base >= 32 && base <= 126) return tabela[base - 32];
  return 556;
};

// Largura do texto, em pontos.
const medir = (conteudo: string, tamanho: number, negrito: boolean) => {
  let total = 0;
  for (const caractere of limpar(conteudo)) total += larguraChar(caractere, negrito);
  return (total * tamanho) / 1000;
};

const escapar = (texto: string) => texto.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const texto = (conteudo: string, tamanho: number, negrito: boolean, x: number, y: number) =>
  `BT /F${negrito ? 2 : 1} ${tamanho} Tf 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm (${escapar(conteudo)}) Tj ET`;

const centrado = (conteudo: string, tamanho: number, negrito: boolean, y: number) =>
  texto(conteudo, tamanho, negrito, (LARGURA - medir(conteudo, tamanho, negrito)) / 2, y);

function quebrar(conteudo: string, tamanho: number, negrito: boolean): string[] {
  const limite = UTIL;
  const linhas: string[] = [];
  let atual = "";

  conteudo
    .split(/\s+/)
    .filter(Boolean)
    .forEach((palavra) => {
      const teste = atual ? `${atual} ${palavra}` : palavra;
      if (medir(teste, tamanho, negrito) <= limite) {
        atual = teste;
        return;
      }
      if (atual) linhas.push(atual);
      // Palavra maior que a linha inteira: corta em pedaços que caibam.
      let resto = palavra;
      while (medir(resto, tamanho, negrito) > limite && resto.length > 1) {
        let corte = resto.length - 1;
        while (corte > 1 && medir(resto.slice(0, corte), tamanho, negrito) > limite) corte -= 1;
        linhas.push(resto.slice(0, corte));
        resto = resto.slice(corte);
      }
      atual = resto;
    });

  if (atual) linhas.push(atual);
  return linhas.length ? linhas : [""];
}

export function gerarPdf(doc: PdfDocumento): Uint8Array {
  const logoLargura = doc.logo ? (LOGO_ALTURA * doc.logo.largura) / doc.logo.altura : 0;
  const logoY = ALTURA - MARGEM - LOGO_ALTURA;
  const tituloY = logoY + LOGO_ALTURA - 15;

  // Informações do cabeçalho (nome, avaliação, status, prazo) centralizadas,
  // logo abaixo do título e do logotipo.
  const informacoes = doc.informacoes.map(limpar);
  const infoInicio = logoY - 16;
  const infoFim = infoInicio - Math.max(0, informacoes.length - 1) * INFO_ENTRELINHA;
  const linhaY = infoFim - 12;
  const corpoTopo = linhaY - 26;
  const corpoBase = RODAPE_Y + 22;

  // Primeiro monta o corpo, quebrando em quantas páginas precisar.
  const paginas: string[][] = [];
  let ops: string[] = [];
  let y = corpoTopo;

  const novaPagina = () => {
    if (ops.length) paginas.push(ops);
    ops = [];
    y = corpoTopo;
  };

  doc.blocos.forEach((bloco) => {
    const estilo = ESTILOS[bloco.tipo];
    if (bloco.tipo === "espaco") {
      y -= estilo.antes;
      return;
    }

    const conteudo = limpar(bloco.texto);
    const linhas = quebrar(conteudo, estilo.tamanho, estilo.negrito);
    const altura = estilo.tamanho * 1.25;

    linhas.forEach((linha, indice) => {
      const espaco = indice === 0 ? estilo.antes : estilo.tamanho * 0.45;
      // Títulos de pergunta não ficam sozinhos no pé da página: exige espaço
      // para o próprio título e mais duas linhas do item.
      const reserva = indice === 0 && estilo.antes > 0 ? altura * 3 : 0;
      if (y - espaco - altura - reserva < corpoBase) novaPagina();
      y -= espaco + altura;
      ops.push(texto(linha, estilo.tamanho, estilo.negrito, MARGEM, y));
    });
  });

  if (ops.length) paginas.push(ops);
  if (!paginas.length) paginas.push([]);

  const total = paginas.length;

  // Cabeçalho repetido em todas as páginas, com a linha separando do corpo.
  const cabecalho: string[] = [];
  if (doc.logo) {
    cabecalho.push(`q ${logoLargura.toFixed(1)} 0 0 ${LOGO_ALTURA} ${MARGEM} ${logoY.toFixed(1)} cm /Im1 Do Q`);
  }
  cabecalho.push(centrado(doc.titulo, TITULO_TAMANHO, true, tituloY));
  informacoes.forEach((linha, indice) => {
    cabecalho.push(centrado(linha, INFO_TAMANHO, false, infoInicio - indice * INFO_ENTRELINHA));
  });
  cabecalho.push(`0.6 G 0.7 w ${MARGEM} ${linhaY.toFixed(1)} m ${LARGURA - MARGEM} ${linhaY.toFixed(1)} l S`);

  // Índices dos objetos: 1 catálogo, 2 páginas, depois página/conteúdo por
  // página, as duas fontes e, por último, a imagem do logotipo.
  const fonteRegular = 3 + total * 2;
  const fonteNegrito = 4 + total * 2;
  const imagem = 5 + total * 2;

  const objetos: string[] = [];
  objetos.push("<< /Type /Catalog /Pages 2 0 R >>");
  objetos.push(
    `<< /Type /Pages /Kids [${paginas.map((_, i) => `${3 + i * 2} 0 R`).join(" ")}] /Count ${total} >>`,
  );

  const xobject = doc.logo ? ` /XObject << /Im1 ${imagem} 0 R >>` : "";

  paginas.forEach((corpo, i) => {
    const rodape = doc.rodape ? doc.rodape(i + 1, total) : "";
    const conteudo = [...cabecalho, ...corpo, ...(rodape ? [centrado(rodape, RODAPE_TAMANHO, false, RODAPE_Y)] : [])].join(
      "\n",
    );
    objetos.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${LARGURA} ${ALTURA}] /Resources << /Font << /F1 ${fonteRegular} 0 R /F2 ${fonteNegrito} 0 R >>${xobject} >> /Contents ${4 + i * 2} 0 R >>`,
    );
    objetos.push(`<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`);
  });

  objetos.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objetos.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  if (doc.logo) {
    const jpeg = Array.from(doc.logo.dados, (b) => String.fromCharCode(b)).join("");
    objetos.push(
      `<< /Type /XObject /Subtype /Image /Width ${doc.logo.largura} /Height ${doc.logo.altura} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${doc.logo.dados.length} >>\nstream\n${jpeg}\nendstream`,
    );
  }

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

  // A codificação WinAnsi é de um byte por caractere (e o JPEG já está em
  // bytes), então o tamanho em caracteres é o tamanho em bytes do PDF.
  const bytes = new Uint8Array(saida.length);
  for (let i = 0; i < saida.length; i += 1) bytes[i] = saida.charCodeAt(i) & 0xff;
  return bytes;
}
