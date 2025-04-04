const { prisma } = require("./prisma/prisma-client");


async function clearDatabase() {
  await prisma.review.deleteMany({});
  await prisma.orderItem.deleteMany({})
  await prisma.order.deleteMany({});
  await prisma.historyProduct.deleteMany({})
  await prisma.history.deleteMany({})
  await prisma.basket.deleteMany({})
  await prisma.favorite.deleteMany({})
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.brand.deleteMany({});
  await prisma.user.deleteMany({});

  console.log(' База данных очищена!');
}

clearDatabase()
  .catch((error) => {
    console.error('Ошибка очистки базы:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });