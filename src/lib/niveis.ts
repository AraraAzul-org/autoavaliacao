export type Nivel = "usuario" | "apf" | "diretor";

export const NIVEIS: { valor: Nivel; rotulo: string }[] = [
  { valor: "usuario", rotulo: "Associado" },
  { valor: "apf", rotulo: "APF" },
  { valor: "diretor", rotulo: "Diretor" },
];

export const ROTULO_NIVEL: Record<Nivel, string> = {
  usuario: "Associado",
  apf: "APF",
  diretor: "Diretor",
};

export function ehNivel(valor: string): valor is Nivel {
  return valor === "usuario" || valor === "apf" || valor === "diretor";
}
