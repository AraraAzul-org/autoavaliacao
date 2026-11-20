import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { MenuItens } from "@/components/MenuItens";

// O menu é montado no servidor a partir da tabela de liberações, para que
// esconder um item do menu signifique também bloquear a rota.
export async function Menu() {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  return <MenuItens acessos={Array.from(eu?.acessos ?? [])} />;
}
