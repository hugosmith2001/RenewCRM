import { getCurrentUser } from "@/modules/auth";
import { getCustomerById } from "@/modules/customers";
import { redirect, notFound } from "next/navigation";
import { CustomerForm } from "../../CustomerForm";
import { PageHeader } from "@/components/layout";

type Props = { params: Promise<{ id: string }> };

export default async function EditCustomerPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const customer = await getCustomerById(user.tenantId, id);
  if (!customer) notFound();

  return (
    <>
      <PageHeader
        title="Redigera kund"
        backHref={`/dashboard/customers/${id}`}
        backLabel={customer.name}
      />
      <CustomerForm mode="edit" customer={customer} />
    </>
  );
}
