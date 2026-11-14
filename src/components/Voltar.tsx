import Link from "next/link";

export function Voltar({ href }: { href: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm text-azul hover:underline">
      <span aria-hidden="true">←</span>
      <span>Voltar</span>
    </Link>
  );
}
