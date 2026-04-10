import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DetailSection, sectionListClasses, sectionListItemClasses } from "@/components/layout";
import { getCurrentUser } from "@/modules/auth";

export default async function DataProcessingSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/dashboard/settings/privacy");
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/settings/privacy"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Privacy &amp; compliance
        </Link>
      </div>
      <DetailSection title="Data processing overview (single-broker deployments)">
        <div className="space-y-4 text-sm text-muted-foreground">
          <p className="text-foreground">
            This page is a practical transparency overview for single-broker deployments. It is grounded in the current
            Renew CRM repository and is not a substitute for your own privacy notices to your customers.
          </p>
          <div className="space-y-2">
            <p>
              <span className="font-medium text-foreground">You as controller:</span> when you store and manage your
              customers’ data in Renew CRM (customers, contacts, policies, documents, tasks, and activities), you
              generally determine the purposes and means of that processing.
            </p>
            <p>
              <span className="font-medium text-foreground">Renew CRM operator as processor (where applicable):</span>{" "}
              the Renew CRM operator processes your customers’ data to provide the service, maintain availability, and
              protect the platform (security and audit).
            </p>
            <p>
              <span className="font-medium text-foreground">Operational/platform data:</span>{" "}
              the platform also processes user account and security data (authentication, sessions, and audit/security
              logs) to run the service.
            </p>
          </div>
        </div>
      </DetailSection>

      <DetailSection title="What data the product processes (by feature)">
        <div className="space-y-3 text-sm text-muted-foreground">
          <ul className={sectionListClasses}>
            <li className={sectionListItemClasses}>
              <span className="font-medium text-foreground">Accounts & access</span>: user accounts, password hashes, and
              session tokens (Auth.js / NextAuth).
            </li>
            <li className={sectionListItemClasses}>
              <span className="font-medium text-foreground">CRM records</span>: customers and contacts (names and contact
              details), policies and insurers, insured objects.
            </li>
            <li className={sectionListItemClasses}>
              <span className="font-medium text-foreground">Work management</span>: tasks and activities (including
              optional free-text that can contain personal data).
            </li>
            <li className={sectionListItemClasses}>
              <span className="font-medium text-foreground">Documents</span>: uploaded files plus metadata (filename,
              type, MIME type, size, and storage key). Bytes are stored in a backend referenced by `storageKey`.
            </li>
            <li className={sectionListItemClasses}>
              <span className="font-medium text-foreground">Security & audit</span>: audit events (action type, entity
              type/ID, user ID, timestamps). Metadata is intended to avoid embedding personal data.
            </li>
          </ul>
        </div>
      </DetailSection>

      <DetailSection title="Privacy & security documents (what to share)">
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Most users only need the in-app{" "}
            <Link className="underline underline-offset-4 hover:text-foreground" href="/dashboard/settings/privacy">
              Privacy notice (app users)
            </Link>
            . If a customer asks for vendor documentation, share the overview below. Deeper operator/admin documentation
            can be provided on request (it is not linked from inside the app).
          </p>
          <ul className={sectionListClasses}>
            <li className={sectionListItemClasses}>
              <span className="font-medium text-foreground">Customer-facing overview (recommended)</span>:{" "}
              <Link
                className="font-mono underline underline-offset-4 hover:text-foreground"
                href="/dashboard/settings/docs/CUSTOMER_PRIVACY_SECURITY_OVERVIEW.md"
              >
                docs/CUSTOMER_PRIVACY_SECURITY_OVERVIEW.md
              </Link>
            </li>
            <li className={sectionListItemClasses}>
              <span className="font-medium text-foreground">Subprocessors (vendors)</span>:{" "}
              <Link
                className="font-mono underline underline-offset-4 hover:text-foreground"
                href="/dashboard/settings/docs/SUBPROCESSORS.md"
              >
                docs/SUBPROCESSORS.md
              </Link>
            </li>
            <li className={sectionListItemClasses}>
              <span className="font-medium text-foreground">Retention & deletion (summary)</span>:{" "}
              <Link
                className="font-mono underline underline-offset-4 hover:text-foreground"
                href="/dashboard/settings/docs/RETENTION_AND_PURGE.md"
              >
                docs/RETENTION_AND_PURGE.md
              </Link>
            </li>
            <li className={sectionListItemClasses}>
              <span className="font-medium text-foreground">Cookies</span>:{" "}
              <Link
                className="font-mono underline underline-offset-4 hover:text-foreground"
                href="/dashboard/settings/docs/COOKIE_NOTICE.md"
              >
                docs/COOKIE_NOTICE.md
              </Link>
            </li>
          </ul>
        </div>
      </DetailSection>
    </div>
  );
}

