// Modelos de e-mail. Todo dado vindo de usuário passa por esc() — nunca HTML cru.
import { unitLabel, type Unit } from "../shared/catalog";
import { company, whatsappLink } from "../shared/company";
import { formatBRL } from "../shared/proposal";
import type { MailMessage } from "./platform/mail";

const esc = (v: string | null | undefined): string =>
  (v ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

const NAVY = "#0B3A6B";
const GREEN = "#3E9A12";

function layout(title: string, body: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title></head>
<body style="margin:0;background:#F5F6F3;font-family:Arial,Helvetica,sans-serif;color:#23313F">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F6F3;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #DCE2E7;border-radius:12px">
<tr><td style="padding:20px 28px;border-bottom:4px solid ${GREEN}">
<strong style="font-size:20px;color:${NAVY};letter-spacing:-0.02em">WSN</strong>
<span style="font-size:12px;color:${GREEN};text-transform:uppercase;letter-spacing:0.12em;margin-left:8px">${esc(company.tagline)}</span>
</td></tr>
<tr><td style="padding:28px">${body}</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #DCE2E7;font-size:12px;color:#5D6B7A">
${esc(company.legalName)} · CNPJ ${esc(company.cnpj)}<br>${esc(company.address.street)} – ${esc(company.address.district)}, ${esc(company.address.city)} – ${esc(company.address.state)}
</td></tr></table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<a href="${esc(href)}" style="display:inline-block;background:${NAVY};color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold">${esc(label)}</a>`;

interface ItemLine {
  ref: string;
  name: string;
  unit: string;
  quantity: number;
}

const itemsTable = (items: ItemLine[]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;margin:16px 0">
${items
  .map(
    (i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #ECEFEB;font-family:monospace;color:#5D6B7A;width:56px">${esc(i.ref)}</td>
<td style="padding:8px 0;border-bottom:1px solid #ECEFEB">${esc(i.name)}</td>
<td style="padding:8px 0;border-bottom:1px solid #ECEFEB;text-align:right;white-space:nowrap"><strong>${i.quantity}</strong> ${esc(unitLabel(i.unit as Unit, i.quantity))}</td></tr>`,
  )
  .join("")}</table>`;

const itemsText = (items: ItemLine[]) =>
  items.map((i) => `- [${i.ref}] ${i.name} — ${i.quantity} ${unitLabel(i.unit as Unit, i.quantity)}`).join("\n");

export function newQuoteToSales(p: {
  to: string;
  protocol: string;
  name: string;
  company: string | null;
  email: string;
  phone: string;
  cep: string;
  isSpCapital: boolean;
  message: string | null;
  items: ItemLine[];
  adminUrl: string;
}): MailMessage {
  const who = p.company ? `${p.name} · ${p.company}` : p.name;
  return {
    to: p.to,
    replyTo: p.email,
    subject: `Nova cotação ${p.protocol} — ${who}`,
    html: layout(
      `Nova cotação ${p.protocol}`,
      `<p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#5D6B7A">Nova cotação</p>
<h1 style="margin:0 0 16px;font-family:monospace;color:${NAVY};font-size:24px">${esc(p.protocol)}</h1>
<p style="margin:0">${esc(who)}<br>${esc(p.email)} · ${esc(p.phone)}<br>CEP ${esc(p.cep)}${p.isSpCapital ? " · São Paulo capital" : ""}</p>
${p.message ? `<p style="background:#F5F6F3;padding:12px;border-radius:8px">${esc(p.message)}</p>` : ""}
${itemsTable(p.items)}
<p>${button(p.adminUrl, "Abrir no painel e montar proposta")}</p>`,
    ),
    text: `Nova cotação ${p.protocol}\n${who}\n${p.email} · ${p.phone}\nCEP ${p.cep}\n\n${itemsText(p.items)}\n\n${p.message ?? ""}\n\nPainel: ${p.adminUrl}`,
  };
}

export function quoteConfirmationToCustomer(p: { to: string; name: string; protocol: string; items: ItemLine[] }): MailMessage {
  const wa = whatsappLink(`Olá! Enviei a cotação ${p.protocol} pelo site.`);
  return {
    to: p.to,
    subject: `Recebemos sua cotação ${p.protocol}`,
    html: layout(
      "Cotação recebida",
      `<p>Olá, ${esc(p.name.split(" ")[0])}.</p>
