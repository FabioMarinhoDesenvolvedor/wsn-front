// Validações brasileiras usadas no formulário (navegador) e na API — uma única implementação.

export const onlyDigits = (value: string): string => value.replace(/\D/g, "");

/** CNPJ com dígitos verificadores válidos (rejeita sequências repetidas). */
export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const digit = (base: string): number => {
    const weights = base.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = base.split("").reduce((acc, n, i) => acc + Number(n) * weights[i], 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const first = digit(cnpj.slice(0, 12));
  const second = digit(cnpj.slice(0, 12) + first);
  return cnpj.endsWith(`${first}${second}`);
}

export function formatCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

/** Telefone BR com DDD: fixo (10 dígitos) ou celular (11 dígitos, começando com 9). */
export function isValidPhoneBR(value: string): boolean {
  let d = onlyDigits(value);
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return false;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  if (d.length === 11) return d[2] === "9";
  return /[2-5]/.test(d[2]);
}

/** Normaliza para E.164 sem "+" (ex.: 5511973846070), formato aceito pelo wa.me. */
export function phoneToE164(value: string): string {
  const d = onlyDigits(value);
  return d.startsWith("55") && d.length > 11 ? d : `55${d}`;
}

export function formatPhone(value: string): string {
  let d = onlyDigits(value);
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return value;
}

export const isValidCep = (value: string): boolean => onlyDigits(value).length === 8;

export const formatCep = (value: string): string =>
  onlyDigits(value).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");

/**
 * Município de São Paulo pelas faixas de CEP dos Correios:
 * 01000-000…05999-999 e 08000-000…08499-999.
 * Usado só para o aviso de pedido mínimo (R-COT-4), nunca para bloquear.
 */
export function isSpCapitalCep(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 8) return false;
  const n = Number(d);
  return (n >= 1_000_000 && n <= 5_999_999) || (n >= 8_000_000 && n <= 8_499_999);
}
