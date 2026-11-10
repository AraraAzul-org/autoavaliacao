import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLICAS = ["/login", "/auth", "/privacidade", "/termos"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );
  const { data } = await supabase.auth.getClaims();
  const { pathname } = request.nextUrl;
  const publica = PUBLICAS.some((r) => pathname.startsWith(r));
  const url = request.nextUrl.clone();

  if (!data?.claims && !publica) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Quem recebeu senha inicial da diretoria precisa trocá-la antes de usar o app.
  const meta = (data?.claims as Record<string, unknown> | undefined)?.app_metadata as
    | { trocar_senha?: boolean }
    | undefined;
  if (data?.claims && meta?.trocar_senha === true && !publica && !pathname.startsWith("/trocar-senha")) {
    url.pathname = "/trocar-senha";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)"],
};
