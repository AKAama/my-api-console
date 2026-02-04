# ===============================
# 构建阶段
# ===============================
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 只复制 package.json 和 package-lock.json（避免重复安装依赖）
COPY package*.json ./

# 安装依赖（包含 devDependencies，用于构建）
RUN npm ci

# 复制源代码
COPY . .

# 构建项目（生成 dist 文件夹）
RUN npm run build

# ===============================
# 运行阶段 - 使用 nginx 提供静态文件服务
# ===============================
FROM nginx:alpine

# 删除默认 nginx 静态文件
RUN rm -rf /usr/share/nginx/html/*

# 复制构建产物到 nginx 的 html 目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置（包含 SPA 路由处理）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露 80 端口
EXPOSE 80

# 启动 nginx 前台运行
CMD ["nginx", "-g", "daemon off;"]
