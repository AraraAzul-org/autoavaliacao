import { Cabecalho } from "@/components/Cabecalho";
import { Menu } from "@/components/Menu";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Cabecalho />
      <div className="flex flex-1 flex-col md:flex-row">
        <Menu />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
