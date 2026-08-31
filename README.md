# PartidoYA ⚽

App para reservar canchas. Los **Jugadores** ven en un mapa las canchas activas más
cercanas a su ubicación y señan un turno (día/horario/cancha). Los dueños de predios
se registran como **Cancha**, configuran sus días, horarios, cantidad de canchas y
turnos, y deben mantener al día una cuota mensual para que su predio esté visible.

Todos los pagos (cuota mensual y señas) funcionan por **transferencia + foto del
comprobante**, salvo que una cancha puntual cargue su propio link de pago de
Mercado Pago para cobrar la seña. No hay cobro automático: los pagos se revisan
a mano desde Supabase.

## Stack elegido y por qué

| Parte | Tecnología | Motivo |
|---|---|---|
| Frontend | React + Vite + TailwindCSS | Liviano, ideal para Cloudflare Pages y reutilizable en las apps móviles vía Capacitor |
| Hosting | **Cloudflare Pages** | Gratis, deploy automático conectando el repo de GitHub |
| Backend/DB | **Supabase** (Postgres + PostGIS + Storage) | Auth lista para usar, base de datos con búsquedas por cercanía geográfica reales, Row Level Security, y un bucket de Storage para guardar las fotos de los comprobantes |
| Mapa | **Leaflet + OpenStreetMap** | 100% gratis y sin API key |

Como ahora los pagos son manuales (transferencia + comprobante), **ya no hace falta
ninguna Cloudflare Function ni cuenta de desarrollador de Mercado Pago** para
arrancar. Todo el circuito de pago vive en la base de datos y vos lo revisás a mano.

## Estructura del proyecto

```
partidoya/
├── src/
│   ├── pages/          Login, Registro, Dashboard Jugador, Dashboard Cancha
│   ├── components/     MapView (Leaflet), CourtCard, ProtectedRoute
│   ├── contexts/        AuthContext (Supabase Auth)
│   ├── hooks/           useGeolocation
│   └── lib/              supabaseClient, storage (subida de comprobantes)
├── supabase/schema.sql   Esquema completo de base de datos + RLS + Storage
└── .env.example
```

## 1. Configurar Supabase

1. Creá un proyecto gratis en [supabase.com](https://supabase.com).
2. Andá a **SQL Editor**, pegá el contenido de `supabase/schema.sql` y ejecutalo.
   Esto crea las tablas, la función `canchas_cercanas` (búsqueda por radio), las
   políticas de seguridad (RLS) y el bucket de Storage `comprobantes` para las
   fotos de los pagos.
3. En **Project Settings > API** copiá la `Project URL` y la `anon public key`.

## 2. Configurar el proyecto localmente

```bash
npm install
cp .env.example .env
# completá .env con tu VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

## 3. Subir a GitHub y desplegar en Cloudflare Pages

1. Creá un repo en GitHub y subí esta carpeta.
2. En Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Build command: `npm run build` — Build output directory: `dist`
4. En **Settings > Environment variables** agregá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
5. Deploy. Cada push a `main` redespliega automáticamente.

## 4. Cómo funciona el cobro de la cuota mensual (a vos, el dueño de PartidoYA)

1. El dueño de una cancha, desde su panel, hace click en "Abonar cuota mensual".
2. Escribe el nombre de la cuenta con la que va a transferir.
3. Ve tu alias fijo: **`partidoya`**.
4. Transfiere y sube una foto del comprobante → queda guardado en la tabla
   `pagos_cuota` con estado `en_revision`.
5. **Vos entrás a Supabase → Table Editor → `pagos_cuota`**, mirás la foto
   (columna `comprobante_url`) y si está bien:
   - marcás esa fila con `status = aprobado`
   - vas a la tabla `canchas` y le ponés `status = activa` a esa cancha
6. Recién ahí esa cancha aparece en el mapa de los jugadores.

Si en el futuro querés automatizar esto (por ejemplo integrando la API de
Mercado Pago para que se active solo), es un paso posterior — el sistema ya
está armado para soportarlo sin romper nada de lo que hay hoy.

## 5. Cómo funciona la seña de un turno

1. El jugador elige cancha, día y turno. Ve el valor total y el valor de la seña
   que cargó el dueño.
2. Si esa cancha cargó un **link de pago de Mercado Pago**, el jugador paga ahí y
   confirma con "Ya pagué, confirmar seña".
3. Si no, el jugador escribe el nombre de su cuenta, ve el **alias propio de esa
   cancha** (no el de PartidoYA — cada cancha carga el suyo al registrarse) y sube
   la foto del comprobante.
4. En cualquiera de los dos casos, ese turno pasa a figurar como **"Señado"** para
   todos los demás jugadores automáticamente (no se puede señar dos veces el mismo
   turno el mismo día).

## 6. Publicar en Play Store y App Store (mediano plazo)

Con esta misma base React se puede empaquetar como app nativa usando **Capacitor**:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init PartidoYA com.tuempresa.partidoya
npm run build
npx cap add android
npx cap add ios
npx cap open android   # abre Android Studio para generar el .aab de Play Store
npx cap open ios       # abre Xcode para generar el build de App Store (necesita Mac)
```

Cuenta de desarrollador de Google Play (pago único ~US$25) y de Apple Developer
(US$99/año) se sacan recién en esta etapa.

## Estado actual / próximos pasos sugeridos

Ya funciona: registro con rol, mapa con canchas cercanas, alta de predio y turnos
(con valor total y seña), señar un turno por transferencia o por link de Mercado
Pago, bloqueo automático del turno ya señado, y cobro manual de la cuota mensual
con revisión de comprobante.

Pendiente para una siguiente vuelta:
- Pantalla de "mis reservas" para el jugador (ver/cancelar sus señas)
- Aviso automático (email) cuando aprobás un pago, en vez de revisarlo solo vos a mano
- Vista de administrador dentro de la propia app (hoy se revisa desde Supabase directamente)
- Fotos de la cancha (ya está el bucket de Storage armado, se puede reusar)
