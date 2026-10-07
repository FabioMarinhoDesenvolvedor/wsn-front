import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, MessageCircle, UserPlus } from "lucide-react";
import { useState } from "react";
import { Navigate, useOutletContext } from "react-router";
import { phoneToE164 } from "@shared/br";
import { whatsappLink } from "@shared/company";
import { api, errorMessage } from "@/lib/api";
import { useDocumentTitle } from "@/lib/hooks";
import { Alert, Badge, EmptyState, Skeleton } from "@/ui/bits";
import { AnchorButton, Button } from "@/ui/Button";
import { Field, Input, Select } from "@/ui/Field";
import { toast } from "@/ui/toast";
import { AdminHeader } from "./AdminLayout";
import { fmtDateTime, type Me } from "./api";

// ---------- Mensagens de contato ----------

interface Message {
  id: string;
  status: "nova" | "respondida" | "arquivada";
  subject: string | null;
  createdAt: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  message: string | null;
}

export function MessagesPage() {
  useDocumentTitle("Mensagens");
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["messages"], queryFn: () => api<{ items: Message[] }>("/admin/contact-messages") });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Message["status"] }) => api(`/admin/contact-messages/${id}`, { method: "PATCH", json: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages"] }),
  });

  return (
    <>
      <AdminHeader label="Formulário de contato" title="Mensagens" />
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : !data?.items.length ? (
        <EmptyState title="Nenhuma mensagem ainda" />
      ) : (
        <ul className="flex flex-col gap-3">
          {data.items.map((m) => (
            <li key={m.id} className="rounded-lg border border-line bg-raised p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-strong">
                    {m.name ?? "Anonimizado"}
                    {m.company && <span className="text-muted"> · {m.company}</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {fmtDateTime(m.createdAt)} {m.subject && `· ${m.subject}`}
                  </p>
                </div>
                <Badge tone={m.status === "nova" ? "signal" : m.status === "respondida" ? "ok" : "neutral"}>{m.status}</Badge>
              </div>
              {m.message && <p className="mt-3 whitespace-pre-line text-body">{m.message}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {m.email && (
                  <AnchorButton size="sm" variant="secondary" href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject ?? "Contato WSN"}`)}`}>
                    <Mail className="size-4" /> Responder
                  </AnchorButton>
                )}
                {m.phone && (
                  <AnchorButton size="sm" variant="whatsapp" external href={whatsappLink(`Olá, ${m.name?.split(" ")[0]}! Aqui é da WSN.`, phoneToE164(m.phone))}>
                    <MessageCircle className="size-4" /> WhatsApp
                  </AnchorButton>
                )}
                {m.status !== "respondida" && (
                  <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: m.id, status: "respondida" })}>
                    Marcar respondida
                  </Button>
                )}
                {m.status !== "arquivada" && (
                  <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: m.id, status: "arquivada" })}>
                    Arquivar
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// ---------- Equipe, LGPD e auditoria (só admin) ----------

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "vendedor";
  active: boolean;
  lastLoginAt: string | null;
}

