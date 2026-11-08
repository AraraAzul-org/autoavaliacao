"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function criarUsuario(formData: FormData) {
  const supabase = await createClient();
  const num = (k: string) => {
    const v = formData.get(k);
    return v ? Number(v) : null;
  };
  const { error } = await supabase.from("usuario").insert({
    nome: String(formData.get("nome") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    linha: String(formData.get("linha") ?? ""),
    idramo: num("idramo"),
    idcargo: num("idcargo"),
    idsituacao: num("idsituacao"),
    idapf: num("idapf"),
    datasituacao: formData.get("datasituacao") || null,
    membrogrupo: formData.get("membrogrupo") === "on",
  });
  if (error) {
    const msg = error.code === "23505" ? "Este e-mail já está cadastrado." : "Não foi possível salvar. Confira os dados.";
    redirect(`/usuarios?erro=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/usuarios");
  redirect("/usuarios?ok=1");
}
