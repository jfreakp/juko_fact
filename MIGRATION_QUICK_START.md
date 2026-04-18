# ⚡ Migración a Supabase - Pasos Rápidos

## 🔐 PASO 1: Obtén tu URL de Supabase (2 min)

```
1. Abre https://supabase.com/dashboard
2. Ve a tu proyecto
3. Settings → Database
4. Copia la "Connection string" en modo "Pooler"
```

**Debería verse así:**
```
postgresql://postgres.abc1234xyz:your_password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

---

## 📝 PASO 2: Actualiza el .env (2 min)

**Opción A: Automático (PowerShell)**
```powershell
# Pega aquí tu URL (reemplaza YOUR_DATABASE_URL)
.\update-supabase-env.ps1 -DatabaseUrl "postgresql://postgres.abc1234xyz:your_password@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
```

**Opción B: Manual**
Edita `.env` y reemplaza esta línea:
```bash
DATABASE_URL="postgresql://postgres.abc1234xyz:your_password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

---

## 🚀 PASO 3: Aplica las migraciones (1-2 min)

```bash
pnpm prisma migrate deploy
```

---

## ✅ PASO 4: Genera Prisma Client (1 min)

```bash
pnpm prisma generate
```

---

## 🧪 PASO 5: Verifica la conexión (opcional)

```bash
# Abre Prisma Studio en el navegador
pnpm prisma studio
```

---

## 🎉 ¡Listo! 

Tu aplicación ahora está conectada a Supabase. Puedes:

```bash
# Iniciar tu app
pnpm dev

# Ver status de migraciones
pnpm prisma migrate status

# Explorar datos
pnpm prisma studio
```

---

## 🛡️ Seguridad - MUY IMPORTANTE

✅ **Hacer:**
- `.env` ya está en `.gitignore` ✓
- Usa variables de entorno en producción
- Nunca comitees credenciales

❌ **NO Hacer:**
- Comitear `.env` a Git
- Compartir DATABASE_URL públicamente
- Usar contraseñas débiles

---

## 🆘 Si algo falla

**Error: `P1001: Can't reach database server`**
- Verifica que copiaste la URL completa
- Confirma que tu proyecto Supabase está activo
- Prueba con Prisma Studio: `pnpm prisma studio`

**Error: `connection refused`**
- La contraseña puede tener caracteres especiales sin escapar
- Copia nuevamente desde Supabase Console

**Error: `permission denied`**
- Verifica que el usuario `postgres` tiene permisos
- En Supabase, debería tener permisos automáticos

