This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# 🎫 TicketAgil – Copilot de soporte al cliente con IA

Copilot de soporte que te ayuda a **resumir tickets**, **clasificarlos** y **sugerir respuestas** usando IA,
con un dashboard sencillo para ver el estado del soporte.

Construido con:

- **Next.js (App Router)**
- **TypeScript**
- **Tailwind CSS**
- **Supabase (Auth + DB + RLS)**
- **Groq (LLMs gratis)**

---

## ✨ Demo

> _Aquí pon un GIF o screenshots cuando puedas_

- Pantalla de login / registro
- Importar CSV de tickets
- Dashboard de soporte (totales, status, etc.)
- Lista de tickets con batch IA
- Vista de ticket con:
  - resumen IA
  - clasificación (category + severity)
  - respuesta sugerida
  - tickets similares
- Settings con tono + políticas

---

## 🧠 ¿Qué problema resuelve?

Equipos de soporte se encuentran con:

- Tickets largos que cuesta leer.
- Muchas preguntas repetidas.
- Agentes nuevos que no conocen bien el producto.
- Falta de visibilidad rápida de:
  - cuántos tickets hay abiertos/cerrados,
  - qué temas son más frecuentes,
  - qué severidad tienen los problemas.

**TicketSense** permite:

- Ver rápido de qué trata un ticket (resumen IA).
- Entender categoría y severidad.
- Obtener una respuesta sugerida con el tono de la empresa.
- Ver otros tickets similares para copiar/aprender.

---

## 🧩 Features principales

### Autenticación

- Registro, login y reset de contraseña con **Supabase Auth**.
- Layout de auth separado, con diseño tipo SaaS.
- Layout protegido para la app (`(app)`), redirigiendo a `/login` si no hay sesión.

### Importar tickets desde CSV

- Pantalla `/import` para subir un `.csv` con columnas:

  ```text
  id, subject, description, status, created_at, updated_at, customer_name (opcional)
  ```

- Valida columnas requeridas.
- Inserta los tickets para el `user_id` actual.
- Muestra cuántos registros se importaron.

### Dashboard de soporte (`/dashboard`)

- KPIs básicos:
  - Total de tickets
  - Abiertos
  - Pendientes
  - Cerrados
- Gráficos (según los datos):
  - Tickets por estado
  - Tickets creados por día
- Tabla de últimos tickets.

### Lista de tickets (`/tickets`)

- Tabla con:
  - asunto
  - estado
  - fecha de creación
  - indicadores IA (resumen / clasificación / respuesta sugerida)
- Filtros por estado.
- Ordenar por fecha / asunto.
- Batch actions:
  - aplicar resumen IA a varios
  - clasificar varios
  - sugerir respuesta a varios
  - cambiar estado
  - eliminar tickets seleccionados

### Vista de ticket (`/tickets/[id]`)

- Muestra:
  - Asunto, descripción completa
  - Cliente, estado, fechas
- Panel de IA con 3 acciones:
  - **Resumir ticket**
  - **Clasificar ticket** (category + severity)
  - **Sugerir respuesta**

- Panel IA muestra:
  - Resumen generado
  - Tags de categoría / severidad
  - Textarea con respuesta sugerida editable
  - Créditos IA restantes

### Tickets similares

- Endpoint `/api/tickets/[id]/similar`
- Calcula similitud de texto (subject + description) con otros tickets del mismo usuario.
- Muestra los 5 más parecidos en la vista de ticket.

### Settings con tono + políticas (`/settings`)

- Tabla `user_settings` con:
  - `company_name`
  - `default_tone` (neutral, formal, friendly, technical, brief, detailed)
  - `language` (es/en)
  - `reply_guidelines` (máximo 1000 caracteres)
- La acción de **“Sugerir respuesta”**:
  - Usa estos settings para construir el `system prompt`.
  - Mantiene el tono y respeta políticas de la empresa.

### IA + créditos con Groq

- Uso de **Groq** (modelos LLaMA) en modo gratis:
  - `llama-3.1-8b-instant` para las respuestas sugeridas (configurable).
- Tabla `ia_usage`:
  - `user_id`
  - `window_start` (fecha)
  - `used_credits`
- Límite diario de IA configurable:
  - Ejemplo: `DAILY_LIMIT = 50`
  - Cada acción IA consume ciertos créditos (`COST_SUMMARY`, `COST_CLASSIFY`, `COST_SUGGEST_REPLY`).

---

## 🏗️ Stack técnico

- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS
- **Backend**: API Routes de Next.js
- **Auth & DB**: Supabase
- **IA**: Groq SDK
- **Infra**: Vercel

---

## 🗄️ Modelo de datos

```sql
-- Tabla tickets
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  user_id uuid references auth.users(id) on delete cascade,
  subject text not null,
  description text not null,
  status text not null check (status in ('open', 'pending', 'closed')),
  customer_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  closed_at timestamptz
);

-- Tabla ticket_insights
create table if not exists public.ticket_insights (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.tickets(id) on delete cascade,
  summary text,
  category text check (category in ('bug', 'payment', 'account', 'question', 'other')),
  severity text check (severity in ('low', 'medium', 'high')),
  suggested_reply text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabla ia_usage (créditos IA)
create table if not exists public.ia_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  window_start date not null,
  used_credits integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists ia_usage_user_window_idx
  on public.ia_usage(user_id, window_start);

-- Tabla user_settings
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text,
  default_tone text,
  language text,
  reply_guidelines text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists user_settings_user_id_idx
  on public.user_settings(user_id);
```

---

## 🔐 Seguridad (RLS)

Todas las tablas principales tienen **Row Level Security** activado:

- `tickets`: cada usuario solo ve / modifica sus propios tickets.
- `ticket_insights`: solo insights de tickets propios.
- `ia_usage`: solo sus propios créditos.
- `user_settings`: solo su propia configuración.


## 👤 Autor

Hecho por **Kevin Rivera (@kevinorlandorivera0)**  

---

## 📝 Roadmap (ideas futuras)

- Embeddings reales para similitud de tickets.
- Integración con Zendesk / Intercom.
- Webhooks / colas para procesar tickets grandes.
- Roles (admin vs agente).
- Evaluar calidad de respuestas IA con feedback del agente.
