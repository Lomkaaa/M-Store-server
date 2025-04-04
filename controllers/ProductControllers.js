const path = require("path");
const fs = require("fs");
const { prisma } = require("../prisma/prisma-client");

const ProductController = {
  createProduct: async (req, res) => {
    let { name, price, brand, category, description, value } = req.body;
    const { files } = req;
  
    console.log("▶ Запрос на создание товара получен");
  
    try {
      const userId = req.user.userId;
      const user = await prisma.user.findUnique({ where: { id: userId } });
  
      if (!user || user.role !== "ADMIN") {
        return res.status(403).json({ message: "Нет доступа" });
      }
  
      price = Number(price);
      value = Number(value);
  
      if (!name || !price || !brand || !category || !description || !value) {
        return res.status(400).json({ message: "Все поля обязательные" });
      }
  
      if (isNaN(price) || isNaN(value)) {
        return res.status(400).json({ message: "Цена и количество должны быть числами" });
      }
  
      const findBrand = await prisma.brand.findUnique({ where: { name: brand } });
      const findCategory = await prisma.category.findUnique({ where: { name: category } });
  
      if (!findBrand) return res.status(400).json({ message: "Неверно указан бренд" });
      if (!findCategory) return res.status(400).json({ message: "Неверно указана категория" });
  
      const existingProduct = await prisma.product.findFirst({ where: { name } });
      if (existingProduct) {
        return res.status(400).json({ message: "Товар с таким названием уже существует" });
      }
  
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "Загрузите хотя бы одно изображение" });
      }
  
      const imagePaths = [];
  
      // Загружаем все файлы
      for (const file of files) {
        const fileDest = path.join(__dirname, "../uploads/products/", file.filename); // Используем новое имя файла
        await fs.promises.rename(file.path, fileDest);
        imagePaths.push(`/uploads/products/${file.filename}`); // Сохраняем путь
      }
  
      const product = await prisma.product.create({
        data: {
          name,
          value,
          description,
          price,
          brandId: findBrand.id,
          categoryId: findCategory.id,
          imageUrl: imagePaths[0], // Главное изображение
          otherImages: imagePaths.slice(1), // Дополнительные изображения
        },
      });
  
      res.json(product);
    } catch (error) {
      console.error("Ошибка при создании товара:", error);
      res.status(500).json({ message: "Ошибка сервера", error: error.message });
    }
  },

  deleteProduct: async (req, res) => {
    try {
      const { productId } = req.params;
      const userId = req.user.userId;
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
  
      // Проверка, если пользователь не администратор
      if (user.role !== "ADMIN") {
        return res.status(400).json({ message: "Доступ запрещен" });
      }
  
      if (!productId) {
        return res.status(400).json({ message: "Поля обязательны" });
      }
  
      // Проверяем существование товара
      const existingProduct = await prisma.product.findUnique({
        where: { id: productId },
      });
      if (!existingProduct) {
        return res.status(400).json({ message: "Продукт не найден" });
      }
  
      const mainImage = existingProduct.imageUrl;
      const otherImages = existingProduct.otherImages;
  
      // Получаем пути к изображениям товара
      const allImages = [mainImage, ...otherImages];
  
      // Удаляем все изображения
      allImages.forEach((imagePath) => {
        const fullPath = path.join(__dirname, "..", imagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath); // Удаляем файл изображения
        }
      });
  
      // Удаляем товар, его отзывы, избранное и корзину
      await prisma.$transaction([
        prisma.favorite.deleteMany({ where: { productId } }),
        prisma.review.deleteMany({ where: { productId } }),
        prisma.basket.deleteMany({ where: { productId } }),
        prisma.product.delete({ where: { id: productId } }),
      ]);
  
      return res.json({ message: "Продукт удален" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Ошибка сервера", error: error.message });
    }
  },



  updateProduct: async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user.role !== "ADMIN") {
      return res.status(400).json({ message: "Доступ запрещен" });
    }

    const { productId } = req.params;
    const { name, price, brand, category, description, discount, value } =
      req.body;
    const { files } = req;

    if (!productId) {
      return res.status(400).json({ message: "Не указан ID товара" });
    }

    // Проверяем, существует ли товар
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      return res.status(404).json({ message: "Товар не найден" });
    }

    // Объект обновления
    const updateData = {};

    if (price) updateData.price = Number(price);
    if (description) updateData.description = description;
    if (discount) updateData.discount = Number(discount);
    if (name) updateData.name = name;
    if (value) updateData.value = Number(value);

    // Обновление бренда
    if (brand) {
      const findBrand = await prisma.brand.findUnique({
        where: { name: brand },
      });
      if (!findBrand)
        return res.status(400).json({ message: "Неверно указан бренд" });
      updateData.brandId = findBrand.id;
    }

    // Обновление категории
    if (category) {
      const findCategory = await prisma.category.findUnique({
        where: { name: category },
      });
      if (!findCategory)
        return res.status(400).json({ message: "Неверно указана категория" });
      updateData.categoryId = findCategory.id;
    }

    // Обновление изображений
    if (files && files.length > 0) {
      const productFolder = path.join(__dirname, "../uploads/products");

      // Убедимся, что папка для товаров существует
      if (!fs.existsSync(productFolder)) {
        fs.mkdirSync(productFolder, { recursive: true });
      }

      const imagePaths = [];

      // Удаляем старые изображения, если они есть
      if (product.imageUrl) {
        const oldMainImage = path.join(__dirname, "..", product.imageUrl);
        if (fs.existsSync(oldMainImage)) {
          fs.unlinkSync(oldMainImage); // Удаляем старое главное изображение
        }
      }

      // Обновляем изображения
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname); // Уникальное имя с расширением
        const filePath = path.join(productFolder, fileName);

        // Перемещаем файлы в папку
        await fs.promises.rename(file.path, filePath);
        imagePaths.push(`/uploads/products/${fileName}`); // Сохраняем путь для базы данных
      }

      // Обновляем путь к изображениям в базе данных
      updateData.imageUrl = imagePaths[0]; // Основное изображение
      updateData.otherImages = imagePaths.slice(1); // Дополнительные изображения
    }

    // Обновляем товар в базе данных
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        brand: true,
        category: true,
      },
    });

    res.json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
},


  getProductById: async (req, res) => {
    try {
      const { productId } = req.params;
      if (!productId) {
        return res.status(404).json({ message: "Все поля обязательны" });
      }
      if (productId.length !== 24) {
        return res.status(404).json({ message: "ID не того формата " });
      }
      const product = await prisma.product.findFirst({
        where: { id: productId },
        include: {
          brand: true,
          category: true,
          reviews: true,
          favorite: true,
        },
      });
      if (!product) {
        return res.status(404).json({ message: "Продукт не найден" });
      }
      const reviewsCount = product.reviews.length;
      const rating =
        reviewsCount > 0
          ? product.reviews.reduce((acc, curr) => acc + curr.value, 0) /
            reviewsCount
          : 0;
      const userId = req.user?.userId || null;

      return res.json({
        id: product.id,
        name: product.name,
        price: product.price,
        discount: product.discount,
        rating,
        brand: product.brand?.name || "Неизвестный бренд",
        category: product.category?.name || "Неизвестная категория",
        description: product.description,
        imageMainUrl: product.imageUrl,
        imageOtherUrl: product.otherImages || [],
        favoriteByUser:
          product.favorite?.some((fav) => fav.userId === userId) || false,
        rateByUser:
          product.reviews?.some((review) => review.userId === userId) || false,
        userRate:
          product.reviews?.find((review) => review.userId === userId)?.value ||
          0,
        reviewsCount,
        reviews: product.reviews,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Ошибка сервера", error: error.message });
    }
  },
  getAllProduct: async (req, res) => {
    try {
      const userId = req.user?.userId || null;
      let page = Number(req.query.page) || 1;
      let limit = Number(req.query.limit) || 15;
      const skip = (page - 1) * limit;

      if (page < 1) page = 1;
      if (limit < 1) limit = 15;

      let {
        minPrice = 0, //минимальная цена
        maxPrice = 99999999, // максимальная цена
        minRating = 0, //  минимальный рейтинг
        maxRating = 5, // максимальный рейтинг
        categorySort, // поиск по категории
        brandSort, //  поиск по бренду
        discountOnly, //  поиск по скидке
        search = "", //  поиск по названию
        sortBy = "price", // сортировка по цене
        sort = "DESC", //  способ сортировки
      } = req.query;

      const filters = {
        price: { gte: Number(minPrice), lte: Number(maxPrice) },
      };

      // Добавляем фильтр только если minRating или maxRating заданы
      if (minRating > 0 || maxRating < 5) {
        filters.reviews = {
          some: {
            value: { gte: Number(minRating), lte: Number(maxRating) },
          },
        };
      }

      if (discountOnly === "true") filters.discount = { gt: 0 };
      if (categorySort) filters.category = { name: categorySort };
      if (brandSort) filters.brand = { name: brandSort };
      if (search.trim())
        filters.name = { contains: search, mode: "insensitive" };

      const products = await prisma.product.findMany({
        where: filters,
        include: {
          brand: true,
          category: true,
          favorite: true,
          reviews: true,
        },
        orderBy: {
          [sortBy]: sort.toUpperCase() === "ASC" ? "asc" : "desc",
        },
        skip,
        take: limit,
      });

      if (!products.length) {
        return res.status(404).json({ message: "Товары не найдены" });
      }

      const totalCount = await prisma.product.count({ where: filters });

      // Массив для сохранения всех товаров
      const result = products.map((product) => {
        // Рассчитываем рейтинг товара
        const productRating =
          product.reviews.length > 0
            ? (
                product.reviews.reduce((acc, curr) => acc + curr.value, 0) /
                product.reviews.length
              ).toFixed(2)
            : 0;

        return {
          id: product.id,
          name: product.name,
          price: product.price,
          discount: product.discount,
          rating: productRating,
          brand: product.brand?.name || "Неизвестный бренд",
          category: product.category?.name || "Неизвестная категория",
          description: product.description,
          imageMainUrl: product.imageUrl,
          imageOtherUrl: product.otherImages || [],
          favoriteByUser:
            product.favorite?.some((fav) => fav.userId === userId) || false,
          rateByUser:
            product.reviews?.some((review) => review.userId === userId) ||
            false,
          userRate:
            product.reviews?.find((review) => review.userId === userId)
              ?.value || 0,
          reviewsCount: product.reviews.length, // Используем product.reviews.length
          reviews: product.reviews,
        };
      });

      // Отправляем итоговый ответ
      res.json({
        totalCount, // Общее количество товаров
        totalPages: Math.ceil(totalCount / limit), // Количество страниц
        currentPage: page, // Текущая страница
        products: result, // Список товаров
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Ошибка сервера", error: error.message });
    }
  },

  getLimits: async (req, res) => {
    try {
      const products = await prisma.product.findMany({
        include: {
          reviews: true,
        },
      });
      const categories = await prisma.category.findMany();
      const brands = await prisma.brand.findMany();

      const reviews = products.map((prod) => prod.reviews.length);
      const reviewsCount = Math.max(...reviews);
      const prices = products.map((prod) => prod.price);
      const maxPrice = Math.max(...prices);

      res.json({
        reviewsCount,
        maxPrice,
        brands,
        categories,
      });
    } catch (error) {
      res.status(500).json({
        message: "Ошибка сервера",
        error: error,
      });
    }
  },
};

module.exports = ProductController;
