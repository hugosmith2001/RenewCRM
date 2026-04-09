import React from "react";
import { DetailSection } from "@/components/layout";
import { getCurrentUser } from "@/modules/auth";

export default async function PrivacySettingsPage() {
  await getCurrentUser();

  return (
    <div className="space-y-6">
      <DetailSection title="Integritetspolicy (Renew CRM)">
        <div className="space-y-5 text-sm text-muted-foreground">
          <p className="text-foreground">
            <span className="font-medium">Senast uppdaterad:</span> 9 april 2026
          </p>

          <p>
            Denna integritetspolicy förklarar hur Renew CRM (”vi”, ”oss”, ”vår”) samlar in och använder personuppgifter
            när du besöker vår webbplats eller använder tjänsten Renew CRM. Den är skriven för att hjälpa dig att förstå
            vad vi gör med din information på ett tydligt och enkelt språk.
          </p>

          <div className="space-y-3">
            <p className="font-medium text-foreground">Vilka vi är (personuppgiftsansvarig)</p>
            <p>Renew CRM drivs av:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <span className="font-medium text-foreground">Företagsnamn:</span>
              </li>
              <li>
                <span className="font-medium text-foreground">Adress:</span>
              </li>
              <li>
                <span className="font-medium text-foreground">Land:</span>
              </li>
              <li>
                <span className="font-medium text-foreground">E-post:</span>
              </li>
            </ul>
            <p>
              För personuppgifter som rör drift av vår webbplats och Renew CRM-plattformen (t.ex. användarkonton,
              inloggning och säkerhet) är vi personuppgiftsansvariga.
            </p>
            <p>
              När Renew CRM används av en företagskund (t.ex. en mäklarfirma) för att lagra och hantera sina egna kunders
              uppgifter är den företagskunden normalt personuppgiftsansvarig för dessa kunduppgifter, och vi agerar som
              tjänsteleverantör och behandlar uppgifterna enligt deras instruktioner. Om din begäran avser information
              som din organisation har lagt in i Renew CRM om sina kunder kan du behöva kontakta den organisationen
              först.
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-medium text-foreground">Vilka uppgifter vi samlar in</p>
            <p>Beroende på hur du använder Renew CRM kan vi samla in:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium text-foreground">Konto- och profiluppgifter</span>
                <div>Namn, e-postadress i arbetet, organisation, roll/behörigheter (i förekommande fall)</div>
              </li>
              <li>
                <span className="font-medium text-foreground">Kund- och kontaktuppgifter (som läggs in i tjänsten)</span>
                <div>
                  Namn, e-postadresser, telefonnummer, postadresser och andra uppgifter som din organisation väljer att
                  registrera
                </div>
              </li>
              <li>
                <span className="font-medium text-foreground">Arbets- och kommunikationsuppgifter (som läggs in i tjänsten)</span>
                <div>
                  Uppgifter om uppgifter, aktivitetsanteckningar och annan text som du eller din organisation lägger in
                  (dessa kan innehålla personuppgifter beroende på vad som skrivs in)
                </div>
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Försäkrings- eller tjänsterelaterade uppgifter (som läggs in i tjänsten)
                </span>
                <div>
                  Information kopplad till försäkringar eller relaterade tjänster som din organisation väljer att hantera
                  i Renew CRM
                </div>
              </li>
              <li>
                <span className="font-medium text-foreground">Dokument- och filuppgifter (som laddas upp i tjänsten)</span>
                <div>
                  Filer du laddar upp och grundläggande information om dessa filer (t.ex. filnamn och vilken post de hör
                  till)
                </div>
              </li>
              <li>
                <span className="font-medium text-foreground">Säkerhets- och användningsuppgifter</span>
                <div>
                  Inloggnings- och autentiseringsuppgifter, grundläggande enhets- och logginformation, tidsstämplar samt
                  åtgärder som utförs i tjänsten (används för att hålla tjänsten säker och driftsäker)
                </div>
              </li>
            </ul>
            <p>
              Vi ber inte avsiktligt om att du ska lämna känsliga kategorier av personuppgifter. Undvik att ange känslig
              information i fritextanteckningar om inte din organisation kräver det och du har en laglig grund för att
              göra det.
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-medium text-foreground">Hur vi använder uppgifterna (ändamål + rättslig grund)</p>
            <p>
              Vi använder personuppgifter endast för specifika ändamål. Enligt GDPR stödjer vi oss på följande rättsliga
              grunder:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium text-foreground">För att tillhandahålla tjänsten (Avtal)</span>
                <div>
                  Skapa och hantera användarkonton, låta dig logga in och tillhandahålla grundläggande CRM-funktioner som
                  din organisation använder.
                </div>
              </li>
              <li>
                <span className="font-medium text-foreground">För att driva, skydda och förbättra tjänsten (Berättigat intresse)</span>
                <div>
                  Hålla plattformen säker, förebygga bedrägeri och missbruk, upprätthålla driftsäkerhet, utreda
                  säkerhetsincidenter och upprätthålla åtkomstkontroller.
                </div>
              </li>
              <li>
                <span className="font-medium text-foreground">För att uppfylla rättsliga skyldigheter (Rättslig förpliktelse)</span>
                <div>Följa tillämpliga lagar och lagliga myndighetsbegäranden när det krävs.</div>
              </li>
              <li>
                <span className="font-medium text-foreground">För att kommunicera med dig (Avtal eller berättigat intresse)</span>
                <div>Svara på supportärenden och tjänsterelaterad kommunikation.</div>
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Marknadsföring (i förekommande fall) (Samtycke eller berättigat intresse, beroende på sammanhang)
                </span>
                <div>
                  Om vi skickar marknadsföringsutskick kan du när som helst avregistrera dig. När samtycke krävs kommer vi
                  att be om det.
                </div>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="font-medium text-foreground">Hur vi delar uppgifter (underbiträden i allmänna termer)</p>
            <p>Vi säljer inte dina personuppgifter.</p>
            <p>Vi kan dela personuppgifter med betrodda tjänsteleverantörer som hjälper oss att driva Renew CRM, såsom leverantörer av:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Hosting och infrastruktur</li>
              <li>Databas och säker datalagring</li>
              <li>Fillagring</li>
              <li>Säkerhetsövervakning och driftverktyg</li>
            </ul>
            <p>
              Dessa leverantörer får endast behandla personuppgifter för att leverera tjänster till oss och måste skydda
              dem.
            </p>
            <p>
              Om våra tjänsteleverantörer finns utanför ditt land (inklusive utanför Storbritannien/EES) använder vi
              lämpliga skyddsåtgärder som krävs enligt lag (t.ex. avtalsmässiga skydd) för att skydda personuppgifter som
              överförs internationellt.
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-medium text-foreground">Lagringstid (enkel förklaring)</p>
            <p>Vi sparar personuppgifter endast så länge som behövs för de ändamål som beskrivs ovan:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Aktiva konton och poster sparas normalt så länge din organisation använder tjänsten.</li>
              <li>Raderade poster kan sparas under en begränsad tid innan de raderas permanent.</li>
              <li>
                Viss information kan sparas längre när det behövs för säkerhet, tvistlösning, regelefterlevnad eller om
                din organisation tillämpar en rättslig spärr (legal hold).
              </li>
            </ul>
            <p className="text-foreground">
              <span className="font-medium">Viktig information om säkerhetskopior:</span> Precis som de flesta
              onlinetjänster kan våra säkerhetskopior behålla kopior av information under en begränsad period. Det
              innebär att uppgifter inte nödvändigtvis försvinner ur säkerhetskopior direkt, men att de försvinner när
              vår policy för lagring av säkerhetskopior löper ut.
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-medium text-foreground">Registrerades rättigheter</p>
            <p>Om GDPR gäller för dig har du rättigheter avseende dina personuppgifter. Dessa inkluderar:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Tillgång: begära en kopia av dina personuppgifter</li>
              <li>Rättelse: begära att vi rättar felaktiga eller ofullständiga uppgifter</li>
              <li>Radering: begära att vi raderar dina personuppgifter (när lagen tillåter)</li>
              <li>Begränsning: begära att vi begränsar hur vi använder dina uppgifter</li>
              <li>Invändning: invända mot viss behandling (särskilt när vi stödjer oss på berättigat intresse)</li>
              <li>Dataportabilitet: få vissa uppgifter i ett strukturerat, allmänt använt format</li>
              <li>Återkalla samtycke: när vi stödjer oss på samtycke kan du när som helst återkalla det</li>
              <li>Klagomål: lämna in klagomål till din lokala tillsynsmyndighet</li>
            </ul>
            <p>
              <span className="font-medium text-foreground">Så utövar du dina rättigheter:</span> Kontakta oss med hjälp
              av uppgifterna nedan.
            </p>
            <p>
              Om din begäran gäller kunduppgifter som din organisation har lagt in i Renew CRM kan vi hänvisa dig till den
              organisationen (som personuppgiftsansvarig) eller samarbeta med dem för att hjälpa till.
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-medium text-foreground">Cookies (endast nödvändiga, autentisering/session)</p>
            <p>
              Renew CRM använder nödvändiga cookies för att hålla dig inloggad och skydda din session. Dessa cookies är
              nödvändiga för att tjänsten ska fungera.
            </p>
            <p>
              Vi använder inte annonscookies. Om vi i framtiden lägger till icke-nödvändiga cookies (t.ex. analys) kommer
              vi att uppdatera denna policy och erbjuda lämpliga val där det krävs enligt lag.
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-medium text-foreground">Datasäkerhet (övergripande)</p>
            <p>
              Vi använder lämpliga säkerhetsåtgärder som är utformade för att skydda personuppgifter, inklusive
              åtkomstkontroller och skydd för att hjälpa till att förhindra obehörig åtkomst, utlämnande, ändring eller
              förlust.
            </p>
            <p>
              Ingen metod för överföring eller lagring är helt säker, men vi arbetar för att skydda din information och
              agera snabbt om vi misstänker ett säkerhetsproblem.
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-medium text-foreground">Kontaktuppgifter</p>
            <p>För integritetsfrågor eller begäranden, kontakta:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <span className="font-medium text-foreground">E-post:</span>
              </li>
              <li>
                <span className="font-medium text-foreground">Postadress:</span>
              </li>
              <li>
                <span className="font-medium text-foreground">Märk:</span> Integritet / Dataskydd
              </li>
            </ul>
            <p>Om du har utsett ett dataskyddsombud (DPO) eller en integritetskontaktperson, ange deras uppgifter här:</p>
            <p>
              <span className="font-medium text-foreground">Dataskyddsombud (DPO) (i förekommande fall):</span>
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-medium text-foreground">Ytterligare information för företagskunder (valfritt)</p>
            <p>
              Om din organisation använder Renew CRM som företagskund kan du hitta mer detaljerad information om vår
              personuppgiftsbehandling och våra säkerhetsrutiner här:
            </p>
            <p>
              <span className="font-medium text-foreground">Dokumentation för företagskunder:</span>
            </p>
          </div>
        </div>
      </DetailSection>
    </div>
  );
}

