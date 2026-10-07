import { Compass } from "lucide-react";
import { privacy, terms, type LegalDoc } from "@/content/legal";
import { useDocumentTitle } from "@/lib/hooks";
import { LinkButton } from "@/ui/Button";

function LegalPage({ doc }: { doc: LegalDoc }) {
  useDocumentTitle(doc.title);
  return (
    <article className="container-page max-w-3xl py-14 md:py-20">
      <p className="label">Atualizado em {doc.updated}</p>
      <h1 className="display-2 mt-4">{doc.title}</h1>
      <div className="mt-10 flex flex-col gap-10">
        {doc.sections.map((s, i) => (
          <section key={s.heading} className="grid gap-3 border-t border-line pt-6 md:grid-cols-[48px_1fr]">
            <span className="font-mono text-sm text-muted">{String(i + 1).padStart(2, "0")}</span>
            <div className="flex flex-col gap-3">
              <h2 className="display-3 text-xl">{s.heading}</h2>
              {s.body.map((p) => (
                <p key={p.slice(0, 24)} className="leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}

export const PrivacyPage = () => <LegalPage doc={privacy} />;
export const TermsPage = () => <LegalPage doc={terms} />;

export function NotFoundPage() {
  useDocumentTitle("Página não encontrada");
  return (
    <div className="container-page grid min-h-[60dvh] place-items-center py-20 text-center">
      <div className="flex flex-col items-center gap-5">
        <Compass className="size-12 stroke-[1.25] text-muted" />
        <p className="font-mono text-sm text-muted">ERRO 404</p>
        <h1 className="display-2">Página não encontrada</h1>
        <p className="lead max-w-md">O endereço mudou ou não existe. O catálogo e a busca continuam aqui.</p>
        <div className="flex gap-3">
          <LinkButton to="/produtos">Ver catálogo</LinkButton>
          <LinkButton to="/" variant="secondary">
            Início
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
