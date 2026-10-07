import { describe, expect, it } from "vitest";
import { isSpCapitalCep, isValidCnpj, isValidPhoneBR, phoneToE164 } from "../shared/br";
import { parseProductSegment, productPath, slugify } from "../shared/catalog";
import { yearsInBusiness } from "../shared/company";
import { computeTotals, isProposalExpired, parseBRL, validUntil } from "../shared/proposal";
import { canTransition, formatProtocol, manualStatuses, submitQuoteSchema } from "../shared/quote";

describe("validações BR", () => {
  it("CNPJ por dígito verificador", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11.699.331/0001-88")).toBe(true); // CNPJ da WSN
    expect(isValidCnpj("11.222.333/0001-82")).toBe(false);
    expect(isValidCnpj("11111111111111")).toBe(false);
  });

  it("telefone com DDD: fixo e celular", () => {
    expect(isValidPhoneBR("(11) 4070-5300")).toBe(true);
    expect(isValidPhoneBR("(11) 97384-6070")).toBe(true);
    expect(isValidPhoneBR("+55 11 97384-6070")).toBe(true);
    expect(isValidPhoneBR("(11) 87384-6070")).toBe(false); // celular sem 9
    expect(isValidPhoneBR("97384-6070")).toBe(false); // sem DDD
    expect(phoneToE164("(11) 97384-6070")).toBe("5511973846070");
  });

  it("CEP da capital paulista (R-COT-4)", () => {
    expect(isSpCapitalCep("02522-000")).toBe(true); // endereço da WSN
    expect(isSpCapitalCep("08400-000")).toBe(true);
    expect(isSpCapitalCep("08500-000")).toBe(false); // Ferraz de Vasconcelos
    expect(isSpCapitalCep("06000-000")).toBe(false); // Osasco
    expect(isSpCapitalCep("20000-000")).toBe(false); // Rio
  });
});

describe("catálogo", () => {
  it("slug e caminho do produto (R-CAT-1)", () => {
    expect(slugify("Luva látex com pó Descarpack")).toBe("luva-latex-com-po-descarpack");
    expect(productPath({ ref: "0038", slug: "luva-latex" })).toBe("/produtos/0038-luva-latex");
    expect(parseProductSegment("0038-qualquer-coisa")).toEqual({ ref: "0038", slug: "qualquer-coisa" });
    expect(parseProductSegment("0038")).toEqual({ ref: "0038", slug: "" });
    expect(parseProductSegment("luva")).toBeNull();
  });

  it("anos de mercado sempre calculados (R-ATD-2)", () => {
    expect(yearsInBusiness(new Date("2026-10-07"))).toBe(20);
  });
});

describe("cotação", () => {
  it("protocolo sequencial com 6 dígitos", () => {
    expect(formatProtocol(2026, 123)).toBe("WSN-2026-000123");
  });

  it("schema rejeita item repetido, quantidade fora do limite e falta de consentimento", () => {
    const base = {
      items: [{ ref: "0003", quantity: 1 }],
      customer: { name: "Ana", email: "a@b.com", phone: "11987654321", cep: "02522000" },
      consent: true,
      turnstileToken: "x",
    };
    expect(submitQuoteSchema.safeParse(base).success).toBe(true);
    expect(submitQuoteSchema.safeParse({ ...base, items: [...base.items, ...base.items] }).success).toBe(false);
    expect(submitQuoteSchema.safeParse({ ...base, items: [{ ref: "0003", quantity: 10000 }] }).success).toBe(false);
    expect(submitQuoteSchema.safeParse({ ...base, consent: false }).success).toBe(false);
    expect(submitQuoteSchema.safeParse({ ...base, customer: { ...base.customer, cnpj: "123" } }).success).toBe(false);
  });

  it("ciclo de vida (R-COT-7)", () => {
    expect(canTransition("recebida", "em_analise")).toBe(true);
    expect(canTransition("respondida", "ganha")).toBe(true);
    expect(canTransition("ganha", "perdida")).toBe(false);
    expect(canTransition("cancelada", "em_analise")).toBe(false);
    expect(manualStatuses("respondida")).toEqual(["ganha", "perdida", "em_analise"]);
  });
});

describe("proposta", () => {
  it("totais em centavos; desconto nunca maior que o subtotal", () => {
    const lines = [
      { quantity: 10, unitPriceCents: 280 },
      { quantity: 3, unitPriceCents: 2399 },
    ];
    expect(computeTotals(lines, 500, 1500)).toEqual({
      subtotalCents: 9997,
      discountCents: 500,
      shippingCents: 1500,
      totalCents: 10997,
    });
    expect(computeTotals(lines, 999_999, 0).totalCents).toBe(0);
  });

  it("validade termina às 23:59:59 de São Paulo", () => {
    const until = validUntil(new Date("2026-10-07T15:00:00Z"), 7);
    expect(until).toBe("2026-10-15T02:59:59.000Z"); // 14/10 23:59:59 em SP
    expect(isProposalExpired(until, new Date("2026-10-15T02:59:58Z"))).toBe(false);
    expect(isProposalExpired(until, new Date("2026-10-15T03:00:00Z"))).toBe(true);
  });

  it("parseBRL aceita formatos brasileiros", () => {
    expect(parseBRL("12,50")).toBe(1250);
    expect(parseBRL("R$ 1.234,56")).toBe(123456);
    expect(parseBRL("1.234")).toBe(123400);
    expect(parseBRL("9.8")).toBe(980);
    expect(parseBRL("abc")).toBeNull();
  });
});
