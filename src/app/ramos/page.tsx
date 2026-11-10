import { CadastroSimples } from "@/components/CadastroSimples";

export const instant = false;

export default function Pagina({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  return <CadastroSimples tabela="ramo" searchParams={searchParams} />;
}