export function TeamPage() {
  useDocumentTitle("Equipe");
  const me = useOutletContext<Me>();
  const qc = useQueryClient();
  const users = useQuery({ queryKey: ["team"], queryFn: () => api<{ items: TeamUser[] }>("/admin/team/users"), enabled: me.role === "admin" });
  const audit = useQuery({
    queryKey: ["audit"],
    queryFn: () => api<{ items: { id: number; action: string; entity: string; entityId: string | null; createdAt: string; actorName: string | null }[] }>("/admin/team/audit"),
    enabled: me.role === "admin",
  });
  const [form, setForm] = useState({ name: "", email: "", role: "vendedor" as TeamUser["role"] });
  const [privacyEmail, setPrivacyEmail] = useState("");

  const create = useMutation({
    mutationFn: () => api("/admin/team/users", { method: "POST", json: { ...form, active: true } }),
    onSuccess: () => {
      toast.ok("Pessoa adicionada — ela entra pedindo o link com o próprio e-mail");
      setForm({ name: "", email: "", role: "vendedor" });
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const update = useMutation({
    mutationFn: (u: TeamUser) => api(`/admin/team/users/${u.id}`, { method: "PATCH", json: { name: u.name, role: u.role, active: u.active } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const anonymize = useMutation({
    mutationFn: () => api<{ quotes: number; contacts: number }>("/admin/team/privacy/anonymize", { method: "POST", json: { email: privacyEmail } }),
    onSuccess: (r) => {
      toast.ok(`Anonimizado: ${r.quotes} cotação(ões), ${r.contacts} mensagem(ns)`);
      setPrivacyEmail("");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (me.role !== "admin") return <Navigate to="/admin" replace />;

  return (
    <>
      <AdminHeader label="Administração" title="Equipe, LGPD e auditoria" />
      <div className="grid gap-8 xl:grid-cols-[1.3fr_1fr]">
        <section className="rounded-lg border border-line bg-raised p-6">
          <h2 className="mb-4 font-sans text-base font-semibold tracking-normal">Quem acessa o painel</h2>
          <ul className="divide-y divide-line">
            {users.data?.items.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-strong">{u.name}</p>
                  <p className="truncate text-muted">
                    {u.email} · {u.lastLoginAt ? `último acesso ${fmtDateTime(u.lastLoginAt)}` : "nunca entrou"}
                  </p>
                </div>
                <select
                  aria-label={`Papel de ${u.name}`}
                  value={u.role}
                  onChange={(e) => update.mutate({ ...u, role: e.target.value as TeamUser["role"] })}
                  className="h-9 rounded-pill border border-line-strong bg-raised px-3"
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="admin">Admin</option>
                </select>
                <Button size="sm" variant={u.active ? "danger" : "secondary"} onClick={() => update.mutate({ ...u, active: !u.active })}>
                  {u.active ? "Desativar" : "Reativar"}
                </Button>
              </li>
            ))}
          </ul>
          <form
            className="mt-6 grid gap-3 border-t border-line pt-6 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <Field label="Nome">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="E-mail">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </Field>
            <Field label="Papel">
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as TeamUser["role"] })}>
                <option value="vendedor">Vendedor</option>
                <option value="admin">Admin</option>
              </Select>
            </Field>
            <Button type="submit" loading={create.isPending}>
              <UserPlus className="size-4" /> Adicionar
            </Button>
          </form>
        </section>

        <div className="flex flex-col gap-8">
          <section className="rounded-lg border border-line bg-raised p-6">
            <h2 className="font-sans text-base font-semibold tracking-normal">Pedido do titular (LGPD)</h2>
            <p className="mt-1 text-sm text-muted">Apaga nome, e-mail, telefone, empresa, CNPJ e mensagens ligados ao e-mail. O histórico comercial (itens e valores) permanece.</p>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (window.confirm(`Anonimizar todos os dados de ${privacyEmail}? Não dá para desfazer.`)) anonymize.mutate();
              }}
            >
              <Input type="email" value={privacyEmail} onChange={(e) => setPrivacyEmail(e.target.value)} placeholder="e-mail do titular" aria-label="E-mail do titular" required />
              <Button type="submit" variant="danger" loading={anonymize.isPending}>
                Anonimizar
              </Button>
            </form>
          </section>

          <section className="rounded-lg border border-line bg-raised p-6">
            <h2 className="font-sans text-base font-semibold tracking-normal">Auditoria</h2>
            <p className="mt-1 text-sm text-muted">Registro somente-inclusão: ninguém edita ou apaga.</p>
            {audit.isError && <Alert>{errorMessage(audit.error)}</Alert>}
            <ol className="mt-4 flex max-h-96 flex-col gap-2 overflow-y-auto text-sm">
              {audit.data?.items.map((a) => (
                <li key={a.id} className="flex justify-between gap-3 border-b border-line pb-2">
                  <span>
                    <span className="font-mono text-xs text-strong">{a.action}</span>
                    <span className="text-muted"> · {a.actorName ?? "cliente/sistema"}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">{fmtDateTime(a.createdAt)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
