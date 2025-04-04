const { json } = require("express")
const { prisma } = require("../prisma/prisma-client")

const FavoriteController = {
    addFavorite: async (req,res) => {
        try {
        const {productId} = req.params
        const userId = req.user.userId
        if(!productId || productId.length !==24 ) return res.status(404).json({message:"Все поля обязательны"})

            // Проверяем существование товара
        const product = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) {return res.status(404).json({ message: "Товар не найден" });}
        // Проверяем, есть ли уже товар в избранном у пользователя
        const existingFavorite = await prisma.favorite.findFirst({
            where: {
                userId,
                productId
            }
        });
        if (existingFavorite) {return res.status(400).json({ message: "Товар уже в избранном" });}
        
      const newItem = await prisma.favorite.create({
        data:{
            userId:userId,
            productId,
        }
      })
       res.json(newItem)
        } catch (error) {
            console.error(error);
      res.status(500).json({ message: "Ошибка сервера", error: error.message });
        }
    },

    deleteFavorite: async (req,res) => {
        try {
        const {productId} = req.params
        const userId = req.user.userId
        if(!productId || productId.length !==24 ) return res.status(404).json({message:"Все поля обязательны"})

        // Проверяем существование товара
        const product = await prisma.product.findUnique({
            where: {id: productId }
        });

        if (!product) {return res.status(404).json({ message: "Товар не найден" });}
        // Проверяем, есть ли товар в избранном у пользователя
        const existingFavorite = await prisma.favorite.findFirst({
            where: {
                userId,
                productId
            }
        });
        if (!existingFavorite) {return res.status(400).json({ message: "Товар нет в избранном" })}
        
        await prisma.favorite.deleteMany({
            where: {
                userId,
                productId
            }
        })
        res.status(200).json({message:`удаление успешно. ID ${existingFavorite.id}`})

        } catch (error) {
            console.error(error);
      res.status(500).json({ message: "Ошибка сервера", error: error.message });
        }
        
    },
    deleteAllFavorites: async (req, res) => {
        try {
            const userId = req.user.userId;
    
            // Проверяем, есть ли избранные товары у пользователя
            const favoritesCount = await prisma.favorite.count({
                where: { userId }
            });
    
            if (favoritesCount === 0) {
                return res.status(400).json({ message: "Список избранного уже пуст." });
            }
    
            // Удаляем все избранные товары
            const deletedFavorites = await prisma.favorite.deleteMany({
                where: { userId }
            });
    
            res.status(200).json({ 
                message: `Удалено товаров из избранного: ${deletedFavorites.count}`
            });
    
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Ошибка сервера", error: error.message });
        }
    },

    getFavoriteProductById: async (req,res) => {
        try {
            const userId = req.user.userId;
            const {productId} = req.params
            if(!productId || productId.length !==24 ) return res.status(404).json({message:"Все поля обязательны"})
    
            // Проверяем, есть ли избранные товары у пользователя
            const favoritesCount = await prisma.favorite.count({
                where: { userId }
            });
            if (favoritesCount === 0) {
                return res.status(400).json({ message: "Список избранного пуст." });
            }
            const existingFavorite = await prisma.favorite.findUnique({
                where:{
                    userId,
                   id: productId,
                    
                },
                include:{
                    product: true
                }
            })
            if (!existingFavorite) {return res.status(400).json({ message: "Товара нет в избранном" })}

            res.json(existingFavorite)

            
        } catch (error) {
            console.error(error);
      res.status(500).json({ message: "Ошибка сервера", error: error.message });
        }
    },
    getFavoriteAllProduct: async (req,res) => {
        try {
            const userId = req.user.userId;
            const page = parseInt(req.query.page) || 1; 
            const limit = parseInt(req.query.limit) || 10
            const offset = (page - 1) * limit;

            // Проверяем, есть ли избранные товары у пользователя
            const favoritesCount = await prisma.favorite.count({
                where: { userId }
            });
    
            if (favoritesCount === 0) {
                return res.status(400).json({ message: "Список избранного пустой." });
            }

            

            const existingFavorite = await prisma.favorite.findMany({
                where:{
                    userId,
                },
                include:{
                    product: true
                },
                take: limit,
                skip:offset,
            })

            if (!existingFavorite) {return res.status(400).json({ message: "Товара нет в избранном" })}

            const totalPages = Math.ceil(favoritesCount / limit);
            const nextPage = page < totalPages ? page + 1 : null;

            res.status(200).json({ 
                message: `товаров  ${favoritesCount}`,
                existingFavorite,
                totalPages,
                currentPage: page,
                totalFavorites: favoritesCount,
                nextPage,
            });
        } catch (error) {
            console.error(error);
        res.status(500).json({ message: "Ошибка сервера", error: error.message });
        }
        
    },
    

}
module.exports = FavoriteController