# Guía de Integración para Agente de IA (n8n & Supabase)

Esta guía documenta cómo un agente de IA externo (por ejemplo, implementado en n8n) debe interactuar con la base de datos de **Aura Skin Studio** y coordinarse con el chat flotante de la web app.

---

## Arquitectura de Conexión

Existen dos opciones para conectar el agente de IA:

### OPCIÓN A (Recomendada y Prioritaria)
**Conexión directa del agente a Supabase:** n8n se conecta directamente a la base de datos PostgreSQL de Supabase utilizando nodos oficiales de Supabase o Postgres. Esto permite consultar y actualizar datos en tiempo real de forma ultra-rápida.

### OPCIÓN B
**Conexión a través de Endpoints:** El agente llama a endpoints HTTP o rutas de API que la aplicación exponga en el servidor (para expansiones futuras).

---

## 1. Operaciones Base de Datos para el Agente (Opción A)

El agente de n8n debe ejecutar las siguientes consultas y mutaciones utilizando credenciales seguras de Supabase.

### 1.1 Consultar Servicios Activos
El agente debe consultar los servicios disponibles para responder sobre tratamientos y precios.
*   **Tabla:** `services`
*   **Filtro SQL:** `active = true`
*   **Orden:** `sort_order ASC`
*   **Acción:** Obtener columnas `id`, `name`, `description`, `duration_minutes`, `price`, `category`.

### 1.2 Consultar Disponibilidad de Turnos
Cuando un cliente consulta horarios libres.
*   **Tabla:** `appointments`
*   **Filtros obligatorios:** 
    *   `status = 'Disponible'`
    *   `appointment_date >= CURRENT_DATE`
*   **Filtros opcionales (para acotar búsqueda):**
    *   `service_id = {uuid_servicio}`
    *   `professional_id = {uuid_profesional}`
    *   `appointment_date = {fecha_seleccionada}`
*   **Orden:** `appointment_date ASC`, `appointment_time ASC`
*   **Límite recomendado:** Ofrecer como máximo 3 opciones de horarios al usuario.

### 1.3 Reservar Turno
Para realizar la reserva, el agente de IA debe seguir este orden transaccional:
1.  **Verificación previa:** Consultar la tabla `appointments` por el `id` del turno seleccionado y verificar que `status = 'Disponible'`. Si no lo está, debe notificar al cliente que ya no está disponible.
2.  **Buscar/Crear Cliente:** Buscar en la tabla `clients` si existe un cliente registrado con el número de teléfono del usuario (`phone`).
    *   Si existe: Obtener su `id`. Opcionalmente incrementar su `visit_count` en 1 y actualizar `status = 'Activo'`.
    *   Si no existe: Insertar un nuevo cliente en la tabla `clients` con los datos recopilados (`full_name`, `phone`, `email` opcional, `status = 'Nuevo'`) y obtener su `id` generado.
3.  **Actualizar el Turno:** Modificar la fila correspondiente en `appointments`:
    *   `client_id = {uuid_cliente}`
    *   `customer_name = {nombre_cliente}`
    *   `customer_phone = {telefono_cliente}`
    *   `customer_email = {email_cliente || null}`
    *   `status = 'Pendiente'`
    *   `notes = {comentarios_adicionales_del_chat}`
4.  **Registrar Pago Pendiente (Opcional pero recomendado):** Insertar en `payments`:
    *   `appointment_id = {uuid_turno}`
    *   `client_id = {uuid_cliente}`
    *   `concept = {nombre_del_servicio}`
    *   `amount = {precio_del_servicio}`
    *   `status = 'Pendiente'`

### 1.4 Confirmar Turno
Cuando el centro valida el turno (hecho por el administrador desde el panel o a través de flujo n8n).
*   **Tabla:** `appointments`
*   **Acción:** Actualizar `status = 'Confirmado'` filtrando por `id` del turno.

### 1.5 Cancelar Turno
Cuando un cliente solicita cancelar o no asiste.
*   **Tabla:** `appointments`
*   **Acción:** Actualizar `status = 'Cancelado'` filtrando por `id` del turno.

### 1.6 Consultar Detalle de un Turno
Para consultas de confirmación de agenda.
*   **Consulta:** Select con Joins de `appointments` con `services` y `professionals` usando el `id` del turno.

### 1.7 Registrar Interacciones del Agente (Auditoría de IA)
Cada vez que el agente de IA responde a un cliente, debe guardar un registro de la interacción.
*   **Tabla:** `agent_logs`
*   **Valores a insertar:**
    *   `session_id`: ID de sesión único del chat.
    *   `user_message`: Mensaje escrito por el usuario.
    *   `assistant_reply`: Respuesta dada por el agente.
    *   `intent`: Intención detectada (ej: `consulta_servicios`, `consulta_disponibilidad`, `reserva_turno`, `actualizacion_estado`, `otro`).
    *   `success`: `true` si se completó la operación pedida, `false` de lo contrario.
    *   `metadata`: Objeto JSON con detalles técnicos (ej: ID de turno reservado, IDs de servicios recomendados, etc.).

---

## 2. Prompt del Sistema para el Agente (n8n / OpenAI)

Copia y pega este prompt de sistema en tu configuración de agente conversacional (nodo AI Agent en n8n):

