import { anosCompletos, fimMesAtualBR } from "./promessa";

// Identificadores dos ramos usados no cadastro de jovens (tabela public.ramo).
export const RAMO_JOVEM = {
  filhotes: 4,
  lobinho: 3,
  escoteiro: 2,
  senior: 5,
  pioneiro: 6,
} as const;

export type NomeRamo = keyof typeof RAMO_JOVEM;

export type JovemDatas = {
  dataacolhida?: string | null;
  datapassagemlobinho?: string | null;
  datapromessalobinho?: string | null;
  deducaolobinho?: number | null;
  datapassagemescoteiro?: string | null;
  datapromessaescoteiro?: string | null;
  deducaoescoteiro?: number | null;
  datapassagemsenior?: string | null;
  datapromessasenior?: string | null;
  deducaosenior?: number | null;
  datapassagempioneiro?: string | null;
  datapromessapioneiro?: string | null;
  deducaopioneiro?: number | null;
  idramo?: number | null;
};

export type CalculoJovem = {
  /** Data que vale como promessa: a primeira promessa preenchida na ordem
   * lobinho, escoteiro, sênior, pioneiro; para filhotes, a data de acolhida. */
  dataConsiderada: string | null;
  anosPromessa: number | null;
  deducaoTotal: number;
  anosNoRamo: number | null;
  anosPorRamo: Record<NomeRamo, number | null>;
};

const NOMES_POR_ID: Record<number, NomeRamo> = {
  [RAMO_JOVEM.filhotes]: "filhotes",
  [RAMO_JOVEM.lobinho]: "lobinho",
  [RAMO_JOVEM.escoteiro]: "escoteiro",
  [RAMO_JOVEM.senior]: "senior",
  [RAMO_JOVEM.pioneiro]: "pioneiro",
};

/**
 * Data que comprova a promessa: acolhida para filhotes; para os demais ramos,
 * a primeira promessa preenchida (lobinho, escoteiro, sênior, pioneiro).
 * Diferente de calcularJovem, não usa a acolhida como fallback dos outros ramos.
 */
export function dataPromessaOuAcolhida(j: JovemDatas): string | null {
  if (j.idramo && NOMES_POR_ID[j.idramo] === "filhotes") return j.dataacolhida ?? null;
  return (
    j.datapromessalobinho ??
    j.datapromessaescoteiro ??
    j.datapromessasenior ??
    j.datapromessapioneiro ??
    null
  );
}

// Início de cada ramo e o ramo seguinte (que marca o fim do anterior).
const INICIO: Record<NomeRamo, keyof JovemDatas> = {
  filhotes: "dataacolhida",
  lobinho: "datapassagemlobinho",
  escoteiro: "datapassagemescoteiro",
  senior: "datapassagemsenior",
  pioneiro: "datapassagempioneiro",
};

const FIM: Record<NomeRamo, keyof JovemDatas | null> = {
  filhotes: "datapassagemlobinho",
  lobinho: "datapassagemescoteiro",
  escoteiro: "datapassagemsenior",
  senior: "datapassagempioneiro",
  pioneiro: null,
};

const DEDUCAO: Record<NomeRamo, keyof JovemDatas | null> = {
  filhotes: null, // Filhotes não tem dedução.
  lobinho: "deducaolobinho",
  escoteiro: "deducaoescoteiro",
  senior: "deducaosenior",
  pioneiro: "deducaopioneiro",
};

const inteiro = (valor: unknown): number | null =>
  valor === null || valor === undefined || !Number.isFinite(Number(valor)) ? null : Math.trunc(Number(valor));

/**
 * Tempo de promessa e tempo por ramo de um jovem.
 *
 * - A promessa considerada é a primeira preenchida na ordem lobinho, escoteiro,
 *   sênior, pioneiro; promessas posteriores não entram no cálculo.
 * - Filhotes usa a data de acolhida (não tem promessa nem dedução).
 * - O tempo de promessa vai da promessa até o fim do mês atual, menos a soma
 *   das deduções dos ramos.
 * - O tempo em cada ramo vai da data de passagem para o ramo até a passagem
 *   para o ramo seguinte (ou fim do mês, se for o ramo atual), menos a dedução
 *   daquele ramo.
 */
export function calcularJovem(j: JovemDatas, fim = fimMesAtualBR()): CalculoJovem {
  const promessa =
    j.datapromessalobinho ?? j.datapromessaescoteiro ?? j.datapromessasenior ?? j.datapromessapioneiro ?? null;
  const dataConsiderada = promessa ?? j.dataacolhida ?? null;

  const deducaoTotal = (
    [j.deducaolobinho, j.deducaoescoteiro, j.deducaosenior, j.deducaopioneiro] as const
  ).reduce<number>((soma, valor) => soma + (inteiro(valor) ?? 0), 0);

  const anosPromessa = anosCompletos(dataConsiderada, fim, deducaoTotal);

  const anosPorRamo = (Object.keys(INICIO) as NomeRamo[]).reduce(
    (acumulado, ramo) => {
      const inicio = j[INICIO[ramo]];
      if (!inicio) {
        acumulado[ramo] = null;
        return acumulado;
      }
      const fimRamo = FIM[ramo] ? j[FIM[ramo] as keyof JovemDatas] : null;
      const deducao = DEDUCAO[ramo] ? j[DEDUCAO[ramo] as keyof JovemDatas] : null;
      acumulado[ramo] = anosCompletos(
        String(inicio),
        String(fimRamo ?? fim),
        inteiro(deducao) ?? null,
      );
      return acumulado;
    },
    {} as Record<NomeRamo, number | null>,
  );

  const ramoAtual = j.idramo ? NOMES_POR_ID[j.idramo] : undefined;

  return {
    dataConsiderada,
    anosPromessa,
    deducaoTotal,
    anosNoRamo: ramoAtual ? anosPorRamo[ramoAtual as NomeRamo] : null,
    anosPorRamo,
  };
}
