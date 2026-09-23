# 🤖 Agnes — Generador de Protocolos Académicos con IA

Agnes es una aplicación de escritorio diseñada para estudiantes e investigadores, que utiliza inteligencia artificial (Google Gemini) para estructurar, redactar y compilar protocolos académicos oficiales de forma automatizada. 

El usuario ingresa la materia, los temas a tratar y los participantes; Agnes genera un protocolo completo, profesional y fiel a la normativa institucional, con visualización de páginas oficiales y exportación directa en formato Word (`.docx`) y PDF (`.pdf`).

> **⚠️ Nota Institucional:** Los protocolos generados por esta aplicación están adaptados exclusivamente a los estándares, formatos de tabla y estructura académica de la **Universidad de Cartagena**.

---

## ✨ Características Principales

- 📄 **Generación automatizada** de protocolos individuales y colaborativos.
- 🧠 **Motor de Inteligencia Artificial:** Impulsado por Google Gemini (`gemini-2.5-flash` por defecto en su nivel de API gratuita).
- 📑 **Visualización de Páginas Oficiales:** Renderizado previo página por página, idéntico al resultado impreso en Word y PDF.
- 📥 **Exportación Profesional:** Generación limpia de archivos Word (`.docx`) basados en las plantillas oficiales y conversión nativa a PDF (`.pdf`).
- 🛑 **Control de Flujo:** Botón de detención inmediata de generación (Stop) mediante `AbortController`.
- 🖨️ **Sin Páginas Sobrantes:** Algoritmo de compactación XML de tablas y recorte de páginas en blanco para evitar hojas residuales.
- 🖥️ **Multiplataforma:** Compatible de forma nativa con **Linux** (AppImage) y **Windows** (Instalador NSIS y Portable) mediante Electron.
- 🔒 **Canal IPC Nativo y Seguro:** Carga directa de plantillas y recursos sin bloqueos de red o errores de *fetch*.

---

## 🛠️ Tecnologías Utilizadas

