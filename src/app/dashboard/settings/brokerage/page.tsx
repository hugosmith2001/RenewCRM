import React from "react";
import { redirect } from "next/navigation";
import { DetailSection } from "@/components/layout";
import { BrokerageForm } from "./BrokerageForm";
import { getCurrentTenant, getCurrentUser } from "@/modules/auth";
import { Role } from "@prisma/client";

export default async function BrokerageSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== Role.ADMIN) {
    redirect("/dashboard/settings/profile");
  }

  const tenant = await getCurrentTenant();

  return (
    <div className="space-y-6">
      <DetailSection title="Brokerage">
        <BrokerageForm
          initialName={tenant?.name ?? ""}
          slug={tenant?.slug ?? ""}
        />
      </DetailSection>
    </div>
  );
}

