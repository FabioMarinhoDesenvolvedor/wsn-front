// Copy do site — preservada do site v1 (componentes Home, AboutUs, Contact, Products,
// Cart, Footer e dos banners). Mudou de lugar, não de texto. Itens com `pendente`
// aparecem com selo "a confirmar" no modo revisão (?revisao=1).
import { company, yearsInBusiness } from "@shared/company";

const years = yearsInBusiness();

export interface Claim {
  text: string;
  pendente?: string;
}

export const home = {
  hero: {
    // Banners v1 (texto que estava "queimado" na imagem)
    eyebrow: `${company.tagline} · desde ${company.foundedYear}`,
    title: "Organização, bem-estar e produtividade em cada ambiente.",
    lead: "Selecione seu produto e solicite sua cotação com a WSN",
    ctaPrimary: "Ver Produtos",
    ctaSecondary: "Solicitar Cotação",
  },
  why: {
    title: "Por que escolher a WSN?",
    lead: `Mais de ${years} anos fornecendo soluções de qualidade para empresas de todos os tamanhos`,
    features: [
      { title: "Entregas Rápidas", desc: "Entregas para São Paulo e todo Brasil" },
      { title: "Qualidade Garantida", desc: "Produtos testados e aprovados" },
      { title: "Experiência", desc: `${years} anos de mercado` },
      { title: "Atendimento", desc: "Suporte especializado personalizado" },
    ],
  },
  categories: {
    title: "Nossas Categorias",
    lead: "Oferecemos uma ampla variedade de produtos para atender todas as necessidades do seu negócio",
    cta: "Ver Produtos",
  },
  about: {
    title: "Sobre a WSN",
    paragraphs: [
      "Desde 2006, a WSN Distribuidora é especializada em soluções completas para descartáveis, EPIs e produtos de limpeza, atendendo empresas, condomínios, restaurantes e comércios.",
      "Nossa missão é fornecer produtos de qualidade com preços competitivos e um atendimento personalizado que vai além da simples venda.",
    ],
    checks: ["Qualidade garantida", "Entrega rápida", "Preços competitivos"],
    cta: "Conheça Nossa História",
  },
  stats: [
    { value: String(years), label: "Anos de experiência" },
    { value: "300+", label: "Produtos", pendente: "o catálogo online tem 60 itens; confirmar o total do portfólio" },
    { value: "500+", label: "Clientes satisfeitos", pendente: "confirmar número de clientes ativos" },
    { value: "100%", label: "Comprometimento", pendente: "não é métrica verificável — manter ou trocar?" },
  ] as { value: string; label: string; pendente?: string }[],
  brands: {
    title: "Trabalhamos com as Melhores Marcas",
    lead: "Parcerias com fornecedores renomados para garantir qualidade e confiabilidade",
  },
  coverage: {
    title: "Atendemos Todo o Brasil",
    lead: "Entregas rápidas e eficientes para todo o território nacional",
    cta: "Solicitar Cotação",
  },
  payment: {
    label: "Formas de pagamento:",
    methods: ["Pix", "Cartão", "Boleto"],
    pixTitle: "Mais facilidade na hora de pagar?",
    pixLead: "Pague com Pix",
    // "Certificações: Site Seguro" não é certificação — virou um selo factual.
    secure: "Conexão segura · dados criptografados",
  },
};

/** Curadoria visual: fotos que representam cada categoria e a vitrine da Home (refs do catálogo). */
export const showcase = {
  hero: ["0017", "0003", "0042", "0056", "0041", "0002"],
  categoryCovers: {
    limpeza: ["0017", "0003", "0002"],
    descartaveis: ["0050", "0026", "0043"],
    epis: ["0042", "0041", "0048"],
    embalagens: ["0063", "0029", "0053"],
    papeis: ["0056", "0054", "0055"],
  } as Record<string, string[]>,
  featured: ["0042", "0002", "0063", "0056", "0017", "0048", "0029", "0003"],
  featuredTitle: "Mais pedidos pelos nossos clientes",
  featuredLead: "Os itens que empresas, condomínios e restaurantes mais cotam com a WSN.",
  // Explica o fluxo novo de cotação; o último passo reaproveita a copy "Como funciona?" do carrinho v1.
  steps: [
    { title: "Escolha os produtos", text: "Busque por nome, marca ou referência e adicione à sua cotação." },
    { title: "Envie sua cotação", text: "Sem compromisso. Você recebe um protocolo na hora." },
    { title: "Receba o orçamento", text: "Nossa equipe entrará em contato em até 24 horas com o orçamento completo dos produtos selecionados." },
  ],
  stepsTitle: "Como funciona?",
};

