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
        title="Documents"
        description="All documents across your book. Filter by customer, type, or date. Upload and link documents from customer workspaces."
        actions={
          <ButtonLink href="/dashboard/customers" variant="secondary" size="sm">
            Customers
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
              title={hasFilters ? "No matches" : "No documents yet"}
              description={
                hasFilters ? (
                  <span>
                    Try adjusting filters, or{" "}
                    <Link href="/dashboard/documents" className="text-primary hover:underline">
                      clear filters
                    </Link>
                    .
                  </span>
                ) : (
                  <span>
                    Documents are uploaded from customer pages.{" "}
                    <Link href="/dashboard/customers" className="text-primary hover:underline">
                      Open a customer
                    </Link>{" "}
                    and use the Documents section to upload policy PDFs, contracts, or other files.
                  </span>
                )
              }
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH className="w-[22%]">Name</TH>
                  <TH className="w-[12%]">Type</TH>
                  <TH className="w-[20%]">Customer</TH>
                  <TH className="w-[15%]">Policy</TH>
                  <TH className="w-[13%]">Uploaded</TH>
                  <TH className="text-right w-[18%]">Action</TH>
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
            Page {query.page} of {totalPages} ({total} total)
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
                Previous
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
                Next
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
            Download
          </a>
          <Link
            href={`/dashboard/customers/${doc.customer.id}#documents`}
            className="text-sm text-primary hover:underline"
          >
            View
          </Link>
        </span>
      </TD>
    </TR>
  );
}
