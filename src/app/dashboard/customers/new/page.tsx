import { getCurrentUser } from "@/modules/auth";
import { redirect } from "next/navigation";
import { CustomerForm } from "../CustomerForm";
import { PageHeader } from "@/components/layout";

export default async function NewCustomerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <PageHeader
        title="Lägg till kund"
        backHref="/dashboard/customers"
        backLabel="Kunder"
      />
      <CustomerForm mode="create" />
    </>
  );
}
