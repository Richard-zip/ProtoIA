# 🤖 Agnes — Generador de Protocolos Académicos con IA

Agnes es una aplicación de escritorio que utiliza inteligencia artificial (Google Gemini) para generar protocolos académicos de forma automática. El usuario ingresa la materia, los temas y los participantes, y la IA redacta un protocolo profesional y completo listo para exportar en formato Word (`.docx`).

> **⚠️ Nota:** Los protocolos generados por esta aplicación están diseñados exclusivamente para el formato y los estándares académicos de la **Universidad de Cartagena**.

## ✨ Características

- 📄 **Generación automática** de protocolos individuales y colaborativos.
- 🧠 **Impulsado por Google Gemini** (`gemini-2.5-flash` por defecto).
- 💬 **Vista previa por secciones** del protocolo generado.
- 📥 **Exportación a Word (`.docx`) y PDF (`.pdf`)** basada en plantillas personalizadas.
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
cd ProtoIA
```

### 2. Instalar dependencias

```bash
pnpm install
```


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

### 🧪 Ejecutar pruebas de arquitectura (SOLID)

```bash
pnpm test
```

---

## 🏛️ Arquitectura y Principios SOLID

El proyecto implementa una **Arquitectura Limpia (Clean / Hexagonal Architecture - Ports & Adapters)** diseñada para desacoplar completamente las reglas de negocio de los frameworks, proveedores de IA y formatos de exportación.

### Capas del Sistema (`src/`)

```
src/
├── core/                               # CAPA DE DOMINIO (Reglas de negocio puras)
│   ├── entities/                       # Entidades del dominio (Protocol, ProtocolSection)
│   ├── interfaces/                     # Puertos / Contratos (IAIService, IDocumentExporter, etc.)
│   ├── prompts/                        # Prompts aislados e independientes (SRP)
│   │   ├── individual.prompt.ts
│   │   └── collaborative.prompt.ts
│   ├── strategies/                     # Patrón Estrategia + Registro (Open/Closed Principle)
│   │   ├── base-protocol.strategy.ts
│   │   ├── individual-protocol.strategy.ts
│   │   ├── collaborative-protocol.strategy.ts
│   │   └── protocol-strategy.registry.ts
│   └── helpers/                        # Parsers puros de secciones
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
│   ├── download/                       # Adaptador para navegador / DOM (BrowserFileDownloader)
│   ├── logging/                        # Servicio de logs reactivo (EventLoggerService)
│   ├── config/                         # Configuración y constantes del sistema
│   └── di/                             # Contenedor de Inyección de Dependencias (Composition Root)
│
└── presentation/                       # CAPA DE PRESENTACIÓN (React)
    ├── components/                     # Componentes desacoplados (Form, Preview, Logs)
    ├── hooks/                          # useProtocolController (mediador React <-> Casos de uso)
    └── ProtocolApp.tsx                 # Vista principal ensamblada
```

---

## 🚀 ¿Cómo agregar nuevas funcionalidades sin romper las existentes?

### Caso 1: Agregar un nuevo tipo de protocolo (ejemplo: "Investigación")

1. Crea tu archivo en `src/core/strategies/research-protocol.strategy.ts`:
   ```ts
   import { BaseProtocolStrategy } from "./base-protocol.strategy";
   import { ProtocolStrategyInput, TemplateTarget } from "../interfaces/protocol-strategy.interface";

   export class ResearchProtocolStrategy extends BaseProtocolStrategy {
     readonly id = "investigacion";
     readonly label = "Investigación";
     readonly requiresParticipants = true;
     readonly defaultParticipantsText = "Investigador 1\nInvestigador 2";
     readonly templatePath = "/templates/PLANTILLA PROTOCOLO INVESTIGACION.docx";

     buildPrompt(input: ProtocolStrategyInput): string {
       return `Tu prompt específico para investigación...`;
     }

     extractSections(rawText: string, input: ProtocolStrategyInput): Record<string, string> {
       // Extracción de campos
       return { ... };
     }

     getTemplateTargets(extracted: Record<string, string>): TemplateTarget[] {
       return [ ... ];
     }
   }
   ```
2. Regístralo en `src/infrastructure/di/container.ts`:
   ```ts
   protocolRegistry.register(new ResearchProtocolStrategy());
   ```
3. **¡Listo!** El selector de la interfaz mostrará la nueva opción, el generador usará su prompt y el exportador mapeará su plantilla sin tocar ni una línea del código individual o colaborativo.

### Caso 2: Cambiar o añadir otro proveedor de IA (ejemplo: Claude, OpenAI u Ollama)

1. Crea una clase que implemente `IAIService`:
   ```ts
   export class OpenAIService implements IAIService {
     async generateContent(prompt: string): Promise<string> {
       // Llamada a la API de OpenAI
       return responseText;
     }
   }
   ```
2. Inyéctalo en `createContainer({ customAiService: new OpenAIService() })` en `container.ts`.
3. Ningún caso de uso ni componente sufrirá modificaciones.

