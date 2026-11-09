"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, temChaveDeServico } from "@/lib/supabase/admin";

export async function trocarSenha(formData: FormData) {
  const nova = String(formData.get("nova") ?? "");
  const confirmar = String(formData.get("confirmar") ?? "");
  const volta = (m: string): never => redirect(`/trocar-senha?erro=${encodeURIComponent(m)}`);

  if (nova.length < 8) volta("A senha deve ter pelo menos 8 caracteres.");
  if (nova !== confirmar) volta("As senhas não conferem.");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { error } = await supabase.auth.updateUser({ password: nova });
  if (error) volta("Não foi possível alterar a senha. Tente uma senha diferente.");

  if (temChaveDeServico()) {
    await createAdminClient().auth.admin.updateUserById(auth.user.id, { app_metadata: { trocar_senha: false } });
    await supabase.auth.refreshSession();
  }
  redirect("/");
}
