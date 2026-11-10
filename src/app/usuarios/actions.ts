"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { gerirAcesso } from "@/lib/acesso";
import { carregarEu } from "@/lib/eu";

function ler(f: FormData) {
  const num = (k: string) => (f.get(k) ? Number(f.get(k)) : null);
  return {
    nome: String(f.get("nome") ?? "").trim(),
    email: String(f.get("email") ?? "").trim().toLowerCase(),
    linha: String(f.get("linha") ?? ""),
    idramo: num("idramo"),
    idcargo: num("idcargo"),
    idsituacao: num("idsituacao"),
    idapf: num("idapf"),
    datasituacao: (f.get("datasituacao") as string) || null,
    membrogrupo: f.get("membrogrupo") === "on",
    ativo: f.get("ativo") === "on",
  };
}

async function exigirDiretor() {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu?.diretor) redirect("/");
  return { supabase, eu };
}

const msgErro = (code?: string) =>
  code === "23505" ? "Este e-mail já está cadastrado." : "Não foi possível salvar. Confira os dados.";
const SENHA_CURTA = "A senha deve ter pelo menos 8 caracteres.";

export async function criarUsuario(formData: FormData) {
  const { supabase } = await exigirDiretor();
  const d = ler(formData);
  const senha = String(formData.get("senha") ?? "");
  const volta = (m: string): never => redirect(`/usuarios?erro=${encodeURIComponent(m)}`);

  if (senha.length < 8) volta(SENHA_CURTA);
  if (d.idapf) {
    const { data: apf } = await supabase.from("usuario").select("email").eq("idusuario", d.idapf).maybeSingle();
    if (apf?.email?.toLowerCase() === d.email) volta("O APF não pode ser o próprio usuário.");
  }

  const { data: novo, error } = await supabase.from("usuario").insert(d).select("idusuario").single();
  if (error || !novo) return volta(msgErro(error?.code));

  const acesso = await gerirAcesso(supabase, { acao: "definir_senha", idusuario: novo.idusuario, senha });
  if (!acesso.ok) {
    await supabase.from("usuario").delete().eq("idusuario", novo.idusuario);
    return volta(acesso.erro ?? "Não foi possível criar o acesso.");
  }

  revalidatePath("/usuarios");
  redirect("/usuarios?ok=1");
}

export async function atualizarUsuario(id: number, formData: FormData) {
  const { supabase, eu } = await exigirDiretor();
  const d = ler(formData);
  const volta = (m: string): never => redirect(`/usuarios/${id}?erro=${encodeURIComponent(m)}`);

  if (d.idapf === id) volta("O APF não pode ser o próprio usuário.");
  if (id === eu.idusuario && !d.ativo) volta("Você não pode inativar o seu próprio cadastro.");

  if (id === eu.idusuario) {
    const { data: cargo } = d.idcargo
      ? await supabase.from("cargo").select("avalia").eq("idcargo", d.idcargo).maybeSingle()
      : { data: null };
    if (!cargo?.avalia) volta("Você não pode retirar a sua própria permissão de diretor.");
  }

  const { data: atual } = await supabase.from("usuario").select("email, auth_user_id").eq("idusuario", id).maybeSingle();
  if (!atual) volta("Usuário não encontrado.");
  const email = atual?.auth_user_id ? atual.email : d.email;

  const { data, error } = await supabase
    .from("usuario")
    .update({ ...d, email })
    .eq("idusuario", id)
    .select("idusuario");
  if (error || !data?.length) volta(msgErro(error?.code));
  revalidatePath("/usuarios");
  redirect("/usuarios?ok=1");
}

export async function redefinirSenha(id: number, formData: FormData) {
  const { supabase } = await exigirDiretor();
  const senha = String(formData.get("senha") ?? "");
  const volta = (m: string): never => redirect(`/usuarios/${id}?erro=${encodeURIComponent(m)}`);

  if (senha.length < 8) volta(SENHA_CURTA);

  const acesso = await gerirAcesso(supabase, { acao: "definir_senha", idusuario: id, senha });
  if (!acesso.ok) return volta(acesso.erro ?? "Não foi possível definir a senha.");
  redirect(`/usuarios/${id}?ok=${encodeURIComponent("Senha definida. A pessoa deverá trocá-la no primeiro acesso.")}`);
}
