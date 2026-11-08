"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setLoading(false);
    setMsg(error ? "Não foi possível enviar o link. Tente novamente." : "Link enviado! Confira seu e-mail.");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <Image src="/logo.png" alt="Grupo Escoteiro Arara Azul" width={140} height={163} priority className="mx-auto" />
      <h1 className="text-center text-2xl font-semibold text-azul">Autoavaliação de Adultos</h1>
      <p className="text-sm text-gray-600">Informe seu e-mail para receber o link de acesso.</p>
      <form onSubmit={enviar} className="flex flex-col gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu.email@escoteiros.org.br"
          className="rounded border border-gray-300 p-2"
        />
        <button disabled={loading} className="rounded bg-azul p-2 hover:bg-azul-escuro text-white disabled:opacity-50">
          {loading ? "Enviando..." : "Enviar link de acesso"}
        </button>
      </form>
      {msg && <p className="text-sm">{msg}</p>}
    </main>
  );
}
