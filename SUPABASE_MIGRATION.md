# 🚀 Guía de Migración a Supabase

## Paso 1: Obtener la URL Correcta de Supabase

1. **Accede a Supabase Console**: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** → **Database** en el menú lateral
4. En la sección **Connection string**, asegúrate de seleccionar **Pooler mode**
5. Copia la URL completa

**Formato esperado:**
```
postgresql://postgres.YOUR_PROJECT_ID:YOUR_PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
```

---

## Paso 2: Actualizar el .env

Reemplaza la línea `DATABASE_URL` en `.env` con:

```bash
DATABASE_URL="postgresql://postgres.YOUR_PROJECT_ID:YOUR_PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

**IMPORTANTE - Seguridad:**
- ❌ NUNCA comitees credenciales en Git
- ✅ Agrega `.env` a `.gitignore` (ya debería estar)
- ✅ Para producción, usa variables de entorno en tu hosting (Vercel, etc.)

---

## Paso 3: Aplicar Migraciones

Una vez actualizado el `.env`, ejecuta:

```bash
pnpm prisma migrate deploy
```

Esto aplicará todas las migraciones pendientes a Supabase.

---

## Paso 4: Generar Prisma Client

```bash
pnpm prisma generate
```

---

## Paso 5: Verificar Conexión

```bash
pnpm prisma db seed
```

Esto ejecutará cualquier seed script si existe.

---

## Paso 6: Limpiar Configuración Local

Si ya no necesitas la base de datos local:

1. **Docker**: Opcionalmente, puedes dejar o remover `docker-compose.yml`
2. **Variable comentada**: La línea comentada en `.env` puede quedarse como referencia o removerse

---

## Checklist de Migración

- [ ] URL de Supabase obtenida
- [ ] `.env` actualizado con DATABASE_URL correcta
- [ ] `pnpm prisma migrate deploy` ejecutado exitosamente
- [ ] `pnpm prisma generate` completado
- [ ] Conexión verificada (opcional: `pnpm prisma studio`)
- [ ] Código fuente actualizado si hay referencias a base de datos local
- [ ] Deploy actualizado (Vercel, etc.)

---

## Comandos Útiles

```bash
# Ver Prisma Studio (explorar datos)
pnpm prisma studio

# Ver estado de migraciones
pnpm prisma migrate status

# Ver esquema
pnpm prisma schema

# Limpiar y reiniciar (⚠️ borra todos los datos)
pnpm prisma migrate reset --force
```

---

## Variables de Entorno Finales

Tu `.env` debería tener:

```env
# Database
DATABASE_URL="postgresql://postgres.PROJECT_ID:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Authentication
JWT_SECRET="juko-facturacion-sri-ecuador-secret-2024-change-in-production"

# SRI Integration
SRI_USE_MOCK=false
SRI_WS_RECEPCION_PRUEBAS=https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline
SRI_WS_AUTORIZACION_PRUEBAS=https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline
SRI_WS_RECEPCION_PRODUCCION=https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline
SRI_WS_AUTORIZACION_PRODUCCION=https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline

# Impuestos
NEXT_PUBLIC_IVA_RATE=15

# App
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Soporte

Si encuentras errores de conexión como `P1001`, verifica:
1. La URL está copiada correctamente (sin espacios extra)
2. La contraseña no tiene caracteres especiales sin escapar
3. Supabase está activo y el proyecto no está en pausa
4. La región en la URL coincide con la región de tu proyecto

