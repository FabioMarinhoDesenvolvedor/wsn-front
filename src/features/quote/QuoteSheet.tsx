import { ClipboardList, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { productPath, unitLabel } from "@shared/catalog";
import { quote as copy } from "@/content/site";
import { Button, LinkButton } from "@/ui/Button";
import { EmptyState } from "@/ui/bits";
import { Dialog } from "@/ui/Dialog";
import { useCatalog, useCatalogIndex } from "../catalog/data";
import { AddToQuote } from "./AddToQuote";
import { useQuote, useQuoteCount } from "./store";

/** Resumo da cotação acessível de qualquer página (gaveta lateral). */
export function QuoteSheet() {
  const open = useQuote((s) => s.sheetOpen);
  const setOpen = useQuote((s) => s.openSheet);
  const lines = useQuote((s) => s.lines);
  const remove = useQuote((s) => s.remove);
  const total = useQuoteCount();
  const navigate = useNavigate();
  const { data } = useCatalog();
  const { productByRef } = useCatalogIndex(data);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      variant="sheet"
      title={
        <span className="flex items-baseline gap-2">
          Sua cotação <span className="font-mono text-sm font-normal text-muted tabular">{lines.length} itens</span>
        </span>
      }
      footer={
        lines.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="flex justify-between text-sm">
              <span className="text-muted">{copy.totalItems}</span>
              <span className="font-mono text-strong tabular">{total}</span>
            </p>
            <Button
              size="lg"
              onClick={() => {
                setOpen(false);
                navigate("/cotacao", { viewTransition: true });
              }}
            >
              Revisar e enviar cotação
            </Button>
            <p className="text-center text-xs text-muted">Sem compromisso · resposta em até 24 horas</p>
          </div>
        )
      }
    >
      {lines.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title={copy.emptyTitle}
          action={
            <LinkButton to="/produtos" onClick={() => setOpen(false)}>
              {copy.emptyAction}
            </LinkButton>
          }
        >
          {copy.emptyText}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {lines.map((l) => {
            const p = productByRef.get(l.ref);
            return (
              <li key={l.ref} className="grid grid-cols-[56px_1fr] gap-3 py-4">
                <div className="grid size-14 place-items-center overflow-hidden rounded-md border border-line bg-white">
                  {p?.imagePath ? <img src={p.imagePath} alt="" className="size-11 object-contain" /> : <span className="font-mono text-xs text-[#5d6b7a]">{l.ref}</span>}
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    {p ? (
                      <Link to={productPath(p)} onClick={() => setOpen(false)} className="line-clamp-2 text-sm font-medium text-strong hover:underline">
                        {p.name}
                      </Link>
                    ) : (
                      <span className="text-sm text-danger">Ref {l.ref} — indisponível</span>
                    )}
                    <button type="button" onClick={() => remove(l.ref)} className="grid size-8 shrink-0 place-items-center rounded-pill text-muted hover:bg-sunken hover:text-danger" aria-label="Remover">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-36">{p && <AddToQuote productRef={l.ref} productName={p.name} />}</div>
                    {p && <span className="text-xs text-muted">{unitLabel(p.unit, l.quantity)}</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
}
