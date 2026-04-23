# Manual de Usuario
## Sistema de Facturación Electrónica — SRI Ecuador

---

## Tabla de contenidos

1. [Introducción](#1-introducción)
2. [Acceso al sistema](#2-acceso-al-sistema)
3. [Panel principal (Dashboard)](#3-panel-principal-dashboard)
4. [Facturas](#4-facturas)
5. [Clientes](#5-clientes)
6. [Productos](#6-productos)
7. [Inventario](#7-inventario)
8. [Empresa](#8-empresa)
9. [Sucursales](#9-sucursales)
10. [Usuarios](#10-usuarios)
11. [Tipos de negocio](#11-tipos-de-negocio)
12. [Roles y permisos](#12-roles-y-permisos)
13. [Preguntas frecuentes](#13-preguntas-frecuentes)

---

## 1. Introducción

El sistema permite emitir **facturas electrónicas válidas ante el SRI** de Ecuador, gestionar su catálogo de productos, clientes e inventario, todo desde una única plataforma web.

### Qué puede hacer el sistema

| Función | Descripción |
|---|---|
| Facturación electrónica | Genera, firma y envía comprobantes al SRI en tiempo real |
| Clientes | Registro de compradores con validación de identificación |
| Productos | Catálogo con precios, IVA y campos específicos por tipo de negocio |
| Inventario | Control de stock por sucursal, movimientos y transferencias |
| Multi-sucursal | Cada usuario puede operar desde su sucursal asignada |
| Usuarios y roles | Administradores y empleados con permisos diferenciados |

### Requisitos previos

- Navegador moderno (Chrome, Firefox, Edge)
- RUC activo en el SRI
- Certificado de firma electrónica (.p12) vigente
- Acceso a internet para envío al SRI

---

## 2. Acceso al sistema

### Iniciar sesión

1. Ingrese la URL del sistema en su navegador
2. Introduzca su **correo electrónico** y **contraseña**
3. Haga clic en **Ingresar**

Si sus credenciales son correctas será redirigido al panel principal. La sesión se mantiene activa mediante una cookie segura; no necesita iniciar sesión en cada visita.

### Cerrar sesión

En la parte inferior del menú lateral haga clic en **Cerrar sesión**. La sesión se invalida inmediatamente en el servidor.

---

## 3. Panel principal (Dashboard)

El dashboard muestra un resumen del estado de su facturación:

| Sección | Qué muestra |
|---|---|
| Total del mes | Importe total facturado en el mes en curso |
| Facturas emitidas | Cantidad de comprobantes del mes |
| Pendientes de autorizar | Facturas enviadas al SRI que aún no tienen respuesta |
| Acceso rápido | Botón directo a crear una nueva factura |

Los datos se actualizan cada vez que accede a la página.

---

## 4. Facturas

### 4.1 Listado de facturas

Ingrese a **Facturas** desde el menú lateral. La pantalla muestra todas las facturas de su empresa con:

- Número secuencial
- Cliente
- Fecha de emisión
- Total
- Estado (ver tabla de estados más abajo)
- Acciones disponibles

**Filtros disponibles:**
- Por estado: Todos / Pendiente / Enviado / Autorizado / Rechazado
- Por búsqueda de texto: número secuencial o nombre del cliente

### Estados de una factura

| Estado | Significado |
|---|---|
| **PENDIENTE** | Creada localmente, aún no enviada al SRI |
| **ENVIADO** | XML firmado y enviado al servidor de recepción del SRI |
| **AUTORIZADO** | El SRI la autorizó; tiene número de autorización válido |
| **RECHAZADO** | El SRI la rechazó; revise el motivo en el detalle |
| **ANULADO** | Comprobante invalidado; no tiene validez tributaria |

### 4.2 Crear una factura

Haga clic en **Nueva Factura** (desde el listado o desde el botón del menú lateral).

#### Paso 1 — Seleccionar cliente

Haga clic en el campo de cliente y empiece a escribir el nombre, cédula o RUC. El sistema buscará automáticamente entre sus clientes registrados. Seleccione el cliente con un clic o presionando **Enter**.

> Si el cliente no existe, créelo primero desde el módulo **Clientes**.

#### Paso 2 — Fecha de emisión

Por defecto es la fecha actual. Puede cambiarla haciendo clic en el campo si necesita emitir con fecha retroactiva (dentro de los límites que acepta el SRI).

#### Paso 3 — Agregar productos

Cada fila del detalle representa un ítem de la factura.

| Campo | Descripción |
|---|---|
| Producto | Buscador: escriba el nombre, código o código de barras |
| Cantidad | Número de unidades (acepta decimales) |
| Precio unitario | Se llena automáticamente desde el catálogo; puede modificarlo |
| Descuento | Valor en dólares a restar de esa línea (no porcentaje) |
| IVA | 0%, 5% o 15%; se hereda del producto pero puede cambiarse |

Para agregar más líneas haga clic en **+ Agregar línea**. Para eliminar una línea use el botón **×** al final de la fila.

**Productos favoritos:** Si tiene productos marcados con ★, aparecen como accesos rápidos en la parte superior del formulario. Haga clic en uno para agregarlo directamente a la primera línea vacía.

#### Paso 4 — Forma de pago y monto

Seleccione la **forma de pago**:

| Código SRI | Descripción |
|---|---|
| Efectivo | Pago en billetes o monedas |
| Transferencia bancaria | Depósito o transferencia |
| Tarjeta de crédito | Pago con tarjeta |

Ingrese el **monto recibido** del cliente. El sistema calcula el vuelto automáticamente. No podrá emitir la factura si el monto recibido es menor al total.

#### Paso 5 — Observaciones (opcional)

Campo libre para notas internas o referencias. No aparece en el XML enviado al SRI.

#### Paso 6 — Emitir factura

Haga clic en **Emitir Factura**. El sistema:

1. Guarda la factura en la base de datos con estado **PENDIENTE**
2. Genera el XML según el formato SRI
3. Firma el XML con su certificado digital (.p12)
4. Envía el comprobante al servidor del SRI
5. Actualiza el estado a **ENVIADO** o **AUTORIZADO** según la respuesta

Si el SRI responde en el momento, la factura queda en **AUTORIZADO** directamente.

### 4.3 Enviar factura al SRI manualmente

Si una factura quedó en **PENDIENTE** (por problemas de conexión), puede reenviarla desde el listado:

1. Localice la factura
2. Haga clic en **Enviar SRI** en la columna de acciones

### 4.4 Anular una factura

Solo las facturas **AUTORIZADAS** pueden anularse.

1. Abra el detalle de la factura haciendo clic en ella
2. Haga clic en **Anular**
3. Ingrese el motivo de anulación
4. Confirme la acción

> **Importante:** La anulación en el sistema cambia el estado localmente. La nota de crédito o el proceso ante el SRI para invalidar el número de autorización debe gestionarse según los procedimientos vigentes del SRI.

### 4.5 Descargar PDF

Desde el detalle de una factura autorizada, haga clic en **Descargar PDF**. El PDF incluye todos los datos del comprobante, los totales por tipo de IVA, forma de pago y el número de autorización del SRI.

---

## 5. Clientes

### 5.1 Listado y búsqueda

Ingrese a **Clientes** desde el menú. Puede buscar por nombre o número de identificación.

### 5.2 Crear o editar un cliente

Haga clic en **+ Nuevo Cliente** o en **Editar** en la fila de un cliente existente.

| Campo | Descripción |
|---|---|
| Tipo de identificación | Cédula, RUC, Pasaporte o Consumidor Final |
| Identificación | Número de cédula, RUC o pasaporte |
| Razón Social | Nombre completo o razón social |
| Email | Correo electrónico (opcional) |
| Teléfono | Número de contacto (opcional) |
| Dirección | Dirección del cliente (opcional) |

> **Consumidor Final:** Use esta opción para ventas donde el cliente no proporciona datos. La identificación se llena automáticamente con el valor requerido por el SRI.

### 5.3 Importar clientes desde Excel

Haga clic en **Importar CSV** y seleccione un archivo `.csv` con el siguiente formato:

```
tipoIdentif,identificacion,razonSocial,email,telefono,direccion
CEDULA,1712345678,Juan Pérez,juan@email.com,0991234567,Quito
RUC,1790123456001,Empresa ABC S.A.,,, Av. 6 de Diciembre
```

El sistema actualizará los registros existentes (por identificación) y creará los nuevos. Al finalizar verá un resumen con el número de creados, actualizados y errores.

---

## 6. Productos

### 6.1 Listado y búsqueda

Ingrese a **Productos**. Puede buscar por código o descripción. Los productos aparecen en la tabla con:

- Ícono de favorito (★ / ☆)
- Código principal
- Descripción
- Tipo (Bien o Servicio)
- Precio unitario con su unidad de medida (si aplica)
- IVA
- Acciones

**Marcar como favorito:** Haga doble clic en una fila, o haga clic en el ícono ★/☆. Los favoritos aparecen como acceso rápido al crear facturas.

### 6.2 Crear o editar un producto

Haga clic en **+ Nuevo Producto** o en **Editar**.

#### Campos base (todos los tipos de negocio)

| Campo | Descripción |
|---|---|
| Código Principal | Identificador único del producto en su catálogo |
| Código Auxiliar | Código interno adicional (opcional) |
| Descripción | Nombre del producto tal como aparecerá en la factura |
| Precio (USD) | Precio de venta sin IVA |
| IVA | 0%, 5% o 15% (estándar) |
| Tipo | Bien (producto físico) o Servicio |

#### Campos según el tipo de negocio

Los campos extra solo aparecen si su empresa tiene configurado el tipo de negocio correspondiente (ver sección [Empresa](#8-empresa)).

**Farmacia (PHARMACY):**

| Campo | Descripción |
|---|---|
| Principio Activo | Ingrediente activo del medicamento |
| Lote | Número de lote del fabricante |
| Vencimiento | Fecha de caducidad (obligatoria en farmacias) |
| Registro Sanitario (ARCSA) | Número de registro sanitario vigente |
| Requiere receta | Marque si el producto requiere prescripción médica |

**Minimarket / Abarrotes (GROCERY):**

| Campo | Descripción |
|---|---|
| Código de Barras | EAN-13 o UPC para escaneo |
| Unidad de Medida | Unidad, Kilogramo, Litro, Metro, m², Caja |
| Lote | Número de lote (opcional) |
| Vencimiento | Fecha de caducidad (opcional) |

**Ferretería (HARDWARE_STORE):**

| Campo | Descripción |
|---|---|
| Código de Barras | EAN-13 o UPC para escaneo |
| Unidad de Medida | Unidad, Kilogramo, Litro, Metro, m², Caja |

**Licorera (LIQUOR_STORE):**

| Campo | Descripción |
|---|---|
| Grados de Alcohol (%) | Porcentaje de alcohol (ej. 40.0) |
| Volumen (ml) | Contenido en mililitros (ej. 750) |
| País de Origen | País donde se elaboró el producto |

### 6.3 Código de barras y búsqueda rápida

Si su tipo de negocio habilita el campo de código de barras, puede ingresar el EAN-13 o UPC del producto. Esto le permite:

- Buscar un producto escribiendo su código de barras en cualquier buscador del sistema
- Conectar un lector de barras USB: apunte al código, escaneelo, y el sistema localiza el producto automáticamente

### 6.4 Configurar inventario por producto

Desde la tabla de productos, haga clic en **Stock** (visible solo para bienes y administradores) para configurar el seguimiento de inventario de ese producto:

| Campo | Descripción |
|---|---|
| Activar control de stock | Habilita el seguimiento de este producto |
| Costo Promedio (USD) | Costo de adquisición para el cálculo de márgenes |
| Stock Mínimo | Cantidad mínima antes de considerar reposición |

---

## 7. Inventario

El módulo de inventario permite ver y gestionar el stock de todos sus productos con seguimiento activado. Está disponible cuando el tipo de negocio lo requiere (los restaurantes, por ejemplo, no lo tienen activo).

### 7.1 Stock actual

Ingrese a **Inventario**. Verá una tabla con:

- Producto (código + descripción)
- Sucursal
- Cantidad actual en stock
- Stock mínimo configurado
- Costo promedio

#### Ajuste de inventario

Los administradores pueden realizar ajustes directos:

1. Haga clic en **Ajuste de Stock**
2. Seleccione el producto
3. Seleccione la sucursal
4. Ingrese la cantidad (positiva para incrementar, use el tipo **Ajuste negativo** para reducir)
5. Ingrese el costo unitario y una nota explicativa
6. Guarde el ajuste

Cada ajuste queda registrado en el kardex con la fecha, usuario y motivo.

### 7.2 Kardex (historial de movimientos)

Ingrese a **Inventario → Kardex**. Muestra el historial completo de movimientos de stock:

| Tipo de movimiento | Descripción |
|---|---|
| Entrada | Ingreso de mercadería (compra o ajuste positivo) |
| Salida | Despacho por venta o ajuste negativo |
| Ajuste + | Corrección positiva de inventario |
| Ajuste - | Corrección negativa de inventario |
| Transf. entrada | Mercadería recibida de otra sucursal |
| Transf. salida | Mercadería enviada a otra sucursal |

**Filtros disponibles:**
- Por producto
- Por sucursal

Cada movimiento muestra: fecha, usuario responsable, cantidad, costo unitario, costo total y saldo resultante.

### 7.3 Transferencias entre sucursales

Ingrese a **Inventario → Transferencias**.

**Crear una transferencia:**

1. Haga clic en **Nueva Transferencia**
2. Seleccione la **sucursal origen** y la **sucursal destino**
3. Agregue los productos a transferir con sus cantidades y costos
4. Confirme la transferencia

El sistema descuenta el stock en la sucursal origen e incrementa en la sucursal destino en el mismo momento. Ambos movimientos quedan registrados en el kardex con referencia cruzada.

---

## 8. Empresa

Esta sección solo es accesible para usuarios con rol **ADMIN**.

### 8.1 Datos tributarios

Ingrese a **Empresa** desde el menú.

| Campo | Descripción |
|---|---|
| RUC | Número de identificación tributaria (13 dígitos) |
| Razón Social | Nombre legal registrado en el SRI |
| Nombre Comercial | Nombre con que opera el negocio (opcional) |
| Dirección Matriz | Dirección fiscal de la empresa |
| Establecimiento | Código de 3 dígitos del local (ej. 001) |
| Punto de Emisión | Código de 3 dígitos del punto de venta (ej. 001) |
| Secuencial Inicial | Número desde el que comienza la secuencia de facturas |
| Contribuyente Especial | Número de resolución si aplica |
| Obligado a llevar contabilidad | Marque según su obligación tributaria |

> **Secuencial Inicial:** Solo tiene efecto antes de emitir la primera factura. Una vez emitida, la secuencia no puede retroceder.

### 8.2 Tipo de negocio

El campo **Giro del negocio** determina qué campos, módulos y validaciones están activos en todo el sistema.

| Valor | Negocio |
|---|---|
| General | Tienda genérica sin lógica especial |
| Farmacia | Habilita lote, vencimiento, registro ARCSA y receta |
| Minimarket | Habilita código de barras, unidad de medida, lote y vencimiento |
| Licorera | Habilita grados de alcohol, volumen y país de origen |
| Restaurante | Oculta el módulo de inventario tradicional |
| Ropa y Calzado | Configuración estándar con inventario |
| Ferretería | Habilita código de barras y unidad de medida |

Cambie el tipo de negocio y haga clic en **Guardar Configuración**. El cambio aplica de inmediato en todo el sistema.

### 8.3 Configuración SRI

| Campo | Opciones |
|---|---|
| Ambiente | **Pruebas** (certificación) o **Producción** |
| Tipo de Emisión | Normal o Indisponibilidad del sistema |

> **Ambiente Pruebas:** Las facturas se envían al servidor de pruebas del SRI y no tienen validez legal. Use este modo para verificar que todo funciona antes de activar Producción.

> **Ambiente Producción:** Las facturas enviadas tienen validez tributaria real. Asegúrese de tener su certificado vigente antes de activar este ambiente.

### 8.4 Logo de la empresa

Aparece en el PDF de la factura.

- Formatos aceptados: PNG, JPG, SVG, WebP
- Tamaño máximo: 2 MB
- Para subir: arrastre el archivo al área indicada o haga clic en ella
- Para cambiar: haga clic en **Cambiar**
- Para eliminar: haga clic en **Quitar**

### 8.5 Certificado digital

El certificado de firma electrónica (.p12) es obligatorio para emitir facturas válidas ante el SRI.

**Cargar el certificado:**

1. En la sección **Cargar Certificado**, haga clic en el campo de archivo
2. Seleccione su archivo `.p12` o `.pfx`
3. Ingrese la contraseña del certificado
4. Haga clic en **Cargar Certificado**

El sistema valida el certificado y muestra su vigencia (fecha desde / hasta) y huella digital. Si ya existe un certificado activo, el nuevo lo reemplaza.

> **Vigencia:** El certificado caduca en la fecha indicada. Renuévelo antes de esa fecha para no interrumpir la facturación.

---

## 9. Sucursales

Accesible solo para **ADMIN**.

Una sucursal representa un local o punto de venta físico. Cada usuario puede estar asignado a una sucursal, y cada factura registra la sucursal desde donde fue emitida.

### Crear una sucursal

1. Ingrese a **Sucursales**
2. Haga clic en **+ Nueva Sucursal**
3. Complete nombre y dirección
4. Guarde

### Editar o desactivar

Haga clic en **Editar** en la fila de la sucursal. Puede modificar nombre, dirección o desactivarla. Las sucursales desactivadas no aparecen como opciones de asignación para nuevos usuarios.

---

## 10. Usuarios

Accesible solo para **ADMIN**.

### Roles del sistema

| Rol | Acceso |
|---|---|
| **ADMIN** | Facturación + gestión de empresa, sucursales, usuarios y configuración completa |
| **EMPLEADO** | Solo facturación (facturas, clientes, productos e inventario según su sucursal) |

### Crear un usuario

1. Ingrese a **Usuarios**
2. Haga clic en **+ Nuevo Usuario**
3. Complete los datos:

| Campo | Descripción |
|---|---|
| Nombre | Nombre completo del usuario |
| Email | Correo con el que iniciará sesión |
| Contraseña | Mínimo 6 caracteres |
| Rol | Admin o Empleado |
| Sucursal | Sucursal asignada (opcional) |

### Editar un usuario

Haga clic en **Editar** en la fila del usuario. Puede modificar todos los campos, incluyendo restablecer la contraseña.

### Desactivar un usuario

En el formulario de edición, desmarque **Usuario activo**. El usuario no podrá iniciar sesión pero sus facturas y movimientos se conservan.

---

## 11. Tipos de negocio

### GENERAL — Tienda genérica

Configuración base del sistema. Sin campos extra. Ideal para negocios que no encajan en las categorías específicas.

**Lo que tiene activo:** Facturación, clientes, productos, inventario.

---

### PHARMACY — Farmacia

Configuración orientada al control de medicamentos y productos de salud.

**Campos extra en productos:**
- **Principio activo** — ingrediente activo del medicamento
- **Lote** — número de lote del fabricante para trazabilidad
- **Vencimiento** — fecha de caducidad (campo obligatorio)
- **Registro sanitario (ARCSA)** — número de autorización de comercialización
- **Requiere receta** — indicador para productos de venta bajo prescripción

**Código de barras activo:** Permite escanear medicamentos por su código de barras durante la facturación.

**Validación de vencimiento:** El sistema requiere ingresar fecha de vencimiento; no puede quedar vacía.

---

### LIQUOR_STORE — Licorera

Configuración para venta de bebidas alcohólicas.

**Campos extra en productos:**
- **Grados de alcohol (%)** — concentración alcohólica
- **Volumen (ml)** — contenido del envase en mililitros
- **País de origen** — procedencia del producto

---

### GROCERY — Minimarket / Abarrotes

Configuración para venta de productos de consumo masivo y alta rotación.

**Campos extra en productos:**
- **Código de barras (EAN-13 / UPC)** — para escaneo en punto de venta
- **Unidad de medida** — Unidad, Kilogramo, Litro, Metro, m², Caja
- **Lote** — número de lote (opcional)
- **Vencimiento** — fecha de caducidad (opcional)

**Búsqueda por código de barras:** En cualquier buscador del sistema, escriba o escanee el código de barras para localizar el producto instantáneamente.

---

### RESTAURANT — Restaurante

Configuración para establecimientos de alimentos y bebidas.

**Diferencias clave:**
- El módulo de **Inventario** está oculto (los restaurantes no suelen llevar control de stock línea por línea)
- Los productos representan platos o preparaciones del menú

---

### CLOTHING_STORE — Ropa y Calzado

Configuración estándar con inventario habilitado. Actualmente sin campos específicos para tallas o colores; se recomienda codificar las variantes en el código principal (ej. `CAMISA-M-AZUL`).

---

### HARDWARE_STORE — Ferretería

Configuración para venta de materiales y herramientas.

**Campos extra en productos:**
- **Código de barras (EAN-13 / UPC)** — para escaneo en punto de venta
- **Unidad de medida** — Unidad, Kilogramo, Litro, Metro, m², Caja

**Unidad de medida en factura:** El precio se muestra como `$X.XX/kg` o `$X.XX/m` en el catálogo para mayor claridad.

---

## 12. Roles y permisos

| Función | ADMIN | EMPLEADO |
|---|---|---|
| Crear facturas | ✅ | ✅ |
| Ver facturas | ✅ | ✅ (solo su sucursal) |
| Anular facturas | ✅ | ✅ |
| Gestionar clientes | ✅ | ✅ |
| Gestionar productos | ✅ | ✅ |
| Ver inventario | ✅ | ✅ |
| Ajustar stock | ✅ | ❌ |
| Crear transferencias | ✅ | ❌ |
| Configurar inventario por producto | ✅ | ❌ |
| Gestionar sucursales | ✅ | ❌ |
| Gestionar usuarios | ✅ | ❌ |
| Configurar empresa | ✅ | ❌ |
| Cambiar tipo de negocio | ✅ | ❌ |
| Cargar certificado digital | ✅ | ❌ |

---

## 13. Preguntas frecuentes

**¿Por qué una factura queda en estado PENDIENTE?**
Puede ocurrir por falta de conectividad con los servidores del SRI o por un problema temporal. Desde el listado de facturas puede reenviarla haciendo clic en **Enviar SRI**.

**¿Puedo modificar una factura ya emitida?**
No. Las facturas electrónicas son inmutables una vez enviadas al SRI. Si necesita corregir un error, debe anular la factura y emitir una nueva.

**¿Qué pasa si mi certificado digital caduca?**
El sistema no podrá firmar nuevas facturas. Renueve su certificado con un proveedor autorizado y cárguelo en **Empresa → Cargar Certificado** antes de la fecha de vencimiento.

**¿Puedo usar el sistema desde el celular?**
Sí. La interfaz es responsiva y funciona en navegadores móviles, aunque la experiencia óptima es en pantallas de escritorio.

**¿Cómo funciona el ambiente de Pruebas?**
En ambiente **Pruebas**, las facturas se envían al servidor de certificación del SRI (`celcer.sri.gob.ec`). Puede emitir y probar sin que los comprobantes tengan validez tributaria real. Cambie a **Producción** cuando esté listo para operar.

**¿Qué es el Consumidor Final?**
Es el tipo de identificación que usa el SRI cuando el comprador no proporciona datos (ventas al público en general). La identificación se llena con el valor `9999999999999` que requiere el SRI para este tipo de transacción.

**¿Cómo agrego productos más rápido durante la facturación?**
Marque sus productos más vendidos como **favoritos** (★). Aparecerán como botones de acceso rápido en la pantalla de nueva factura. Si tiene lector de código de barras, conéctelo y escanee directamente en el campo de búsqueda de productos.

**¿Puedo tener más de una sucursal?**
Sí. Los administradores pueden crear todas las sucursales que necesiten. Cada usuario se asigna a una sucursal, y el stock y las facturas se registran por sucursal.

**¿Qué significa "vuelto" en la factura?**
Es el cambio que recibe el cliente cuando paga más del total. El sistema lo calcula automáticamente al ingresar el monto recibido. Queda registrado en la factura pero no afecta los totales tributarios reportados al SRI.

**¿El sistema envía la factura por correo al cliente?**
No automáticamente en la versión actual. Puede descargar el PDF y enviarlo manualmente al cliente.

---

*Documento generado para uso interno. Versión correspondiente al sistema con soporte de tipos de negocio, inventario multi-sucursal y campo de código de barras y unidad de medida en productos.*
