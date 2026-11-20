import { Cabecalho } from "@/components/Cabecalho";
import { Menu } from "@/components/Menu";
import { RegistrarAcesso } from "@/components/RegistrarAcesso";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <RegistrarAcesso />
      <Cabecalho />
      <div className="flex flex-1 flex-col md:flex-row">
        <Menu />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
