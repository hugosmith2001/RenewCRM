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
import { PurgeCustomerButton } from "./PurgeCustomerButton";

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  PRIVATE: "Privat",
  COMPANY: "Företag",
};

const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktiv",
  INACTIVE: "Inaktiv",
  PROSPECT: "Prospekt",
};

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
        backLabel="Kunder"
        description={
          <span className="flex items-center gap-2">
            <Badge tone={statusTone}>
              {CUSTOMER_STATUS_LABELS[customer.status] ?? customer.status}
            </Badge>
            <span className="text-muted-foreground">
              {CUSTOMER_TYPE_LABELS[customer.type] ?? customer.type}
            </span>
          </span>
        }
        actions={
          <ButtonLink href={`/dashboard/customers/${id}/edit`} variant="primary">
            Redigera kund
          </ButtonLink>
        }
      />

      <div className="space-y-section-gap">
        <DetailSection id="overview" title="Översikt">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-muted-foreground">Typ</dt>
              <dd className="mt-0.5 text-foreground">
                {CUSTOMER_TYPE_LABELS[customer.type] ?? customer.type}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">E-post</dt>
              <dd className="mt-0.5 text-foreground">{customer.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Telefon</dt>
              <dd className="mt-0.5 text-foreground">{customer.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Ansvarig mäklare</dt>
              <dd className="mt-0.5 text-foreground">
                {"—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-medium text-muted-foreground">Adress</dt>
              <dd className="mt-0.5 text-foreground">{customer.address ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Skapad</dt>
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

        <div className="rounded-card border border-border bg-surface p-modal">
          <div className="text-sm font-semibold text-foreground">Ta bort kund</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Radera kunden permanent och relaterade poster.
          </div>
          <div className="mt-4 flex justify-end">
            <PurgeCustomerButton customerId={id} customerName={customer.name} />
          </div>
        </div>
      </div>
    </>
  );
}
