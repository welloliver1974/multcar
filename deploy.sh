#!/usr/bin/env bash
# ==============================================================================
# Script de Deploy e Atualização Automática do Multcar Pro na VPS
# Repositório: https://github.com/welloliver1974/multcar.git
# ==============================================================================

set -e

REPO_URL="https://github.com/welloliver1974/multcar.git"
APP_DIR="/opt/multcar"

# Cores para o terminal
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}======================================================${NC}"
echo -e "${GREEN}   🏎️  MULTCAR PRO — SCRIPT DE DEPLOY NA VPS        ${NC}"
echo -e "${CYAN}======================================================${NC}"

# 1. Verifica se já está dentro da pasta do projeto ou se precisa clonar
if [ -d ".git" ]; then
    echo -e "${YELLOW}[1/4] Repositório local detectado. Atualizando via Git...${NC}"
    git fetch origin
    git reset --hard origin/main
    git pull origin main
else
    echo -e "${YELLOW}[1/4] Clonando o repositório em ${APP_DIR}...${NC}"
    if [ ! -d "$APP_DIR" ]; then
        sudo mkdir -p "$APP_DIR"
        sudo chown -R $USER:$USER "$APP_DIR"
        git clone "$REPO_URL" "$APP_DIR"
    fi
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/main
    git pull origin main
fi

# 2. Pergunta / Detecta método de execução (Docker ou Node.js)
echo -e "${YELLOW}[2/4] Verificando ambiente de execução...${NC}"

if command -v docker &> /dev/null && command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    echo -e "${GREEN}Docker e Docker Compose detectados!${NC}"
    echo -e "${YELLOW}[3/4] Construindo e iniciando container com Nginx otimizado...${NC}"
    
    # Subir via Docker Compose
    if docker compose version &> /dev/null; then
        docker compose down || true
        docker compose build --no-cache
        docker compose up -d
    else
        docker-compose down || true
        docker-compose build --no-cache
        docker-compose up -d
    fi

    echo -e "${CYAN}======================================================${NC}"
    echo -e "${GREEN}✅ DEPLOY VIA DOCKER CONCLUÍDO COM SUCESSO!${NC}"
    echo -e "O Multcar Pro está rodando na porta ${YELLOW}3030${NC} da sua VPS."
    echo -e "URL Local: ${CYAN}http://localhost:3030${NC}"
    echo -e "Download do APK: ${CYAN}http://IP_DA_SUA_VPS:3030/Multcar_Pro_v1.0.apk${NC}"
    echo -e "${CYAN}======================================================${NC}"

elif command -v node &> /dev/null; then
    echo -e "${GREEN}Node.js detectado! Usando servidor nativo server.js...${NC}"
    
    if command -v pm2 &> /dev/null; then
        echo -e "${YELLOW}[3/4] Reiniciando aplicação via PM2...${NC}"
        pm2 restart multcar || pm2 start server.js --name "multcar"
        pm2 save
    else
        echo -e "${YELLOW}[3/4] PM2 não encontrado. Instalando PM2 globalmente...${NC}"
        sudo npm install -g pm2
        pm2 start server.js --name "multcar"
        pm2 save
        pm2 startup | tail -n 1 | sudo bash || true
    fi

    echo -e "${CYAN}======================================================${NC}"
    echo -e "${GREEN}✅ DEPLOY VIA NODE.JS (PM2) CONCLUÍDO COM SUCESSO!${NC}"
    echo -e "Aplicação ativa em segundo plano na porta ${YELLOW}3030${NC}."
    echo -e "${CYAN}======================================================${NC}"

else
    echo -e "${RED}Nem Docker nem Node.js foram encontrados na VPS!${NC}"
    echo -e "Instale o Docker rapidamente com:"
    echo -e "${YELLOW}curl -fsSL https://get.docker.com | sh${NC}"
    exit 1
fi

# 4. Instala o comando CLI global "multcar" no sistema
echo -e "${YELLOW}[4/4] Instalando atalho global 'multcar' em /usr/local/bin/multcar...${NC}"
if [ -f "$APP_DIR/bin/multcar" ]; then
    sudo cp -f "$APP_DIR/bin/multcar" /usr/local/bin/multcar
    sudo chmod +x /usr/local/bin/multcar
    echo -e "${GREEN}Atalho 'multcar' instalado com sucesso!${NC}"
fi

echo -e "\n${CYAN}======================================================${NC}"
echo -e "${GREEN}🎉 TUDO PRONTO! AGORA VOCÊ PODE USAR APENAS:${NC}"
echo -e "   ${YELLOW}multcar att${NC}      -> Atualiza tudo automaticamente"
echo -e "   ${YELLOW}multcar status${NC}   -> Verifica se o container está rodando"
echo -e "   ${YELLOW}multcar logs${NC}     -> Acompanha os logs em tempo real"
echo -e "${CYAN}======================================================${NC}"

echo -e "\n${YELLOW}💡 Próximo Passo para ter HTTPS (Obrigatório para o Bluetooth no Celular):${NC}"
echo -e "1. Aponte seu domínio/subdomínio para o IP desta VPS."
echo -e "2. Use o Nginx Proxy Manager, Caddy ou Certbot para gerar o certificado SSL gratuito:"
echo -e "   ${CYAN}certbot --nginx -d multcar.seudominio.com${NC}"
echo -e "3. Ou pelo Cloudflare Tunnel (Tunnel -> Public Hostname -> localhost:3030).\n"

