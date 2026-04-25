# Manual de Usuario
## Sistema de Facturación Electrónica — SRI Ecuador

---

## Tabla de contenidos

1. [Introducción](#1-introducción)
2. [Acceso al sistema](#2-acceso-al-sistema)
3. [Barra superior](#3-barra-superior)
4. [Panel principal (Dashboard)](#4-panel-principal-dashboard)
5. [Facturas](#5-facturas)
6. [Clientes](#6-clientes)
7. [Productos](#7-productos)
8. [Inventario](#8-inventario)
9. [Compras y Proveedores](#9-compras-y-proveedores)
10. [Reportes](#10-reportes)
11. [Empresa](#11-empresa)
12. [Sucursales](#12-sucursales)
13. [Usuarios](#13-usuarios)
14. [Tipos de negocio](#14-tipos-de-negocio)
15. [Roles y permisos](#15-roles-y-permisos)
16. [Preguntas frecuentes](#16-preguntas-frecuentes)

---

## 1. Introducción

El sistema permite emitir **facturas electrónicas válidas ante el SRI** de Ecuador, gestionar su catálogo de productos, clientes, inventario, compras a proveedores y reportes de negocio, todo desde una única plataforma web.

### Qué puede hacer el sistema

| Función | Descripción |
|---|---|
| Facturación electrónica | Genera, firma y envía comprobantes al SRI en tiempo real |
| Clientes | Registro de compradores con validación de identificación |
| Productos | Catálogo con precios, IVA y campos específicos por tipo de negocio |
| Inventario | Control de stock por sucursal, alertas de mínimo, movimientos y transferencias |
| Compras | Registro de ingresos de mercadería y gestión de proveedores |
| Reportes | Ventas por período, resumen IVA Form. 104 y top productos con exportación CSV |
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

Haga clic en su **avatar** (esquina superior derecha) y luego en **Cerrar sesión**. La sesión se invalida inmediatamente en el servidor.

---

## 3. Barra superior

La barra superior es visible en todas las pantallas del sistema y contiene dos elementos en el lado derecho:

### Notificaciones (campana)

El ícono de campana muestra alertas activas del sistema. Actualmente reporta **productos con stock por debajo del mínimo configurado**.

| Indicador | Significado |
|---|---|
| Sin número | Todo en orden — ningún producto bajo el mínimo |
| Número rojo | Cantidad de productos que requieren reabastecimiento |

Al hacer clic en la campana se despliega un panel con el detalle de cada alerta:

- Nombre del producto y código
- Sucursal afectada
- Stock actual (en rojo) vs. mínimo configurado
- Chip **"Pedir +X"** con la cantidad exacta que falta para llegar al mínimo

Al pie del panel hay un enlace directo a **Ver inventario completo**.

> Las alertas se actualizan automáticamente cada 5 minutos. Si acaba de registrar una compra o ajuste, recargue la página para ver el estado inmediato.

### Perfil de usuario

El avatar con sus iniciales abre un menú con:

- Nombre completo y correo electrónico
- Rol (**Admin** o **Empleado**) y sucursal asignada
- Botón **Cerrar sesión**

---

## 4. Panel principal (Dashboard)

El dashboard muestra un resumen del estado de su facturación:

| Sección | Qué muestra |
|---|---|
| Total del mes | Importe total facturado en el mes en curso |
| Facturas emitidas | Cantidad de comprobantes del mes |
| Pendientes de autorizar | Facturas enviadas al SRI que aún no tienen respuesta |
| Acceso rápido | Botón directo a crear una nueva factura |

Los datos se actualizan cada vez que accede a la página.

---

## 5. Facturas

### 5.1 Listado de facturas

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

### 5.2 Crear una factura

Haga clic en **Nueva Factura** (desde el listado o desde el botón del menú lateral).

#### Paso 1 — Seleccionar cliente

Haga clic en el campo de cliente y empiece a escribir el nombre, cédula o RUC. El sistema buscará automáticamente entre sus clientes registrados. Seleccione el cliente con un clic o presionando **Enter**.

> Si el cliente no existe, créelo primero desde el módulo **Clientes**.

#### Paso 2 — Fecha de emisión

Por defecto es la fecha actual. Puede cambiarla si necesita emitir con fecha retroactiva (dentro de los límites que acepta el SRI).

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

**Productos favoritos:** Si tiene productos marcados con ★, aparecen como accesos rápidos en la parte superior del formulario.

#### Paso 4 — Forma de pago y monto

Seleccione la **forma de pago**:

| Código SRI | Descripción |
|---|---|
| Efectivo | Pago en billetes o monedas |
| Transferencia bancaria | Depósito o transferencia |
| Tarjeta de crédito | Pago con tarjeta |

Ingrese el **monto recibido** del cliente. El sistema calcula el vuelto automáticamente.

#### Paso 5 — Observaciones (opcional)

Campo libre para notas internas o referencias. No aparece en el XML enviado al SRI.

#### Paso 6 — Emitir factura

Haga clic en **Emitir Factura**. El sistema:

1. Guarda la factura con estado **PENDIENTE**
2. Genera el XML según el formato SRI
3. Firma el XML con su certificado digital (.p12)
4. Envía el comprobante al servidor del SRI
5. Actualiza el estado a **ENVIADO** o **AUTORIZADO** según la respuesta

### 5.3 Enviar factura al SRI manualmente

Si una factura quedó en **PENDIENTE**, puede reenviarla desde el listado haciendo clic en **Enviar SRI**.

### 5.4 Anular una factura

Solo las facturas **AUTORIZADAS** pueden anularse.

1. Abra el detalle de la factura
2. Haga clic en **Anular**
3. Ingrese el motivo de anulación
4. Confirme la acción

> La anulación cambia el estado localmente. El proceso ante el SRI para invalidar el número de autorización debe gestionarse según los procedimientos vigentes.

### 5.5 Descargar PDF

Desde el detalle de una factura autorizada, haga clic en **Descargar PDF**. El PDF incluye todos los datos del comprobante, totales por tipo de IVA, forma de pago y número de autorización.

---

## 6. Clientes

### 6.1 Listado y búsqueda

Ingrese a **Clientes** desde el menú. Puede buscar por nombre o número de identificación.

### 6.2 Crear o editar un cliente

Haga clic en **+ Nuevo Cliente** o en **Editar** en la fila de un cliente existente.

| Campo | Descripción |
|---|---|
| Tipo de identificación | Cédula, RUC, Pasaporte o Consumidor Final |
| Identificación | Número de cédula, RUC o pasaporte |
| Razón Social | Nombre completo o razón social |
| Email | Correo electrónico (opcional) |
| Teléfono | Número de contacto (opcional) |
| Dirección | Dirección del cliente (opcional) |

> **Consumidor Final:** Use esta opción para ventas donde el cliente no proporciona datos. La identificación se llena automáticamente con el valor requerido por el SRI (`9999999999999`).

### 6.3 Importar clientes desde CSV

Haga clic en **Importar CSV** y seleccione un archivo `.csv` con el siguiente formato:

```
tipoIdentif,identificacion,razonSocial,email,telefono,direccion
CEDULA,1712345678,Juan Pérez,juan@email.com,0991234567,Quito
RUC,1790123456001,Empresa ABC S.A.,,,Av. 6 de Diciembre
```

El sistema actualizará los registros existentes (por identificación) y creará los nuevos. Al finalizar verá un resumen con creados, actualizados y errores.

---

## 7. Productos

### 7.1 Listado y búsqueda

Ingrese a **Productos**. Puede buscar por código, descripción o código de barras. Los productos aparecen con código, descripción, tipo, precio con unidad de medida, IVA y acciones.

**Marcar como favorito:** Haga doble clic en una fila o clic en el ícono ★/☆. Los favoritos aparecen como acceso rápido al crear facturas.

### 7.2 Crear o editar un producto

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

Los campos extra solo aparecen si su empresa tiene configurado el tipo correspondiente (ver [Empresa](#11-empresa)).

**Farmacia:** Principio activo, lote, vencimiento (obligatorio), registro sanitario ARCSA, requiere receta.

**Minimarket:** Código de barras, unidad de medida, lote, vencimiento.

**Ferretería:** Código de barras, unidad de medida.

**Licorera:** Grados de alcohol (%), volumen (ml), país de origen.

### 7.3 Código de barras

Si su tipo de negocio habilita este campo, puede usar un lector de barras USB: apunte al código, escanéelo, y el sistema localiza el producto automáticamente en cualquier buscador.

### 7.4 Configurar inventario por producto

Desde la tabla de productos, haga clic en **Stock** (visible solo para bienes y administradores):

| Campo | Descripción |
|---|---|
| Activar control de stock | Habilita el seguimiento de inventario para este producto |
| Costo Promedio (USD) | Costo de adquisición inicial |
| Stock Mínimo | Cantidad mínima — al caer bajo este valor se genera una alerta |

> **Importante:** El stock mínimo configurado aquí se aplica a todos los registros de stock del producto (todas las sucursales). Para ajustar el mínimo por sucursal individualmente, use la edición directa en la tabla de **Inventario**.

---

## 8. Inventario

El módulo de inventario permite ver y gestionar el stock de todos los productos con seguimiento activado. Disponible según el tipo de negocio (los restaurantes no lo tienen activo).

### 8.1 Panel de alertas

Si hay productos con stock **igual o menor al mínimo configurado**, la pantalla muestra un panel de alerta al inicio con una tabla que indica:

- Código y nombre del producto
- Sucursal afectada
- **Stock actual** (en rojo)
- Mínimo configurado
- **Déficit** — cantidad exacta que hay que reponer

Este mismo conteo aparece en la **campana de la barra superior** como número rojo, visible desde cualquier pantalla del sistema.

### 8.2 Tabla de stock

Muestra todos los productos con inventario activo, con columnas: código, producto, tipo, sucursal, cantidad actual, mínimo, costo promedio y estado (Normal / Stock bajo).

#### Editar el stock mínimo directamente

En la columna **Mín.**, haga clic en el número para editarlo en línea:

1. El número se convierte en un campo editable (borde amarillo)
2. Escriba el nuevo valor
3. Presione **Enter** para guardar o **Escape** para cancelar

El cambio se guarda de inmediato y la alerta se activa o desactiva automáticamente según el nuevo mínimo.

### 8.3 Ajuste de inventario

Los administradores pueden realizar ajustes directos haciendo clic en **+ Ajuste**:

1. Seleccione el producto
2. Seleccione la sucursal
3. Ingrese la cantidad (positiva para incrementar, negativa para reducir)
4. Ingrese el costo unitario y una nota explicativa
5. Guarde el ajuste

Cada ajuste queda registrado en el kardex con fecha, usuario y motivo.

### 8.4 Kardex (historial de movimientos)

Ingrese a **Inventario → Kardex** para ver el historial completo:

| Tipo de movimiento | Descripción |
|---|---|
| ENTRADA | Ingreso por compra o ajuste positivo |
| SALIDA | Despacho por venta o ajuste negativo |
| AJUSTE_POSITIVO | Corrección positiva manual |
| AJUSTE_NEGATIVO | Corrección negativa manual |
| TRANSFERENCIA_IN | Mercadería recibida de otra sucursal |
| TRANSFERENCIA_OUT | Mercadería enviada a otra sucursal |

Cada movimiento muestra: fecha, usuario, cantidad, costo unitario, costo total y saldo resultante.

### 8.5 Transferencias entre sucursales

En **Inventario → Transferencias**, haga clic en **Nueva Transferencia**:

1. Seleccione sucursal origen y destino
2. Agregue los productos con sus cantidades
3. Confirme

El stock se descuenta en origen y se acredita en destino simultáneamente. Ambos movimientos quedan enlazados en el kardex.

---

## 9. Compras y Proveedores

Este módulo cierra el ciclo de inventario: registra los ingresos de mercadería y actualiza el stock automáticamente.

### 9.1 Proveedores

Ingrese a **Compras** y seleccione la pestaña **Proveedores**.

#### Crear o editar un proveedor

Haga clic en **+ Nuevo Proveedor**:

| Campo | Descripción |
|---|---|
| Nombre | Razón social o nombre del proveedor |
| RUC | Número de RUC del proveedor (opcional) |
| Email | Correo de contacto (opcional) |
| Teléfono | Número de contacto (opcional) |
| Dirección | Dirección del proveedor (opcional) |

Para editar, haga clic en **Editar** en la fila. Para eliminar (desactivar), use **Eliminar**.

### 9.2 Registrar una compra

En la pestaña **Compras**, haga clic en **+ Nueva Compra**.

#### Datos del documento

| Campo | Descripción |
|---|---|
| Proveedor | Seleccione de la lista o deje vacío si no tiene proveedor registrado |
| Sucursal | Sucursal donde ingresa la mercadería |
| Tipo de Documento | Factura, Nota de Entrega, Liquidación de Compra u Otro |
| N° Documento | Número del documento del proveedor (ej. 001-001-000000123) |
| Fecha de Compra | Fecha en que se recibió la mercadería |
| Notas | Observaciones opcionales |

#### Ítems de la compra

Por cada producto recibido:

1. Busque el producto en el **buscador** (escriba nombre o código)
2. Verifique o complete la **descripción** (editable aunque se seleccione un producto)
3. Ingrese la **cantidad** recibida
4. Ingrese el **costo unitario** (precio de compra sin IVA)

El sistema calcula el total en tiempo real. Puede agregar líneas con **+ Agregar ítem** y eliminarlas con **✕**.

> **Ítems sin producto vinculado:** Puede registrar líneas escribiendo directamente la descripción sin seleccionar un producto del catálogo. En ese caso no se actualiza el inventario, pero queda el registro de gasto.

#### Efecto en inventario

Al guardar la compra, para cada ítem que tenga un producto vinculado con **control de stock activo**:

- Se registra un movimiento **ENTRADA** en el kardex
- Se actualiza el stock de la sucursal seleccionada
- Se recalcula el **costo promedio ponderado** del producto automáticamente

### 9.3 Ver detalle de una compra

En el listado de compras, haga clic en **Ver** para acceder al detalle completo: datos del documento, proveedor, ítems, costos y totales.

### 9.4 Filtrar compras por período

Use los campos **Desde** y **Hasta** en la pestaña Compras y haga clic en **Filtrar**. Al pie de la tabla se muestra el total del período filtrado.

---

## 10. Reportes

El módulo de reportes permite analizar las ventas del negocio y preparar la información para declaraciones tributarias.

Ingrese a **Reportes** desde el menú lateral.

### 10.1 Selector de período

Elija un período predefinido con un clic:

| Preset | Cobertura |
|---|---|
| Hoy | Solo el día actual |
| Esta semana | Lunes al día actual |
| Este mes | Del 1 al día actual del mes en curso |
| Mes anterior | El mes calendario anterior completo |
| Este trimestre | Los últimos 3 meses |
| Este año | Del 1 de enero al día actual |

O use **Personalizado** para definir un rango exacto con fechas **Desde** y **Hasta**, luego haga clic en **Aplicar**.

### 10.2 Tab Ventas

Muestra un análisis de las ventas del período seleccionado.

**Tarjetas de resumen:**

| Tarjeta | Descripción |
|---|---|
| Facturas | Cantidad de comprobantes emitidos (excluye anuladas y rechazadas) |
| Subtotal | Suma de los subtotales sin IVA |
| IVA Cobrado | Total de IVA recaudado |
| **Total** | Importe total facturado (destacado en amarillo) |

**Tabla por período:**
- Si el rango es **≤ 31 días**: agrupa por día
- Si el rango es **> 31 días**: agrupa por mes

Cada fila muestra: período, N° facturas, subtotal, IVA y total. La fila de pie suma todos los valores.

**Exportar CSV:** Haga clic en **Exportar CSV** para descargar los datos en formato compatible con Excel. El archivo incluye encabezados y está codificado en UTF-8 con BOM para correcta visualización en Excel.

### 10.3 Tab IVA Form. 104

Presenta el resumen de IVA del período, organizado según los campos del **Formulario 104** del SRI que debe presentar mensualmente.

| Campo Form. 104 | Descripción |
|---|---|
| **401** — Base imponible tarifa 0% | Ventas gravadas al 0% |
| **405** — Base imponible tarifa 5% | Ventas gravadas al 5% (si aplica) |
| **412** — Base imponible gravada 15% | Ventas gravadas a la tarifa estándar |
| **413** — IVA generado 15% | IVA cobrado en ventas gravadas |
| Total ventas con IVA | Suma de todas las ventas del período |

> Este resumen es referencial. Valídelo siempre con su contador antes de declarar.

**Exportar CSV:** El archivo generado está listo para entregar al contador.

### 10.4 Tab Top Productos

Ranking de los 10 productos con mayor monto vendido en el período:

- Posición (el #1 destacado en amarillo)
- Código y descripción
- Cantidad total vendida
- Subtotal sin IVA

**Exportar CSV:** Descarga el ranking completo.

---

## 11. Empresa

Esta sección solo es accesible para usuarios con rol **ADMIN**.

### 11.1 Datos tributarios

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

> **Secuencial Inicial:** Solo tiene efecto antes de emitir la primera factura.

### 11.2 Tipo de negocio

El campo **Giro del negocio** determina qué campos, módulos y validaciones están activos en todo el sistema.

| Valor | Negocio |
|---|---|
| General | Tienda genérica sin lógica especial |
| Farmacia | Habilita lote, vencimiento, registro ARCSA y receta |
| Minimarket | Habilita código de barras, unidad de medida, lote y vencimiento |
| Licorera | Habilita grados de alcohol, volumen y país de origen |
| Restaurante | Oculta el módulo de inventario |
| Ropa y Calzado | Configuración estándar con inventario |
| Ferretería | Habilita código de barras y unidad de medida |

### 11.3 Configuración SRI

| Campo | Opciones |
|---|---|
| Ambiente | **Pruebas** (sin validez legal) o **Producción** (válido ante el SRI) |
| Tipo de Emisión | Normal o Indisponibilidad del sistema |

### 11.4 Logo de la empresa

Aparece en el PDF de las facturas. Formatos aceptados: PNG, JPG, SVG, WebP. Tamaño máximo: 2 MB.

### 11.5 Certificado digital

El certificado de firma electrónica (.p12) es obligatorio para emitir facturas válidas.

1. En la sección **Cargar Certificado**, seleccione su archivo `.p12` o `.pfx`
2. Ingrese la contraseña del certificado
3. Haga clic en **Cargar Certificado**

El sistema muestra la vigencia (fecha desde/hasta) y huella digital. Si ya existe un certificado activo, el nuevo lo reemplaza.

---

## 12. Sucursales

Accesible solo para **ADMIN**.

Una sucursal representa un local o punto de venta físico. Cada usuario puede estar asignado a una sucursal, y el stock y las facturas se registran por sucursal.

### Crear una sucursal

1. Ingrese a **Sucursales**
2. Haga clic en **+ Nueva Sucursal**
3. Complete nombre y dirección
4. Guarde

### Editar o desactivar

Haga clic en **Editar** en la fila de la sucursal. Las sucursales desactivadas no aparecen como opciones de asignación para nuevos usuarios.

---

## 13. Usuarios

Accesible solo para **ADMIN**.

### Crear un usuario

1. Ingrese a **Usuarios**
2. Haga clic en **+ Nuevo Usuario**

| Campo | Descripción |
|---|---|
| Nombre | Nombre completo del usuario |
| Email | Correo con el que iniciará sesión |
| Contraseña | Mínimo 6 caracteres |
| Rol | Admin o Empleado |
| Sucursal | Sucursal asignada (opcional) |

### Editar y desactivar

Haga clic en **Editar** en la fila del usuario. En el formulario de edición, desmarque **Usuario activo** para desactivarlo. El usuario no podrá iniciar sesión pero sus facturas y movimientos se conservan.

---

## 14. Tipos de negocio

### GENERAL — Tienda genérica

Configuración base. Sin campos extra. Ideal para negocios que no encajan en las categorías específicas.

**Módulos activos:** Facturación, clientes, productos, inventario, compras, reportes.

---

### PHARMACY — Farmacia

**Campos extra en productos:** Principio activo, lote, vencimiento (obligatorio), registro sanitario ARCSA, requiere receta.

**Código de barras activo** para escaneo de medicamentos.

**Validación de vencimiento:** El sistema requiere ingresar fecha de vencimiento; no puede quedar vacía.

---

### LIQUOR_STORE — Licorera

**Campos extra en productos:** Grados de alcohol (%), volumen (ml), país de origen.

---

### GROCERY — Minimarket / Abarrotes

**Campos extra en productos:** Código de barras (EAN-13/UPC), unidad de medida, lote, vencimiento.

**Búsqueda por código de barras** en cualquier buscador del sistema.

---

### RESTAURANT — Restaurante

El módulo de **Inventario** y **Compras** está oculto. Los productos representan platos del menú.

---

### CLOTHING_STORE — Ropa y Calzado

Configuración estándar con inventario habilitado. Se recomienda codificar las variantes en el código principal (ej. `CAMISA-M-AZUL`).

---

### HARDWARE_STORE — Ferretería

**Campos extra en productos:** Código de barras (EAN-13/UPC), unidad de medida.

El precio se muestra con la unidad en el catálogo (ej. `$12.50/kg`).

---

## 15. Roles y permisos

| Función | ADMIN | EMPLEADO |
|---|---|---|
| Crear facturas | ✅ | ✅ |
| Ver facturas | ✅ | ✅ (su sucursal) |
| Anular facturas | ✅ | ✅ |
| Gestionar clientes | ✅ | ✅ |
| Gestionar productos | ✅ | ✅ |
| Ver inventario | ✅ | ✅ |
| Ajustar stock | ✅ | ❌ |
| Editar stock mínimo | ✅ | ❌ |
| Crear transferencias | ✅ | ❌ |
| Configurar inventario por producto | ✅ | ❌ |
| Ver reportes | ✅ | ✅ |
| Exportar reportes CSV | ✅ | ✅ |
| Ver compras | ✅ | ✅ |
| Registrar compras | ✅ | ✅ |
| Gestionar proveedores | ✅ | ✅ |
| Gestionar sucursales | ✅ | ❌ |
| Gestionar usuarios | ✅ | ❌ |
| Configurar empresa | ✅ | ❌ |
| Cambiar tipo de negocio | ✅ | ❌ |
| Cargar certificado digital | ✅ | ❌ |

---

## 16. Preguntas frecuentes

**¿Por qué una factura queda en estado PENDIENTE?**
Puede ocurrir por falta de conectividad con los servidores del SRI o un problema temporal. Desde el listado de facturas puede reenviarla haciendo clic en **Enviar SRI**.

**¿Puedo modificar una factura ya emitida?**
No. Las facturas electrónicas son inmutables una vez enviadas al SRI. Si necesita corregir un error, anule la factura y emita una nueva.

**¿Qué pasa si mi certificado digital caduca?**
El sistema no podrá firmar nuevas facturas. Renueve su certificado con un proveedor autorizado y cárguelo en **Empresa → Cargar Certificado** antes de la fecha de vencimiento.

**¿Cómo funciona el ambiente de Pruebas?**
Las facturas se envían al servidor de certificación del SRI (`celcer.sri.gob.ec`) y no tienen validez tributaria. Cambie a **Producción** cuando esté listo para operar.

**¿Cómo activo las alertas de stock mínimo?**
En la tabla de **Inventario**, haga clic en el número de la columna **Mín.** para editarlo. También puede configurarlo desde **Productos → Stock**. Una vez que el stock caiga igual o por debajo de ese número, la alerta aparece en la campana de la barra superior y en el panel de inventario.

**¿Por qué la campana no muestra ninguna alerta aunque el stock es bajo?**
Las alertas se basan en el **stock mínimo configurado**. Si el mínimo es `0` (valor por defecto), ningún producto disparará una alerta aunque tenga pocas unidades. Configure el mínimo acorde a su operación: por ejemplo, si trabaja con lotes de 10 unidades, ponga el mínimo en `10` para que la alerta aparezca cuando quede 1 pedido completo pendiente.

**¿El registro de una compra actualiza el inventario automáticamente?**
Sí. Al guardar una compra, cada ítem que tenga un producto vinculado con control de stock activo genera una **ENTRADA** en el kardex, actualiza el stock de la sucursal y recalcula el costo promedio ponderado.

**¿Puedo registrar una compra sin proveedor?**
Sí. El campo proveedor es opcional. Puede registrar ingresos de mercadería aunque no tenga el proveedor cargado en el sistema.

**¿Qué es el Form. 104 en Reportes?**
Es el Formulario 104 que el SRI exige para la declaración mensual del IVA. El tab **IVA Form. 104** en Reportes organiza sus ventas exactamente con los campos que necesita ese formulario (bases imponibles 0%, 5%, 15% e IVA generado). Compártalo con su contador para agilizar la declaración.

**¿Puedo usar el sistema desde el celular?**
Sí. La interfaz es responsiva, aunque la experiencia óptima es en pantallas de escritorio.

**¿Qué significa "vuelto" en la factura?**
Es el cambio que recibe el cliente cuando paga más del total. El sistema lo calcula automáticamente. Queda registrado en la factura pero no afecta los totales tributarios reportados al SRI.

---

*Versión del documento: Sistema con facturación electrónica SRI, inventario multi-sucursal, compras y proveedores, reportes con exportación CSV, alertas de stock y panel de notificaciones.*
