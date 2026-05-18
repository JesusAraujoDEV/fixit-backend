# FixHub — Guía Completa de Integración Frontend

> Última actualización: 18 de mayo 2025
> Stack: Express + Sequelize + Socket.io + ImgBB (TypeScript)
> Base de datos: PostgreSQL (schema `fixit`, Haversine — sin PostGIS)
> Swagger UI: `http://localhost:3000/api-docs`

---

## 1. Configuración de Clientes

### REST (Axios / Fetch)

```ts
// src/lib/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: { "Content-Type": "application/json" },
});

// Interceptor para inyectar JWT automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("fixit_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### WebSocket (Socket.io Client)

```ts
// src/lib/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  socket = io("http://localhost:3000", {
    path: "/ws",
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    reconnectionAttempts: Infinity,
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
```

---

## 2. Endpoints por Rol — Payloads y Responses

---

### AUTH — Sesión y Login

#### `POST /api/auth/login`

**Request:**
```json
{
  "email": "maria.prebo@gmail.com",
  "password": "Cliente1!"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImExYjJjM2Q0Li4uIiwicm9sZSI6ImNsaWVudCIsImlhdCI6MTcxNjA0ODAwMCwiZXhwIjoxNzE2MTM0NDAwfQ.signature",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "maria.prebo@gmail.com",
    "role": "client",
    "full_name": "María González",
    "phone": "+58 412 7451234",
    "avatar_url": "https://i.pravatar.cc/150?u=maria",
    "created_at": "2025-05-18T10:00:00.000Z",
    "updated_at": "2025-05-18T10:00:00.000Z"
  }
}
```

**Uso en SessionProvider:**
```ts
const { data } = await api.post("/auth/login", { email, password });
localStorage.setItem("fixit_token", data.token);
setUser(data.user); // { id, email, role, full_name, phone, avatar_url }
```

---

#### `GET /api/auth/me`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "maria.prebo@gmail.com",
    "role": "client",
    "full_name": "María González",
    "phone": "+58 412 7451234",
    "avatar_url": "https://i.pravatar.cc/150?u=maria",
    "created_at": "2025-05-18T10:00:00.000Z",
    "updated_at": "2025-05-18T10:00:00.000Z"
  }
}
```

**Errores:**
| Status | Code | Cuándo |
|--------|------|--------|
| 401 | `unauthorized` | Sin header Authorization |
| 401 | `token_expired` | JWT expirado (24h) |
| 401 | `token_invalid` | JWT malformado |

---

### MAP & GEO (Haversine)

#### `GET /api/map/technicians`

Retorna técnicos online dentro del radio. Para pintar markers en Leaflet.

**Query Params:**
```
GET /api/map/technicians?lat=10.1910&lng=-68.0130&radius_km=10
```

| Param | Tipo | Rango |
|-------|------|-------|
| `lat` | number | -90 a 90 |
| `lng` | number | -180 a 180 |
| `radius_km` | number | 0.1 a 100 |

**Response (200):**
```json
{
  "technicians": [
    {
      "id": "profile-uuid-1",
      "user_id": "user-uuid-1",
      "full_name": "Luis Hernández",
      "rating_average": 4.50,
      "is_verified": true,
      "latitude": 10.1897,
      "longitude": -68.0150,
      "distance_km": 0.32
    },
    {
      "id": "profile-uuid-2",
      "user_id": "user-uuid-2",
      "full_name": "Pedro Ramírez",
      "rating_average": 4.75,
      "is_verified": true,
      "latitude": 10.2333,
      "longitude": -67.9578,
      "distance_km": 7.42
    }
  ]
}
```

**Leaflet:**
```tsx
const { data } = await api.get("/map/technicians", {
  params: { lat: userLat, lng: userLng, radius_km: 10 }
});

data.technicians.forEach((tech) => {
  L.marker([tech.latitude, tech.longitude])
    .addTo(map)
    .bindPopup(`${tech.full_name} ⭐${tech.rating_average} — ${tech.distance_km}km`);
});
```

---

#### `GET /api/map/requests`

Retorna solicitudes pendientes como markers. Solo rol `client`.