export const about = {
  title: "Nossa história",
  paragraphs: [
    "A WSN Distribuidora nasceu em 2006 com um propósito claro: oferecer soluções completas em descartáveis, Epi's e Produtos de Limpeza que facilitem o dia a dia de empresas, condomínios, restaurantes e comércios. Desde o início, nosso compromisso sempre foi ir além da simples venda de produtos. Nós acreditamos que cada cliente merece um atendimento personalizado, agilidade nas entregas e um portfólio de itens que atendam às necessidades reais do mercado.",
    `Com ${years} anos de experiência no setor, construímos parcerias sólidas com fornecedores renomados, garantindo qualidade, segurança e preços competitivos. Nosso objetivo é ser mais do que um distribuidor: queremos ser um parceiro estratégico para quem busca manter ambientes organizados, seguros e higienizados.`,
    "Hoje, a WSN Distribuidora se orgulha de atender uma ampla gama de clientes, sempre com o mesmo cuidado e dedicação que nos fizeram crescer. Nossa história é movida por confiança, inovação e compromisso, porque acreditamos que um bom relacionamento com nossos clientes é a base para um futuro sustentável e de grande sucesso.",
    "Seja bem-vindo à WSN Distribuidora, onde qualidade, atendimento e eficiência caminham lado a lado para entregar as melhores soluções para o seu negócio.",
  ],
  mission: {
    title: "Missão",
    text: "Distribuir e comercializar nossos produtos com eficiência, rapidez e confiabilidade, de modo a satisfazer as necessidades de nossos clientes.",
  },
  vision: {
    title: "Visão",
    text: "Ser referencial de excelência na venda de produtos e na prestação de serviços com crescimento acima dos níveis de mercado.",
  },
  values: { title: "Valores", items: ["Agilidade", "Comprometimento", "Ética", "Respeito", "Transparência", "Trabalho em equipe"] },
  location: { title: "Nossa Localização" },
  why: {
    title: "Por que escolher a WSN?",
    items: [
      { text: `Mais de ${years} anos de experiência no mercado` },
      { text: "Controle de qualidade rigoroso" },
      { text: "Logística eficiente para todo o Brasil" },
      { text: "Compromisso com a sustentabilidade ambiental" },
      { text: "Equipe especializada e treinada" },
    ] as Claim[],
  },
  sustainability: {
    title: "Compromisso com a Sustentabilidade",
    paragraphs: [
      {
        text: "Na WSN, assumimos a responsabilidade de cuidar do meio ambiente através de práticas sustentáveis em todos os nossos processos, desde a fabricação até a distribuição.",
        pendente: "a WSN é distribuidora — confirmar a menção a \"fabricação\"",
      },
      {
        text: "Desenvolvemos uma linha especial de produtos biodegradáveis e investimos constantemente em tecnologias que reduzem nosso impacto ambiental.",
        pendente: "confirmar quais produtos biodegradáveis existem no portfólio",
      },
    ] as Claim[],
    cta: "Conhecer Produtos Sustentáveis",
    pillars: [
      { title: "Produtos Biodegradáveis", text: "Linha completa de itens eco-friendly" },
      { title: "Embalagens Sustentáveis", text: "Materiais reciclados e recicláveis" },
      { title: "Logística Eficiente", text: "Rotas otimizadas para reduzir emissões" },
      { title: "Produção Responsável", text: "Controle de resíduos e consumo consciente" },
    ],
  },
  cta: {
    title: "Pronto para fazer parte da nossa história?",
    text: "Entre em contato conosco e descubra como a WSN pode ajudar seu negócio a crescer com produtos de qualidade e um atendimento excepcional.",
    primary: "Solicitar Orçamento",
    secondary: "Falar com Consultor",
  },
};

