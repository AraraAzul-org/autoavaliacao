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
 * Anos de promessa = anos completos entre a data da promessa e hoje,
 * menos a dedução informada (anos já contados antes da promessa).
 * Devolve null quando não há data válida ou quando a data está no futuro.
 */
export function anosPromessa(
  datapromessa?: string | null,
  deducao?: number | null,
): number | null {
  if (!datapromessa) return null;
  const iso = String(datapromessa).slice(0, 10);
  const [ano, mes, dia] = iso.split("-").map(Number);
  if (!ano || !mes || !dia) return null;

  const [anoHoje, mesHoje, diaHoje] = hojeBR().split("-").map(Number);

  let anos = anoHoje - ano;
  if (mesHoje < mes || (mesHoje === mes && diaHoje < dia)) anos -= 1;
  if (anos < 0) return null;

  const desconto = Number.isFinite(Number(deducao)) ? Math.trunc(Number(deducao)) : 0;
  return Math.max(0, anos - desconto);
}

/** Data no formato brasileiro a partir de um ISO (aaaa-mm-dd). */
export function dataBR(iso?: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = String(iso).slice(0, 10).split("-");
  if (!ano || !mes || !dia) return "—";
  return `${dia}/${mes}/${ano}`;
}
