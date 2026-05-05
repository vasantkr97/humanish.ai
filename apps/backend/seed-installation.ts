import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding installation...");

  const installation = await prisma.installation.upsert({
    where: { installationId: 123787101 },
    update: { accountLogin: "vasantkr97", accountType: "User" },
    create: {
      installationId: 123787101,
      accountLogin: "vasantkr97",
      accountType: "User",
    },
  });
  console.log("✅ Installation:", installation.installationId, installation.accountLogin);

  const repos = [
    { name: "AiFitness", fullName: "vasantkr97/AiFitness", githubId: 900000001, private: false },
    { name: "bookingApp", fullName: "vasantkr97/bookingApp", githubId: 900000002, private: false },
    { name: "appointment-slot-booking", fullName: "vasantkr97/appointment-slot-booking", githubId: 900000003, private: false },
  ];

  for (const repo of repos) {
    const r = await prisma.repository.upsert({
      where: { fullName: repo.fullName },
      update: {},
      create: { ...repo, installationId: 123787101 },
    });
    console.log("  ✅ Repo:", r.fullName);
  }

  console.log("\nDone! Now login at http://localhost:3000 - your repos will appear in the dashboard.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
