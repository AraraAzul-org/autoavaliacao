"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const { error } = await createClient().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    });
    if (error) {
      setLoading(false);
      setMsg("E-mail ou senha incorretos.");
      return;
    }
    location.assign("/");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <Image src="/logo.png" alt="Grupo Escoteiro Arara Azul" width={140} height={163} priority className="mx-auto" />
      <h1 className="text-center text-2xl font-semibold text-azul">Autoavaliação de Adultos</h1>
      <form onSubmit={entrar} className="flex flex-col gap-3">
        <input
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail cadastrado"
          className="rounded border border-gray-300 p-2"
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha"
          className="rounded border border-gray-300 p-2"
        />
        <button disabled={loading} className="rounded bg-azul p-2 text-white hover:bg-azul-escuro disabled:opacity-50">
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
      {msg && <p className="text-sm text-red-700">{msg}</p>}
      <p className="text-center text-xs text-gray-500">
        Esqueceu a senha? Peça uma nova à diretoria do grupo.
        <br />
        <Link href="/privacidade" className="underline">Privacidade</Link> · <Link href="/termos" className="underline">Termos</Link>
      </p>
    </main>
  );
}
