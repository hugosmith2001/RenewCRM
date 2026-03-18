import Link from "next/link";
import { getCurrentUser } from "@/modules/auth";
import { listCustomers } from "@/modules/customers";
import { listCustomersQuerySchema } from "@/lib/validations/customers";
import { redirect } from "next/navigation";
import { CustomerSearchForm } from "./CustomerSearchForm";
import { PageHeader } from "@/components/layout";
import { Badge, ButtonLink, InlineState, ListToolbar, Table, TableShell, TBody, TD, TH, THead, TR } from "@/components/ui";

type Props = {
  searchParams: Promise<{ search?: string; status?: string; type?: string; page?: string }>;
};

export default async function CustomersPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const parsed = listCustomersQuerySchema.safeParse({
    search: sp.search,
    status: sp.status,
    type: sp.type,
    page: sp.page,
    limit: 20,
  });
  const query = parsed.success ? parsed.data : listCustomersQuerySchema.parse({});

  const { customers, total } = await listCustomers(user.tenantId, query);
  const totalPages = Math.ceil(total / query.limit);

  return (
    <>
      <PageHeader
        title="Customers"
        actions={
          <ButtonLink
            href="/dashboard/customers/new"
            variant="primary"
          >
            Add customer
          </ButtonLink>
        }
      />

      <ListToolbar
        left={
          <CustomerSearchForm
            initialSearch={query.search}
            initialStatus={query.status}
            initialType={query.type}
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
          {customers.length === 0 ? (
            <InlineState
              title={query.search || query.status || query.type ? "No matches" : "No customers yet"}
              description={
                query.search || query.status || query.type ? (
                  <span>
                    Try adjusting your search or filters, or{" "}
                    <Link href="/dashboard/customers" className="text-primary hover:underline">
                      clear filters
                    </Link>
                    .
                  </span>
                ) : (
                  <span>
                    Create your first customer to start tracking policies, documents, activities, and tasks.
                  </span>
                )
              }
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH className="w-[36%]">Customer</TH>
                  <TH>Type</TH>
                  <TH>Contact</TH>
                  <TH>Status</TH>
                  <TH>Owner</TH>
                  <TH className="text-right">Action</TH>
                </tr>
              </THead>
              <TBody>
                {customers.map((c) => {
                  const tone =
                    c.status === "ACTIVE" ? "success" : c.status === "PROSPECT" ? "warning" : "neutral";
                  return (
                    <TR key={c.id}>
                      <TD className="font-medium text-foreground">
                        <Link href={`/dashboard/customers/${c.id}`} className="text-primary hover:underline">
                          {c.name}
                        </Link>
                      </TD>
                      <TD className="text-muted-foreground">{c.type}</TD>
                      <TD className="text-muted-foreground">{c.email ?? c.phone ?? "—"}</TD>
                      <TD>
                        <Badge tone={tone}>{c.status}</Badge>
                      </TD>
                      <TD className="text-muted-foreground">{c.owner?.name ?? c.owner?.email ?? "—"}</TD>
                      <TD className="text-right">
                        <Link href={`/dashboard/customers/${c.id}`} className="text-sm text-primary hover:underline">
                          View
                        </Link>
                      </TD>
                    </TR>
                  );
                })}
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
                href={`/dashboard/customers?${new URLSearchParams({
                  ...(query.search && { search: query.search }),
                  ...(query.status && { status: query.status }),
                  ...(query.type && { type: query.type }),
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
                href={`/dashboard/customers?${new URLSearchParams({
                  ...(query.search && { search: query.search }),
                  ...(query.status && { status: query.status }),
                  ...(query.type && { type: query.type }),
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
