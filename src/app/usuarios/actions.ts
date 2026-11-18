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
    registro: String(f.get("registro") ?? "").trim() || null,
    linha: String(f.get("linha") ?? ""),
    idramo: num("idramo"),
    idcargo: num("idcargo"),
    idsituacao: num("idsituacao"),
    idapf: num("idapf"),
    datasituacao: (f.get("datasituacao") as string) || null,
    datapromessa: (f.get("datapromessa") as string) || null,
    deducaopromessa: num("deducaopromessa"),
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

type ErroBanco = { code?: string; message?: string } | null;

const msgErro = (error?: ErroBanco) => {
  if (error?.code !== "23505") return "Não foi possível salvar. Confira os dados.";
  return /registro/i.test(error.message ?? "")
    ? "Este registro já está cadastrado."
    : "Este e-mail já está cadastrado.";
};

function validar(d: ReturnType<typeof ler>): string | null {
  if (!d.nome) return "Informe o nome.";
  if (!d.email) return "Informe o e-mail.";
  if (!d.registro) return "Informe o registro.";
  if (d.deducaopromessa !== null && (!Number.isInteger(d.deducaopromessa) || d.deducaopromessa < 0)) {
    return "A dedução deve ser um número inteiro de anos, sem valor negativo.";
  }
  return null;
}

const SENHA_CURTA = "A senha deve ter pelo menos 8 caracteres.";

export async function criarUsuario(formData: FormData) {
  const { supabase } = await exigirDiretor();
  const d = ler(formData);
  const senha = String(formData.get("senha") ?? "");
  const volta = (m: string): never => redirect(`/usuarios?erro=${encodeURIComponent(m)}`);

  const invalido = validar(d);
  if (invalido) volta(invalido);
  if (senha.length < 8) volta(SENHA_CURTA);
  if (d.idapf) {
    const { data: apf } = await supabase.from("usuario").select("email").eq("idusuario", d.idapf).maybeSingle();
    if (apf?.email?.toLowerCase() === d.email) volta("O APF não pode ser o próprio associado.");
  }

  const { data: novo, error } = await supabase.from("usuario").insert(d).select("idusuario").single();
  if (error || !novo) return volta(msgErro(error));

  const acesso = await gerirAcesso(supabase, { acao: "definir_senha", idusuario: novo.idusuario, senha });
  if (!acesso.ok) {
    await supabase.from("usuario").delete().eq("idusuario", novo.idusuario);
    return volta(acesso.erro ?? "Não foi possível criar o acesso.");
  }

  revalidatePath("/usuarios");
  redirect("/usuarios?ok=criado");
}

export async function atualizarUsuario(id: number, formData: FormData) {
  const { supabase, eu } = await exigirDiretor();
  const d = ler(formData);
  const volta = (m: string): never => redirect(`/usuarios/${id}?erro=${encodeURIComponent(m)}`);

  const invalido = validar(d);
  if (invalido) volta(invalido);
  if (d.idapf === id) volta("O APF não pode ser o próprio associado.");
  if (id === eu.idusuario && !d.ativo) volta("Você não pode inativar o seu próprio cadastro.");

  if (id === eu.idusuario) {
    const { data: cargo } = d.idcargo
      ? await supabase.from("cargo").select("avalia").eq("idcargo", d.idcargo).maybeSingle()
      : { data: null };
    if (!cargo?.avalia) volta("Você não pode retirar a sua própria permissão de diretor.");
  }

  const { data: atual } = await supabase
    .from("usuario")
    .select("email, auth_user_id, ativo")
    .eq("idusuario", id)
    .maybeSingle();
  const emailAntigo = String(atual?.email ?? "").trim().toLowerCase();
  const temAcesso = !!atual?.auth_user_id;
  const ativoAtual = !!atual?.ativo;
  if (!atual) volta("Associado não encontrado.");

  if (d.email !== emailAntigo && temAcesso) {
    const acesso = await gerirAcesso(supabase, { acao: "alterar_email", idusuario: id, email: d.email });
    if (!acesso.ok) volta(acesso.erro ?? "Não foi possível alterar o e-mail de acesso.");
  }

  // Registra quem inativou e quando; ao reativar, limpa o registro.
  const registroStatus =
    d.ativo === ativoAtual
      ? {}
      : d.ativo
        ? { datainativacao: null, idusuarioinativacao: null }
        : { datainativacao: new Date().toISOString(), idusuarioinativacao: eu.idusuario };

  const { data, error } = await supabase
    .from("usuario")
    .update({ ...d, ...registroStatus })
    .eq("idusuario", id)
    .select("idusuario");
  if (error || !data?.length) volta(msgErro(error));
  revalidatePath("/usuarios");
  redirect("/usuarios?ok=salvo");
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
