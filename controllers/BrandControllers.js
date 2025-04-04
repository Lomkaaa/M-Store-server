const { prisma } = require("../prisma/prisma-client");

const BrandController = {
  createBrand: async (req, res) => {
    try {
      const userId = req.user.userId;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user.role !== "ADMIN"|| user.role === false) {
        return res.status(400).json({ message: "Нет доступа" });
      }

      const { brandName } = req.body;
      if (!brandName) {
        return res.status(400).json("Заполните поля");
      }

      const BrandUnique = await prisma.brand.findFirst({
        where: { name: brandName },
      });

      if (BrandUnique) {
        return res.status(400).json({ message: "Бренд уже существует" });
      }
      const brand = await prisma.brand.create({
        data: {
          name: brandName,
        },
      });

      res.json(brand);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Ошибка сервера", error: error.message });
    }
  },

  getAllBrands: async (req, res) => {
    try {
      const brands = await prisma.brand.findMany({
        include: {
          products: true,
        },
      });
      res.json(brands);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Ошибка сервера", error: error.message });
    }
  },
  getBrandById: async (req, res) => {
    try {
      const { brandId } = req.body;

      if (!brandId) {
        return res.status(400).json({ message: "Все поля обязательны" });
      }
      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
      });

      if (!brand) {
        return res.status(400).json({ message: "Бренд не найден" });
      }

      res.json(brand);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Ошибка сервера", error: error.message });
    }
  },

  updateBrand: async (req, res) => {
    try {
      const userId = req.user.userId;
  
      // Проверяем, является ли пользователь админом
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.role !== "ADMIN") {
        return res.status(403).json({ message: "Нет доступа" });
      }
  
      // Получаем данные из запроса
      const { brandId, brandName } = req.body;
  
      if (!brandId || !brandName) {
        return res.status(400).json({ message: "Все поля обязательны" });
      }
  
      // Проверяем, существует ли бренд с переданным ID
      const existingBrand = await prisma.brand.findUnique({ where: { id: brandId } });
      if (!existingBrand) {
        return res.status(404).json({ message: "Бренд не найден" });
      }
  
      // Проверяем, существует ли уже бренд с таким же названием (но с другим ID)
      const brandWithSameName = await prisma.brand.findFirst({
        where: { name: brandName, NOT: { id: brandId } }
      });
  
      if (brandWithSameName) {
        return res.status(400).json({ message: "Бренд с таким названием уже существует" });
      }
  
      // Обновляем бренд
      const updatedBrand = await prisma.brand.update({
        where: { id: brandId },
        data: { name: brandName },
      });
  
      res.json(updatedBrand);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Ошибка сервера", error: error.message });
    }
  },

  deleteBrand: async (req, res) => {
    try {
      const userId = req.user.userId;

      // Проверяем, существует ли пользователь и является ли он админом
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.role !== "ADMIN") {
        return res.status(403).json({ message: "Нет доступа" });
      }
      const { brandId } = req.body;

      // Проверяем, переданы ли все нужные данные
      if (!brandId) {
        return res.status(400).json({ message: "Все поля обязательны" });
      }

      // Проверяем, существует ли бренд с таким ID
      const existingBrand = await prisma.brand.findUnique({
        where: { id: brandId },
      });
      if (!existingBrand) {
        return res.status(404).json({ message: "Бренд не найден" });
      }

      await prisma.$transaction([
        prisma.product.deleteMany({ where: { brandId } }), // Удаляем все продукты бренда
        prisma.brand.delete({ where: { id: brandId } }), // Удаляем сам бренд
      ]);

      return res.json({ message: "Бренд и все его продукты удалены" });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Ошибка сервера", error: error.message });
    }
  },
  getProductsByBrand: async (req, res) => {
    try {
      const { brandId } = req.params;
      const { page = 1, pageSize = 10 } = req.query; // Страница по умолчанию - 1, размер страницы - 10

      if (!brandId) {
        return res.status(400).json({ message: "brandId обязателен" });
      }

      // Проверяем, существует ли бренд
      const brand = await prisma.brand.findUnique({ where: { id: brandId } });
      if (!brand) {
        return res.status(404).json({ message: "Бренд не найден" });
      }

      // Получаем количество всех продуктов бренда для пагинации
      const totalCount = await prisma.product.count({
        where: { brandId },
      });

      // Получаем продукты для текущей страницы
      const products = await prisma.product.findMany({
        where: { brandId },
        skip: (page - 1) * pageSize, // Пропускаем количество элементов до текущей страницы
        take: Number(pageSize), // Ограничиваем количеством продуктов на странице
      });

      // Возвращаем продукты и информацию о пагинации
      return res.json({
        products,
        pagination: {
          totalCount,
          page,
          pageSize,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Ошибка получения продуктов", error: error.message });
    }
  },
};

module.exports = BrandController;
