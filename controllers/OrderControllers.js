const { prisma } = require("../prisma/prisma-client");
const { OrderStatus } = require("@prisma/client")

const OrderController = {
  purchaseBasket: async (req, res) => {
    try {
      const userId = req.user.userId;
      console.log(userId);
      // Получаем товары из корзины пользователя
      const BasketItems = await prisma.basket.findMany({
        where: { userId },
        include: { product: true },
      });

      if (BasketItems.length === 0) {
        return res.status(400).json({ message: "Корзина пуста" });
      }

      let totalPrice = 0;
      let unavailableProducts = [];

      // Проверяем наличие и считаем итоговую сумму
      for (const item of BasketItems) {
        const { product, value } = item;

        // Проверяем, достаточно ли товара на складе
        if (product.value < value) {
          unavailableProducts.push(product.name);
        } else {
          totalPrice += product.price * value;
        }
      }

      if (unavailableProducts.length > 0) {
        return res.status(400).json({
          message: `Недостаточно товара: ${unavailableProducts.join(", ")}`,
        });
      }

      // Получаем пользователя
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (user.balance < totalPrice) {
        return res.status(400).json({ message: "Недостаточно средств" });
      }

      // Обновляем баланс пользователя
      await prisma.user.update({
        where: { id: userId },
        data: { balance: user.balance - totalPrice },
      });

      // Оформляем заказ
      const order = await prisma.order.create({
        data: {
          userId,
          total: totalPrice,
          status: "PENDING", // Статус  "Оплачено"
          products: {
            create: BasketItems.map((item) => ({
              productId: item.productId,
              value: item.value,
              price: item.product.price,
            })),
          },
        },
      });

      // Добавляем товары в историю покупок
      const history = await prisma.history.create({
        data: {
          userId,
          products: {
            create: BasketItems.map((item) => ({
              productId: item.productId,
              value: item.value,
            })),
          },
        },
      });

      // Обновляем количество товаров 
      for (const item of BasketItems) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { value: { decrement: item.value } },
        });
      }

      // Очищаем корзину
      await prisma.basket.deleteMany({ where: { userId } });

      return res.status(200).json({ message: "Покупка успешна!", order });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Ошибка сервера", error: error.message });
    }
  },
  getOrdersByUserId: async (req, res) => {
    try {
      const userId = req.user.userId;

      const orders = await prisma.order.findMany({
        where: { userId },
        include: {
          products: {
            include: {
              product: { select: { name: true, price: true, id: true, imageUrl:true,discount:true} },
            },
          },
        },
      });

      return res.status(200).json(orders);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Ошибка сервера", error: error.message });
    }
  },
  updateOrderStatus: async (req, res) => {

    try {
      const userId = req.user.userId;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.role !== "ADMIN") {
        return res.status(403).json({ message: "Нет доступа" });
      }


      const {status } = req.body;
      const  {orderId} = req.params
      if (!orderId) {
        return res.status(400).json({ message: "ID заказа обязателен" });
      }

      if (!Object.values(OrderStatus).includes(status)) {
        return res.status(400).json({ message: "Неверный статус заказа" });
      }

      // Обновляем статус заказа
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status },
      });

      return res
        .status(200)
        .json({ message: "Статус заказа обновлен", order: updatedOrder });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Ошибка сервера", error: error.message });
    }
  },

  getOrderStatus: async (req, res) => {
    try {
      
      const  {orderId} = req.params
      if (!orderId || orderId.length !==24) {
        return res.status(400).json({ message: "ID заказа обязателен и корректный " });
      }

      // Получаем заказ по его id
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true },
      });

      if (!order) {
        return res.status(404).json({ message: "Заказ не найден" });
      }

      return res.status(200).json({ status: order.status });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Ошибка сервера", error: error.message });
    }
  },
};

module.exports = OrderController;
