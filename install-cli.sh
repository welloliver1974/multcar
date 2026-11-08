#!/usr/bin/env bash
# ==============================================================================
# Instalador rápido do comando 'multcar' para a VPS
# ==============================================================================

set -e

echo "Instalando comando 'multcar' em /usr/local/bin/multcar..."
sudo curl -fsSL https://raw.githubusercontent.com/welloliver1974/multcar/main/bin/multcar -o /usr/local/bin/multcar
sudo chmod +x /usr/local/bin/multcar

echo ""
echo "✅ Pronto! O comando 'multcar' já está instalado no seu terminal."
echo "Agora você só precisa digitar:"
echo "   multcar att"
echo ""

