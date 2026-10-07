// Dados institucionais — fonte única para site, e-mails e propostas (R-ATD-1).

export const company = {
  name: "WSN Distribuidora",
  legalName: "WSN Comércio e Distribuição",
  cnpj: "11.699.331/0001-88",
  foundedYear: 2006,
  tagline: "Descartáveis e EPI's",
  email: "contato@wsndistribuidora.com.br",
  site: "https://www.wsndistribuidora.com.br",
  /** WhatsApp oficial: celular usado no link wa.me da página de contato. */
  whatsapp: { display: "(11) 97384-6070", e164: "5511973846070" },
  /** Fixo exibido no menu do site antigo. */
  phone: { display: "(11) 4070-5300", e164: "551140705300" },
  address: {
    street: "Av. Baruel, 506",
    district: "Vila Baruel",
    city: "São Paulo",
    state: "SP",
    cep: "02522-000",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Av.+Baruel,+506+-+Vila+Baruel,+S%C3%A3o+Paulo+-+SP,+02522-000",
  },
  minimumOrderSpCapital: "R$ 150,00",
} as const;

/** Anos de mercado, sempre calculados (R-ATD-2). */
export const yearsInBusiness = (now: Date = new Date()): number =>
  now.getFullYear() - company.foundedYear;

export const whatsappLink = (text?: string, e164: string = company.whatsapp.e164): string =>
  `https://wa.me/${e164}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
