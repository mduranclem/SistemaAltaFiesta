# Sistema Alta Fiesta — Backend API

Sistema de gestión comercial con inventario, punto de venta y cierre de caja diario.

**Stack:** Python 3.10+ · FastAPI · SQLite · SQLAlchemy 2.0 · Pydantic v2

---

## Requisitos previos

- Python 3.10 o superior instalado y en el PATH
  → Descarga: https://www.python.org/downloads/

---

## Instalación (primera vez)

### Windows (doble clic o terminal)
```bat
setup.bat
```

### Manual (cualquier OS)
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
```

---

## Iniciar el servidor

```bash
# Windows rápido:
run.bat

# O manualmente:
venv\Scripts\activate
uvicorn app.main:app --reload
```

El servidor queda disponible en: **http://localhost:8000**

---

## Documentación interactiva (Swagger UI)

Abre en el navegador:
**http://localhost:8000/docs**

Desde ahí podés probar todos los endpoints directamente, sin Postman.

---

## Estructura del proyecto

```
SistemaAltaFiesta/
├── app/
│   ├── main.py               # Punto de entrada FastAPI
│   ├── core/
│   │   └── config.py         # Configuración (lee .env)
│   ├── database/
│   │   └── session.py        # Motor SQLite y sesión
│   ├── models/               # Tablas (SQLAlchemy ORM)
│   │   ├── product.py        # Producto + stock + precios
│   │   ├── sale.py           # Venta + ítems
│   │   ├── expense.py        # Gastos diarios
│   │   └── cash_close.py     # Cierre de caja
│   ├── schemas/              # Validación de datos (Pydantic)
│   │   ├── product.py
│   │   ├── sale.py
│   │   ├── expense.py
│   │   └── cash_close.py
│   ├── services/             # Lógica de negocio
│   │   ├── product_service.py
│   │   ├── sale_service.py
│   │   └── finance_service.py
│   └── api/v1/
│       ├── router.py
│       └── endpoints/
│           ├── products.py   # Inventario y precios
│           ├── sales.py      # POS
│           └── finances.py   # Gastos y cierre de caja
├── tests/
│   └── test_products.py
├── .env                      # Variables de entorno
├── requirements.txt
├── setup.bat
└── run.bat
```

---

## Módulos disponibles

### Inventario (`/api/v1/products`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/products/` | Crear producto |
| GET | `/products/` | Listar productos |
| GET | `/products/{id}` | Obtener producto |
| PATCH | `/products/{id}` | Editar datos |
| PATCH | `/products/{id}/price` | Actualizar costo/margen → recalcula PVP |
| POST | `/products/prices/bulk-margin` | Actualizar margen masivamente |
| POST | `/products/{id}/stock` | Ajustar stock (entrada/salida) |
| GET | `/products/low-stock` | Alerta de stock bajo |
| DELETE | `/products/{id}` | Desactivar producto |

### Punto de Venta (`/api/v1/sales`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/sales/` | Registrar venta (descuenta stock) |
| GET | `/sales/{id}` | Ver venta |
| GET | `/sales/?date=YYYY-MM-DD` | Ventas del día |

### Finanzas (`/api/v1/finances`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/finances/expenses` | Registrar gasto |
| GET | `/finances/expenses?date=YYYY-MM-DD` | Gastos del día |
| GET | `/finances/summary?date=YYYY-MM-DD` | Resumen diario (preview) |
| POST | `/finances/close?date=YYYY-MM-DD` | Cierre de caja |
| GET | `/finances/closes` | Historial de cierres |

---

## Ejemplos de uso rápido

### 1. Crear un producto
```json
POST /api/v1/products/
{
  "name": "Coca Cola 500ml",
  "sku": "CC-500",
  "category": "Bebidas",
  "unit_type": "unidad",
  "stock": 100,
  "min_stock": 10,
  "cost_price": 500.00,
  "margin_percent": 40.0
}
```
→ El sistema calcula automáticamente: `sale_price = 500 * 1.40 = 700.00`

### 2. Registrar una venta en efectivo
```json
POST /api/v1/sales/
{
  "payment_method": "efectivo",
  "items": [
    {"product_id": 1, "quantity": 3}
  ]
}
```
→ Descuenta 3 unidades del stock y registra `total = 2100.00`

### 3. Cierre de caja del día
```
GET  /api/v1/finances/summary?date=2026-03-30   ← preview
POST /api/v1/finances/close?date=2026-03-30     ← guarda el cierre
```

### 4. Actualizar margen a toda la categoría "Bebidas"
```
POST /api/v1/products/prices/bulk-margin?new_margin=45&category=Bebidas
```

---

## Correr los tests

```bash
venv\Scripts\activate
pytest tests/ -v
```

---

## Variables de entorno (`.env`)

| Variable | Valor por defecto | Descripción |
|----------|-------------------|-------------|
| `DATABASE_URL` | `sqlite:///./altafiesta.db` | Ruta de la base de datos |
| `APP_NAME` | `Sistema Alta Fiesta` | Nombre de la app |
| `DEBUG` | `True` | Activa logs SQL en consola |

---

## Lógica de precios

```
PVP = Costo × (1 + Margen% / 100)
```

Cada vez que se actualiza el `cost_price` o el `margin_percent`, el `sale_price` se recalcula automáticamente. La actualización masiva (`bulk-margin`) afecta todos los productos activos o solo los de una categoría específica.
