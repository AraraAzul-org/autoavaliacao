export function tempoDesde(iso: string | null): string {
  if (!iso) return "—";

  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  if (!ano || !mes || !dia) return "—";

  const agora = new Date();
  let anos = agora.getUTCFullYear() - ano;
  let meses = agora.getUTCMonth() + 1 - mes;
  let dias = agora.getUTCDate() - dia;

  if (dias < 0) {
    meses -= 1;
    // Dias do mês anterior ao atual, para completar o mês incompleto.
    const anterior = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 0));
    dias += anterior.getUTCDate();
  }
  if (meses < 0) {
    anos -= 1;
    meses += 12;
  }
  if (anos < 0) return "—";

  const plural = (n: number, singular: string, plurais: string) =>
    `${n} ${n === 1 ? singular : plurais}`;

  if (anos > 0) {
    return meses > 0
      ? `${plural(anos, "ano", "anos")} e ${plural(meses, "mês", "meses")}`
      : plural(anos, "ano", "anos");
  }
  if (meses > 0) {
    return dias > 0
      ? `${plural(meses, "mês", "meses")} e ${plural(dias, "dia", "dias")}`
      : plural(meses, "mês", "meses");
  }
  if (dias > 0) return plural(dias, "dia", "dias");
  return "hoje";
}
