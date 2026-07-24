import type { Metadata } from 'next';
import { LegalDoc, LegalSection } from '../../components/legal-doc';

export const metadata: Metadata = {
  title: 'Termos de Uso — Consultório',
  description: 'Termos de Uso da plataforma Consultório.',
};

export default function TermosPage() {
  return (
    <LegalDoc kicker="Termos de Uso" title="Termos de Uso" updatedAt="22/07/2026">
      <LegalSection title="1. Quem somos e o que estes termos regulam">
        <p>
          O Consultório é uma plataforma de agenda e gestão para profissionais e clínicas da
          área da saúde. Estes Termos de Uso regulam o acesso e a utilização da plataforma
          pelo profissional/consultório (o &quot;titular da conta&quot;) e por quem ele autoriza.
        </p>
        <p>
          Ao criar uma conta ou utilizar a plataforma, você declara ter lido e concordado com
          estes termos e com a Política de Privacidade.
        </p>
      </LegalSection>

      <LegalSection title="2. Cadastro e conta">
        <p>
          O acesso exige autenticação (e-mail e senha, link de acesso ou provedor de terceiros).
          Você é responsável por manter suas credenciais em sigilo e por toda atividade
          realizada na sua conta.
        </p>
        <p>
          O titular da conta é o controlador dos dados dos pacientes que cadastra, e o
          Consultório atua como operador desses dados, nos termos da Política de Privacidade.
        </p>
      </LegalSection>

      <LegalSection title="3. Uso adequado">
        <p>
          Você concorda em utilizar a plataforma apenas para fins lícitos e relacionados à
          gestão do seu consultório, respeitando a legislação aplicável, incluindo as normas
          de sigilo profissional e de proteção de dados.
        </p>
        <p>
          É vedado tentar acessar dados de outros consultórios, comprometer a segurança da
          plataforma ou utilizá-la para enviar comunicações não autorizadas.
        </p>
      </LegalSection>

      <LegalSection title="4. Planos, cobrança e cancelamento">
        <p>
          Funcionalidades podem variar conforme o plano contratado. Alterações de plano,
          valores e limites são informadas na plataforma. Você pode cancelar sua conta a
          qualquer momento; dados são tratados conforme a Política de Privacidade.
        </p>
      </LegalSection>

      <LegalSection title="5. Disponibilidade e responsabilidade">
        <p>
          Empenhamo-nos para manter a plataforma disponível e segura, mas ela é fornecida
          &quot;no estado em que se encontra&quot;. Não nos responsabilizamos por decisões clínicas,
          que são de responsabilidade exclusiva do profissional.
        </p>
      </LegalSection>

      <LegalSection title="6. Alterações destes termos">
        <p>
          Podemos atualizar estes termos periodicamente. Mudanças materiais serão comunicadas
          na plataforma, com atualização da versão indicada nesta página.
        </p>
      </LegalSection>

      <LegalSection title="7. Contato">
        <p>
          Dúvidas sobre estes termos podem ser encaminhadas pelo canal de suporte informado na
          plataforma.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
