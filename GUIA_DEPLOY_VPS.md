# 🚀 Guia de Deploy do Multcar Pro na VPS

Este guia ensina como colocar o **Multcar Pro (PWA + APK)** rodando no seu próprio servidor VPS Linux (Ubuntu, Debian, etc.), pronto para acesso com HTTPS e download do APK.

---

## ⚡ Método Rápido (1 Comando no Terminal da VPS)

Conecte-se na sua VPS via SSH e execute este comando único:

```bash
curl -fsSL https://raw.githubusercontent.com/welloliver1974/multcar/main/deploy.sh | bash
```

Esse script faz tudo sozinho:
1. Clona o repositório em `/opt/multcar`.
2. Detecta se você tem **Docker** ou **Node.js/PM2**.
3. Sobe o servidor web com **Nginx otimizado** na porta `3030`.
4. Deixa o PWA ativo e o download do arquivo `Multcar_Pro_v1.0.apk` disponível.

---

## 🔄 Como Atualizar Quando Sair Nova Versão

Sempre que fizermos alterações no projeto e enviarmos para o GitHub, basta digitar diretamente no terminal da VPS:

```bash
multcar att
```

O comando busca as novidades no GitHub, reconstrói os containers Docker sem cache e atualiza o PWA e o download do APK automaticamente!

*(Caso ainda não tenha o comando instalado, instale com: `curl -fsSL https://raw.githubusercontent.com/welloliver1974/multcar/main/install-cli.sh | bash`)*

---

## 🔒 Como Configurar HTTPS Grátis (Essencial para o Bluetooth no Celular)

O Chrome do celular exige **HTTPS** para liberar a Web Bluetooth API. Você tem duas opções simples:

### Opção 1: Via Cloudflare Tunnel (Mais recomendado se já usa Cloudflare)
Se você já usa Cloudflare:
1. No painel do **Cloudflare Zero Trust** (Networks -> Tunnels):
2. No seu túnel ativo, crie um **Public Hostname**:
   * **Subdomain:** `multcar`
   * **Domain:** `seudominio.com`
   * **Type:** `HTTP`
   * **URL:** `localhost:3030`
3. Salve! O seu endereço `https://multcar.seudominio.com` já terá SSL automático com selo de segurança.

---

### Opção 2: Via Nginx + Certbot (Certificado Let's Encrypt na VPS)
Se você usa Nginx como proxy reverso padrão na VPS:

1. Crie o arquivo de configuração:
```bash
sudo nano /etc/nginx/sites-available/multcar
```

2. Cole o conteúdo:
```nginx
server {
    server_name multcar.seudominio.com;

    location / {
        proxy_pass http://localhost:3030;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. Ative o site e emita o certificado SSL gratuito:
```bash
sudo ln -s /etc/nginx/sites-available/multcar /etc/nginx/sites-enabled/
sudo systemctl reload nginx
sudo certbot --nginx -d multcar.seudominio.com
```

---

## 📱 Links Resultantes na sua VPS:
* **Dashboard PWA:** `https://multcar.seudominio.com`
* **Download direto do APK:** `https://multcar.seudominio.com/Multcar_Pro_v1.0.apk`

