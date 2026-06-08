# Configuración de Base de Datos - Supabase

Este directorio contiene los scripts SQL necesarios para estructurar y poblar la base de datos de **Aura Skin Studio** en Supabase, y prepararla para que interactúe con el frontend y el agente de IA externo (n8n).

## Archivos Incluidos

1. **`schema.sql`**: Define las tablas (`services`, `professionals`, `clients`, `appointments`, `payments`, `business_settings`, `agent_logs`), triggers para la actualización automática del campo `updated_at`, y políticas simples de Row Level Security (RLS) para desarrollo/MVP.
2. **`seed.sql`**: Contiene un set de datos ficticios coherentes con el negocio (servicios, profesionales, clientes, turnos ocupados y disponibles, pagos y ajustes de configuración).

---

## Instrucciones Paso a Paso para la Configuración

### Paso 1: Crear el proyecto en Supabase
1. Ingresá a [Supabase](https://supabase.com/) e iniciá sesión.
2. Hacé clic en **New Project** y seleccioná tu organización.
3. Completá los datos del proyecto:
   - **Name**: `Aura Skin Studio`
   - **Database Password**: *Tu contraseña segura*
   - **Region**: Seleccioná la más cercana a tus usuarios (ej. `sa-east-1` para Sudamérica).
4. Esperá unos minutos a que la base de datos se inicialice.

### Paso 2: Ejecutar el Schema en el Editor SQL
1. Una vez creado el proyecto, andá al menú lateral izquierdo y seleccioná **SQL Editor**.
2. Hacé clic en **New query** (o "New blank query").
3. Copiá el contenido completo de [schema.sql](./schema.sql) y pegalo en el editor.
4. Hacé clic en el botón **Run** (o presiona `Ctrl + Enter` / `Cmd + Enter`).
5. Verificá que la salida confirme que las consultas se ejecutaron con éxito. Esto creará todas las tablas, relaciones, triggers y políticas RLS.

### Paso 3: Cargar los Datos de Prueba (Seed)
1. Abrí una nueva pestaña de consulta en el **SQL Editor** (**New query**).
2. Copiá el contenido completo de [seed.sql](./seed.sql) y pegalo en el editor.
3. Hacé clic en **Run**.
4. Ahora, tu base de datos tendrá servicios, profesionales, clientes, turnos y configuraciones de prueba cargadas correctamente.

### Paso 4: Obtener las Credenciales de Conexión
1. Dirigite a **Project Settings** (el icono de engranaje abajo en el menú lateral).
2. Seleccioná la sección **API**.
3. Copiá los siguientes valores:
   - **Project API keys** -> `anon` `public` (Esta es tu `VITE_SUPABASE_ANON_KEY`).
   - **Project URL** (Esta es tu `VITE_SUPABASE_URL`, ej: `https://xxxx.supabase.co`).
4. Pegá estos valores en tu archivo `.env` en la raíz de la web app.

---

## Seguridad y Row Level Security (RLS)

> [!WARNING]
> Las políticas RLS creadas en `schema.sql` permiten el acceso público para la demo. 
> 
> - **services, professionals, business_settings**: Lectura pública sin restricciones para que la web app cargue los datos estáticos directamente.
> - **appointments**: Lectura y modificación pública. Esto permite que cualquier usuario no autenticado reserve turnos directamente.
> - **clients, agent_logs**: Lectura y escritura pública para registrar nuevos clientes durante la reserva y guardar los registros de interacciones del agente de IA.
> 
> **Para producción:**
> Se debe restringir la edición de servicios, profesionales y configuraciones únicamente a usuarios autenticados con rol de administrador (usando Supabase Auth). El frontend deberá consumir los turnos a través de funciones PostgreSQL seguras o endpoints de backend autenticados.