**Query Params:** Mismos que `/technicians` (`lat`, `lng`, `radius_km`)

**Response (200):**
```json
[
  {
    "id": "request-uuid-1",
    "position": [10.1910, -68.0130],
    "label": "Se fue la luz en toda la casa",
    "type": "request",
    "category": "electrical"
  },
  {
    "id": "request-uuid-2",
    "position": [10.2100, -67.9950],
    "label": "Fuga de agua debajo del fregadero",
    "type": "request",
    "category": "plumbing"
  }
]
```

---

#### `GET /api/map/heatmap`

Zonas de demanda para técnicos y admins. Roles: `technician`, `admin`.

**Response (200):**
```json
[
  {
    "id": "zone_0",
    "center": [10.19, -68.01],
    "radius_m": 500,
    "intensity": 1.0,
    "label": "3 solicitudes"
  },
  {
    "id": "zone_1",
    "center": [10.21, -67.99],
    "radius_m": 500,
    "intensity": 0.33,
    "label": "1 solicitudes"
  }
]
```

---

### REQUESTS & UPLOAD

#### `POST /api/upload/image` (Subir foto a ImgBB)

**Content-Type:** `multipart/form-data`

```ts
const formData = new FormData();
formData.append("image", fileFromInput);

const { data } = await api.post("/upload/image", formData);
// data.url → "https://i.ibb.co/abc123/foto.jpg"
```

**Response (200):**
```json
{
  "url": "https://i.ibb.co/abc123/foto.jpg",
  "display_url": "https://i.ibb.co/abc123/foto.jpg",
  "thumbnail_url": "https://i.ibb.co/abc123t/foto.jpg",
  "delete_url": "https://ibb.co/delete/abc123/xyz",
  "size": 245000,
  "width": 1200,
  "height": 800,
  "title": "foto",
  "expiration": null
}
```

---

#### `POST /api/requests` (Crear ticket)

Rol: `client`. Usa las URLs obtenidas del endpoint de upload.

**Request:**
```json
{
  "title": "Se fue la luz en toda la casa",
  "description": "Los breakers están arriba pero no llega corriente.",
  "category": "electrical",
  "images": [
    "https://i.ibb.co/abc123/foto1.jpg",
    "https://i.ibb.co/def456/foto2.jpg"
  ],
  "latitude": 10.1910,
  "longitude": -68.0130
}
```

| Campo | Tipo | Validación |
|-------|------|------------|
| `title` | string | 5–200 chars, requerido |
| `description` | string | Opcional (default: "") |
| `category` | string | `plumbing`, `electrical`, `carpentry`, `painting`, `appliance_repair`, `locksmith`, `cleaning`, `hvac`, `general` |
| `images` | string[] | Máx 4 URLs, opcional |
| `latitude` | number | -90 a 90, requerido |
| `longitude` | number | -180 a 180, requerido |

**Response (201):**
```json
{
  "id": "generated-uuid",
  "status": "pending",
  "created_at": "2025-05-18T14:30:00.000Z",
  "nearby_technicians_count": 3,
  "estimated_response_min": 5
}
```

---

#### `GET /api/requests/mine` (Historial del cliente)

**Query Params opcionales:** `status=active|completed|cancelled`

**Response (200):**
```json
[
  {
    "id": "uuid-1",
    "title": "Se fue la luz en toda la casa",
    "category": "electrical",
    "status": "active",
    "technician": { "name": "Pedro Ramírez" },
    "created_at": "2025-05-18T14:30:00.000Z",
    "price": null,
    "eta_minutes": 8
  },
  {
    "id": "uuid-2",
    "title": "Fuga de agua",
    "category": "plumbing",
    "status": "completed",
    "technician": { "name": "Luis Hernández" },
    "created_at": "2025-05-17T09:00:00.000Z",
    "price": "$35.00"
  }
]
```

---

#### `POST /api/ai/diagnose` (Diagnóstico IA)

**Content-Type:** `multipart/form-data`

```ts
const formData = new FormData();
formData.append("image", photoFile);

const { data } = await api.post("/ai/diagnose", formData);
```

