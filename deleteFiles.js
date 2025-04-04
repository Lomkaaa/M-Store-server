const fs = require("fs")
const path = require("path");

const mainFolder = path.join(__dirname, 'uploads/products/'); // Путь к основной папке

// Функция для очистки основной папки от файлов, не находящихся в подкаталогах
 async function cleanMainFolder() {
    
  fs.readdir(mainFolder, (err, files) => {
    if (err) {
      console.error('Ошибка при чтении папки:', err);
      return;
    }

    files.forEach(file => {
      const filePath = path.join(mainFolder, file);
      
      // Проверяем, является ли это папкой
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error('Ошибка при получении информации о файле:', err);
          return;
        }

        // Если это не папка, удаляем файл
        if (!stats.isDirectory()) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error('Ошибка при удалении файла:', err);
            } else {
              console.log(`Удален файл: ${filePath}`);
            }
          });
        }
      });
    });
  });
}

module.exports = cleanMainFolder