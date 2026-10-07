import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MailCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api, errorMessage } from "@/lib/api";
import { useDocumentTitle } from "@/lib/hooks";
import { Alert } from "@/ui/bits";
import { Button } from "@/ui/Button";
import { Field, Input } from "@/ui/Field";
import { Symbol } from "@/ui/Logo";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-lg border border-line bg-raised p-8">
        <Symbol className="mb-6 size-12" />
        {children}
      </div>
    </div>
  );
}

export function LoginPage() {
  useDocumentTitle("Entrar no painel");
  const [email, setEmail] = useState("");
  const request = useMutation({ mutationFn: () => api("/auth/request-link", { method: "POST", json: { email } }) });

  if (request.isSuccess) {
    return (
      <Card>
        <MailCheck className="mb-4 size-8 text-green" />
        <h1 className="display-3 text-2xl">Confira seu e-mail</h1>
        <p className="mt-3 text-muted">
          Se <strong className="text-strong">{email}</strong> tiver acesso ao painel, você vai receber um link de entrada. Ele vale por 15 minutos e funciona uma vez.
        </p>
        <Button variant="ghost" className="mt-6" onClick={() => request.reset()}>
          Usar outro e-mail
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="display-3 text-2xl">Painel WSN</h1>
      <p className="mt-2 text-sm text-muted">Sem senha: enviamos um link de acesso para o seu e-mail.</p>
      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          request.mutate();
        }}
      >
        <Field label="E-mail" required>
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </Field>
        {request.isError && <Alert>{errorMessage(request.error)}</Alert>}
        <Button type="submit" loading={request.isPending}>
          Enviar link de acesso
        </Button>
      </form>
      <Link to="/" className="mt-6 block text-center text-sm text-muted hover:text-strong">
        Voltar ao site
      </Link>
    </Card>
  );
}

export function VerifyPage() {
  useDocumentTitle("Entrando…");
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const started = useRef(false);
  const verify = useMutation({
    mutationFn: () => api("/auth/verify", { method: "POST", json: { token } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      navigate("/admin", { replace: true });
    },
  });

  useEffect(() => {
    if (started.current) return; // StrictMode monta duas vezes; o link é de uso único
    started.current = true;
    verify.mutate();
  }, [verify]);

  return (
    <Card>
      {verify.isError ? (
        <>
          <h1 className="display-3 text-2xl">Link inválido</h1>
          <p className="mt-3 text-muted">{errorMessage(verify.error)}</p>
          <Link to="/admin/entrar" className="mt-6 inline-block font-medium text-strong underline">
            Pedir novo link
          </Link>
        </>
      ) : (
        <p className="text-muted">Entrando no painel…</p>
      )}
    </Card>
  );
}
