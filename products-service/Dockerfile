# Используем официальный образ Node.js
FROM node:18

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json (позже создадим)
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем все файлы проекта
COPY . .

# Указываем порт, который слушает приложение
EXPOSE 5000

# Команда для запуска приложения
CMD ["npm", "start"]
