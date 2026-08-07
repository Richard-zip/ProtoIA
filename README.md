# 🤖 ProtoAI — Generador de Protocolos Académicos con IA

ProtoAI es una aplicación de escritorio que utiliza inteligencia artificial (Google Gemini) para generar protocolos académicos de forma automática. El usuario ingresa la materia, los temas y los participantes, y la IA redacta un protocolo profesional y completo listo para exportar en formato Word (`.docx`).

> **⚠️ Nota:** Los protocolos generados por esta aplicación están diseñados exclusivamente para el formato y los estándares académicos de la **Universidad de Cartagena**.

## ✨ Características

- 📄 **Generación automática** de protocolos individuales y colaborativos.
- 🧠 **Impulsado por Google Gemini** (`gemini-2.5-flash` por defecto).
- 💬 **Vista previa por secciones** del protocolo generado.
- 📥 **Exportación a Word** (`.docx`) basada en plantillas personalizadas.
- 🖥️ **App de escritorio multiplataforma** gracias a Electron.
- 🎓 **Formato exclusivo** para la **Universidad de Cartagena** — estructura y secciones adaptadas a sus estándares académicos.

---

## 🛠️ Tecnologías utilizadas

| Tecnología | Descripción |
|---|---|
| [React 18](https://react.dev/) | Interfaz de usuario |
| [TypeScript](https://www.typescriptlang.org/) | Tipado estático |
| [Vite](https://vitejs.dev/) | Bundler y servidor de desarrollo |
| [Electron](https://www.electronjs.org/) | Aplicación de escritorio |
| [Google Generative AI SDK](https://www.npmjs.com/package/@google/generative-ai) | Integración con la API de Gemini |
| [JSZip](https://stuk.github.io/jszip/) | Manipulación de archivos `.docx` |
| [pnpm](https://pnpm.io/) | Gestor de paquetes |

---

## 📋 Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior
- [pnpm](https://pnpm.io/) v8 o superior
- Una **API Key de Google Gemini** — obtén una gratis en [Google AI Studio](https://aistudio.google.com/app/apikey)

---

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/Richard-zip/ProtoIA
cd protoai
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

Copia el archivo de ejemplo y añade tu API Key de Gemini:

```bash
cp example.env .env
```

Edita el archivo `.env` con tus valores:

```env
VITE_GEMINI_API_KEY=tu_api_key_aqui
GEMINI_MODEL=gemini-2.5-flash
APP_NAME=ProtoAI
```

---

## ▶️ Ejecución en modo desarrollo

```bash
pnpm dev
```

Esto abre la aplicación Electron con el servidor de Vite en modo hot-reload.

---

## 📦 Build para producción

```bash
pnpm build
```

El instalador se generará en la carpeta `release/`.

---

## 📁 Estructura del proyecto

```
protoai/
├── electron/          # Proceso principal de Electron
│   ├── main.ts        # Ventana principal e IPC
│   └── preload.ts     # Script de precarga (bridge seguro)
├── src/               # Aplicación React (renderer)
│   ├── App.tsx        # Componente raíz
│   ├── uiTests.tsx    # Interfaz principal de usuario
│   ├── geminiTest.ts  # Integración con la API de Gemini
│   └── wordExport.ts  # Exportación a formato Word
├── public/            # Plantillas .docx y recursos estáticos
├── example.env        # Plantilla de variables de entorno
└── package.json
```

---

## 🔑 Variables de entorno

| Variable | Descripción | Requerida |
|---|---|---|
| `VITE_GEMINI_API_KEY` | API Key de Google Gemini | ✅ Sí |
| `GEMINI_MODEL` | Modelo de Gemini a usar (ej. `gemini-2.5-flash`) | No (tiene valor por defecto) |
| `APP_NAME` | Nombre de la aplicación | No |

---

## 📄 Licencia

Este proyecto es privado y de uso académico.
