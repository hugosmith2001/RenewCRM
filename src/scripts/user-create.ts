import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

type Args = {
  tenantSlug: string;
  tenantName: string;
  email: string;
  password: string;
  name?: string;
};

function parseArgs(argv: string[]): Args {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    args[key] = value;
    i++;
  }

  const tenantSlug = (args.tenantSlug || "").trim();
  const tenantName = (args.tenantName || "").trim();
  const email = (args.email || "").trim().toLowerCase();
  const password = args.password || "";
  const name = args.name?.trim();

  if (!tenantSlug) throw new Error("Required: --tenantSlug <slug>");
  if (!tenantName) throw new Error("Required: --tenantName <name>");
  if (!email) throw new Error("Required: --email <email>");
  if (!password) throw new Error("Required: --password <password>");
  if (password.length < 10) {
    throw new Error("Password too short. Use at least 10 characters.");
  }

  return { tenantSlug, tenantName, email, password, name };
}

async function main() {
  const { tenantSlug, tenantName, email, password, name } = parseArgs(
    process.argv.slice(2)
  );

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: { name: tenantName },
    create: { slug: tenantSlug, name: tenantName },
  });

  const passwordHash = await hash(password, 10);
  const user = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email,
      },
    },
    update: {
      name: name ?? undefined,
      passwordHash,
      sessionVersion: 0,
      isActive: true,
    },
    create: {
      tenantId: tenant.id,
      email,
      name: name ?? undefined,
      passwordHash,
      sessionVersion: 0,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      tenantId: true,
      isActive: true,
      createdAt: true,
    },
  });

  logger.info("Created/updated user", {
    tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
    user,
  });

  // Make it easy to copy/paste for sending to testers.
  // Do not print the password.
  console.log(
    JSON.stringify(
      {
        tenant: { slug: tenant.slug, name: tenant.name },
        user: { email: user.email, name: user.name, isActive: user.isActive },
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  logger.error("user:create failed", { err });
  process.exit(1);
});

