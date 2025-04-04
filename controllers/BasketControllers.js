const { prisma } = require("../prisma/prisma-client.js");
const { Mutex } = require('async-mutex');
const basketMutex = new Mutex(); // Создаём мьютекс для корзины

const BasketController = {
    //  Добавить товар в корзину (безопасно)
    addToBasket: async (req, res) => {
        let release = await basketMutex.acquire(); // Блокируем доступ
        try {
            const userId = req.user.userId;
            const { productId } = req.body;

            if (!productId) {
                return res.status(400).json({ message: "Товар обязателен" });
            }

            const existingItem = await prisma.basket.findFirst({ where: { userId, productId } });

            if (existingItem) {
                // Если товар уже в корзине, увеличиваем количество
                const updatedItem = await prisma.basket.update({
                    where: { id: existingItem.id },
                    data: { value : { increment: 1 } }, 
                });
                return res.json(updatedItem);
            } else {
                // Добавляем новый товар в корзину
                const newItem = await prisma.basket.create({
                    data: { userId, productId, value : 1 },
                });
                return res.json(newItem);
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Ошибка добавления в корзину" });
        } finally {
            release();
        }
    },

    //  Удалить товар из корзины 
    removeFromBasket: async (req, res) => {
        let release = await basketMutex.acquire(); // Блокируем доступ
        try {
            const userId = req.user.userId;
            const { productId } = req.params;

            if (!productId) {
                return res.status(400).json({ message: "Товар обязателен" });
            }

            const item = await prisma.basket.findFirst({ where: { userId, productId } });

            if (!item) {
                return res.status(404).json({ message: "Товар не найден в корзине" });
            }

            if (item.value > 1) {
                // Если количество > 1, уменьшаем 
                const updatedItem = await prisma.basket.update({
                    where: { id: item.id },
                    data: { value: { decrement: 1 } },
                });
                return res.json(updatedItem);
            } else {
                // Если товар 1 штука, удаляем его из корзины
                await prisma.basket.delete({ where: { id: item.id } });
                return res.json({ message: "Товар удалён из корзины" });
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Ошибка удаления из корзины" });
        } finally {
            release();
        }
    },

    //  Получить корзину пользователя
    getBasket: async (req, res) => {
        try {
            const userId = req.user.userId;

            const basket = await prisma.basket.findMany({
                where: { userId },
                include: { product: true },
            });

            return res.json(basket);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Ошибка получения корзины" });
        }
    },

    //  Очистить корзину
    clearBasket: async (req, res) => {
        let release = await basketMutex.acquire();
        try {
            const userId = req.user.userId;

            await prisma.basket.deleteMany({ where: { userId } });

            return res.json({ message: "Корзина очищена" });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Ошибка очистки корзины" });
        } finally {
            release(); // Освобождаем мьютекс
        }
    }
};

module.exports = BasketController;