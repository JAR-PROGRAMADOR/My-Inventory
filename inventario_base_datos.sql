-- =====================================================================
-- SISTEMA DE INVENTARIO - ESQUEMA DE BASE DE DATOS
-- Compatible con MySQL 8+ / MariaDB 10.4+
-- Roles: empleado, supervisor, dueño
-- =====================================================================

CREATE DATABASE IF NOT EXISTS inventario_empresa
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE inventario_empresa;

-- ---------------------------------------------------------------------
-- 1. ROLES
-- ---------------------------------------------------------------------
CREATE TABLE roles (
  id          TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(30) NOT NULL UNIQUE,
  nivel       TINYINT UNSIGNED NOT NULL  -- 1=empleado 2=supervisor 3=dueño (jerarquía)
) ENGINE=InnoDB;

INSERT INTO roles (nombre, nivel) VALUES
  ('empleado', 1),
  ('supervisor', 2),
  ('dueño', 3);

-- ---------------------------------------------------------------------
-- 2. USUARIOS
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre_completo VARCHAR(120) NOT NULL,
  usuario         VARCHAR(50)  NOT NULL UNIQUE,
  -- NUNCA guardar contraseñas en texto plano en producción: usar hash (bcrypt/argon2)
  password_hash   VARCHAR(255) NOT NULL,
  rol_id          TINYINT UNSIGNED NOT NULL,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  -- Cuentas creadas por auto-registro nacen con pendiente=TRUE y activo=FALSE;
  -- un supervisor o el dueño las revisa y aprueba (ver tabla solicitudes_registro).
  pendiente       BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rol_id) REFERENCES roles(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2.1 SOLICITUDES DE REGISTRO (auditoría del auto-registro)
--     Además de marcar al usuario como pendiente, se guarda un registro
--     separado de cada solicitud para trazabilidad de quién la aprobó
--     o rechazó y cuándo.
-- ---------------------------------------------------------------------
CREATE TABLE solicitudes_registro (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id     INT UNSIGNED NOT NULL,
  estado         ENUM('pendiente','aprobada','rechazada') NOT NULL DEFAULT 'pendiente',
  revisado_por   INT UNSIGNED NULL,
  rol_asignado   TINYINT UNSIGNED NULL,
  creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resuelto_en    DATETIME NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (revisado_por) REFERENCES usuarios(id),
  FOREIGN KEY (rol_asignado) REFERENCES roles(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. CATEGORÍAS Y PROVEEDORES
-- ---------------------------------------------------------------------
CREATE TABLE categorias (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(80) NOT NULL UNIQUE,
  descripcion VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE TABLE proveedores (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(120) NOT NULL,
  contacto  VARCHAR(120) NULL,
  telefono  VARCHAR(30)  NULL,
  email     VARCHAR(120) NULL,
  activo    BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. PRODUCTOS
--    Restricciones clave:
--    - stock y stock_minimo son enteros y NUNCA pueden ser negativos (CHECK).
--    - precios son decimales y NUNCA pueden ser negativos (CHECK).
--    - código único por producto.
-- ---------------------------------------------------------------------
CREATE TABLE productos (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo         VARCHAR(30)  NOT NULL UNIQUE,
  nombre         VARCHAR(150) NOT NULL,
  descripcion    VARCHAR(255) NULL,
  categoria_id   INT UNSIGNED NULL,
  proveedor_id   INT UNSIGNED NULL,
  precio_compra  DECIMAL(12,2) NOT NULL DEFAULT 0,
  precio_venta   DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock          INT NOT NULL DEFAULT 0,
  stock_minimo   INT NOT NULL DEFAULT 0,
  unidad_medida  VARCHAR(20) NOT NULL DEFAULT 'unidad',
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id),
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
  CONSTRAINT chk_stock_no_negativo         CHECK (stock >= 0),
  CONSTRAINT chk_stock_minimo_no_negativo  CHECK (stock_minimo >= 0),
  CONSTRAINT chk_precio_compra_no_negativo CHECK (precio_compra >= 0),
  CONSTRAINT chk_precio_venta_no_negativo  CHECK (precio_venta >= 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. MOVIMIENTOS DE INVENTARIO (auditoría / trazabilidad)
--    - cantidad siempre positiva (el signo lo da el "tipo").
--    - guarda stock_anterior y stock_nuevo para trazabilidad completa.
-- ---------------------------------------------------------------------
CREATE TABLE movimientos_inventario (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  producto_id    INT UNSIGNED NOT NULL,
  usuario_id     INT UNSIGNED NOT NULL,
  tipo           ENUM('entrada','salida','ajuste') NOT NULL,
  cantidad       INT NOT NULL,
  stock_anterior INT NOT NULL,
  stock_nuevo    INT NOT NULL,
  motivo         VARCHAR(255) NULL,
  creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT chk_cantidad_positiva   CHECK (cantidad > 0),
  CONSTRAINT chk_stock_nuevo_valido  CHECK (stock_nuevo >= 0)
) ENGINE=InnoDB;

CREATE INDEX idx_mov_producto ON movimientos_inventario(producto_id);
CREATE INDEX idx_mov_fecha    ON movimientos_inventario(creado_en);

-- ---------------------------------------------------------------------
-- 6. TRIGGERS DE SEGURIDAD ADICIONAL
--    Aunque el CHECK de la tabla productos ya impide stock negativo,
--    este trigger da un mensaje de error claro y evita que un UPDATE
--    directo (fuera de la lógica de la aplicación) deje stock negativo.
-- ---------------------------------------------------------------------
DELIMITER $$

CREATE TRIGGER trg_productos_stock_no_negativo
BEFORE UPDATE ON productos
FOR EACH ROW
BEGIN
  IF NEW.stock < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'El stock de un producto no puede ser negativo.';
  END IF;
END$$

CREATE TRIGGER trg_movimientos_cantidad_valida
BEFORE INSERT ON movimientos_inventario
FOR EACH ROW
BEGIN
  IF NEW.cantidad <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'La cantidad de un movimiento debe ser un entero positivo.';
  END IF;
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- 7. VISTAS ÚTILES PARA REPORTES POR ROL
-- ---------------------------------------------------------------------

-- Vista de alertas de stock bajo (visible para todos los roles)
CREATE VIEW vw_alertas_stock_bajo AS
SELECT id, codigo, nombre, stock, stock_minimo
FROM productos
WHERE activo = TRUE AND stock <= stock_minimo;

-- Vista de valorización de inventario (solo debe exponerse a supervisor y dueño
-- desde la capa de la aplicación, ya que incluye precio_compra)
CREATE VIEW vw_valorizacion_inventario AS
SELECT
  p.id, p.codigo, p.nombre, p.stock,
  p.precio_compra, p.precio_venta,
  (p.stock * p.precio_compra) AS valor_costo_total,
  (p.stock * p.precio_venta)  AS valor_venta_total
FROM productos p
WHERE p.activo = TRUE;

-- ---------------------------------------------------------------------
-- 8. ARRANQUE DEL SISTEMA
--    Esta base de datos se entrega vacía a propósito: sin usuarios ni
--    productos precargados. La aplicación debe implementar la misma
--    regla que la versión web: si la tabla `usuarios` está vacía, el
--    primer registro que se cree se activa automáticamente con rol
--    'dueño' (bootstrap), para que exista alguien capaz de aprobar a los
--    siguientes usuarios. A partir de ahí, todo registro nuevo entra con
--    rol 'empleado', activo = FALSE y pendiente = TRUE hasta que un
--    supervisor o el dueño lo apruebe.

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. Los CHECK constraints garantizan a nivel de base de datos que:
--      - stock y stock_minimo nunca sean negativos.
--      - precio_compra y precio_venta nunca sean negativos.
--      - cantidad de un movimiento siempre sea un entero positivo.
--    Esto es la última línea de defensa: la aplicación (backend/frontend)
--    debe validar los mismos campos ANTES de enviarlos a la base de datos,
--    rechazando texto no numérico en campos numéricos.
--
-- 2. El control de "quién puede hacer qué" (roles) se maneja en dos capas:
--      a) rol_id en la tabla usuarios (quién es quién).
--      b) lógica de permisos en el backend, que decide qué endpoints/
--         acciones puede ejecutar cada rol (empleado / supervisor / dueño).
--    La base de datos no impone permisos por sí sola: eso lo hace el
--    backend antes de ejecutar cualquier INSERT/UPDATE/DELETE.
--
-- 3. Todo cambio de stock debe hacerse SIEMPRE a través de un registro en
--    movimientos_inventario (nunca con un UPDATE directo a productos.stock
--    desde la aplicación), para mantener trazabilidad completa de quién,
--    cuándo y por qué cambió el inventario.
--
-- 4. Auto-registro: cualquier persona puede solicitar una cuenta, pero nace
--    con pendiente=TRUE y activo=FALSE (no puede iniciar sesión todavía).
--    El backend debe forzar el rol por defecto a 'empleado' en el registro
--    público; solo un usuario con rol 'dueño' puede aprobar una solicitud
--    asignando rol 'supervisor' o 'dueño'. Un 'supervisor' que aprueba solo
--    puede dejar el rol en 'empleado'.
-- =====================================================================
