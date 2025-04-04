const { prisma } = require('../prisma/prisma-client.js');

const HistoryController = {
  getHistoriesByUserId: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { cursor } = req.query; 

     
      const histories = await prisma.history.findMany({
        where: { userId },
        include: {
          products: {
            include: { 
              product: { 
                select: { price: true, name: true, id: true, imageUrl: true, discount: true} 
              },
            },
          },
        },
        take: 10, 
        skip: cursor ? 1 : 0, 
        cursor: cursor ? { id: cursor } : undefined, 
        orderBy: { id: "desc" }, 
      });

      
      const nextCursor = histories.length ? histories[histories.length - 1].id : null;

      res.json({ histories, nextCursor });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Не удалось получить историю покупок" });
    }
  },
};

module.exports = HistoryController;