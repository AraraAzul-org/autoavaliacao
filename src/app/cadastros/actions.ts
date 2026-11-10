"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { CADASTROS } from "@/lib/cadastros";

async function preparar(f: FormData) {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu?.diretor) redirect("/");
  const cfg = CADASTROS[String(f.get("tabela") ?? "")];
  if (!cfg) redirect("/");
  return { supabase, cfg, tabela: String(f.get("tabela")) };
}

function voltar(rota: string, tipo: "ok" | "erro", msg: string): never {
  revalidatePath(rota);
  redirect(`${rota}?${tipo}=${encodeURIComponent(msg)}`);
}

export async function salvarSimples(f: FormData) {
  const { supabase, cfg, tabela } = await preparar(f);
  const dados: Record<string, string | boolean> = {};
  for (const c of cfg.campos) {
    if (c.tipo === "bool") dados[c.nome] = f.get(c.nome) === "on";
    else {
      const v = String(f.get(c.nome) ?? "").trim();
      if (!v) voltar(cfg.rota, "erro", `Informe: ${c.rotulo}.`);
      dados[c.nome] = v;
    }
  }
  const id = f.get("id") ? Number(f.get("id")) : null;
  const { error } = id
    ? await supabase.from(tabela).update(dados).eq(cfg.chave, id)
    : await supabase.from(tabela).insert(dados);
  if (error) voltar(cfg.rota, "erro", "Não foi possível salvar. Confira os dados.");
  voltar(cfg.rota, "ok", "Registro salvo.");
}

export async function excluirSimples(f: FormData) {
  const { supabase, cfg, tabela } = await preparar(f);
  const id = Number(f.get("id"));
  if (!id) voltar(cfg.rota, "erro", "Pedido inválido.");
  const { error } = await supabase.from(tabela).delete().eq(cfg.chave, id);
  if (error) {
    voltar(cfg.rota, "erro", error.code === "23503"
      ? "Não é possível excluir: há usuários ou registros usando este item."
      : "Não foi possível excluir.");
  }
  voltar(cfg.rota, "ok", "Registro excluído.");
}
