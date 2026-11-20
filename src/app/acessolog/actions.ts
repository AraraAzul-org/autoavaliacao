"use server";

import { createClient } from "@/lib/supabase/server";

/** Grava a opção consultada pelo usuário atual (a RPC resolve o usuário pela sessão). */
export async function registrarAcesso(opcao: string) {
  if (!opcao || typeof opcao !== "string") return;
  const supabase = await createClient();
  await supabase.rpc("registrar_acesso", { p_opcao: opcao.slice(0, 80) });
}
