import type { Metadata } from "next";
import { PaginaPublica } from "@/components/PaginaPublica";

export const metadata: Metadata = { title: "Termos de Uso · Avaliação de Adultos" };

export default function Termos() {
  return (
    <PaginaPublica titulo="Termos de Uso">
      <p>
        O aplicativo de Avaliação de Adultos é de uso restrito aos adultos cadastrados pela diretoria do Grupo
        Escoteiro Arara Azul (15º GO). Ao usá-lo, você concorda com os termos abaixo.
      </p>

      <h2>Acesso</h2>
      <ul>
        <li>O acesso é pessoal e liberado somente a quem tem o e-mail cadastrado pela diretoria.</li>
        <li>Não compartilhe o seu acesso com outras pessoas.</li>
        <li>A diretoria pode inativar cadastros quando a pessoa deixar de participar do processo.</li>
      </ul>

      <h2>Uso</h2>
      <ul>
        <li>O aplicativo serve ao acompanhamento da formação dos adultos do grupo.</li>
        <li>Responda às avaliações com sinceridade e use as informações de outras pessoas apenas para essa finalidade.</li>
        <li>As respostas podem ser consultadas pelo seu APF e pelos diretores com permissão de avaliação.</li>
      </ul>

      <h2>Privacidade</h2>
      <p>O tratamento dos seus dados está descrito na Política de Privacidade, disponível neste aplicativo.</p>

      <h2>Alterações</h2>
      <p>Estes termos podem ser atualizados. A data da última atualização aparece no topo desta página.</p>
    </PaginaPublica>
  );
}
