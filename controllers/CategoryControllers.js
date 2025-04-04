const { prisma } = require("../prisma/prisma-client");

const CategoryController = {
  createCategory: async (req, res) => {
    try {
      const userId = req.user.userId;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.role !== "ADMIN") {
        return res.status(400).json({ message: "Нет доступа" });
      }

      const { categoryName } = req.body;
      if (!categoryName) {
        return res.status(400).json("Заполните поля");
      }

      const categoryUnique = await prisma.category.findFirst({
        where: { name: categoryName },
      });

      if (categoryUnique) {
        return res.status(400).json({ message: "Категория уже существует" });
      }
      const category = await prisma.category.create({
        data: {
          name: categoryName,
        },
      });

      res.json(category);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Ошибка сервера", error: error.message });
    }
  },

  getAllCategories: async (req, res) => {
    try {
      const categories = await prisma.category.findMany({
        include: {
          products: true,
        },
      });
      res.json(categories);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Ошибка сервера", error: error.message });
    }
  },

  getCategoryById: async (req, res) => {
    try {
      const { categoryId } = req.body;

      if (!categoryId) {
        return res.status(400).json({ message: "Все поля обязательны" });
      }
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        return res.status(400).json({ message: "Категория не найден" });
      }

      res.json(category);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Ошибка сервера", error: error.message });
    }
  },
  updateCategory: async (req, res) => {
    try {
      const userId = req.user.userId;
  
      // Проверяем, является ли пользователь админом
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.role !== "ADMIN") {
        return res.status(403).json({ message: "Нет доступа" });
      }
  
      // Получаем данные из запроса
      const { categoryId, categoryName } = req.body;
  
      if (!categoryId || !categoryName) {
        return res.status(400).json({ message: "Все поля обязательны" });
      }
  
      // Проверяем, существует ли категория с переданным ID
      const existingCategory = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!existingCategory) {
        return res.status(404).json({ message: "Категория не найдена" });
      }

      // Проверяем, существует ли уже категория с таким же названием (но с другим ID)
      const categoryWithSameName = await prisma.category.findFirst({
        where: { name: categoryName, NOT: { id: categoryId } }
      });
  
      if (categoryWithSameName) {
        return res.status(400).json({ message: "Категория с таким названием уже существует" });
      }
      // Обновляем категорию
      const categoryUpdate = await prisma.category.update({
        where: { id: categoryId },
        data: { name: categoryName },
      });
  
      res.json(categoryUpdate);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Ошибка сервера", error: error.message });
    }
  },
  

  deleteCategory: async (req, res) => {
    try {
      const userId = req.user.userId;

      // Проверяем, существует ли пользователь и является ли он админом
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.role !== "ADMIN") {
        return res.status(403).json({ message: "Нет доступа" });
      }

      const { categoryId } = req.body;
      if (!categoryId) {
        return res.status(400).json({ message: "Все поля обязательны" });
      }
      const existingCategory = await prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!existingCategory) {
        res.status(400).json({ message: "Категория не найдена" });
      }

      await prisma.$transaction([
        prisma.product.deleteMany({ where: { categoryId } }), // Удаляем все продукты
        prisma.category.delete({ where: { id: categoryId } }),
      ]);

      return res.json({ message: "Категория и все ее продукты удалены" });
    } catch (error) {}
  },
  getProductsByCategory: async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { page = 1, pageSize = 10 } = req.query; // Страница по умолчанию - 1, размер страницы - 10

      if (!categoryId) {
        return res.status(400).json({ message: "все поля обязателен" });
      }

      // Проверяем, существует ли Категория
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        return res.status(404).json({ message: "категория не найден" });
      }

      // Получаем количество всех продуктов  для пагинации
      const totalCount = await prisma.product.count({
        where: { categoryId },
      });

      // Получаем продукты для текущей страницы
      const products = await prisma.product.findMany({
        where: { categoryId },
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

module.exports = CategoryController;
