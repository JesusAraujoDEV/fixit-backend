# FixHub — Guía de Integración Frontend

> Última actualización: 18 de mayo 2025
> Backend: Express + Sequelize + Socket.io (TypeScript)
> Base de datos: PostgreSQL (schema `fixit`)

---

## 1. Configuración Base

### Cliente HTTP (axios / fetch)

```ts
const API_BASE_URL = "http://localhost:3000/api";
```

Todas las peticiones protegidas deben incluir el header:

```
Authorization: Bearer <token_jwt>
```

### Cliente WebSocket (Socket.io)

```ts
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  path: "/ws",
  auth: {
    token: "<token_jwt>", // El mismo JWT del login
  },
});
```

El servidor valida el JWT antes de aceptar la conexión. Si el token es inválido o está expirado, el socket recibirá un error de conexión.

---

## 2. Contratos REST

### POST `/api/auth/login`

Autentica al usuario y retorna un JWT.

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
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
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

**Errores posibles:**

| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | `invalid_params` | Falta email o password |
| 401 | `unauthorized` | Credenciales inválidas |

---

### GET `/api/auth/me`

Retorna los datos del usuario autenticado. Usado por el `SessionProvider` para mantener la sesión viva.

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

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

**Errores posibles:**

| Status | Código | Descripción |
|--------|--------|-------------|
| 401 | `unauthorized` | No se envió token |
| 401 | `token_expired` | Token expirado |
| 401 | `token_invalid` | Token malformado |

---

### GET `/api/map/technicians`

Retorna técnicos online dentro de un radio. El frontend usa estos datos para pintar markers en Leaflet.

**Query Params:**

| Param | Tipo | Requerido | Ejemplo |
|-------|------|-----------|---------|
| `lat` | number | ✅ | `10.1910` |
| `lng` | number | ✅ | `-68.0130` |
| `radius_km` | number | ✅ | `10` |

**Ejemplo de petición:**

