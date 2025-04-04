const cron = require('node-cron')
const { prisma } = require("./prisma/prisma-client");

// Функция обновления статусов заказов
const updateOrderStatuses = async () => {
  try {
    const now = new Date();

    // Обновляем PENDING → PAID (через 5 минут)
    await prisma.order.updateMany({
      where: {
        status: "PENDING",
        createdAt: { lte: new Date(now.getTime() - 2 * 60 * 1000) }, 
      },
      data: { status: "PAID", updatedAt: now },
    });

    // Обновляем PAID → SHIPPED (через 30 минут)
    await prisma.order.updateMany({
      where: {
        status: "PAID",
        updatedAt: { lte: new Date(now.getTime() - 5 * 60 * 1000) }, 
      },
      data: { status: "SHIPPED", updatedAt: now },
    });

    // Обновляем SHIPPED → DELIVERED (через 2 дня)
    await prisma.order.updateMany({
      where: {
        status: "SHIPPED",
        updatedAt: { lte: new Date(now.getTime() - 20 * 60 * 1000) }, 
      },
      data: { status: "DELIVERED", updatedAt: now },
    });

    console.log(`[${new Date().toISOString()}]  Статусы заказов обновлены`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}]  Ошибка обновления статусов:`, error);
  }
};

// Запуск cron-задачи раз в 5 минут
cron.schedule("*/5 * * * *", async () => {
  console.log(`[${new Date().toISOString()}]  Запуск обновления статусов заказов...`);
  await updateOrderStatuses();
});

module.exports = updateOrderStatuses;