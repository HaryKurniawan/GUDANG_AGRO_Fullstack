import prisma from './prisma/client';

async function main() {
  const warehouses = await prisma.gudang.findMany();
  console.log('Warehouses in Gudang DB:');
  console.log(JSON.stringify(warehouses, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
