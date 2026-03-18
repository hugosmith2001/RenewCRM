import React from "react";
import { redirect } from "next/navigation";
import { DetailSection } from "@/components/layout";
import { TeamSection } from "./TeamSection";
import { getCurrentUser } from "@/modules/auth";
import { Role } from "@prisma/client";

export default async function TeamSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== Role.ADMIN) {
    redirect("/dashboard/settings/profile");
  }

  return (
    <div className="space-y-6">
      <DetailSection title="Team">
        <TeamSection />
      </DetailSection>
    </div>
  );
}

