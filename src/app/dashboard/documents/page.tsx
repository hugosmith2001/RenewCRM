import Link from "next/link";
import { getCurrentUser } from "@/modules/auth";
import { listDocumentsForTenant, type DocumentForList } from "@/modules/documents";
import { listCustomers } from "@/modules/customers";
import { listDocumentsQuerySchema } from "@/lib/validations/documents";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout";
import {
  Badge,
  ButtonLink,
  InlineState,
  ListToolbar,
  Table,
  TableShell,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants/labels";
import { DocumentFilters } from "./DocumentFilters";

type Props = {
  searchParams: Promise<{
    customerId?: string;
    documentType?: string;
    range?: string;
    search?: string;
    page?: string;
  }>;
};

function getDateRange(range: "7d" | "30d" | undefined): { from?: Date; to?: Date } {
  if (!range) return {};
  const to = new Date();
  const from = new Date();
  if (range === "7d") from.setDate(from.getDate() - 7);
  else if (range === "30d") from.setDate(from.getDate() - 30);
  return { from, to };
}

export default async function DocumentsPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const parsed = listDocumentsQuerySchema.safeParse({
    customerId: sp.customerId,
    documentType: sp.documentType,
    range: sp.range,
    search: sp.search,
    page: sp.page,
    limit: 50,
  });
  const query = parsed.success ? parsed.data : listDocumentsQuerySchema.parse({});
  const { from, to } = getDateRange(query.range);
  const offset = (query.page - 1) * query.limit;

  const [customersResult, { documents, total }] = await Promise.all([
    listCustomers(user.tenantId, { page: 1, limit: 300 }),
    listDocumentsForTenant(user.tenantId, {
      customerId: query.customerId,
      documentType: query.documentType,
      search: query.search,
      from,
      to,
      limit: query.limit,
      offset,
    }),
  ]);

  const totalPages = Math.ceil(total / query.limit);
  const hasFilters = !!(query.customerId || query.documentType || query.range || query.search);

  return (
    <>
      <PageHeader
        title="Dokument"
        description="Alla dokument i ditt bestånd. Filtrera på kund, typ eller datum. Ladda upp och koppla dokument från kundsidor."
        actions={
          <ButtonLink href="/dashboard/customers" variant="secondary" size="sm">
            Kunder
          </ButtonLink>
        }
      />

      <ListToolbar
        left={
          <DocumentFilters
            customers={customersResult.customers.map((c) => ({ id: c.id, name: c.name }))}
            initialCustomerId={query.customerId ?? ""}
            initialType={query.documentType ?? ""}
            initialRange={query.range ?? ""}
            initialSearch={query.search ?? ""}
          />
        }
        right={
          <div className="text-sm text-muted-foreground">
            {total.toLocaleString()} total
          </div>
        }
      />

      <div className="mt-content-top">
        <TableShell>
          {documents.length === 0 ? (
            <InlineState
              title={hasFilters ? "Inga träffar" : "Inga dokument ännu"}
              description={
                hasFilters ? (
                  <span>
                    Prova att justera filtren, eller{" "}
                    <Link href="/dashboard/documents" className="text-primary hover:underline">
                      rensa filter
                    </Link>
                    .
                  </span>
                ) : (
                  <span>
                    Dokument laddas upp från kundsidor.{" "}
                    <Link href="/dashboard/customers" className="text-primary hover:underline">
                      Öppna en kund
                    </Link>{" "}
                    och använd avsnittet Dokument för att ladda upp PDF:er för försäkringar, avtal eller andra filer.
                  </span>
                )
              }
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH className="w-[22%]">Namn</TH>
                  <TH className="w-[12%]">Typ</TH>
                  <TH className="w-[20%]">Kund</TH>
                  <TH className="w-[15%]">Försäkring</TH>
                  <TH className="w-[13%]">Uppladdad</TH>
                  <TH className="text-right w-[18%]">Åtgärd</TH>
                </tr>
              </THead>
              <TBody>
                {documents.map((d) => (
                  <DocumentRow key={d.id} doc={d} />
                ))}
              </TBody>
            </Table>
          )}
        </TableShell>
      </div>

      {totalPages > 1 && (
        <div className="mt-content-top flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Sida {query.page} av {totalPages} ({total} totalt)
          </p>
          <div className="flex gap-2">
            {query.page > 1 && (
              <ButtonLink
                href={`/dashboard/documents?${new URLSearchParams({
                  ...(query.customerId && { customerId: query.customerId }),
                  ...(query.documentType && { documentType: query.documentType }),
                  ...(query.range && { range: query.range }),
                  ...(query.search && { search: query.search }),
                  page: String(query.page - 1),
                }).toString()}`}
                variant="secondary"
                size="sm"
              >
                Föregående
              </ButtonLink>
            )}
            {query.page < totalPages && (
              <ButtonLink
                href={`/dashboard/documents?${new URLSearchParams({
                  ...(query.customerId && { customerId: query.customerId }),
                  ...(query.documentType && { documentType: query.documentType }),
                  ...(query.range && { range: query.range }),
                  ...(query.search && { search: query.search }),
                  page: String(query.page + 1),
                }).toString()}`}
                variant="secondary"
                size="sm"
              >
                Nästa
              </ButtonLink>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function DocumentRow({ doc }: { doc: DocumentForList }) {
  const uploadedAt = new Date(doc.createdAt).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
  return (
    <TR>
      <TD className="font-medium text-foreground max-w-[200px] truncate" title={doc.name || undefined}>
        {doc.name}
      </TD>
      <TD>
        <Badge tone="neutral">
          {DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}
        </Badge>
      </TD>
      <TD>
        <Link
          href={`/dashboard/customers/${doc.customer.id}`}
          className="text-primary hover:underline"
        >
          {doc.customer.name}
        </Link>
      </TD>
      <TD className="text-muted-foreground">
        {doc.policy ? (
          <Link
            href={`/dashboard/customers/${doc.customer.id}/policies/${doc.policy.id}`}
            className="text-primary hover:underline"
          >
            {doc.policy.policyNumber}
          </Link>
        ) : (
          "—"
        )}
      </TD>
      <TD className="text-muted-foreground">{uploadedAt}</TD>
      <TD className="text-right">
        <span className="flex items-center justify-end gap-2">
          <a
            href={`/api/customers/${doc.customer.id}/documents/${doc.id}/download`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Ladda ner
          </a>
          <Link
            href={`/dashboard/customers/${doc.customer.id}#documents`}
            className="text-sm text-primary hover:underline"
          >
            Visa
          </Link>
        </span>
      </TD>
    </TR>
  );
}
