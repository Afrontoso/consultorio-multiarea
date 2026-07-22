import type { Metadata } from 'next';
import { LegalDoc, LegalSection } from '../../components/legal-doc';

export const metadata: Metadata = {
  title: 'Política de Privacidade — Consultório',
  description: 'Política de Privacidade e tratamento de dados (LGPD) do Consultório.',
};

export default function PrivacidadePage() {
  return (
    <LegalDoc
      kicker="Política de Privacidade"
      title="Política de Privacidade"
      updatedAt="22/07/2026"
    >
      <LegalSection title="1. Introdução">
        <p>
          Esta Política descreve como o Consultório trata dados pessoais, em conformidade com a
          Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD). Dados de saúde são dados
          pessoais sensíveis e recebem proteção reforçada.
        </p>
      </LegalSection>

      <LegalSection title="2. Papéis: controlador e operador">
        <p>
          Em relação aos dados dos pacientes, o consultório/profissional que os cadastra é o{' '}
          <strong>controlador</strong>. O Consultório atua como <strong>operador</strong>,
          tratando os dados por conta e ordem do controlador, para viabilizar a agenda e a
          gestão do atendimento.
        </p>
      </LegalSection>

      <LegalSection title="3. Dados que coletamos">
        <p>Podemos tratar, conforme o uso da plataforma:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Dados de cadastro do profissional (nome, e-mail, dados de conta).</li>
          <li>
            Dados de pacientes inseridos pelo consultório: nome, telefone, e-mail, data de
            nascimento e anotações do atendimento.
          </li>
          <li>Dados de agendamento (serviço, profissional, data e status da consulta).</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Finalidade e base legal">
        <p>
          Os dados são usados para permitir o agendamento, o gerenciamento das consultas e a
          comunicação relacionada (confirmações e avisos). As bases legais incluem a execução
          de contrato, o consentimento do titular e o cumprimento de obrigações legais.
        </p>
        <p>
          No agendamento, registramos o <strong>consentimento</strong> do paciente (momento e
          versão dos termos aceitos).
        </p>
      </LegalSection>

      <LegalSection title="5. Segurança e criptografia">
        <p>
          Adotamos medidas técnicas e organizacionais para proteger os dados. Campos sensíveis
          do paciente — como anotações e data de nascimento — são armazenados{' '}
          <strong>criptografados</strong>, com chave mantida fora do banco de dados.
        </p>
      </LegalSection>

      <LegalSection title="6. Retenção e direito ao esquecimento">
        <p>
          A exclusão de uma ficha de paciente é feita primeiro como remoção lógica
          (soft-delete). Fichas removidas são <strong>apagadas em definitivo</strong> após um
          período de retenção de 30 dias, salvo obrigação legal de guarda por prazo maior.
        </p>
      </LegalSection>

      <LegalSection title="7. Direitos do titular">
        <p>
          O titular pode solicitar confirmação de tratamento, acesso, correção, portabilidade,
          eliminação e informações sobre compartilhamento de seus dados. As solicitações devem
          ser dirigidas ao consultório responsável (controlador); o Consultório apoia o
          atendimento dessas solicitações.
        </p>
      </LegalSection>

      <LegalSection title="8. Compartilhamento">
        <p>
          Não vendemos dados pessoais. O compartilhamento ocorre apenas com prestadores
          necessários à operação (por exemplo, envio de e-mails transacionais e hospedagem), sob
          obrigações de confidencialidade e segurança.
        </p>
      </LegalSection>

      <LegalSection title="9. Encarregado e contato">
        <p>
          Para exercer direitos ou tirar dúvidas sobre privacidade, utilize o canal de suporte
          informado na plataforma. O encarregado pelo tratamento de dados (DPO) será indicado
          aqui quando definido.
        </p>
      </LegalSection>

      <LegalSection title="10. Alterações">
        <p>
          Esta Política pode ser atualizada. Mudanças materiais são comunicadas na plataforma,
          com atualização da versão indicada nesta página.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
