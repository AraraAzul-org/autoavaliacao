"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";

function ler(f: FormData) {
  const data = (k: string) => (f.get(k) ? String(f.get(k)) : null);
  const num = (k: string) => (f.get(k) ? Number(f.get(k)) : null);
  return {
    registro: String(f.get("registro") ?? "").trim(),
    nome: String(f.get("nome") ?? "").trim(),
    idramo: num("idramo"),
    dataregistro: data("dataregistro"),
    datanascimento: data("datanascimento"),
    dataacolhida: data("dataacolhida"),
    datapassagemlobinho: data("datapassagemlobinho"),
    datapromessalobinho: data("datapromessalobinho"),
    deducaolobinho: num("deducaolobinho"),
    datapassagemescoteiro: data("datapassagemescoteiro"),
    datapromessaescoteiro: data("datapromessaescoteiro"),
    deducaoescoteiro: num("deducaoescoteiro"),
    datapassagemsenior: data("datapassagemsenior"),
    datapromessasenior: data("datapromessasenior"),
    deducaosenior: num("deducaosenior"),
    datapassagempioneiro: data("datapassagempioneiro"),
    datapromessapioneiro: data("datapromessapioneiro"),
    deducaopioneiro: num("deducaopioneiro"),
    ativo: f.get("ativo") === "on",
    datamedalhabonservicos: data("datamedalhabonservicos"),
  };
}

async function exigirCadastro() {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu?.podeCadastros) redirect("/");
  return { supabase, eu };
}

type ErroBanco = { code?: string; message?: string } | null;

const msgErro = (error?: ErroBanco) =>
  error?.code === "23505"
    ? "Este registro já está cadastrado para outro jovem."
    : "Não foi possível salvar. Confira os dados.";

function validar(d: ReturnType<typeof ler>): string | null {
  if (!d.registro) return "Informe o registro.";
  if (!d.nome) return "Informe o nome.";
  if (!d.idramo) return "Informe o ramo.";
  if (!d.datanascimento) return "Informe a data de nascimento.";
  const deducoes = [d.deducaolobinho, d.deducaoescoteiro, d.deducaosenior, d.deducaopioneiro];
  if (deducoes.some((v) => v !== null && (!Number.isInteger(v) || v < 0))) {
    return "As deduções devem ser números inteiros de anos, sem valor negativo.";
  }
  return null;
}

export async function criarJovem(formData: FormData) {
  const { supabase, eu } = await exigirCadastro();
  const d = ler(formData);
  const volta = (m: string): never => redirect(`/jovens?erro=${encodeURIComponent(m)}`);

  const invalido = validar(d);
  if (invalido) volta(invalido);

  const dados = { ...d, datainativacao: d.ativo ? null : new Date().toISOString(), idusuarioinativacao: d.ativo ? null : eu.idusuario };
  const { data: novo, error } = await supabase.from("jovem").insert(dados).select("idjovem").single();
  if (error || !novo) return volta(msgErro(error));

  revalidatePath("/jovens");
  redirect("/jovens?ok=criado");
}

export async function atualizarJovem(id: number, formData: FormData) {
  const { supabase, eu } = await exigirCadastro();
  const d = ler(formData);
  const volta = (m: string): never => redirect(`/jovens/${id}?erro=${encodeURIComponent(m)}`);

  const invalido = validar(d);
  if (invalido) volta(invalido);

  const { data: atual } = await supabase.from("jovem").select("ativo").eq("idjovem", id).maybeSingle();
  if (!atual) volta("Jovem não encontrado.");

  const ativoAtual = Boolean(atual?.ativo);

  const registroStatus =
    d.ativo === ativoAtual
      ? {}
      : d.ativo
        ? { datainativacao: null, idusuarioinativacao: null }
        : { datainativacao: new Date().toISOString(), idusuarioinativacao: eu.idusuario };

  const { data, error } = await supabase
    .from("jovem")
    .update({ ...d, ...registroStatus })
    .eq("idjovem", id)
    .select("idjovem");
  if (error || !data?.length) volta(msgErro(error));
  revalidatePath("/jovens");
  redirect("/jovens?ok=salvo");
}
