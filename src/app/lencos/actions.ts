"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { carregarEu } from "@/lib/eu";
import { BUCKET_LENCOS } from "@/lib/lencos";

const CAMPOS_OBRIGATORIOS = [
  ["grupoescoteiro", "Grupo escoteiro"],
  ["numero", "Número do lenço"],
  ["uf", "UF"],
  ["data", "Data"],
  ["nomeescoteiro", "Nome do escoteiro"],
  ["nomeescoteiroarara", "Nome do escoteiro no Arara Azul"],
  ["nomeatividade", "Nome da atividade"],
] as const;

const EXTENSOES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function exigirCadastro() {
  const supabase = await createClient();
  const eu = await carregarEu(supabase);
  if (!eu) redirect("/login");
  if (!eu.acessos.has("lencoscadastro")) redirect("/");
  return { supabase, eu };
}

function voltar(tipo: "ok" | "erro", mensagem: string): never {
  revalidatePath("/lencos");
  redirect(`/lencos?${tipo}=${encodeURIComponent(mensagem)}`);
}

function lerCampos(f: FormData) {
  const dados: Record<string, string> = {};
  for (const [nome, rotulo] of CAMPOS_OBRIGATORIOS) {
    const valor = String(f.get(nome) ?? "").trim();
    if (!valor) voltar("erro", `Informe: ${rotulo}.`);
    dados[nome] = valor;
  }
  if (dados.uf.length !== 2) voltar("erro", "Informe uma UF válida.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.data)) voltar("erro", "Informe uma data válida.");
  dados.observacao = String(f.get("observacao") ?? "").trim();
  return dados;
}

type ResultadoFoto = { caminho: string | null; erro: string | null };

async function enviarFoto(
  supabase: SupabaseClient,
  arquivo: FormDataEntryValue | null,
  anterior: string | null,
  idusuario: number,
): Promise<ResultadoFoto> {
  if (!(arquivo instanceof File) || arquivo.size === 0) return { caminho: anterior, erro: null };
  if (arquivo.size > 5 * 1024 * 1024) {
    return { caminho: anterior, erro: "Cada foto deve ter no máximo 5 MB." };
  }
  const extensao = EXTENSOES[arquivo.type];
  if (!extensao) {
    return { caminho: anterior, erro: "Use uma imagem JPG, PNG ou WEBP." };
  }
  const caminho = `${idusuario}/${globalThis.crypto.randomUUID()}.${extensao}`;
  const { error } = await supabase.storage.from(BUCKET_LENCOS).upload(caminho, arquivo, {
    contentType: arquivo.type,
    upsert: false,
  });
  if (error) return { caminho: anterior, erro: "Não foi possível enviar a foto." };
  if (anterior) {
    await supabase.storage.from(BUCKET_LENCOS).remove([anterior]);
  }
  return { caminho, erro: null };
}

export async function criarLenco(f: FormData) {
  const { supabase, eu } = await exigirCadastro();
  const dados = lerCampos(f);

  const fotoLenco = await enviarFoto(
    supabase,
    f.get("fotolenco"),
    String(f.get("fotolencoatual") ?? "") || null,
    eu.idusuario,
  );
  const fotoEntrega = await enviarFoto(
    supabase,
    f.get("fotoentrega"),
    String(f.get("fotoentregaatual") ?? "") || null,
    eu.idusuario,
  );
  if (fotoLenco.erro || fotoEntrega.erro) {
    voltar("erro", fotoLenco.erro ?? fotoEntrega.erro ?? "Erro nas fotos.");
  }

  const { error } = await supabase.from("lenco").insert({
    ...dados,
    fotolenco: fotoLenco.caminho,
    fotoentrega: fotoEntrega.caminho,
    criadoidusuario: eu.idusuario,
  });
  if (error) {
    const enviadas = [fotoLenco.caminho, fotoEntrega.caminho].filter(Boolean) as string[];
    if (enviadas.length) await supabase.storage.from(BUCKET_LENCOS).remove(enviadas);
    voltar("erro", "Não foi possível cadastrar o lenço.");
  }
  voltar("ok", "Lenço cadastrado.");
}

export async function atualizarLenco(id: number, f: FormData) {
  const { supabase, eu } = await exigirCadastro();
  if (!Number.isInteger(id) || id <= 0) voltar("erro", "Pedido inválido.");
  const dados = lerCampos(f);

  const fotoLenco = await enviarFoto(
    supabase,
    f.get("fotolenco"),
    String(f.get("fotolencoatual") ?? "") || null,
    eu.idusuario,
  );
  const fotoEntrega = await enviarFoto(
    supabase,
    f.get("fotoentrega"),
    String(f.get("fotoentregaatual") ?? "") || null,
    eu.idusuario,
  );
  if (fotoLenco.erro || fotoEntrega.erro) {
    voltar("erro", fotoLenco.erro ?? fotoEntrega.erro ?? "Erro nas fotos.");
  }

  const { error } = await supabase
    .from("lenco")
    .update({
      ...dados,
      fotolenco: fotoLenco.caminho,
      fotoentrega: fotoEntrega.caminho,
      alteradoem: new Date().toISOString(),
      alteradoidusuario: eu.idusuario,
    })
    .eq("idlenco", id);
  if (error) voltar("erro", "Não foi possível salvar o cadastro.");

  revalidatePath("/lencos");
  revalidatePath(`/lencos/${id}`);
  redirect(`/lencos/${id}?ok=${encodeURIComponent("Cadastro salvo.")}`);
}

export async function excluirLenco(id: number) {
  const { supabase } = await exigirCadastro();
  if (!Number.isInteger(id) || id <= 0) voltar("erro", "Pedido inválido.");

  const { data: alvo } = await supabase
    .from("lenco")
    .select("fotolenco, fotoentrega")
    .eq("idlenco", id)
    .maybeSingle();
  if (!alvo) voltar("erro", "Cadastro não encontrado.");

  const { error } = await supabase.from("lenco").delete().eq("idlenco", id);
  if (error) voltar("erro", "Não foi possível excluir o cadastro.");

  const caminhos = [alvo.fotolenco, alvo.fotoentrega].filter(Boolean) as string[];
  if (caminhos.length) await supabase.storage.from(BUCKET_LENCOS).remove(caminhos);
  voltar("ok", "Cadastro excluído.");
}
