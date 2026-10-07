import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, ImageUp, Pencil, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { normalizeSearch, productPath, UNIT_LABEL, UNITS, type Unit } from "@shared/catalog";
import { formatBRL, parseBRL } from "@shared/proposal";
import { api, errorMessage } from "@/lib/api";
import { useDocumentTitle } from "@/lib/hooks";
import { Badge, Skeleton } from "@/ui/bits";
import { Button } from "@/ui/Button";
import { Checkbox, Field, Input, Select, Textarea } from "@/ui/Field";
import { Dialog } from "@/ui/Dialog";
import { toast } from "@/ui/toast";
import { AdminHeader } from "./AdminLayout";
import type { AdminProduct, Me } from "./api";

interface CatalogData {
  products: AdminProduct[];
  categories: { id: number; name: string }[];
  brands: { id: number; name: string }[];
}

export function CatalogAdminPage() {
  useDocumentTitle("Catálogo");
  const me = useOutletContext<Me>();
  const { data, isLoading } = useQuery({ queryKey: ["admin-products"], queryFn: () => api<CatalogData>("/admin/products") });
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<AdminProduct | "new" | null>(null);

  const list = useMemo(() => {
    const n = normalizeSearch(q);
    return (data?.products ?? []).filter((p) => !n || normalizeSearch(`${p.ref} ${p.name}`).includes(n));
  }, [data, q]);

  return (
    <>
      <AdminHeader
        label={`${data?.products.length ?? "—"} produtos`}
        title="Catálogo"
        actions={
          me.role === "admin" && (
            <Button size="sm" onClick={() => setEditing("new")}>
              <Plus className="size-4" /> Novo produto
            </Button>
          )
        }
      />
      <div className="relative mb-4 md:w-80">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome ou Ref." aria-label="Filtrar produtos" className="h-10 w-full rounded-pill border border-line-strong bg-raised pr-3 pl-9 text-sm" />
      </div>
      {isLoading || !data ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-raised">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-line bg-sunken/60">
              <tr className="label text-left">
                <th className="px-4 py-3 font-normal">Ref</th>
                <th className="px-4 py-3 font-normal">Produto</th>
                <th className="px-4 py-3 font-normal">Categoria</th>
                <th className="px-4 py-3 text-right font-normal">Preço interno</th>
                <th className="px-4 py-3 text-right font-normal">Cotado</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 font-mono text-muted">{p.ref}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-sm border border-line bg-white">
                        {p.imagePath && <img src={p.imagePath} alt="" className="size-7 object-contain" />}
                      </span>
                      <span className="text-strong">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted">{data.categories.find((c) => c.id === p.categoryId)?.name}</td>
                  <td className="px-4 py-2.5 text-right tabular">{p.priceCents == null ? "—" : formatBRL(p.priceCents)}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular">{p.timesQuoted}×</td>
                  <td className="px-4 py-2.5">{p.active ? <Badge tone="ok">Ativo</Badge> : <Badge>Inativo</Badge>}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <a href={productPath(p)} target="_blank" rel="noopener noreferrer" className="grid size-8 place-items-center rounded-pill text-muted hover:bg-sunken" aria-label="Ver no site">
                        <ExternalLink className="size-4" />
                      </a>
                      <button type="button" onClick={() => setEditing(p)} className="grid size-8 place-items-center rounded-pill text-muted hover:bg-sunken hover:text-strong" aria-label={`Editar ${p.name}`}>
                        <Pencil className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && data && <ProductEditor product={editing === "new" ? null : editing} data={data} isAdmin={me.role === "admin"} onClose={() => setEditing(null)} />}
    </>
  );
}

/** Reduz no navegador para ≤ 800px WebP (também remove metadados EXIF) antes de enviar. */
async function toWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("webp"))), "image/webp", 0.85));
}

function ProductEditor({ product, data, isAdmin, onClose }: { product: AdminProduct | null; data: CatalogData; isAdmin: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    ref: product?.ref ?? "",
    name: product?.name ?? "",
    unit: (product?.unit ?? "unidade") as Unit,
    categoryId: product?.categoryId ?? data.categories[0]?.id ?? 1,
    brandId: product?.brandId ?? null,
    description: product?.description ?? "",
    price: product?.priceCents == null ? "" : (product.priceCents / 100).toFixed(2).replace(".", ","),
    active: product?.active ?? true,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const done = () => {
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["catalog"] });
  };

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name,
        unit: form.unit,
        categoryId: Number(form.categoryId),
        brandId: form.brandId ? Number(form.brandId) : null,
        description: form.description.trim() || null,
        priceCents: form.price ? parseBRL(form.price) : null,
        active: form.active,
      };
      return product ? api(`/admin/products/${product.id}`, { method: "PATCH", json: body }) : api("/admin/products", { method: "POST", json: { ...body, ref: form.ref } });
    },
    onSuccess: () => {
      toast.ok("Produto salvo — o site já mostra a mudança");
      done();
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => api<{ imagePath: string }>(`/admin/products/${product!.id}/image`, { method: "PUT", body: await toWebp(file), headers: { "content-type": "image/webp" } }),
    onSuccess: () => {
      toast.ok("Foto atualizada");
      done();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Dialog
      open
      onClose={onClose}
      variant="sheet"
      title={product ? `Editar Ref. ${product.ref}` : "Novo produto"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={save.isPending} onClick={() => save.mutate()}>
            Salvar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {product && (
          <div className="flex items-center gap-4">
            <span className="grid size-20 place-items-center rounded-md border border-line bg-white">
              {product.imagePath && <img src={product.imagePath} alt="" className="size-16 object-contain" />}
            </span>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-pill border border-line-strong px-4 py-2 text-sm hover:border-action">
              <ImageUp className="size-4" /> {upload.isPending ? "Enviando…" : "Trocar foto"}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])} />
            </label>
          </div>
        )}
        {!product && (
          <Field label="Referência (4 dígitos)" required>
            <Input inputMode="numeric" maxLength={4} value={form.ref} onChange={(e) => set("ref", e.target.value.replace(/\D/g, ""))} />
          </Field>
        )}
        <Field label="Nome" required hint="Mudar o nome muda o endereço; o antigo continua redirecionando.">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={160} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Unidade de venda">
            <Select value={form.unit} onChange={(e) => set("unit", e.target.value as Unit)}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {UNIT_LABEL[u].one}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Categoria">
            <Select value={form.categoryId} onChange={(e) => set("categoryId", Number(e.target.value))}>
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Marca">
          <Select value={form.brandId ?? ""} onChange={(e) => set("brandId", e.target.value ? Number(e.target.value) : null)}>
            <option value="">Sem marca</option>
            {data.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Descrição" hint="Aparece na página do produto e no Google.">
          <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={2000} />
        </Field>
        <Field label="Preço interno (R$)" hint={isAdmin ? "Nunca aparece no site; pré-preenche as propostas." : "Somente administradores alteram."}>
          <Input inputMode="decimal" value={form.price} disabled={!isAdmin} onChange={(e) => set("price", e.target.value)} />
        </Field>
        <Checkbox checked={form.active} disabled={!isAdmin} onChange={(e) => set("active", e.target.checked)} label="Ativo no site" />
      </div>
    </Dialog>
  );
}
