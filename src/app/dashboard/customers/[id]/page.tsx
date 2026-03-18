import { getCurrentUser } from "@/modules/auth";
import { getCustomerById } from "@/modules/customers";
import { redirect, notFound } from "next/navigation";
import { ContactPersonsSection } from "../ContactPersonsSection";
import { InsuredObjectsSection } from "../InsuredObjectsSection";
import { PoliciesSection } from "../PoliciesSection";
import { DocumentsSection } from "../DocumentsSection";
import { ActivitiesSection } from "../ActivitiesSection";
import { TasksSection } from "../TasksSection";
import { PageHeader, DetailSection } from "@/components/layout";
import { Badge, ButtonLink } from "@/components/ui";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ editPolicy?: string } | undefined>;
};

export default async function CustomerDetailPage({ params, searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const customer = await getCustomerById(user.tenantId, id);
  if (!customer) notFound();

  const statusTone =
    customer.status === "ACTIVE"
      ? "success"
      : customer.status === "PROSPECT"
        ? "warning"
        : "neutral";

  return (
    <>
      <PageHeader
        title={customer.name}
        backHref="/dashboard/customers"
        backLabel="Customers"
        description={
          <span className="flex items-center gap-2">
            <Badge tone={statusTone}>{customer.status}</Badge>
            <span className="text-muted-foreground">
              {customer.type}
              {customer.owner && ` · ${customer.owner.name ?? customer.owner.email}`}
            </span>
          </span>
        }
        actions={
          <ButtonLink href={`/dashboard/customers/${id}/edit`} variant="primary">
            Edit customer
          </ButtonLink>
        }
      />

      <div className="space-y-section-gap">
        <DetailSection id="overview" title="Overview">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-muted-foreground">Type</dt>
              <dd className="mt-0.5 text-foreground">{customer.type}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Email</dt>
              <dd className="mt-0.5 text-foreground">{customer.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Phone</dt>
              <dd className="mt-0.5 text-foreground">{customer.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Owner broker</dt>
              <dd className="mt-0.5 text-foreground">
                {customer.owner
                  ? customer.owner.name ?? customer.owner.email
                  : "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-medium text-muted-foreground">Address</dt>
              <dd className="mt-0.5 text-foreground">{customer.address ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Created</dt>
              <dd className="mt-0.5 text-foreground">
                {new Date(customer.createdAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </DetailSection>

        <ContactPersonsSection customerId={id} />
        <InsuredObjectsSection customerId={id} />
        <PoliciesSection
          customerId={id}
          editPolicyId={resolvedSearchParams?.editPolicy}
        />
        <DocumentsSection customerId={id} />
        <ActivitiesSection customerId={id} />
        <TasksSection customerId={id} />
      </div>
    </>
  );
}