**Response (200):**
```json
{
  "diagnosis": "Posible cortocircuito en el panel eléctrico. Se observan marcas de quemadura.",
  "confidence": 0.87,
  "suggested_category": "electrical",
  "tags": ["cortocircuito", "panel eléctrico", "quemadura", "urgente"]
}
```

---

### JOBS (Técnico)

#### `GET /api/jobs/available`

**Query Params:** `lat`, `lng`, `category` (opcional)

**Response (200):**
```json
[
  {
    "id": "uuid-1",
    "category": "electrical",
    "title": "Se fue la luz en toda la casa",
    "distance_km": 2.3,
    "expires_in_min": 45,
    "payout": "$15–50",
    "urgent": false
  },
  {
    "id": "uuid-2",
    "category": "plumbing",
    "title": "Fuga de agua debajo del fregadero",
    "distance_km": 0.8,
    "expires_in_min": 12,
    "payout": "$15–50",
    "urgent": true
  }
]
```

---

#### `GET /api/jobs/completed`

**Query Params opcionales:** `date_from`, `date_to` (ISO-8601)

**Response (200):**
```json
[
  {
    "id": "uuid-1",
    "title": "Instalación de tomacorrientes",
    "earnings": "$45.00",
    "rating": 5,
    "completed_at": "2025-05-17T16:00:00.000Z"
  }
]
```

---

### TECHNICIAN

#### `PATCH /api/technician/availability`

**Request:**
```json
{
  "online": true,
  "lat": 10.2333,
  "lng": -67.9578
}
```

**Response (200):**
```json
{
  "online": true,
  "updated_at": "2025-05-18T14:00:00.000Z"
}
```

> Nota: `lat` y `lng` son requeridos cuando `online=true`. Al pasar `online=false`, la ubicación se limpia automáticamente.

---

### ADMIN

#### `GET /api/admin/kpis`

**Response (200):**
```json
{
  "active_services": { "value": 12, "delta": "+3" },
  "technicians_online": { "value": 8, "delta": "+0" },
  "revenue_today": { "value": "$1,250.00", "delta": "+0%" },
  "reports_pending": { "value": 2, "delta": "0" }
}
```

---

#### `GET /api/admin/transactions`

**Query Params:** `page`, `per_page`, `status`, `date_from`, `date_to`

**Response (200):**
```json
{
  "data": [
    {
      "id": "txn-uuid-1",
      "client": "María González",
      "technician": "Pedro Ramírez",
      "service": "Se fue la luz en toda la casa",
      "amount": "$45.00",
      "commission": "$4.50",
      "status": "paid",
      "created_at": "2025-05-18T15:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 20
}
```

---

#### `GET /api/admin/transactions/summary`

**Response (200):**
```json
{
  "today_count": 5,
  "today_volume": "$320.00",
  "today_commission": "$32.00",
  "disputes_pending": 1
}
```

---

#### `GET /api/admin/events` (Log de Plataforma)

**Query Params:** `limit` (default 50), `type` (info|success|warning|error)

**Response (200):**
```json
[
  {
    "id": "evt-uuid-1",
    "time": "2025-05-18T14:35:00.000Z",
    "type": "success",
    "message": "Técnico verificado: user-uuid-123"
  },
  {
    "id": "evt-uuid-2",
    "time": "2025-05-18T14:30:00.000Z",
    "type": "info",
    "message": "Nueva solicitud de servicio creada en Prebo"
  }
]
```

---

#### `GET /api/admin/verifications`

**Query Params:** `status` (pending|approved|rejected)

**Response (200):**
```json
[
  {
    "id": "ver-uuid-1",
    "name": "Pedro Ramírez",
    "specialty": "Electricista",
    "experience": "8 años",
    "documents_count": 3,
    "status": "pending",
    "submitted_at": "2025-05-18T10:00:00.000Z"
  }
]
```

---

#### `PATCH /api/admin/verifications/:id`

**Request:**
```json
{
  "action": "approve"
}
```

O para rechazar:
```json
{
  "action": "reject",
  "reason": "Documentos ilegibles, por favor re-subir"
}
```

