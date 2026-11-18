"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";

const MAX_TEXTO = 2000;

const dataValida = (valor: string) => !valor || /^\d{4}-\d{2}-\d{2}$/.test(valor);

async function exigirDono(f: FormData) {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");

  const idppf = Number(f.get("idppf"));
  if (!Number.isInteger(idppf)) redirect("/meu-ppf");

  const { data } = await supabase
    .from("ppf")
    .select("idppf, idusuario, status")
    .eq("idppf", idppf)
    .maybeSingle();
  if (!data || data.idusuario !== eu.idusuario) redirect("/meu-ppf");

  return { supabase, eu, idppf, status: String(data.status) };
}

function voltar(idppf: number, tipo: "ok" | "erro", msg: string): never {
  revalidatePath("/meu-ppf");
  revalidatePath(`/meu-ppf/${idppf}`);
  redirect(`/meu-ppf/${idppf}?${new URLSearchParams({ [tipo]: msg }).toString()}`);
}

// Grava a ação e a data prevista dos itens gerados pela avaliação.
export async function salvarItens(f: FormData) {
  const { supabase, idppf, status } = await exigirDono(f);
  if (status !== "aberto") voltar(idppf, "erro", "Este PPF está fechado e não pode mais ser alterado.");

  const { data: itens } = await supabase
    .from("ppfitem")
    .select("idppfitem")
    .eq("idppf", idppf)
    .eq("manual", false);

  const ids = (itens ?? []).map((i) => Number(i.idppfitem));
  if (!ids.length) voltar(idppf, "erro", "Este PPF não tem itens gerados para salvar.");

  for (const id of ids) {
    const acao = String(f.get(`acao_${id}`) ?? "").trim();
    const data = String(f.get(`data_${id}`) ?? "").trim();

    if (acao.length > MAX_TEXTO) voltar(idppf, "erro", "A ação pode ter no máximo 2.000 caracteres.");
    if (!dataValida(data)) voltar(idppf, "erro", "Informe uma data prevista válida.");

    const { error } = await supabase
      .from("ppfitem")
      .update({ acao: acao || null, dataprevista: data || null })
      .eq("idppfitem", id)
      .eq("idppf", idppf);
    if (error) voltar(idppf, "erro", "Não foi possível salvar o PPF. Tente novamente.");
  }

  voltar(idppf, "ok", "PPF salvo.");
}

// Itens criados pela própria pessoa: descrição livre e data prevista.
export async function adicionarItem(f: FormData) {
  const { supabase, idppf, status } = await exigirDono(f);
  if (status !== "aberto") voltar(idppf, "erro", "Este PPF está fechado e não pode mais ser alterado.");

  const descricao = String(f.get("descricao") ?? "").trim();
  const data = String(f.get("dataprevista") ?? "").trim();

  if (!descricao) voltar(idppf, "erro", "Descreva o item que será incluído no PPF.");
  if (descricao.length > MAX_TEXTO) voltar(idppf, "erro", "A descrição pode ter no máximo 2.000 caracteres.");
  if (!dataValida(data)) voltar(idppf, "erro", "Informe uma data prevista válida.");

  const { data: ultimo } = await supabase
    .from("ppfitem")
    .select("ordem")
    .eq("idppf", idppf)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("ppfitem").insert({
    idppf,
    resposta: descricao,
    dataprevista: data || null,
    manual: true,
    ordem: Number(ultimo?.ordem ?? 0) + 1,
  });
  if (error) voltar(idppf, "erro", "Não foi possível incluir o item. Tente novamente.");

  voltar(idppf, "ok", "Item incluído no PPF.");
}

// Salva ou exclui um item incluído pela pessoa. Os itens gerados pela
// avaliação não podem ser excluídos.
export async function editarItem(f: FormData) {
  const { supabase, idppf, status } = await exigirDono(f);
  if (status !== "aberto") voltar(idppf, "erro", "Este PPF está fechado e não pode mais ser alterado.");

  const id = Number(f.get("idppfitem"));
  if (!Number.isInteger(id)) voltar(idppf, "erro", "Item inválido.");

  const { data: item } = await supabase
    .from("ppfitem")
    .select("idppfitem, manual")
    .eq("idppfitem", id)
    .eq("idppf", idppf)
    .maybeSingle();
  if (!item || !item.manual) voltar(idppf, "erro", "Este item não pode ser alterado.");

  if (String(f.get("intencao") ?? "salvar") === "excluir") {
    const { error } = await supabase
      .from("ppfitem")
      .delete()
      .eq("idppfitem", id)
      .eq("idppf", idppf)
      .eq("manual", true);
    if (error) voltar(idppf, "erro", "Não foi possível excluir o item.");
    voltar(idppf, "ok", "Item excluído.");
  }

  const descricao = String(f.get("descricao") ?? "").trim();
  const data = String(f.get("dataprevista") ?? "").trim();
  if (!descricao) voltar(idppf, "erro", "Descreva o item.");
  if (descricao.length > MAX_TEXTO) voltar(idppf, "erro", "A descrição pode ter no máximo 2.000 caracteres.");
  if (!dataValida(data)) voltar(idppf, "erro", "Informe uma data prevista válida.");

  const { error } = await supabase
    .from("ppfitem")
    .update({ resposta: descricao, dataprevista: data || null })
    .eq("idppfitem", id)
    .eq("idppf", idppf);
  if (error) voltar(idppf, "erro", "Não foi possível salvar o item.");

  voltar(idppf, "ok", "Item salvo.");
}
