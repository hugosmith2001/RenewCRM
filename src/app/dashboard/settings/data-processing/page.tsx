import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DetailSection, sectionListClasses, sectionListItemClasses } from "@/components/layout";
import { getCurrentUser } from "@/modules/auth";
import { Role } from "@prisma/client";

export default async function DataProcessingSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== Role.ADMIN) {
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
      <DetailSection title="Data processing overview (tenant admins)">
        <div className="space-y-4 text-sm text-muted-foreground">
          <p className="text-foreground">
            This page is a practical transparency overview for tenant administrators. It is grounded in the current
            Renew CRM repository and is not a substitute for your organization’s own privacy notices to your customers.
          </p>
          <div className="space-y-2">
            <p>
              <span className="font-medium text-foreground">Your organization as controller:</span>{" "}
              when you store and manage your customers’ data in Renew CRM (customers, contacts, policies, documents,
              tasks, and activities), your organization generally determines the purposes and means of that processing.
            </p>
            <p>
              <span className="font-medium text-foreground">Renew CRM operator as processor (where applicable):</span>{" "}
              the Renew CRM operator processes tenant data to provide the service, maintain availability, and protect
              the platform (security and audit).
            </p>
            <p>
              <span className="font-medium text-foreground">Operational/platform data:</span>{" "}
              the platform also processes user account and security data (authentication, roles, and audit/security logs)
              to run the service.
            </p>
          </div>
        </div>
      </DetailSection>

      <DetailSection title="What data the product processes (by feature)">
        <div className="space-y-3 text-sm text-muted-foreground">
          <ul className={sectionListClasses}>
            <li className={sectionListItemClasses}>
              <span className="font-medium text-foreground">Accounts & access</span>: users, roles, tenant membership,
              password hashes, and session tokens (Auth.js / NextAuth).
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

      <DetailSection title="Where to find operational/legal details">
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            For operator-facing documentation in this repository, see:
          </p>
          <ul className={sectionListClasses}>
            <li className={sectionListItemClasses}>
              <span className="font-medium text-foreground">Lawful basis</span>:{" "}
              <Link
                className="font-mono underline underline-offset-4 hover:text-foreground"
                href="/dashboard/settings/docs/LAWFUL_BASIS.md"
              >
                docs/LAWFUL_BASIS.md
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
            <li className={sectionListItemClasses}>
              <span className="font-medium text-foreground">Subprocessors</span>:{" "}
              <Link
                className="font-mono underline underline-offset-4 hover:text-foreground"
                href="/dashboard/settings/docs/SUBPROCESSORS.md"
              >
                docs/SUBPROCESSORS.md
              </Link>
            </li>
            <li className={sectionListItemClasses}>
              <span className="font-medium text-foreground">Auth/security model</span>:{" "}
              <Link
                className="font-mono underline underline-offset-4 hover:text-foreground"
                href="/dashboard/settings/docs/AUTH_SECURITY.md"
              >
                docs/AUTH_SECURITY.md
              </Link>
            </li>
            <li className={sectionListItemClasses}>
              <span className="font-medium text-foreground">Storage security</span>:{" "}
              <Link
                className="font-mono underline underline-offset-4 hover:text-foreground"
                href="/dashboard/settings/docs/STORAGE_SECURITY.md"
              >
                docs/STORAGE_SECURITY.md
              </Link>
            </li>
            <li className={sectionListItemClasses}>
              <span className="font-medium text-foreground">RoPA (draft)</span>:{" "}
              <Link
                className="font-mono underline underline-offset-4 hover:text-foreground"
                href="/dashboard/settings/docs/gdpr/ROPA.md"
              >
                docs/gdpr/ROPA.md
              </Link>
            </li>
          </ul>
          <p>
            If you need an in-app summary for end users, link them to{" "}
            <Link className="underline underline-offset-4 hover:text-foreground" href="/dashboard/settings/privacy">
              Privacy notice (app users)
            </Link>
            .
          </p>
        </div>
      </DetailSection>
    </div>
  );
}

