#!/bin/bash

# ✨ BARBER.PE QUICK START
# Ejecuta este script para instalar y correr el proyecto

echo "🚀 Iniciando BARBER.PE..."
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo -e "${BLUE}📋 Verificando Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Descárgalo de https://nodejs.org"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"
echo ""

# Install dependencies
echo -e "${BLUE}📦 Instalando dependencias...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo "❌ Error instalando dependencias"
    exit 1
fi
echo -e "${GREEN}✅ Dependencias instaladas${NC}"
echo ""

# Check .env
echo -e "${BLUE}⚙️  Verificando configuración...${NC}"
if [ ! -f ".env" ]; then
    echo "📝 Creando archivo .env..."
    cp .env.example .env
    echo -e "${GREEN}✅ Archivo .env creado${NC}"
else
    echo -e "${GREEN}✅ Archivo .env ya existe${NC}"
fi
echo ""

# Start dev server
echo -e "${YELLOW}🎬 Iniciando servidor de desarrollo...${NC}"
echo -e "${BLUE}➜  Abre: http://localhost:5173${NC}"
echo ""

npm run dev
