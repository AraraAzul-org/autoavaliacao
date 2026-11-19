import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { MenuItens } from "@/components/MenuItens";

// O menu é montado no servidor para esconder as áreas da diretoria de quem não é diretor.
export async function Menu() {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  return (
    <MenuItens
      cadastros={!!eu?.podeCadastros}
      parecer={!!eu?.podeParecer}
      resultados={!!eu?.podeResultados}
    />
  );
}
