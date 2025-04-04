const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const cleanupUnusedFiles = async () => {
  try {
    console.log('⏳ Очистка неиспользуемых файлов...');

    const productImages = await prisma.product.findMany({
      select: {
        imageUrl: true,
        otherImages: true,
      },
    });

    const allImages = [
      ...productImages.map(p => p.imageUrl),
      ...productImages.flatMap(p => p.otherImages),
    ];

    const productFolder = path.resolve(__dirname, "./uploads/products")

    if (!fs.existsSync(productFolder)) {
      console.log('Папка products не существует, пропускаем очистку');
      return;
    }

    fs.readdirSync(productFolder).forEach((file) => {
      const filePath = path.join(productFolder, file);

      if (!allImages.includes(`/uploads/products/${file}`)) {
        console.log(`🗑 Удаляем: ${file}`);
        fs.unlinkSync(filePath);
      }
    });


  } catch (error) {
    console.error('Ошибка при очистке файлов:', error);
  }
};

// Автоматически каждый день в 03:00
cron.schedule('0 3 * * *', cleanupUnusedFiles);
module.exports = cleanupUnusedFiles