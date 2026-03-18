import React from "react";
import { DetailSection } from "@/components/layout";
import { getCurrentUser } from "@/modules/auth";
import { ProfileForm } from "./ProfileForm";

export default async function ProfileSettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-6">
      <DetailSection title="Profile">
        <ProfileForm
          initialName={user?.name ?? ""}
          email={user?.email ?? ""}
        />
      </DetailSection>
    </div>
  );
}

