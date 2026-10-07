// Textos legais novos (o site v1 só tinha links "#"). Redigidos a partir do que o
// sistema de fato faz — revisar com o jurídico da WSN antes de publicar.
import { company } from "@shared/company";

export interface LegalDoc {
  title: string;
  updated: string;
  sections: { heading: string; body: string[] }[];
}

export const privacy: LegalDoc = {
  title: "Política de Privacidade",
  updated: "7 de outubro de 2026",
  sections: [
    {
      heading: "Quem somos",
      body: [
        `${company.legalName} (CNPJ ${company.cnpj}), ${company.address.street}, ${company.address.district}, ${company.address.city} – ${company.address.state}, é a controladora dos dados pessoais tratados neste site.`,
      ],
    },
    {
      heading: "Quais dados coletamos e por quê",
      body: [
        "Cotação: nome, e-mail, telefone, CEP e, se você informar, empresa, CNPJ e observações. Usamos esses dados para preparar e enviar seu orçamento e falar com você sobre ele (procedimentos preliminares a um contrato, art. 7º, V, da LGPD).",
        "Contato: nome, e-mail, mensagem e, se você informar, telefone e empresa, para responder ao seu contato.",
        "Segurança: um identificador do seu endereço IP transformado por função criptográfica irreversível, trocado diariamente, para impedir abuso dos formulários. Não guardamos o IP em si.",
        "Buscas sem resultado: guardamos apenas o termo buscado (sem qualquer dado seu) para saber quais produtos os clientes procuram.",
        "Não usamos cookies de rastreamento, publicidade ou análise de terceiros. O carrinho de cotação fica salvo apenas no seu navegador.",
      ],
    },
    {
      heading: "Como protegemos",
      body: [
        "Nome, e-mail, telefone, empresa, CNPJ e mensagens são criptografados individualmente (AES-256-GCM) antes de serem gravados. Somente a equipe autorizada da WSN, com acesso individual e registrado em log de auditoria, visualiza esses dados.",
        "Toda a comunicação com o site usa HTTPS. A verificação anti-robô é feita pelo Cloudflare Turnstile, que não usa cookies de rastreamento.",
      ],
    },
    {
      heading: "Com quem compartilhamos",
      body: [
        "Com fornecedores que operam o site em nosso nome, apenas no necessário: hospedagem e banco de dados (Cloudflare) e envio de e-mails transacionais. Não vendemos nem cedemos seus dados.",
      ],
    },
    {
      heading: "Por quanto tempo guardamos",
      body: [
        "Cotações que não viraram pedido e mensagens de contato têm os dados pessoais apagados automaticamente após 24 meses. Cotações que viraram pedido seguem os prazos legais fiscais.",
      ],
    },
    {
      heading: "Seus direitos",
      body: [
        `Você pode pedir acesso, correção ou eliminação dos seus dados, ou revogar consentimentos, escrevendo para ${company.email}. Respondemos em até 15 dias.`,
      ],
    },
  ],
};

export const terms: LegalDoc = {
  title: "Termos de Uso",
  updated: "7 de outubro de 2026",
  sections: [
    {
      heading: "Sobre o site",
      body: [
        "Este site apresenta o catálogo da WSN Distribuidora e permite solicitar cotações. Ele não realiza vendas nem cobranças online.",
      ],
    },
    {
      heading: "Cotações e propostas",
      body: [
        "A solicitação de cotação não gera compromisso de compra. Preços, prazos e condições são informados em proposta comercial enviada pela equipe da WSN, válida até a data indicada nela.",
        "A aprovação de uma proposta pelo link recebido registra sua concordância com os itens, valores e condições daquela proposta. O pedido é confirmado pela equipe WSN após a aprovação.",
        `Pedido mínimo de ${company.minimumOrderSpCapital} para São Paulo capital. Para outras localidades, consulte condições.`,
      ],
    },
    {
      heading: "Imagens e informações",
      body: [
        "As imagens são ilustrativas e podem variar conforme o fabricante. Marcas citadas pertencem aos respectivos titulares.",
      ],
    },
    {
      heading: "Contato",
      body: [`Dúvidas sobre estes termos: ${company.email}.`],
    },
  ],
};
