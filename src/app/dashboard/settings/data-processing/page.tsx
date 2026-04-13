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

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/settings/privacy"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Integritet &amp; regelefterlevnad
        </Link>
      </div>
      <DetailSection title="Översikt av databehandling (för enskilda mäklarkontor)">
        <div className="space-y-4 text-sm text-muted-foreground">
          <p className="text-foreground">
            Den här sidan är en praktisk översikt för transparens i installationer för enskilda mäklarkontor. Den bygger
            på nuvarande Renew CRM-kodbas och ersätter inte dina egna integritetsmeddelanden till dina kunder.
          </p>
          <div className="space-y-2">
            <p>
              <span className="font-medium text-foreground">Du som personuppgiftsansvarig:</span> när du lagrar och
              hanterar kunddata i Renew CRM (kunder, kontakter, försäkringar, dokument, uppgifter och aktiviteter)
              bestämmer du normalt ändamål och medel för behandlingen.
            </p>
            <p>
              <span className="font-medium text-foreground">Operatören av Renew CRM som personuppgiftsbiträde (i tillämpliga fall):</span>{" "}
              operatören behandlar kunddata för att leverera tjänsten, upprätthålla tillgänglighet och skydda plattformen
              (säkerhet och revision).
            </p>
            <p>
              <span className="font-medium text-foreground">Drift-/plattformdata:</span>{" "}
              plattformen behandlar även konto- och säkerhetsdata för användare (autentisering, sessioner samt
              revisions-/säkerhetsloggar) för att driva tjänsten.
            </p>
          </div>
        </div>
      </DetailSection>

      <DetailSection title="Vilka uppgifter produkten behandlar (per funktion)">
        <div className="space-y-3 text-sm text-muted-foreground">
          <ul className={sectionListClasses}>
            <li className={sectionListItemClasses}>
              <span className="font-medium text-foreground">Konton &amp; åtkomst</span>: användarkonton,
              lösenordshashar och sessionstoken (Auth.js / NextAuth).
            </li>
            <li className={sectionListItemClasses}>
              <span className="font-medium text-foreground">CRM-poster</span>: kunder och kontakter (namn och
              kontaktuppgifter), försäkringar och försäkringsgivare samt försäkrade objekt.
            </li>
            <li className={sectionListItemClasses}>
              <span className="font-medium text-foreground">Arbetsflöde</span>: uppgifter och aktiviteter (inklusive
              frivillig fritext som kan innehålla personuppgifter).
            </li>
            <li className={sectionListItemClasses}>
              <span className="font-medium text-foreground">Dokument</span>: uppladdade filer samt metadata (filnamn,
              typ, MIME-typ, storlek och lagringsnyckel). Filinnehållet lagras i en backend som refereras av `storageKey`.
            </li>
            <li className={sectionListItemClasses}>
              <span className="font-medium text-foreground">Säkerhet &amp; revision</span>: revisionshändelser (åtgärdstyp,
              entitetstyp/ID, användar-ID, tidsstämplar). Metadata är avsedd att undvika att bädda in personuppgifter.
            </li>
          </ul>
        </div>
      </DetailSection>

      <DetailSection title="Integritets- och säkerhetsdokument (vad du kan dela)">
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            De flesta användare behöver bara{" "}
            <Link className="underline underline-offset-4 hover:text-foreground" href="/dashboard/settings/privacy">
              Integritetsmeddelande (appanvändare)
            </Link>
            . Om en kund efterfrågar leverantörsdokumentation kan du dela översikten nedan. Mer fördjupad
            operatörs-/administratörsdokumentation kan tillhandahållas vid behov (den är inte länkad från appen).
          </p>
          <ul className={sectionListClasses}>
            <li className={sectionListItemClasses}>
              <span className="font-medium text-foreground">Översikt för kunder (rekommenderas)</span>:{" "}
              <Link
                className="font-mono underline underline-offset-4 hover:text-foreground"
                href="/dashboard/settings/docs/CUSTOMER_PRIVACY_SECURITY_OVERVIEW.md"
              >
                docs/CUSTOMER_PRIVACY_SECURITY_OVERVIEW.md
              </Link>
            </li>
            <li className={sectionListItemClasses}>
              <span className="font-medium text-foreground">Underbiträden (leverantörer)</span>:{" "}
              <Link
                className="font-mono underline underline-offset-4 hover:text-foreground"
                href="/dashboard/settings/docs/SUBPROCESSORS.md"
              >
                docs/SUBPROCESSORS.md
              </Link>
            </li>
            <li className={sectionListItemClasses}>
              <span className="font-medium text-foreground">Gallring &amp; radering (sammanfattning)</span>:{" "}
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

