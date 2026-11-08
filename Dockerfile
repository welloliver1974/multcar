# Imagem base Nginx Alpine ultra-leve (~20MB)
FROM nginx:alpine

# Remove configuração padrão
RUN rm -rf /etc/nginx/conf.d/*

# Copia configuração customizada otimizada para PWA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos estáticos do PWA
COPY multcar-app/www/ /usr/share/nginx/html/

# Copia também o APK compilado para permitir download direto pelo VPS
COPY Multcar_Pro_v1.0.apk /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
