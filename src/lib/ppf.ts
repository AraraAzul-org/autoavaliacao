import type { SupabaseClient } from "@supabase/supabase-js";

export const STATUS_PPF: Record<string, { rotulo: string; classe: string }> = {
  aberto: { rotulo: "Aberto", classe: "bg-green-100 text-green-800" },
  fechado: { rotulo: "Fechado", classe: "bg-gray-100 text-gray-700" },
};

export type Ppf = {
  idppf: number;
  idavaliacao: number;
  idusuario: number;
  status: string;
  datageracao: string;
  datafechamento: string | null;
};

export type PpfAvaliacao = { idavaliacao: number; descricao: string; prazo: string; status: string };

export type PpfItem = {
  idppfitem: number;
  idppf: number;
  idpergunta: number | null;
  idpontuacao: number | null;
  etapa: string | null;
  codigo: string | null;
  pergunta: string | null;
  resposta: string | null;
  nota: number | null;
  acao: string | null;
  dataprevista: string | null;
  manual: boolean;
  ordem: number;
};

export type PpfCompleto = {
  ppf: Ppf;
  avaliacao: PpfAvaliacao | null;
  usuario: { nome: string } | null;
  itens: PpfItem[];
};

const COLUNAS_ITEM =
  "idppfitem, idppf, idpergunta, idpontuacao, etapa, codigo, pergunta, resposta, nota, acao, dataprevista, manual, ordem";

// Um registro por avaliação e por associado, com os itens gerados (abaixo da
// nota mínima da etapa) e os itens que o próprio associado incluiu.
export async function carregarPpf(supabase: SupabaseClient, idppf: number): Promise<PpfCompleto | null> {
  const { data } = await supabase
    .from("ppf")
    .select(
      "idppf, idavaliacao, idusuario, status, datageracao, datafechamento, avaliacao:avaliacao(idavaliacao, descricao, prazo, status), usuario:usuario(nome)",
    )
    .eq("idppf", idppf)
    .maybeSingle();
  if (!data) return null;

  const av = Array.isArray(data.avaliacao) ? data.avaliacao[0] : data.avaliacao;
  const us = Array.isArray(data.usuario) ? data.usuario[0] : data.usuario;

  const { data: itens } = await supabase
    .from("ppfitem")
    .select(COLUNAS_ITEM)
    .eq("idppf", idppf)
    .order("ordem", { ascending: true })
    .order("idppfitem", { ascending: true });

  return {
    ppf: {
      idppf: data.idppf,
      idavaliacao: data.idavaliacao,
      idusuario: data.idusuario,
      status: data.status,
      datageracao: data.datageracao,
      datafechamento: data.datafechamento,
    },
    avaliacao: (av as PpfAvaliacao) ?? null,
    usuario: (us as { nome: string }) ?? null,
    itens: ((itens ?? []) as PpfItem[]).map((i) => ({ ...i, manual: !!i.manual })),
  };
}

// Junta os itens gerados por etapa, mantendo a ordem em que foram criados.
export function agruparPorEtapa(itens: PpfItem[]) {
  const grupos: { etapa: string; itens: PpfItem[] }[] = [];
  itens
    .filter((i) => !i.manual)
    .forEach((item) => {
      const etapa = item.etapa ?? "Sem etapa";
      const grupo = grupos.find((g) => g.etapa === etapa);
      if (grupo) grupo.itens.push(item);
      else grupos.push({ etapa, itens: [item] });
    });
  return grupos;
}

export const dataBR = (iso: string | null) =>
  iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—";
