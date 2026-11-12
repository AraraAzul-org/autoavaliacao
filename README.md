# Avaliação de Adultos

Sistema de autoavaliação dos adultos do grupo escoteiro. Cada adulto responde o
questionário da avaliação aberta; diretores administram o cadastro e os APFs
acompanham as respostas dos seus assessorados.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript, Tailwind CSS)
- [Supabase](https://supabase.com) (Postgres, autenticação e RLS)
- [Vercel](https://vercel.com) (deploy automático a cada push na `main`)

## Configuração local

1. Copie `.env.example` para `.env.local`.
2. Preencha com os dados do projeto Supabase
   (Dashboard → Project Settings → API):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

3. Instale as dependências e rode o servidor:

```bash
npm install
npm run dev
```

Acesse http://localhost:3000.

## Observações

- A chave `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` é pública por definição: ela vai
  para o navegador. A proteção dos dados é feita pelo RLS no banco.
- Nunca commite `.env.local` nem a chave `service_role`.
- O schema, as políticas de acesso (RLS), os triggers e as funções ficam no
  Supabase, não neste repositório.
- Em produção, as variáveis de ambiente são configuradas no Vercel
  (Project Settings → Environment Variables).