export const contact = {
  title: "Entre em Contato",
  lead: "Estamos à disposição para tirar suas dúvidas, ouvir sugestões e oferecer o melhor atendimento.",
  form: {
    title: "Envie sua Mensagem",
    name: "Nome Completo",
    namePlaceholder: "Seu nome completo",
    email: "E-mail",
    emailPlaceholder: "seu@email.com",
    phone: "Telefone/WhatsApp",
    phonePlaceholder: "(11) 99999-9999",
    company: "Empresa",
    companyPlaceholder: "Sua empresa",
    subject: "Assunto",
    subjectPlaceholder: "Selecione um assunto",
    subjects: ["Solicitar Orçamento", "Dúvida sobre Produtos", "Reclamação", "Sugestão", "Proposta de Parceria", "Outro"],
    message: "Mensagem",
    messagePlaceholder: "Descreva sua mensagem aqui...",
    submit: "Enviar Mensagem",
    success: "Mensagem enviada com sucesso! Retornaremos em breve.",
  },
  info: {
    title: "Informações de Contato",
    phone: { label: "Telefone", pendente: "o site antigo mostrava (11) 3789-3789 aqui e (11) 4070-5300 no menu — qual é o fixo?" },
    whatsapp: "WhatsApp",
    email: "E-mail",
  },
  location: { title: "Nossa Localização", address: "Endereço", directions: "Como chegar" },
  // "Siga-nos" ficou de fora: os links de redes sociais do site antigo eram "#".
  faq: {
    title: "Perguntas Frequentes",
    lead: "Confira as dúvidas mais comuns sobre nossos produtos e serviços",
    items: [
      { question: "Qual o prazo de entrega?", answer: "Para São Paulo capital: 24-48h. Demais regiões: consulte-nos para verificar prazos." },
      { question: "Entregam para todo o Brasil?", answer: "Sim, trabalhamos com parceiros logísticos para atender todo o território nacional." },
      { question: "Há valor mínimo para pedido?", answer: "Sim, R$ 150,00 para São Paulo capital. Para outras localidades, consulte condições." },
      { question: "Como solicitar orçamento?", answer: "Através do formulário, telefone ou WhatsApp. Retornamos rapidamente após o contato." },
      { question: "Trabalham com quais formas de pagamento?", answer: "Cartão de crédito, débito, PIX, transferência bancária e boleto." },
      { question: "Oferecem descontos para grandes quantidades?", answer: "Sim, temos condições especiais para pedidos em grande volume. Consulte-nos." },
    ],
  },
};

export const catalog = {
  title: "Catálogo de Produtos",
  lead: "Descubra nossa linha completa de produtos de limpeza, higiene e descartáveis",
  categoriesLabel: "Categorias",
  allLabel: "Todos os Produtos",
  searchPlaceholder: "Buscar produtos por nome ou referência...",
  sortByName: "Ordenar por nome",
  empty: { title: "Nenhum produto encontrado", text: "Tente ajustar os termos de busca ou selecione outra categoria", action: "Limpar filtros" },
  help: {
    title: "Precisa de ajuda para escolher os produtos?",
    text: "Nossos especialistas estão prontos para te ajudar a encontrar as melhores soluções para suas necessidades",
    consultant: "Falar com Consultor",
    fullCatalog: "Solicitar Catálogo Completo",
  },
  addToQuote: "Adicionar à cotação",
};

export const quote = {
  title: "Carrinho de Cotações",
  emptyTitle: "Seu carrinho de cotações está vazio",
  emptyText: "Adicione produtos para solicitar um orçamento",
  emptyAction: "Ver Produtos",
  selected: "Produtos Selecionados",
  totalItems: "Total de itens:",
  clear: "Limpar Carrinho",
  formTitle: "Solicitar Orçamento",
  submit: "Solicitar Orçamento",
  howTitle: "Como funciona?",
  howText: "Após enviar sua solicitação, nossa equipe entrará em contato em até 24 horas com o orçamento completo dos produtos selecionados.",
  success: "Solicitação de orçamento enviada com sucesso! Entraremos em contato em breve.",
};

export const footer = {
  since: "Soluções desde 2006",
  blurb: "Especializada em descartáveis, EPIs e produtos de limpeza para empresas em todo Brasil.",
  contactTitle: "Contato",
  institutionalTitle: "Institucional",
  services: [
    { title: "Entregas Rápidas", desc: "Para todo Brasil" },
    { title: "Compra Segura", desc: "Seus dados protegidos" },
    { title: "Atendimento", desc: "Equipe pronta para atender" },
  ],
  credit: "Desenvolvido por Connectionstree",
  creditUrl: "https://connectionstree.vercel.app/",
};
