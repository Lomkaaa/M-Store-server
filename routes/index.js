const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const {
  UserController,
  BasketController,
  BrandController,
  CategoryController,
  ProductController,
  FavoriteController,
  HistoryController,
  OrderController,
  ReviewControler
} = require("../controllers");

const { auth } = require("../middleware/auth");

const storageProduct = multer.diskStorage({
  destination: path.join(__dirname, "../uploads/products/"), 
  filename: (req, file, cb) => {
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extname = path.extname(file.originalname); 
    cb(null, uniqueSuffix + extname); 
  },
});

const uploadProduct = multer({ storage: storageProduct }).array("files");

// показать где хранить файлы Аватаров
const storageAvatar = multer.diskStorage({
  destination: "uploads/avatar/",
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const uploadAvatar = multer({ storage: storageAvatar }).single("file");

// Пользователь
router.post("/register", UserController.register);
router.post("/login", UserController.login);
router.get("/current", auth, UserController.current);
router.get("/users/:id", auth, UserController.getUserById);
router.post("/balance", auth, UserController.UserBalance);
router.put("/users/:id", auth,uploadAvatar, UserController.updateUser);

// Корзина
router.get("/basket", auth, BasketController.getBasket);
router.patch("/basket/:productId", auth, BasketController.addToBasket);
router.delete("/basket/:productId", auth, BasketController.removeFromBasket);
router.delete("/basket", auth, BasketController.clearBasket);

//Бренды
router.post("/brands", auth, BrandController.createBrand); //Создать бренд
router.get("/brands", auth, BrandController.getAllBrands); //Получить все бренды
router.get("/brands/:brandId", auth, BrandController.getBrandById); //Получить бренд по id
router.put("/brands/:brandId", auth, BrandController.updateBrand); //Обновить бренд
router.delete("/brands/:brandId", auth, BrandController.deleteBrand); //Удалить бренд
router.get(
  "/brands/:brandId/products",
  auth,
  BrandController.getProductsByBrand
); //Получить товары бренда

//категория
router.post("/categories", auth, CategoryController.createCategory); //Создать категории
router.get("/categories", auth, CategoryController.getAllCategories); //Получить все категории
router.get("/categories/:categoryId", auth, CategoryController.getCategoryById); //Получить категорию по id
router.put("/categories/:categoryId", auth, CategoryController.updateCategory); //Обновить категории
router.delete(
  "/categories/:categoryId",
  auth,
  CategoryController.deleteCategory
); //Удалить категорию
router.get(
  "/categories/:categoryId/products",
  auth,
  CategoryController.getProductsByCategory
); //Получить категорию

//Продукт
router.post("/products", auth, uploadProduct,ProductController.createProduct); //Добавление продукта
router.delete("/products/:productId", auth, ProductController.deleteProduct); //Удаление продукта
router.get("/products/:productId", auth, ProductController.getProductById); //Получение продукта
router.get("/products", auth, ProductController.getAllProduct); //Получение продуктов
router.patch("/products/:productId",auth,uploadProduct, ProductController.updateProduct)//редактировать продукт
router.get("/limits",auth, ProductController.getLimits)
//избранное 
router.patch("/favorites/:productId", auth, FavoriteController.addFavorite); //Добавление избранных продукта
router.delete("/favorites/:productId", auth, FavoriteController.deleteFavorite); //Удаление избранного  продукта
router.delete("/favorites", auth, FavoriteController.deleteAllFavorites); //очистить избранное
router.get("/favorites/:productId", auth,FavoriteController.getFavoriteProductById); //Получение избранного продукта
router.get("/favorites", auth,FavoriteController.getFavoriteAllProduct); //Получение избранных продуктов
// История Покупок
router.get("/histories", auth, HistoryController.getHistoriesByUserId); //История покупок
// Tовар купленый
router.post("/orders", auth, OrderController.purchaseBasket) // Сделать заказ
router.get("/orders",auth, OrderController.getOrdersByUserId) //Показать покупки
router.patch("/orders/:orderId/status",auth, OrderController.updateOrderStatus)// Изменить статус заказа
router.get("/orders/:orderId", auth , OrderController.getOrderStatus) // Статус заказа
// Отзывы
router.post("/reviews/:productId", auth, ReviewControler.createReview)// Создать или обновить отзыв (авторизованный пользователь)
router.delete("/reviews/:reviewId", auth, ReviewControler.deleteReview)// Удалить отзыв (только автор отзыва)
router.get("/reviews/:productId", ReviewControler.getReviewsByProductId)// Получить отзывы по `productId`

module.exports = router;


