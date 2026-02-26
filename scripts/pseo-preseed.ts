import { prisma } from "@/lib/prisma";
import { preseedPseoPages } from "@/lib/pseo/service";

function parseIntArg(args: string[], key: string) {
  const prefixed = `${key}=`;
  const match = args.find((arg) => arg.startsWith(prefixed));
  if (!match) return undefined;

  const value = Number.parseInt(match.slice(prefixed.length), 10);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const templateLimit = parseIntArg(args, "--limit");
  const unpublish = args.includes("--unpublished");

  const result = await preseedPseoPages({
    templateLimit,
    publish: !unpublish,
  });

  console.log("pSEO preseed complete");
  console.table(result);
}

main()
  .catch((error) => {
    console.error("pSEO preseed failed");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

