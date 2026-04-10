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

  if (user.role !== "ADMIN") {
    redirect("/dashboard/settings/profile");
  }

  const tenant = await getCurrentTenant();

  return (
    <div className="space-y-6">
      <DetailSection title="Brokerage">
        <BrokerageForm
          initialName={tenant?.name ?? ""}
        />
      </DetailSection>
    </div>
  );
}

