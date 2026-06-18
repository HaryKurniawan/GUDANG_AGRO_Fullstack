import prisma from './prisma/client';

async function main() {
  const requests = await prisma.pengajuanStokToko.findMany({
    include: {
      gudang: true,
      items: true
    }
  });
  console.log('Stock Requests in Gudang DB:');
  console.log(JSON.stringify(requests, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
