import React from "react";
import Link from "next/link";
import { DetailSection, sectionListClasses, sectionListItemClasses } from "@/components/layout";
import { getCurrentUser } from "@/modules/auth";

export default async function PrivacySettingsPage() {
  await getCurrentUser();

  return (
    <div className="space-y-6">
      <DetailSection title="Privacy notice (app users)">
        <div className="space-y-4 text-sm text-muted-foreground">
          <p className="text-foreground">
            Renew CRM is used by your organization to manage customer relationships and related work.
          </p>
          <div className="space-y-2">
            <p>
              <span className="font-medium text-foreground">Who controls access:</span>{" "}
              your organization controls user access, roles, and what data you can view or change.
            </p>
            <p>
              <span className="font-medium text-foreground">What data you may see in the app:</span>{" "}
              customer/contact details, policy information, tasks/activities, documents, and operational audit entries
              (IDs and timestamps).
            </p>
            <p>
              <span className="font-medium text-foreground">What the platform processes:</span>{" "}
              account and authentication data (such as your email, name, password hash, and session information),
              tenant-scoped CRM data entered by your organization, and security/operational logs needed to run and protect
              the service.
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-foreground">Data categories commonly processed in Renew CRM</p>
            <ul className={sectionListClasses}>
              <li className={sectionListItemClasses}>User account data (email, name, role, tenant membership)</li>
              <li className={sectionListItemClasses}>Customer and contact details (name, email, phone, address)</li>
              <li className={sectionListItemClasses}>Work records (tasks and activities, including optional free-text)</li>
              <li className={sectionListItemClasses}>Policy and insurer records</li>
              <li className={sectionListItemClasses}>Uploaded documents and document metadata</li>
              <li className={sectionListItemClasses}>Security/audit records (action types, entity IDs, timestamps)</li>
            </ul>
          </div>
          <p>
            If you have questions about your organization’s customer data processing (including retention and disclosures),
            contact your organization. For platform/operator information, see{" "}
            <Link className="underline underline-offset-4 hover:text-foreground" href="/dashboard/settings/data-processing">
              Data processing (controllers)
            </Link>
            .
          </p>
        </div>
      </DetailSection>

      <DetailSection title="Cookies">
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Renew CRM currently uses <span className="font-medium text-foreground">essential cookies</span> for
            authentication and session security (Auth.js / NextAuth).
          </p>
          <ul className={sectionListClasses}>
            <li className={sectionListItemClasses}>
              <span className="font-medium text-foreground">Auth session cookie</span>: used to keep you signed in and
              protect authenticated requests (configured as HttpOnly and Secure in production).
            </li>
          </ul>
          <p>
            This codebase does not include analytics/tracking scripts by default, so there is no cookie consent banner for
            non-essential cookies.
          </p>
        </div>
      </DetailSection>
    </div>
  );
}

