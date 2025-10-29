# Nóminas Brutales

Sistema integral de nóminas pensado para equipos modernos que necesitan rapidez, claridad y control absoluto sobre cada percepción. Combina un backend robusto en Express + SQLite con una interfaz brutalmente simple que permite gestionar colaboradores, generar ciclos de nómina, ajustar movimientos y cerrar periodos con un solo clic.

## Características destacadas

- **Tablero ejecutivo en tiempo real** con métricas clave (colaboradores, nóminas en curso y cerradas, totales pagados y costo patronal).
- **Gestión completa de colaboradores**: nombre, puesto, salario, fecha de ingreso y datos bancarios.
- **Motor de nómina flexible** que soporta frecuencias mensual, quincenal, bisemanal y semanal, con configuración de impuestos, prestaciones y cargas patronales.
- **Movimientos editables por colaborador** (horas extra, bonos, deducciones, beneficios e impuestos) con recálculo instantáneo de netos y costos.
- **Cierre de nómina** con bloqueo de ediciones y registro de la fecha de procesamiento.
- **SQLite embebido** para fácil despliegue; basta con llevar la carpeta `data/` para mantener el histórico.

## Requisitos

- Node.js 18+
- npm 9+

## Instalación

```bash
npm install
```

### Cargar datos de ejemplo (opcional pero recomendado)

```bash
npm run seed
```

Este comando crea dos colaboradores reales y una nómina mensual en estado *draft* para que puedas explorar todo sin partir de cero.

## Ejecución en desarrollo

```bash
npm run dev
```

Esto levanta el servidor en `http://localhost:3000` con recarga automática vía `nodemon`.

## Ejecución en producción

```bash
npm start
```

## Cómo empezar (versión express)

1. Ejecuta `npm run seed` para precargar el entorno de demo o registra a tu primer colaborador desde **Gestión de talento**.
2. Genera un ciclo en **Motor de nóminas**, ajusta bonos/deducciones y guarda los cambios.
3. Desde la tarjeta de la nómina da clic en **Cerrar** para marcarla como procesada.
4. Consulta el tablero de **Inteligencia Operativa** para validar totales, netos y costo patronal.

Si te pierdes, en la interfaz hay un botón **¿Cómo empiezo?** que despliega esta misma guía y algunos tips adicionales.

## Estructura del proyecto

```
├── src/
│   ├── db.js          # Inicialización y migraciones ligeras de SQLite
│   └── server.js      # API Express con rutas para empleados, ciclos y dashboard
├── public/
│   ├── index.html     # Interfaz principal en español
│   ├── styles.css     # Estilos brutalmente modernos con glassmorphism
│   └── app.js         # Lógica de frontend, fetch de API y manejo de UI
├── data/              # Base de datos SQLite (ignorada por Git)
├── package.json
└── README.md
```

## API principal

| Método | Ruta                         | Descripción |
| ------ | ---------------------------- | ----------- |
| GET    | `/api/dashboard`             | Indicadores globales y últimos movimientos |
| GET    | `/api/employees`             | Lista de colaboradores |
| POST   | `/api/employees`             | Alta de colaborador |
| PUT    | `/api/employees/:id`         | Actualización de colaborador |
| DELETE | `/api/employees/:id`         | Elimina colaborador y movimientos asociados |
| GET    | `/api/cycles`                | Lista de nóminas con totales |
| POST   | `/api/cycles`                | Crea un ciclo de nómina con entradas iniciales |
| GET    | `/api/cycles/:id/entries`    | Detalle de movimientos de un ciclo |
| PUT    | `/api/entries/:id`           | Actualiza percepciones/deducciones de un colaborador |
| POST   | `/api/cycles/:id/process`    | Cierra una nómina y la marca como procesada |

## Persistencia

La base de datos se guarda en `data/payroll.db`. Para migrar información entre entornos basta con copiar ese archivo. Las tablas se crean automáticamente la primera vez que se levanta el servidor.

## Variables de entorno

- `PORT`: puerto de escucha del servidor (por defecto `3000`).

## Próximos pasos sugeridos

- Exportar recibos individuales en PDF.
- Integrar autenticación y roles.
- Enviar notificaciones por correo cuando se procese un ciclo.

Si necesitas personalizarlo o extenderlo, el código es 100% JavaScript y fácil de modificar. ¡Listo para romper con cualquier sistema de nómina aburrido!