| Componente | Tecnología | Propósito |
|---|---|---|
| **Frontend** | [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) | Interfaz reactiva, modular y con tipado estricto |
| **Bundler** | [Vite 5](https://vitejs.dev/) | Compilación ultrarrápida y entorno HMR |
| **Plataforma Desktop** | [Electron 30](https://www.electronjs.org/) + `electron-builder` | Empaquetado de escritorio para Linux y Windows |
| **Inteligencia Artificial** | [Google Generative AI SDK](https://www.npmjs.com/package/@google/generative-ai) | Comunicación directa con Gemini 2.5 Flash |
| **Manipulación DOCX** | [JSZip](https://stuk.github.io/jszip/) | Inyección estructurada de contenido en XML de Word |
| **Motor de Renderizado PDF**| [LibreOffice](https://www.libreoffice.org/) (Embebido o Sistema) | Compilación fidedigna de DOCX a PDF y hojas oficiales |
| **Gestor de Paquetes** | [pnpm](https://pnpm.io/) | Gestión eficiente y determinista de dependencias |

---

## 📋 Requisitos Previos

Antes de instalar el proyecto, asegúrate de contar con:

1. **Node.js:** Versión 18.0.0 o superior (recomendado v20+ o v22+ LTS).
2. **Gestor de paquetes:** [pnpm](https://pnpm.io/) v8 o superior (o npm/yarn).
   ```bash
   corepack enable
   corepack prepare pnpm@latest --activate
   ```
3. **API Key de Google Gemini:** Obtén una clave de API gratuita en [Google AI Studio](https://aistudio.google.com/app/apikey).
4. **Git:** Para clonar el repositorio.

---

## 🚀 Instalación y Puesta en Marcha

### 1. Clonar el repositorio

```bash
git clone https://github.com/Richard-zip/ProtoIA.git
cd ProtoIA
```

### 2. Instalar dependencias

```bash
pnpm install
```

*(Si utilizas `npm`, ejecuta `npm install`)*.

---

## 📄 Configuración de LibreOffice en la Aplicación

Agnes utiliza el motor de **LibreOffice** en segundo plano (modo headless) para compilar las páginas físicas oficiales de la vista previa y generar los archivos PDF con 100% de fidelidad al formato `.docx`.

La aplicación detecta LibreOffice en el siguiente orden de prioridad:
1. **Directorio local embebido (`bin/libreoffice`):** Ideal para empaquetar una aplicación 100% autónoma y portable que no requiera que el usuario final instale nada en su sistema.
2. **Instalación estándar del sistema operativo:** Rutas habituales de Linux y Windows.
3. **Variable de entorno PATH del sistema.**
4. **Motor de respaldo web:** Si no se encuentra LibreOffice, el sistema utiliza un motor de renderizado HTML alternativo basado en Chromium.

---

### 🐧 Configuración en Linux

Tienes dos opciones para disponer de LibreOffice:

#### Opción A: Embebido en la app (Recomendado para generar AppImage autónomo)
Ejecuta el script automatizado que descarga los paquetes oficiales de LibreOffice y configura el wrapper ejecutable en `bin/libreoffice`:

```bash
pnpm run setup:libreoffice
```
> **Nota:** Este script requiere `wget`, `tar` y `ar` (incluido en `binutils`). El binario quedará listo en `bin/libreoffice/soffice` y se empaquetará dentro del AppImage.

#### Opción B: Instalar en el sistema
Si prefieres usar la instalación de tu distribución Linux:

* **Ubuntu / Debian / Linux Mint:**
  ```bash
  sudo apt update && sudo apt install -y libreoffice libreoffice-writer
  ```
* **Arch Linux / Manjaro / CachyOS:**
  ```bash
  sudo pacman -S libreoffice-fresh
  ```
* **Fedora / RHEL:**
  ```bash
  sudo dnf install -y libreoffice libreoffice-writer
  ```

---

### 🪟 Configuración en Windows

Para Windows también cuentas con dos opciones:

#### Opción A: Instalación en el sistema (Recomendada y más rápida)
Puedes instalar LibreOffice en tu sistema mediante **Windows Package Manager (winget)**:

```powershell
winget install TheDocumentFoundation.LibreOffice
```

O descargando el instalador oficial `.msi` desde [libreoffice.org/download](https://www.libreoffice.org/download/download-libreoffice/).

Agnes detectará automáticamente la ruta oficial (`C:\Program Files\LibreOffice\program\soffice.exe` o `C:\Program Files (x86)\LibreOffice\program\soffice.exe`).

#### Opción B: Embebido en la app (Para generar instaladores o portables autónomos)
Si deseas que el instalador de Windows (`.exe` o versión portable) incluya LibreOffice en su interior:

1. Ejecuta el script de PowerShell incluido en el proyecto:
   ```powershell
   pnpm run setup:libreoffice:win
   ```
   *(O directamente: `powershell -ExecutionPolicy Bypass -File scripts/setup-portable-libreoffice.ps1`)*

2. Si ya tienes LibreOffice instalado en tu sistema, el script copiará automáticamente los binarios a `bin\libreoffice`.
3. Al compilar la aplicación, `electron-builder` empaquetará la carpeta `bin/libreoffice` como recurso extra en la aplicación.

---

## ▶️ Ejecución en Modo Desarrollo

Para iniciar la aplicación con recarga rápida (HMR):

```bash
pnpm dev
```

Esto compilará el código de Electron y levantará el servidor de desarrollo de Vite en una ventana de escritorio interactiva.

---

## 📦 Compilación y Generación de Releases (Build)

Para generar los instaladores y ejecutables de distribución para producción:

### En Linux (Genera AppImage ejecutable):
```bash
pnpm run build:linux
# o simplemente:
pnpm run build
```
* **Salida:** `dist/Agnes-1.0.0.AppImage` y la carpeta desempaquetada en `dist/linux-unpacked/agnes`.
* **Para ejecutar el AppImage generado:**
  ```bash
  chmod +x dist/Agnes-1.0.0.AppImage
  ./dist/Agnes-1.0.0.AppImage
  ```

### En Windows (Genera instalador NSIS `.exe` y ejecutable portable):
```powershell
pnpm run build:win
```
* **Salida:** `dist/Agnes-Setup-1.0.0.exe` e instalador portable en la carpeta `dist/`.

---

## 🔑 Configuración de la API Key de Gemini

1. Inicia la aplicación.
2. Haz clic en el botón de **Configuración** (`API Key`) en la esquina superior derecha de la barra superior.
3. Ingresa tu clave obtenida de [Google AI Studio](https://aistudio.google.com/app/apikey).
4. Presiona **Probar Conexión** para validar la comunicación con los servidores de Google.
5. Haz clic en **Guardar Configuración**. La clave quedará almacenada localmente de forma segura en tu equipo.

---

## 🧪 Pruebas Automatizadas y Principios SOLID

El proyecto cuenta con una suite integral de pruebas arquitectónicas que validan el cumplimiento estricto de los principios **SOLID**, la limpieza de datos y la robustez de las exportaciones:

```bash
pnpm test
```

### Verificaciones incluidas en la suite:
- **Test 1 (SRP):** Desacoplamiento de prompts independientes y responsabilidad única.
- **Test 2 (LSP):** Sustitución de Liskov en estrategias de protocolo.
- **Test 3 (OCP):** Extensibilidad abierta sin modificación de código fuente preexistente.
- **Test 4 (ISP):** Segregación de interfaces (`IAIService`, `IDocumentExporter`, `IFileDownloader`).
- **Test 5 (DIP):** Inversión de dependencias mediante contenedor IoC (`AppContainer`).
- **Test 6:** Limpieza tipográfica de viñetas, eliminación de asteriscos parásitos, formato de bibliografía plano y estilo Times New Roman.
- **Test 7:** Normalización de mayúsculas sostenidas, preservación de siglas técnicas (OWASP, SQL, etc.) y corrección de dobles puntos.
- **Test 8:** Exportación e inyección XML de plantillas DOCX y exportador PDF.
- **Test 9:** Filtrado inteligente de emojis y numeraciones en los nombres de temas.
- **Test 10:** Configuración predeterminada del modelo gratuito `gemini-2.5-flash`.
- **Test 11 & 12:** Detección de motor LibreOffice y visualización de hojas oficiales.
- **Test 13:** Cancelación limpia de generación con `AbortController` (botón Stop).
- **Test 14:** Recorte automático de saltos de página y supresión de páginas finales en blanco.
- **Test 15:** Animación de carga arcade retro con estilo pixelado de Agnes.
- **Test 16:** Carga nativa de plantillas DOCX por canal IPC para entornos de producción y AppImage (prevención de errores `Failed to fetch`).

---

## 🏛️ Arquitectura del Software

El sistema sigue una **Arquitectura Hexagonal (Puertos y Adaptadores)**:

```
src/
├── core/                               # CAPA DE DOMINIO (Reglas de negocio puras)
│   ├── entities/                       # Entidades (Protocol, ProtocolSection)
│   ├── interfaces/                     # Puertos / Contratos (IAIService, IDocumentExporter, etc.)
│   ├── prompts/                        # Prompts aislados por estrategia (SRP)
│   │   ├── individual.prompt.ts
│   │   └── collaborative.prompt.ts
│   ├── strategies/                     # Patrón Estrategia + Registro (Open/Closed Principle)
│   │   ├── base-protocol.strategy.ts
│   │   ├── individual-protocol.strategy.ts
│   │   ├── collaborative-protocol.strategy.ts
│   │   └── protocol-strategy.registry.ts
│   └── helpers/                        # Parsers de secciones y reglas sintácticas
│
├── application/                        # CAPA DE APLICACIÓN (Casos de Uso)
│   ├── dtos/                           # DTOs de entrada y validación
│   └── use-cases/                      # Orquestadores de negocio
│       ├── generate-protocol.use-case.ts
│       └── export-protocol.use-case.ts
│
├── infrastructure/                     # CAPA DE INFRAESTRUCTURA (Adaptadores)
│   ├── ai/                             # Adaptadores de IA (GeminiAIService, MockAIService)
│   ├── export/                         # Adaptadores de formato (DocxProtocolExporter, XML helpers)
│   ├── download/                       # Adaptador de descarga (BrowserFileDownloader)
│   ├── logging/                        # Servicio reactivo de logs (EventLoggerService)
│   ├── config/                         # Configuración y almacenamiento de parámetros
│   └── di/                             # Composition Root (Inversión de Dependencias)
│
├── presentation/                       # CAPA DE PRESENTACIÓN (React 18)
│   ├── components/                     # Componentes desacoplados (ProtocolForm, DocxPreview, etc.)
│   ├── hooks/                          # useProtocolController (mediador React <-> Casos de uso)
│   └── ProtocolApp.tsx                 # Ensamblado principal de la interfaz
│
└── electron/                           # PROCESO PRINCIPAL DE ESCRITORIO
    ├── main.ts                         # Ventana nativa, ciclo de vida e IPC
    └── preload.ts                      # Puente de contexto seguro (Context Isolation)
```

---

## 🧩 ¿Cómo Extender la Aplicación?

### Agregar un nuevo tipo de protocolo (ejemplo: "Investigación")

1. Crea tu estrategia en `src/core/strategies/research-protocol.strategy.ts` heredando de `BaseProtocolStrategy`.
2. Define su `id`, `label`, `templatePath`, `buildPrompt()`, `extractSections()` y `getTemplateTargets()`.
3. Regístrala en `src/infrastructure/di/container.ts`:
   ```ts
   protocolRegistry.register(new ResearchProtocolStrategy());
   ```
4. **Listo:** La interfaz agregará automáticamente la nueva opción en el selector, el generador usará su prompt correspondiente y el exportador mapeará la plantilla sin modificar el código de los protocolos existentes (Principio Abierto/Cerrado).

---

## 📄 Licencia

Este proyecto está bajo la licencia **MIT**. Consulta el archivo `LICENSE` para más detalles.
