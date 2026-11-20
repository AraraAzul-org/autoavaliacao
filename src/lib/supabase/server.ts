import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

export async function createClient() {
  // O @supabase/ssr registra um listener onAuthStateChange ao criar o client;
  // ele valida o token com Date.now() de forma assíncrona. Com Cache Components,
  // a criação do client precisa acontecer só em request time, nunca na pré-renderização.
  await connection();
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado de um Server Component: o proxy renova a sessão
          }
        },
      },
    }
  );
}
