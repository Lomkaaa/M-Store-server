const { prisma } = require("../prisma/prisma-client.js");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const path = require("path");
const multiavatar = require("@multiavatar/multiavatar");

const UserController = {
  register: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Заполните обязательные поля" });
      }

      const registeredUser = await prisma.user.findUnique({
        where: { email }, //Поиск первого пользователя с таким емайл
      });
      if (registeredUser) {
        return res.status(400).json({ message: "Пользователь уже существует" });
      }

      const hashPassword = await bcrypt.hash(password, 10);

      const svg = multiavatar(email); //Генерация аватарки . пути и имени
      const avatarName = `${email}_avatar.svg`;
      const avatarPath = path.join(__dirname, "../uploads/avatar/", avatarName);
      fs.writeFileSync(avatarPath, svg);

      const user = await prisma.user.create({
        // Записываем пользователя в БД
        data: {
          email,
          password: hashPassword,
          avatarUrl: `/uploads/avatar/${avatarName}`,
        },
      });
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Ошибка сервера", error: error });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Заполните обязательные поля" });
      }
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(400).json({ message: "неверный логин или пароль" });
      }
      const isMatch = await bcrypt.compare(req.body.password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Неверный email или пароль" });
      }
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.SECRET
      );
      res.json({ token: token, user: user.email });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Ошибка сервера", error: error });
    }
  },
  getUserById: async (req, res) => {
    try {
      const { id } = await req.params;
      if (!id || id.length !== 24)
        return res.status(400).json({ message: "id не верный" });

      const user = await prisma.user.findFirst({
        where: { id },
        include: { reviews: true },
      });
      if (!user) {
        return res
          .status(400)
          .json({ message: "Не существует такого пользователя" });
      }

      return res.json({
        ...user,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Ошибка сервера", error: error });
    }
  },
  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      let { name, email, balance, password, phone } = req.body;
      balance = Number(balance);

      if (id !== req.user.userId) {
        return res.status(403).json({ message: "Нет доступа" });
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }

      // Проверка email на дубликаты
      if (email && email !== user.email) {
        const existingUser = await prisma.user.findFirst({ where: { email } });
        if (existingUser) {
          return res.status(400).json({ message: "Почта уже используется" });
        }
      }

      let filePath = user.avatarUrl; // Если новый файл не загружается, оставляем старый

      // Если загружается новый аватар
      if (req.file && req.file.path) {
        const uploadsDir = path.join(__dirname, "../uploads/avatar/");

        // Удаляем старый аватар, если он существует
        if (user.avatarUrl) {
          const oldAvatarPath = path.join(__dirname, "..", user.avatarUrl);
          if (fs.existsSync(oldAvatarPath)) {
            fs.unlinkSync(oldAvatarPath);
          }
        }

        // Уникальное имя файла: userId_timestamp.extension
        const ext = path.extname(req.file.originalname); // Расширение файла (.jpg, .png)
        const newFileName = `${id}_${Date.now()}${ext}`;
        const newFilePath = path.join(uploadsDir, newFileName);

        // Переименовываем загруженный файл
        fs.renameSync(req.file.path, newFilePath);

        filePath = `/uploads/avatar/${newFileName}`;
      }
      // Обновляем пользователя
      let updatedData = {
        name: name || undefined,
        email: email || undefined,
        avatarUrl: filePath,
        phone: phone || undefined,
        balance: isNaN(balance) ? user.balance : user.balance + balance,
      };
      // Если передан новый пароль - хешируем
      if (password) {
        updatedData.password = await bcrypt.hash(password, 10);
      }
      const userUpdated = await prisma.user.update({
        where: { id },
        data: updatedData,
      });
      res.json(userUpdated);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Не удалось обновить данные пользователя",
        error: error.message,
      });
    }
  },
  current: async (req, res) => {
    const id = req.user.userId;
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Не авторизован" });
      }
      const user = await prisma.user.findFirst({
        where: { id },
        include: { reviews: true },
      });
      if (!user) {
        return res
          .status(400)
          .json({ message: "Не существует такого пользователя" });
      }
      return res.json({
        ...user,
      });
    } catch (error) {
      return res.status(500).json({ message: "ошибка сервера", error });
    }
  },

  UserBalance: async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Не авторизован" });

      const id = req.user.userId;
      let { balance } = req.body;

      if (balance === undefined) {
        return res.status(400).json({ message: "Заполните обязательные поля" });
      }

      // Преобразуем balance в число
      balance = Number(balance);
      if (isNaN(balance) || balance <= 0) {
        return res
          .status(400)
          .json({ message: "Некорректная сумма пополнения" });
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user)
        return res.status(404).json({ message: "Пользователь не найден" });

      // Обновляем баланс безопасно
      const updateUserBalance = await prisma.user.update({
        where: { id },
        data: { balance: { increment: balance } },
      });

      return res.json(updateUserBalance);
    } catch (error) {
      console.error("Ошибка пополнения баланса:", error);
      return res
        .status(500)
        .json({ message: "Ошибка пополнения баланса", error: error.message });
    }
  },
};

module.exports = UserController;
