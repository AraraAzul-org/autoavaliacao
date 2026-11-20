import type { SupabaseClient } from "@supabase/supabase-js";

export const BUCKET_LENCOS = "lencos";

export type Lenco = {
  idlenco: number;
  grupoescoteiro: string;
  numero: string;
  uf: string;
  nomeescoteiro: string;
  nomeescoteiroarara: string;
  nomeatividade: string;
  data: string;
  fotolenco: string | null;
  fotoentrega: string | null;
  observacao: string | null;
  criadoem?: string;
};

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export function dataBR(iso: string | null) {
  if (!iso) return "—";
  const partes = iso.slice(0, 10).split("-");
  if (partes.length !== 3) return iso;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

export async function urlAssinada(supabase: SupabaseClient, caminho: string | null) {
  if (!caminho) return null;
  const { data } = await supabase.storage
    .from(BUCKET_LENCOS)
    .createSignedUrl(caminho, 60 * 60);
  return data?.signedUrl ?? null;
}

export type LencoComFotos = Lenco & { urlLenco: string | null; urlEntrega: string | null };

export async function comFotosAssinadas(
  supabase: SupabaseClient,
  lenco: Lenco,
): Promise<LencoComFotos> {
  const [urlLenco, urlEntrega] = await Promise.all([
    urlAssinada(supabase, lenco.fotolenco),
    urlAssinada(supabase, lenco.fotoentrega),
  ]);
  return { ...lenco, urlLenco, urlEntrega };
}