**Response (200):**
```json
{
  "id": "ver-uuid-1",
  "status": "approved",
  "reviewed_at": "2025-05-18T15:00:00.000Z"
}
```

---

#### `GET /api/admin/performance/weekly`

**Response (200):**
```json
{
  "days": [
    { "label": "Lun", "completed": 12, "date": "2025-05-12" },
    { "label": "Mar", "completed": 8, "date": "2025-05-13" },
    { "label": "Mié", "completed": 15, "date": "2025-05-14" },
    { "label": "Jue", "completed": 10, "date": "2025-05-15" },
    { "label": "Vie", "completed": 20, "date": "2025-05-16" },
    { "label": "Sáb", "completed": 6, "date": "2025-05-17" },
    { "label": "Dom", "completed": 3, "date": "2025-05-18" }
  ]
}
```

---

## 3. Eventos en Tiempo Real (Socket.io)

### Conexión

Al conectar exitosamente, el servidor emite:

**Evento:** `connection:established`
```json
{
  "session_id": "socket-id-abc123",
  "user_id": "a1b2c3d4-...",
  "role": "client",
  "joined_rooms": ["clients", "user:a1b2c3d4-..."]
}
```

---

### Heartbeat

El servidor envía `ping` cada 25s. Responder con `pong`:

```ts
socket.on("ping", () => socket.emit("pong"));
```

---

### Flujo: Radar de Búsqueda (Cliente)

| Paso | Dirección | Evento | Payload |
|------|-----------|--------|---------|
| 1 | Cliente → Server | `search:start` | `{ request_id: "uuid" }` |
| 2 | Server → Cliente | `search:ack` | `{ search_id, request_id, status: "searching" }` |
| 3a | Server → Cliente | `search:timeout` | `{ search_id }` (si nadie acepta en 30s) |
| 3b | Cliente → Server | `search:cancel` | `{ search_id }` (cancelar manualmente) |

```ts
// Iniciar búsqueda
socket.emit("search:start", { request_id: ticketId });

// Escuchar confirmación
socket.on("search:ack", (data) => {
  setSearchId(data.search_id);
  setStatus("searching");
});

// Timeout (nadie aceptó)
socket.on("search:timeout", (data) => {
  setStatus("timeout");
  showNotification("No se encontró técnico disponible");
});
```

---

### Flujo: Alerta de Misión (Técnico)

| Paso | Dirección | Evento | Payload |
|------|-----------|--------|---------|
| 1 | Server → Técnico | `mission:offer` | Ver abajo |
| 2a | Técnico → Server | `mission:accept` | `{ mission_id }` |
| 2b | Técnico → Server | `mission:reject` | `{ mission_id }` |
| 3a | Server → Técnico | `mission:confirmed` | `{ mission_id, status: "confirmed" }` |
| 3b | Server → Técnico | `mission:expired` | `{ mission_id }` |

**Payload de `mission:offer`:**
```json
{
  "mission_id": "mission_1716048000000",
  "search_id": "search_1716048000000_user-uuid",
  "request_id": "uuid-del-ticket",
  "client_id": "uuid-del-cliente",
  "expires_in_seconds": 30
}
```

```ts
// Escuchar ofertas de misión
socket.on("mission:offer", (data) => {
  showMissionAlert(data);
  startCountdown(data.expires_in_seconds); // 30 segundos
});

// Aceptar
socket.emit("mission:accept", { mission_id: data.mission_id });

// Rechazar
socket.emit("mission:reject", { mission_id: data.mission_id });
```

---

### Flujo: Tracking en Vivo (Ubicación del Técnico)

| Paso | Dirección | Evento | Payload |
|------|-----------|--------|---------|
| 1 | Técnico → Server | `location:update` | `{ lat, lng }` |
| 2 | Server → Admin/Cliente | `tracking:update` | Ver abajo |

**Técnico emite su posición periódicamente:**
```ts
// Cada 5 segundos mientras está en misión
setInterval(() => {
  navigator.geolocation.getCurrentPosition((pos) => {
    socket.emit("location:update", {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    });
  });
}, 5000);
```