<p>Recebemos sua solicitação de orçamento. Nossa equipe entrará em contato em até 24 horas com o orçamento completo dos produtos selecionados.</p>
<p style="font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#5D6B7A;margin:20px 0 4px">Protocolo</p>
<p style="font-family:monospace;font-size:22px;color:${NAVY};margin:0">${esc(p.protocol)}</p>
${itemsTable(p.items)}
<p>${button(wa, "Falar no WhatsApp")}</p>`,
    ),
    text: `Olá, ${p.name.split(" ")[0]}.\n\nRecebemos sua cotação ${p.protocol}. Nossa equipe entrará em contato em até 24 horas.\n\n${itemsText(p.items)}\n\nWhatsApp: ${wa}`,
  };
}

export function proposalToCustomer(p: {
  to: string;
  name: string;
  protocol: string;
  link: string;
  totalCents: number;
  validUntil: string;
  version: number;
}): MailMessage {
  const until = new Date(p.validUntil).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return {
    to: p.to,
    subject: `Sua proposta WSN ${p.protocol}${p.version > 1 ? ` (versão ${p.version})` : ""}`,
    html: layout(
      "Proposta comercial",
      `<p>Olá, ${esc(p.name.split(" ")[0])}.</p>
<p>Sua proposta para a cotação <strong style="font-family:monospace">${esc(p.protocol)}</strong> está pronta.</p>
<p style="font-size:28px;color:${NAVY};margin:16px 0 4px"><strong>${esc(formatBRL(p.totalCents))}</strong></p>
<p style="margin:0 0 20px;color:#5D6B7A">Válida até ${esc(until)}</p>
<p>${button(p.link, "Ver e aprovar a proposta")}</p>
<p style="font-size:13px;color:#5D6B7A">Este link é pessoal. Se não foi você que pediu o orçamento, ignore esta mensagem.</p>`,
    ),
    text: `Olá, ${p.name.split(" ")[0]}.\n\nSua proposta ${p.protocol}: ${formatBRL(p.totalCents)}, válida até ${until}.\nVer e aprovar: ${p.link}`,
  };
}

export function proposalApprovedToSales(p: {
  to: string;
  protocol: string;
  approvedBy: string;
  totalCents: number;
  adminUrl: string;
}): MailMessage {
  return {
    to: p.to,
    subject: `✔ Proposta aprovada ${p.protocol} — ${formatBRL(p.totalCents)}`,
    html: layout(
      "Proposta aprovada",
      `<p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:${GREEN}">Proposta aprovada</p>
<h1 style="margin:0 0 12px;font-family:monospace;color:${NAVY};font-size:24px">${esc(p.protocol)}</h1>
<p>Aprovada por <strong>${esc(p.approvedBy)}</strong> no valor de <strong>${esc(formatBRL(p.totalCents))}</strong>.</p>
<p>${button(p.adminUrl, "Abrir no painel")}</p>`,
    ),
    text: `Proposta ${p.protocol} aprovada por ${p.approvedBy}: ${formatBRL(p.totalCents)}.\n${p.adminUrl}`,
  };
}

export function loginLink(p: { to: string; name: string; link: string }): MailMessage {
  return {
    to: p.to,
    subject: "Seu link de acesso ao painel WSN",
    html: layout(
      "Acesso ao painel",
      `<p>Olá, ${esc(p.name.split(" ")[0])}.</p>
<p>Use o botão abaixo para entrar no painel. O link vale por 15 minutos e funciona uma única vez.</p>
<p>${button(p.link, "Entrar no painel")}</p>
<p style="font-size:13px;color:#5D6B7A">Se não foi você, ignore este e-mail — ninguém entra sem este link.</p>`,
    ),
    text: `Entrar no painel WSN (válido por 15 minutos, uso único): ${p.link}`,
  };
}

export function contactToSales(p: {
  to: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  subject: string | null;
  body: string;
}): MailMessage {
  return {
    to: p.to,
    replyTo: p.email,
    subject: `Contato pelo site — ${p.subject || p.name}`,
    html: layout(
      "Contato pelo site",
      `<p><strong>${esc(p.name)}</strong>${p.company ? ` · ${esc(p.company)}` : ""}<br>${esc(p.email)}${p.phone ? ` · ${esc(p.phone)}` : ""}</p>
${p.subject ? `<p style="font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#5D6B7A">${esc(p.subject)}</p>` : ""}
<p style="white-space:pre-wrap;background:#F5F6F3;padding:12px;border-radius:8px">${esc(p.body)}</p>`,
    ),
    text: `${p.name} <${p.email}> ${p.phone ?? ""}\n${p.subject ?? ""}\n\n${p.body}`,
  };
}