```
GET /api/map/technicians?lat=10.1910&lng=-68.0130&radius_km=10
Authorization: Bearer <token>
```

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
      "full_name": "Andrés Martínez",
      "rating_average": 4.85,
      "is_verified": true,
      "latitude": 10.2050,
      "longitude": -68.0020,
      "distance_km": 1.87
    },
    {
      "id": "profile-uuid-3",
      "user_id": "user-uuid-3",
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

**Uso en Leaflet:**

```tsx
technicians.forEach((tech) => {
  L.marker([tech.latitude, tech.longitude])
    .addTo(map)
    .bindPopup(`${tech.full_name} ⭐ ${tech.rating_average} — ${tech.distance_km} km`);
});
```

**Errores posibles:**

| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | `invalid_params` | Faltan parámetros o no son numéricos |
| 401 | `unauthorized` | No autenticado |

---

### POST `/api/requests`

Crea una solicitud de servicio (ticket). Solo usuarios con rol `client`.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**

```json
{
  "title": "Se fue la luz en toda la casa",
  "description": "Los breakers están arriba pero no llega corriente a ningún tomacorriente.",
  "category": "electrical",
  "images": [
    "https://storage.fixit.com/uploads/img-001.jpg",
    "https://storage.fixit.com/uploads/img-002.jpg"
  ],
  "latitude": 10.1910,
  "longitude": -68.0130
}
```

**Campos del body:**

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `title` | string | ✅ | 5–200 caracteres |
| `description` | string | ❌ | Máx 2000 chars (default: "") |
| `category` | string | ✅ | Ver categorías válidas abajo |
| `images` | string[] | ❌ | Máx 4 URLs (default: []) |
| `latitude` | number | ✅ | -90 a 90 |
| `longitude` | number | ✅ | -180 a 180 |

**Categorías válidas:**

```
plumbing | electrical | carpentry | painting | appliance_repair |
locksmith | cleaning | hvac | general
```

**Response (201):**

```json
{
  "id": "request-uuid-generated",
  "status": "pending",
  "created_at": "2025-05-18T14:30:00.000Z",
  "nearby_technicians_count": 3,
  "estimated_response_min": 5
}
```

**Errores posibles:**

| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | `invalid_params` | Campos requeridos faltantes |
| 401 | `unauthorized` | No autenticado |
| 403 | `forbidden` | El usuario no es `client` |
| 422 | `invalid_params` | Error de validación (con array `errors`) |

**Ejemplo de error 422:**

```json
{
  "error": "El título debe tener entre 5 y 200 caracteres",
  "code": "invalid_params",
  "errors": [
    { "field": "title", "message": "Debe tener entre 5 y 200 caracteres" }
  ]
}
```

---

## 3. Eventos de Tiempo Real (Socket.io)

### Conexión exitosa

Al conectar, el servidor emite automáticamente:

**Evento recibido:** `connection:established`

```json
{
  "session_id": "socket-id-abc123",
  "user_id": "a1b2c3d4-...",
  "role": "client",
  "joined_rooms": ["clients", "user:a1b2c3d4-..."]
}
```

---

### Flujo del Radar de Búsqueda (Cliente)

El cliente inicia la búsqueda de un técnico cercano:

#### Emitir: `search:start`

```ts
socket.emit("search:start", {
  request_id: "uuid-del-ticket-creado"
});
```

#### Escuchar: `search:ack`

Confirmación de que la búsqueda inició:

```json
{
  "search_id": "search_1716048000000_user-uuid",
  "request_id": "uuid-del-ticket",
  "status": "searching"
}
```

#### Escuchar: `search:timeout`

Si ningún técnico acepta en 30 segundos:

```json
{
  "search_id": "search_1716048000000_user-uuid"
}
```

#### Cancelar búsqueda: `search:cancel`

```ts
socket.emit("search:cancel", {
  search_id: "search_1716048000000_user-uuid"
});
```

---

### Flujo de Alerta de Misión (Técnico)

Los técnicos reciben ofertas de trabajo en tiempo real:

#### Escuchar: `mission:offer`

```json
{
  "mission_id": "mission_1716048000000",
  "search_id": "search_1716048000000_user-uuid",
  "request_id": "uuid-del-ticket",
  "client_id": "uuid-del-cliente",
  "expires_in_seconds": 30
}
```

> ⏱️ El técnico tiene exactamente **30 segundos** para aceptar o rechazar.

#### Emitir: `mission:accept`

```ts
socket.emit("mission:accept", {
  mission_id: "mission_1716048000000"
});
```

#### Emitir: `mission:reject`

```ts
socket.emit("mission:reject", {
  mission_id: "mission_1716048000000"
});
```

#### Escuchar: `mission:confirmed`

Si el técnico aceptó y fue asignado:

```json
{
  "mission_id": "mission_1716048000000",
  "status": "confirmed"
}
```

#### Escuchar: `mission:expired`

Si el tiempo se agotó sin respuesta:

```json
{
  "mission_id": "mission_1716048000000"
}
```

---

### Tracking en Tiempo Real (Ubicación del Técnico)

#### Técnico emite: `location:update`

```ts
// El técnico envía su posición periódicamente
socket.emit("location:update", {
  lat: 10.1950,
  lng: -68.0100
});
```

#### Cliente/Admin escucha: `tracking:update`

```json
{
  "technician_id": "uuid-del-tecnico",
  "latitude": 10.1950,
  "longitude": -68.0100,
  "timestamp": "2025-05-18T14:35:22.000Z"
}
```

**Uso en Leaflet (actualizar marker del técnico en camino):**

```tsx
socket.on("tracking:update", (data) => {
  technicianMarker.setLatLng([data.latitude, data.longitude]);
});
```

---

### Heartbeat

El servidor envía un `ping` cada 25 segundos. El cliente debe responder con `pong`:

```ts
socket.on("ping", () => {
  socket.emit("pong");
});
```

---

## 4. Credenciales de Prueba (Seeder)

| Email | Contraseña | Rol |
|-------|-----------|-----|
| `admin@fixit.com` | `Admin123!` | admin |
| `maria.prebo@gmail.com` | `Cliente1!` | client |
| `jose.sambil@gmail.com` | `Cliente2!` | client |
| `pedro.electricista@gmail.com` | `Tecnico1!` | technician |
| `luis.plomero@gmail.com` | `Tecnico2!` | technician |
| `andres.lineablanca@gmail.com` | `Tecnico3!` | technician |

---

## 5. Resumen de Endpoints

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| POST | `/api/auth/login` | ❌ | — | Login, retorna JWT |
| GET | `/api/auth/me` | ✅ | any | Datos del usuario actual |
| GET | `/api/map/technicians` | ✅ | any | Técnicos cercanos por radio |
| POST | `/api/requests` | ✅ | client | Crear ticket de servicio |

**Swagger UI disponible en:** `http://localhost:3000/api-docs`

---

## 6. Códigos de Error Globales

| Código | Significado |
|--------|-------------|
| `invalid_params` | Parámetros faltantes o inválidos |
| `unauthorized` | No autenticado / credenciales inválidas |
| `token_expired` | JWT expirado (re-login necesario) |
| `token_invalid` | JWT malformado |
| `forbidden` | Sin permisos para este recurso |
| `not_found` | Recurso no encontrado |
| `internal_error` | Error interno del servidor |
