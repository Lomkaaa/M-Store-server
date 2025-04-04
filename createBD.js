const { prisma } = require("./prisma/prisma-client.js");
const { faker } = require("@faker-js/faker");
const getImageUrl = () => `https://picsum.photos/300/300?random=${Math.random()}`;

async function main() {
  // Создание пользователей
  const users = await prisma.user.createMany({
    data: Array.from({ length: 10 }, () => ({
      name: `${faker.person.firstName()} ${faker.person.lastName()}`,
      email: faker.internet.email(),
      password: faker.internet.password(),
      avatarUrl: getImageUrl(), // Аватарка
      phone: faker.phone.number(),
      balance: faker.number.float({ min: 1000, max: 50000, precision: 0.01 }),
    })),
  });

  const userRecords = await prisma.user.findMany();

  // Создание категорий
  await prisma.category.createMany({
    data: Array.from({ length: 10 }, () => ({
      name: faker.commerce.department(),
    })),
  });

  // Создание брендов
  await prisma.brand.createMany({
    data: Array.from({ length: 10 }, () => ({
      name: faker.company.name(),
    })),
  });

  const categoryRecords = await prisma.category.findMany();
  const brandRecords = await prisma.brand.findMany();

  // Создание продуктов
  await prisma.product.createMany({
    data: Array.from({ length: 500 }, () => ({
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price: parseFloat(faker.commerce.price({ min: 500, max: 250000 })),
      imageUrl: getImageUrl(), // Основное изображение товара
      otherImages: [
        getImageUrl(), // Дополнительное изображение 1
        getImageUrl(), // Дополнительное изображение 2
        getImageUrl(), // Дополнительное изображение 3
      ],
      categoryId: faker.helpers.arrayElement(categoryRecords).id,
      brandId: faker.helpers.arrayElement(brandRecords).id,
      value: faker.number.int({ min: 0, max: 100 }),
      discount: faker.number.int({ min: 0, max: 50 }),
    })),
  });

  const productRecords = await prisma.product.findMany();

  // Добавление отзывов
  await prisma.review.createMany({
    data: Array.from({ length: 1000 }, () => ({
      content: faker.lorem.sentence(),
      value: faker.number.int({ min: 1, max: 5 }),
      userId: faker.helpers.arrayElement(userRecords).id,
      productId: faker.helpers.arrayElement(productRecords).id,
    })),
  });

  // Создание заказов
  for (let i = 0; i < 200; i++) {
    const user = faker.helpers.arrayElement(userRecords);
    await prisma.order.create({
      data: {
        userId: user.id,
        total: faker.number.int({ min: 1000, max: 50000 }),
        status: faker.helpers.arrayElement([
          "PENDING",
          "PAID",
          "SHIPPED",
          "DELIVERED",
          "CANCELLED",
        ]),
        products: {
          create: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => ({
            productId: faker.helpers.arrayElement(productRecords).id,
            value: faker.number.int({ min: 1, max: 3 }),
            price: faker.number.float({ min: 500, max: 20000, precision: 0.01 }),
          })),
        },
      },
    });
  }
}
console.log("База данных создана")

main()
  .catch((error) => console.error("❌ Ошибка:", error))
  .finally(() => prisma.$disconnect());