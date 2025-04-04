const { prisma } = require("../prisma/prisma-client");


const ReviewControler = {
    createReview: async (req,res) => {
        try {

			const { productId } = req.params;
			let { content, value } = req.body;
			const userId = req.user.userId;
            value = Number(value)
            

			if (!value) return res.status(400).json({ message: 'Поле оценки обязательное' });
            
			const existingReview = await prisma.review.findFirst({ where: { productId, userId } });
			if (existingReview) {
				const updatedReview = await prisma.review.update({
					where: { id: existingReview.id },
					data: {
						value,
						content: content || existingReview.content,
					},
				});
				return res.json(updatedReview);
			}

			const review = await prisma.review.create({
				data: {
					productId,
					userId,
					value,
					content,
				},
			});
			res.json(review);
		} catch (error) {
			console.log(error);
			res.status(500).json({ message: 'Не удалось оставить отзыв' });
		}
    },
    deleteReview: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { reviewId } = req.params;

            if (!reviewId) {
                return res.status(400).json({ message: "reviewId обязателен" });
            }

            const review = await prisma.review.findUnique({
                where: { id: reviewId }
            });

            if (!review) return res.status(404).json({ message: "Отзыв не найден" });

            if (review.userId !== userId) {
                return res.status(403).json({ message: "Нет доступа" });
            }

            await prisma.review.delete({ where: { id: reviewId } });

            return res.status(200).json({ message: "Отзыв удален" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Не удалось удалить отзыв" });
        }
    },
    getReviewsByProductId: async (req,res) => {
    
            try {
                const {productId} = req.params;
                if (!productId || productId.length !== 24) {
                    return res.status(400).json({ message: "productId обязателен" });
                }
                const reviews = await prisma.review.findMany({ where: { productId }, include: { user: true } });
                res.json(reviews);
            } catch {
                res.status(500).json({ message: 'Ошибка сервера' });
            }
        },



}
module.exports = ReviewControler