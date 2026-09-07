import { IAIService } from "../../core/interfaces/ai-service.interface";

export class MockAIService implements IAIService {
  constructor(private readonly delayMs = 1000) {}

  async generateContent(prompt: string): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));

    const isColab = prompt.includes("PROTOCOLO COLABORATIVO");
    if (isColab) {
      return `PROTOCOLO COLABORATIVO - Arquitectura de Software

REGISTRO DE PARTICIPANTES
Ana Pérez
Carlos Gómez

DESCRIPCIÓN DEL TEXTO O ACTIVIDAD A REALIZAR
En este protocolo colaborativo se aborda la arquitectura de software y sus patrones fundamentales. Se cubren conceptos de diseño limpio, principios SOLID y patrones arquitectónicos. Este tema es relevante tanto en el ámbito académico como profesional porque permite construir sistemas mantenibles. La actividad realizada fue de tipo teórico-práctico, enfocándose en la aplicación de principios mediante estudio colaborativo y discusión grupal para enriquecer la formación profesional en ingeniería de software.

PALABRAS CLAVE
arquitectura, software, diseño, principios, patrones, escalabilidad, modularidad, desacoplamiento.

OBJETIVOS DE LAS LECTURAS O ACTIVIDAD A REALIZAR

Objetivo General:
Comprender la arquitectura de software mediante el análisis de principios de diseño y patrones estructurales.

Objetivos Específicos:
1. Identificar los principios SOLID y su impacto en la mantenibilidad.
2. Analizar patrones arquitectónicos distribuidos y desacoplados.
3. Evaluar técnicas de modularización en proyectos reales.

CONCEPTOS CLAVE Y DEFINICIONES
Arquitectura de software: Estructura fundamental de un sistema que comprende sus componentes y relaciones.
Principios SOLID: Conjunto de cinco principios de diseño orientado a objetos.
Acoplamiento: Grado de interdependencia entre módulos de software.
Cohesión: Medida en que las responsabilidades de un módulo forman una unidad lógica.

RESUMEN DE LAS DISCUSIONES GRUPALES
Durante nuestras discusiones grupales surgieron varios aspectos importantes sobre arquitectura:
- Microservicios vs Monolitos: Algunos argumentaban que los microservicios son siempre mejores, otros defendían que los monolitos modulares reducen complejidad operativa. Concordamos en que depende del tamaño del equipo y volumen.
- Inversión de Dependencias: Hubo diferentes opiniones sobre la complejidad añadida de usar interfaces para todo. Concordamos en que en módulos centrales es indispensable.
- Desacoplamiento de Base de Datos: Algunos sostenían que abstraer la persistencia añade sobrecarga innecesaria. No hubo consenso sobre la conveniencia en proyectos pequeños.
- Reglas de Negocio en la UI: Hubo acuerdo unánime en que la UI jamás debe contener lógica de dominio. Concordamos en aplicar Clean Architecture.
- Pruebas Unitarias: Algunos defendían TDD estricto, otros preferían pruebas de integración posteriores. No hubo consenso sobre TDD como estándar obligatorio.
- Manejo de Errores: Se debatieron enfoques de excepciones versus Result types. Concordamos en estandarizar el manejo en capas intermedias.

ENCUENTROS CONCEPTUALES
- Todos concordamos en que la mantenibilidad a largo plazo supera el beneficio de entregas apresuradas con deuda técnica.
- Hubo acuerdo unánime en que la inversión de dependencias facilita la realización de pruebas unitarias efectivas.
- El grupo concordó en que la arquitectura limpia previene que los cambios en frameworks externos afecten el núcleo de negocio.
- Todos estuvimos de acuerdo en que separar responsabilidades reduce drásticamente los errores colaterales en cambios futuros.
- Hubo consenso en que las interfaces bien definidas actúan como contratos claros entre diferentes módulos del sistema.
- El grupo reconoció que la documentación de decisiones arquitectónicas mediante ADRs agrega un valor indispensable.

DESENCUENTROS CONCEPTUALES
- Selección de persistencia relacional vs NoSQL: Postura relacional con ACID estricto mientras que otros preferían NoSQL por flexibilidad. No hubo consenso sobre una recomendación universal.
- Uso de ORM vs Queries nativos: Postura a favor de ORM por productividad mientras que otros defendían queries directos por control de rendimiento. No se llegó a acuerdo sobre un estándar único.
- Adopción de GraphQL vs REST: Postura por GraphQL para reducir over-fetching mientras otros preferían REST por simplicidad de caché. No hubo consenso sobre el protocolo idóneo.
- Gestión de Estado Global en Frontend: Postura de Context nativo mientras otros preferían stores externos centralizados. No se llegó a acuerdo sobre la biblioteca definitiva.
- Manejo de Migraciones automáticas: Postura a favor de migraciones en arranque mientras otros exigían scripts manuales en pipelines. No hubo consenso sobre la automatización completa.
- Cobertura mínima de código: Postura fijando 80% como umbral bloqueante mientras otros consideraban que las métricas rígidas desincentivan pruebas significativas. No se llegó a acuerdo sobre un número fijo.

METODOLOGÍA DE TRABAJO (CÓMO SE HIZO LA ACTIVIDAD COLABORATIVA)
Para realizar esta actividad colaborativa dividimos los temas entre los dos integrantes del grupo para investigar de manera individual. Posteriormente nos reunimos para compartir los hallazgos de cada uno y discutir los conceptos principales. Durante las discusiones identificamos puntos de acuerdo y desacuerdo sobre las tecnologías estudiadas. Luego trabajamos de forma conjunta en un documento compartido para integrar la información, definir conceptos clave y elaborar las conclusiones. Finalmente realizamos una revisión colaborativa del protocolo completo antes de la entrega.

CONCLUSIONES
Después de estudiar y discutir colaborativamente arquitectura de software, concluimos que la adopción de principios de diseño robustos y arquitecturas desacopladas es fundamental para la sostenibilidad de cualquier proyecto de software moderno. La práctica grupal permitió confrontar perspectivas teóricas con experiencias prácticas, fortaleciendo nuestra formación profesional en equipo. La aplicación de estos conceptos en entornos reales disminuye costos operativos y minimiza el riesgo de fallas sistémicas. El trabajo colaborativo demostró ser una herramienta invaluable para alcanzar consensos técnicos de alta calidad.

DISCUSIONES Y RECOMENDACIONES
Pregunta 1:
¿En qué escenarios resulta justificable tolerar deuda técnica arquitectónica a cambio de una mayor velocidad de comercialización?

Pregunta 2:
¿Cómo balancear el rigor en el desacoplamiento de capas con la complejidad cognitiva que esto introduce en desarrolladores junior?

BIBLIOGRAFÍA
1. Martin, R. C. (2017). Clean Architecture: A Craftsman's Guide to Software Structure and Design. Prentice Hall.
2. Evans, E. (2003). Domain-Driven Design: Tackling Complexity in the Heart of Software. Addison-Wesley.
`;
    }

    return `PROTOCOLO INDIVIDUAL - Programación Orientada a Objetos

DESCRIPCIÓN DEL TEXTO O ACTIVIDAD A REALIZAR
El presente protocolo individual aborda los fundamentos de la programación orientada a objetos y los principios SOLID. Se analiza su relevancia profesional y su relación directa con la formación de ingeniería de software. La actividad consiste en elaborar un protocolo individual donde demuestro mi comprensión de principios SOLID y POO.

PALABRAS CLAVE
encapsulamiento, herencia, polimorfismo, abstracción, acoplamiento, cohesión, modularidad, arquitectura.

OBJETIVOS DE LAS LECTURAS O ACTIVIDAD A REALIZAR
Objetivo General:
Comprender los principios fundamentales de la programación orientada a objetos mediante el análisis de casos de estudio.

Objetivos Específicos:
1. Analizar el impacto de la cohesión y el acoplamiento.
2. Implementar los principios SOLID en código TypeScript.
3. Evaluar estrategias de diseño modular.

CONCEPTOS CLAVE Y DEFINICIONES
Encapsulamiento: Ocultamiento del estado interno de un objeto permitiendo su manipulación únicamente a través de métodos públicos.
Herencia: Mecanismo que permite definir una clase a partir de otra existente.
Polimorfismo: Capacidad de objetos de distintas clases de responder a un mismo mensaje de forma diferente.
Abstracción: Proceso de representar las características esenciales de una entidad ignorando detalles accesorios.

RESUMEN DE LAS LECTURAS
A través del estudio de programación orientada a objetos, comprendí que no se trata solo de agrupar variables y métodos, sino de modelar el dominio de forma desacoplada y predecible. Sobre los principios de diseño, entendí que guían la evolución del software sin introducir regresiones. La separación de responsabilidades garantiza que cada módulo cumpla una única tarea clara. Finalmente, estas bases me permiten encarar arquitecturas limpias y escalables con solvencia profesional.

METODOLOGÍA DE TRABAJO (CÓMO REALICÉ LA ACTIVIDAD)
Investigué la bibliografía académica sobre diseño orientado a objetos, analicé ejemplos prácticos de refactorización de código, organicé los conceptos clave y reflexioné sobre su aplicación en proyectos contemporáneos.

CONCLUSIONES
Después de estudiar los principios de programación orientada a objetos, concluyo que su asimilación profunda es el pilar para construir sistemas robustos y testeables, permitiendo a los ingenieros de software entregar valor continuo sin degradar la calidad técnica con el paso del tiempo.

DISCUSIONES Y RECOMENDACIONES
Pregunta para discusión:
¿En qué medida el paradigma funcional complementa o reemplaza a la orientación a objetos en sistemas concurrentes modernos?

BIBLIOGRAFÍA
1. Gamma, E., Helm, R., Johnson, R., & Vlissides, J. (1994). Design Patterns: Elements of Reusable Object-Oriented Software. Addison-Wesley.
2. Fowler, M. (2018). Refactoring: Improving the Design of Existing Code. Addison-Wesley.
`;
  }
}
