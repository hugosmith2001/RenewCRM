import { getCurrentUser } from "@/modules/auth";
import { getCustomerById } from "@/modules/customers";
import { getPolicyById } from "@/modules/policies";
import { listDocumentsByPolicyId } from "@/modules/documents";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, DetailSection, sectionListClasses, sectionListItemClasses } from "@/components/layout";
import { Badge, ButtonLink } from "@/components/ui";
import { PolicyDocumentsSection } from "../../../policies/PolicyDocumentsSection";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktiv",
  PENDING: "Pågående",
  EXPIRED: "Utgången",
  CANCELLED: "Avbruten",
};

const INSURED_OBJECT_TYPE_LABELS: Record<string, string> = {
  PROPERTY: "Fastighet",
  VEHICLE: "Fordon",
  PERSON: "Person",
  BUSINESS: "Företag",
  EQUIPMENT: "Utrustning",
  OTHER: "Annat",
};

type Props = {
  params: Promise<{ id: string; policyId: string }>;
};

export default async function PolicyDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id: customerId, policyId } = await params;

  const [policy, customer] = await Promise.all([
    getPolicyById(user.tenantId, policyId),
    getCustomerById(user.tenantId, customerId),
  ]);

  if (!policy || !customer || policy.customerId !== customerId) notFound();

  const documents = await listDocumentsByPolicyId(user.tenantId, policyId);

  const statusTone =
    policy.status === "ACTIVE"
      ? "success"
      : policy.status === "CANCELLED"
        ? "danger"
        : policy.status === "PENDING"
          ? "warning"
          : "neutral";

  function formatDate(d: Date | string) {
    return new Date(d).toLocaleDateString();
  }

  return (
    <>
      <PageHeader
        title={policy.policyNumber}
        backHref={`/dashboard/customers/${customerId}`}
        backLabel={customer.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone}>
              {STATUS_LABELS[policy.status] ?? policy.status}
            </Badge>
            <span className="text-muted-foreground">
              {policy.insurer?.name ?? "—"}
              {policy.premium != null &&
                ` · ${Number(policy.premium).toLocaleString()} premie`}
            </span>
          </span>
        }
        actions={
          <ButtonLink
            href={`/dashboard/customers/${customerId}?editPolicy=${policyId}#policies`}
            variant="primary"
          >
            Redigera försäkring
          </ButtonLink>
        }
      />

      <div className="space-y-section-gap">
        <DetailSection id="overview" title="Översikt">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-muted-foreground">Försäkringsnummer</dt>
              <dd className="mt-0.5 text-foreground font-mono">
                {policy.policyNumber}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Status</dt>
              <dd className="mt-0.5">
                <Badge tone={statusTone}>
                  {STATUS_LABELS[policy.status] ?? policy.status}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Försäkringsbolag</dt>
              <dd className="mt-0.5 text-foreground">
                {policy.insurer?.name ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Premie</dt>
              <dd className="mt-0.5 text-foreground">
                {policy.premium != null
                  ? Number(policy.premium).toLocaleString()
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Startdatum</dt>
              <dd className="mt-0.5 text-foreground">
                {formatDate(policy.startDate)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Slutdatum</dt>
              <dd className="mt-0.5 text-foreground">
                {formatDate(policy.endDate)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Förnyelsedatum</dt>
              <dd className="mt-0.5 text-foreground">
                {policy.renewalDate
                  ? formatDate(policy.renewalDate)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Skapad</dt>
              <dd className="mt-0.5 text-foreground">
                {formatDate(policy.createdAt)}
              </dd>
            </div>
          </dl>
        </DetailSection>

        <DetailSection id="customer" title="Kund">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium text-foreground">{customer.name}</p>
              <p className="text-sm text-muted-foreground">
                {customer.type}
              </p>
            </div>
            <ButtonLink
              href={`/dashboard/customers/${customerId}`}
              variant="secondary"
              size="sm"
            >
              Visa hela kunden
            </ButtonLink>
          </div>
        </DetailSection>

        <DetailSection id="insured-objects" title="Försäkrade objekt">
          {!policy.insuredObjects?.length ? (
            <p className="text-sm text-muted-foreground">
              Inga försäkrade objekt är kopplade. Redigera försäkringen på kundsidan för att koppla objekt.
            </p>
          ) : (
            <ul className={sectionListClasses}>
              {policy.insuredObjects.map(({ insuredObject }) => (
                <li
                  key={insuredObject.id}
                  className={`flex items-center justify-between gap-2 ${sectionListItemClasses}`}
                >
                  <span className="font-medium text-foreground">
                    {insuredObject.name}
                  </span>
                  <Badge tone="neutral">
                    {INSURED_OBJECT_TYPE_LABELS[insuredObject.type] ??
                      insuredObject.type}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </DetailSection>

        <PolicyDocumentsSection customerId={customerId} documents={documents} />

        <DetailSection id="context" title="Aktiviteter & att göra">
          <p className="text-sm text-muted-foreground">
            Aktiviteter och att göra hanteras på kundsidan.
          </p>
          <ButtonLink
            href={`/dashboard/customers/${customerId}#activities`}
            variant="secondary"
            size="sm"
            className="mt-2"
          >
            Visa kundens aktiviteter
          </ButtonLink>
        </DetailSection>
      </div>
    </>
  );
}
