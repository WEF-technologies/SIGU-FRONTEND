# SIGU-FRONTEND

Este proyecto es el **frontend** para el sistema de gestión de flotas y contratos de **Servimont (SIGU)**. Permite la administración de choferes, contratos y vehículos de manera sencilla y eficiente.

---

## 🚗 ¿Qué es SIGU?

SIGU (Sistema Integral de Gestión de Unidades) es una plataforma desarrollada para Servimont, orientada a la gestión de flotas, choferes y contratos, facilitando el control y la operación diaria de la empresa.

---

## 🛠️ Tecnologías utilizadas

- **React** (Vite)
- **TypeScript**
- **Tailwind CSS**
- **Radix UI**
- **Lucide React Icons**
- **React Router**

---

## ⚡ Instalación y uso local

1. Clona el repositorio:
   ```bash
   git clone https://github.com/WEF-technologies/SIGU-FRONTEND.git
   cd SIGU-FRONTEND
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

4. Accede a la aplicación en [http://localhost:8080](http://localhost:8080)

---

## 🔐 Roles y permisos

Desde el backend del 26/10 (PR "security") cada usuario tiene un rol y el backend responde **403** a lo que su rol no puede hacer. El frontend oculta del menú, de las rutas y de los botones lo que el rol no puede usar. La tabla vive en `src/lib/permissions.ts` y es un espejo de `src/main.py` del backend: si el backend cambia un permiso, hay que cambiarlo también ahí.

| Módulo | Gerente | Administrador | Mantenimiento |
| --- | --- | --- | --- |
| Usuarios | ✅ | — | — |
| Contratos | ✅ | 👁️ solo lectura | — |
| Vehículos | ✅ | ✅ | ✅ |
| Mantenimiento | ✅ | — | ✅ |
| Repuestos | ✅ | 👁️ solo lectura | ✅ |
| Solicitudes de repuestos | ✅ | ✅ | ✅ |
| Choferes, Rutas, Viajes, Combustible, Fluidos, Herramientas, Dotación, Proveedores | ✅ | ✅ | — |
| Manual de fallas | ✅ | — | ✅ |

- Solo el **gerente** crea usuarios (pantalla *Usuarios → Nuevo usuario*) y elige su rol.
- El primer gerente se crea en el backend con `python -m scripts.create_manager` (también sirve para promover a gerente una cuenta existente).
- Al abrir la app, la sesión guardada se confirma con `GET /api/v1/users/me`, que devuelve el rol vigente.


## 👥 Autores

- [LuisRivasW](https://github.com/LuisRivasW)
- [EnmanuelAlx](https://github.com/EnmanuelAlx)
- [LilFon](https://github.com/LilFon)
