"use client";

import { usePathname, useRouter } from "next/navigation";
import { MESES } from "@/lib/promessa";

export function SeletorMes({ valor }: { valor: number }) {
  const router = useRouter();
  const caminho = usePathname();

  return (
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
      Mês
      <select
        value={valor}
        onChange={(e) => router.push(`${caminho}?mes=${e.target.value}`)}
        className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-azul focus:outline-none focus:ring-2 focus:ring-azul/20"
      >
        {MESES.map((mes, i) => (
          <option key={mes} value={i + 1}>
            {mes}
          </option>
        ))}
      </select>
    </label>
  );
}
