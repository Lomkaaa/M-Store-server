const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1];

	if (!token) {
		return res.status(401).json({ error: 'Пользователь не авторизован' });
	}
    try {
        // Проверяем и верифицируем токен
        const user = jwt.verify(token, process.env.SECRET); // Используем синхронный вариант
    
        req.user = user; // Добавляем информацию о пользователе в запрос
     
 
     // Логируем объект req.user после его заполнения
     console.log("Заполненный объект req.user:", req.user);
        next(); // Переходим к следующему middleware или обработчику
      } catch (error) {
        console.error('JWT Verification Error:', error);
        return res.status(403).json({ error: 'Не верный Token' });
      }
    };


module.exports = {
	auth,
};