**Cliente/Admin recibe actualizaciones:**
```json
{
  "technician_id": "uuid-del-tecnico",
  "latitude": 10.1950,
  "longitude": -68.0100,
  "timestamp": "2025-05-18T14:35:22.000Z"
}
```

```ts
// Actualizar marker del técnico en Leaflet
socket.on("tracking:update", (data) => {
  techMarker.setLatLng([data.latitude, data.longitude]);
  updateETA(data);
});
```

---

## 4. Tabla Resumen de Endpoints (20 total)

| # | Método | Ruta | Rol | Descripción |
|---|--------|------|-----|-------------|
| 1 | POST | `/api/auth/login` | Público | Login → JWT + user |
| 2 | GET | `/api/auth/me` | Any | Sesión actual |
| 3 | GET | `/api/map/technicians` | Any | Técnicos cercanos |
| 4 | GET | `/api/map/requests` | Client | Markers de solicitudes |
| 5 | GET | `/api/map/heatmap` | Tech, Admin | Zonas de demanda |
| 6 | POST | `/api/requests` | Client | Crear ticket |
| 7 | GET | `/api/requests/mine` | Client | Historial del cliente |
| 8 | GET | `/api/jobs/available` | Technician | Jobs disponibles |
| 9 | GET | `/api/jobs/completed` | Technician | Jobs completados |
| 10 | PATCH | `/api/technician/availability` | Technician | Toggle online/offline |
| 11 | GET | `/api/admin/transactions` | Admin | Transacciones paginadas |
| 12 | GET | `/api/admin/transactions/summary` | Admin | Resumen del día |
| 13 | GET | `/api/admin/verifications` | Admin | Verificaciones |
| 14 | PATCH | `/api/admin/verifications/:id` | Admin | Aprobar/rechazar |
| 15 | GET | `/api/admin/events` | Admin | Log de eventos |
| 16 | GET | `/api/admin/kpis` | Admin | KPIs dashboard |
| 17 | GET | `/api/admin/performance/weekly` | Admin | Performance 7 días |
| 18 | POST | `/api/ai/diagnose` | Client | Diagnóstico IA |
| 19 | POST | `/api/upload/image` | Any | Subir imagen → ImgBB |
| 20 | POST | `/api/upload/image-url` | Any | Subir desde URL → ImgBB |

---

## 5. Credenciales de Prueba (Seeder)

| Email | Password | Rol |
|-------|----------|-----|
| `admin@fixit.com` | `Admin123!` | admin |
| `maria.prebo@gmail.com` | `Cliente1!` | client |
| `jose.sambil@gmail.com` | `Cliente2!` | client |
| `pedro.electricista@gmail.com` | `Tecnico1!` | technician |
| `luis.plomero@gmail.com` | `Tecnico2!` | technician |
| `andres.lineablanca@gmail.com` | `Tecnico3!` | technician |

---

## 6. Códigos de Error Globales

| Code | HTTP | Significado |
|------|------|-------------|
| `invalid_params` | 400 | Parámetros faltantes o inválidos |
| `unauthorized` | 401 | Sin token o credenciales inválidas |
| `token_expired` | 401 | JWT expirado (re-login) |
| `token_invalid` | 401 | JWT malformado |
| `forbidden` | 403 | Sin permisos para el recurso |
| `not_found` | 404 | Recurso no encontrado |
| `invalid_file` | 422 | Archivo muy grande o formato incorrecto |
| `upload_failed` | 502 | Error del servicio externo (ImgBB) |
| `internal_error` | 500 | Error interno del servidor |

---

## 7. Variables de Entorno (.env)

```env
DATABASE_URL="postgresql://user:pass@host:port/db?schema=fixit"
JWT_SECRET="tu-secret-seguro"
PORT=3000
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"
IMGBB_API_KEY="tu-api-key-de-imgbb"
```

---

## 8. Comandos del Backend

```bash
npm run dev              # Servidor con hot-reload (tsx watch)
npm run db:migrate       # Aplicar migraciones
npm run db:rollback      # Revertir última migración
npm run db:seed          # Insertar datos de prueba
npm run db:seed:undo     # Limpiar datos de prueba
npm run typecheck        # Verificar tipos TypeScript
```
