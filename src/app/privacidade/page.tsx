import type { Metadata } from "next";
import { PaginaPublica } from "@/components/PaginaPublica";

export const metadata: Metadata = { title: "Política de Privacidade · Avaliação de Adultos" };

const CONTATO = process.env.NEXT_PUBLIC_CONTATO_EMAIL;

export default function Privacidade() {
  return (
    <PaginaPublica titulo="Política de Privacidade">
      <p>
        Este aplicativo é usado pelo Grupo Escoteiro Arara Azul (15º GO) para a avaliação e o acompanhamento da
        formação dos adultos do grupo. Esta política explica quais dados são tratados e para quê, conforme a Lei
        Geral de Proteção de Dados (Lei nº 13.709/2018).
      </p>

      <h2>Quais dados tratamos</h2>
      <ul>
        <li>Nome e e-mail do adulto, cadastrados pela diretoria do grupo.</li>
        <li>Linha de atuação (Escotista ou Dirigente), ramo, cargo, situação de formação e o APF responsável.</li>
        <li>Respostas e notas das avaliações preenchidas no aplicativo.</li>
        <li>
          No login com Google, recebemos apenas o e-mail e os dados básicos de perfil da conta, usados para conferir se
          a pessoa está cadastrada. Não acessamos e-mails, contatos, arquivos ou outros dados da conta Google.
        </li>
      </ul>

      <h2>Para que usamos</h2>
      <ul>
        <li>Identificar quem está acessando e liberar o acesso somente a adultos cadastrados.</li>
        <li>Registrar a avaliação e acompanhar a formação de cada adulto.</li>
        <li>Manter o histórico das avaliações realizadas ao longo dos anos.</li>
      </ul>

      <h2>Quem pode ver</h2>
      <ul>
        <li>O próprio adulto, o seu APF (assessor pessoal de formação) e os diretores com permissão de avaliação.</li>
        <li>Não vendemos nem compartilhamos os dados com terceiros para fins comerciais ou de publicidade.</li>
      </ul>

      <h2>Onde os dados ficam</h2>
      <p>
        Os dados são armazenados em serviços de nuvem contratados pelo grupo (Supabase, para o banco de dados e o
        login, e Vercel, para a hospedagem do aplicativo), cujos servidores podem estar fora do Brasil. Usamos apenas
        cookies essenciais para manter a sessão de login.
      </p>

      <h2>Por quanto tempo</h2>
      <p>
        Mantemos os dados enquanto forem necessários ao acompanhamento da formação. Cadastros podem ser marcados como
        inativos, preservando o histórico das avaliações já realizadas.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Você pode pedir à diretoria do grupo a confirmação do tratamento, o acesso, a correção ou a eliminação de seus
        dados, nos termos da LGPD.
      </p>

      <h2>Contato</h2>
      <p>
        Dúvidas ou pedidos sobre seus dados devem ser feitos à diretoria do Grupo Escoteiro Arara Azul
        {CONTATO ? <> pelo e-mail <a className="text-azul underline" href={`mailto:${CONTATO}`}>{CONTATO}</a></> : " pelos canais oficiais do grupo"}.
      </p>
    </PaginaPublica>
  );
}
