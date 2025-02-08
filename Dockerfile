FROM node:18

WORKDIR /app

# 安裝 nodemon 用於開發環境
RUN npm install -g nodemon

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3002

CMD ["npm", "run", "dev"]