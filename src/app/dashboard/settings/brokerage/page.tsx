import React from "react";
import { redirect } from "next/navigation";
import { DetailSection } from "@/components/layout";
import { BrokerageForm } from "./BrokerageForm";
import { getCurrentTenant, getCurrentUser } from "@/modules/auth";

export default async function BrokerageSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const tenant = await getCurrentTenant();

  return (
    <div className="space-y-6">
      <DetailSection title="Mäklarkontor">
        <BrokerageForm
          initialName={tenant?.name ?? ""}
        />
      </DetailSection>
    </div>
  );
}

