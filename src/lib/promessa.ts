// Datas de promessa são dias civis; por isso as contas usam o dia de hoje
// no horário de Brasília, e não o dia em UTC do servidor.
export const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function hojeBR(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function mesAtualBR(): number {
  return Number(hojeBR().slice(5, 7));
}

/**
 * Último dia do mês corrente em Brasília. As contas de anos consideram sempre
 * o fim do mês, e não o dia de hoje.
 */
export function fimMesAtualBR(): string {
  const [ano, mes] = hojeBR().split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
}

/**
 * Anos completos entre duas datas (aaaa-mm-dd), menos a dedução em anos
 * inteiros. Devolve null quando falta alguma data, quando o fim é anterior ao
 * início ou quando o resultado seria negativo.
 */
export function anosCompletos(
  inicio?: string | null,
  fim?: string | null,
  deducao?: number | null,
): number | null {
  if (!inicio || !fim) return null;
  const [anoInicio, mesInicio, diaInicio] = String(inicio).slice(0, 10).split("-").map(Number);
  const [anoFim, mesFim, diaFim] = String(fim).slice(0, 10).split("-").map(Number);
  if (!anoInicio || !mesInicio || !diaInicio || !anoFim || !mesFim || !diaFim) return null;

  let anos = anoFim - anoInicio;
  if (mesFim < mesInicio || (mesFim === mesInicio && diaFim < diaInicio)) anos -= 1;
  if (anos < 0) return null;

  const desconto = Number.isFinite(Number(deducao)) ? Math.trunc(Number(deducao)) : 0;
  return Math.max(0, anos - desconto);
}

/**
 * Anos de promessa = anos completos entre a data da promessa e o fim do mês
 * atual, menos a dedução informada (anos já contados antes da promessa).
 * Devolve null quando não há data válida.
 */
export function anosPromessa(
  datapromessa?: string | null,
  deducao?: number | null,
): number | null {
  if (!datapromessa) return null;
  return anosCompletos(String(datapromessa).slice(0, 10), fimMesAtualBR(), deducao);
}

/** Data no formato brasileiro a partir de um ISO (aaaa-mm-dd). */
export function dataBR(iso?: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = String(iso).slice(0, 10).split("-");
  if (!ano || !mes || !dia) return "—";
  return `${dia}/${mes}/${ano}`;
}
