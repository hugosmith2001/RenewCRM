import { DetailSection } from "@/components/layout";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default function PasswordSettingsPage() {
  return (
    <div className="space-y-6">
      <DetailSection title="Lösenord">
        <ChangePasswordForm />
      </DetailSection>
    </div>
  );
}

