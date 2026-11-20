"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { CHAVES_MENU } from "@/lib/menu";

export async function salvarAcessos(formData: FormData) {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  if (!eu.acessos.has("usuarios")) redirect("/");

  const id = Number(formData.get("idusuario"));
  if (!Number.isInteger(id) || id <= 0) {
    redirect("/usuarios?erro=Associado+invalido.");
  }

  const marcados = new Set(formData.getAll("acessos").map(String));
  const liberadas = CHAVES_MENU.filter((chave) => marcados.has(chave));

  // A própria direção não pode se trancar fora da gestão de associados e do log.
  if (id === eu.idusuario) {
    for (const chave of ["usuarios", "acessolog"]) {
      if (eu.acessos.has(chave) && !liberadas.includes(chave)) liberadas.push(chave);
    }
  }

  const linhas = CHAVES_MENU.map((chave) => ({
    idusuario: id,
    chave,
    liberado: liberadas.includes(chave),
  }));
  const { error } = await supabase
    .from("usuario_menu")
    .upsert(linhas, { onConflict: "idusuario,chave" });
  if (error) {
    redirect(`/usuarios/${id}/acessos?erro=${encodeURIComponent("Não foi possível salvar as liberações.")}`);
  }

  revalidatePath("/");
  revalidatePath("/usuarios");
  redirect(`/usuarios/${id}/acessos?ok=${encodeURIComponent("Liberações salvas.")}`);
}