```text
Sos el asistente virtual de Aura Skin Studio, un centro de estética y dermocosmética. Tu función es responder consultas sobre servicios, precios, disponibilidad y turnos.

Reglas obligatorias:
- Respondé siempre en español rioplatense, con tono profesional, amable y claro (usa "vos", tildes rioplatenses como "mirá", "reservá", "contame").
- No inventes servicios, precios, horarios ni disponibilidad.
- Para servicios, consultá la tabla services.
- Para disponibilidad, consultá la tabla appointments con status Disponible.
- Para reservar, primero verificá que el turno siga Disponible.
- Antes de reservar, asegurate de tener nombre completo, teléfono, servicio deseado y turno elegido.
- Si falta información, pedila de forma simple.
- Si el cliente pide disponibilidad, ofrecé hasta 3 opciones concretas.
- Si el cliente confirma una opción, reservá el turno antes de decir que quedó registrado.
- Al reservar, dejá el turno en estado Pendiente.
- No proceses pagos.
- No pidas datos de tarjeta.
- No envíes links de pago.
- Si una operación falla, explicá el problema sin inventar confirmaciones.
- Mantené respuestas cortas, útiles y orientadas a resolver.
```

---

## 3. Seguridad y Manejo de Claves

> [!CAUTION]
> **Políticas de Uso de API Keys:**
> 1.  **VITE_SUPABASE_ANON_KEY (React Frontend):** Esta clave pública anónima es segura para exponerse en el navegador web del frontend de React. Solo permite acciones definidas en las políticas Row Level Security (RLS) que creamos para lectura y inserciones limitadas de demostración.
> 2.  **SUPABASE_SERVICE_ROLE_KEY (n8n / Backend):** Esta clave otorga bypass total a todas las políticas RLS. **NUNCA la expongas en el frontend React** (no la agregues en archivos `.env` del cliente y no la subas a GitHub). Solo debe configurarse de manera privada y segura dentro de n8n o tu servidor backend para permitir que el agente interactúe plenamente con la base de datos.
> 3.  **Producción:** Para entornos de producción comercial, implementá autenticación real de Supabase Auth en el frontend, y restringe el acceso de escritura en las tablas `appointments` y `clients` usando políticas basadas en roles o mediante funciones Postgres en el backend.

---

## 4. Importar Plantilla de Workflow en n8n

Hemos provisto el archivo [n8n_agent_workflow.json](file:///C:/Users/alejo%20calderon/Desktop/nuevo/aura-skin-studio/n8n_agent_workflow.json) en la raíz del proyecto. Este archivo contiene un flujo de n8n v1 completo listo para importar, el cual incluye:
1.  **Webhook Trigger:** Escucha las peticiones POST de la webapp con `message` y `sessionId`.
2.  **AI Agent (Langchain):** Agente conversacional avanzado configurado con el System Prompt correspondiente.
3.  **OpenAI Chat Model:** Modelo de lenguaje configurado (`gpt-4o-mini`). Requiere configurar tus credenciales de OpenAI en n8n.
4.  **Memory (Window Buffer Memory):** Retiene el contexto de la sesión de chat basándose en `sessionId`.
5.  **Herramientas Personalizadas de JavaScript (Custom Code Tools):**
    *   `consultar_servicios`: Consulta directamente tratamientos activos de la base de datos Supabase usando su REST API.
    *   `consultar_disponibilidad`: Consulta turnos disponibles a partir del día de hoy.
    *   `reservar_turno`: Ejecuta la lógica transaccional de reserva (buscar/crear cliente, asignar ID del cliente, marcar el turno como `Pendiente` y registrar un pago pendiente).
6.  **Write Agent Logs (HTTP Request):** Registra cada respuesta y mensaje en la tabla `agent_logs` de Supabase para auditoría.
7.  **Respond to Webhook:** Envía la respuesta formateada con `reply`, `intent` y `success` de vuelta a la webapp.

### Cómo Importarlo en n8n:
1.  Entrá a tu instancia de n8n y crea un flujo vacío (**New workflow**).
2.  Hacé clic en los tres puntos de la esquina superior derecha y seleccioná **Import from file...**.
3.  Seleccioná el archivo `n8n_agent_workflow.json` ubicado en la raíz de tu proyecto.
4.  Configurá las credenciales en n8n:
    *   **OpenAI Credential:** Vinculá tu API Key de OpenAI en el nodo `OpenAI Chat Model`.
5.  Configurá las variables de entorno en el entorno donde corre n8n (o dentro del apartado de variables en n8n):
    *   `VITE_SUPABASE_URL`: La URL de tu proyecto Supabase (ej: `https://xxxx.supabase.co`).
    *   `VITE_SUPABASE_ANON_KEY`: Tu clave pública `anon` de Supabase.
    *   `SUPABASE_SERVICE_ROLE_KEY`: Tu clave privada `service_role` de Supabase (requerida por la herramienta de reserva para registrar clientes y pagos).
6.  Activá el flujo (**Active**) en la esquina superior derecha para habilitar el webhook de producción.
7.  Copia la URL del Webhook de producción y colócala en tu archivo `.env` del frontend en la clave `VITE_N8N_WEBHOOK_URL`.
