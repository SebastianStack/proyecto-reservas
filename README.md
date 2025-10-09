# WePlace - Plataforma de Reservas de Espacios

![WePlace Hero](https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400&q=80)

WePlace es una plataforma web completa para la reserva de espacios de trabajo y eventos. La aplicación permite a los usuarios buscar, filtrar y reservar espacios, mientras que los propietarios pueden gestionar sus propiedades y reservas en tiempo real.

🌐 **Demo en vivo:** [https://proyecto-reservas-lozronrender.com](https://proyecto-reservas-lozronrender.com)

## 📋 Características

### 🏠 **Para Usuarios**
- **Registro y autenticación** con sistema JWT seguro
- **Búsqueda avanzada** con filtros por ubicación, precio, capacidad y amenidades
- **Galería de imágenes** interactiva con modal expansivo y navegación
- **Sistema de favoritos** para guardar espacios preferidos
- **Gestión de reservas** con historial completo
- **Perfil personalizable** con imagen de usuario

### 🏢 **Para Propietarios**
- **Gestión completa de espacios** - crear, editar y eliminar
- **Upload de múltiples imágenes** con drag & drop
- **Panel de control** para gestionar reservas pendientes
- **Estadísticas de ocupación** y historial de ingresos
- **Notificaciones** de nuevas solicitudes de reserva

### ⚙️ **Funcionalidades Técnicas**
- **Diseño responsive** optimizado para móviles y escritorio
- **Componentes reutilizables** con skeleton loading
- **Virtual scrolling** para listas de gran tamaño
- **Manejo de errores robusto** con logging detallado
- **Validación completa** en frontend y backend
- **Integración con servicios cloud** para almacenamiento

## 🛠️ Tecnologías

### Frontend
```
React 18.2, Vite 4.4, Bootstrap 5.3, React Router 6.18
React DatePicker, Bootstrap Icons, Custom Hooks
```

### Backend
```
Python 3.13, Flask 3.1, SQLAlchemy 2.0, Flask-JWT-Extended
Flask-Mail, Flask-CORS, Gunicorn, Psycopg2
```

### Base de Datos y Storage
```
PostgreSQL, Supabase Storage, Alembic Migrations
```

### Deployment y DevOps
```
Render, GitHub Actions, Environment Variables
CI/CD Pipeline, Error Monitoring
```

## 📱 Responsive

Esta aplicación web ha sido diseñada tanto para escritorio como para dispositivos móviles, garantizando una experiencia de usuario óptima en cualquier pantalla.

## 🚀 Instalación y Configuración

### Prerrequisitos
- Python 3.10+
- Node.js 20+
- PostgreSQL
- Cuenta de Supabase (para imágenes)

### 1. Clonar el repositorio
```bash
git clone https://github.com/SebastianStack/proyecto-reservas.git
cd proyecto-reservas
```

### 2. Configurar Backend
```bash
# Instalar dependencias Python
pipenv install

# Crear archivo de variables de entorno
cp .env.example .env

# Configurar variables en .env:
# DATABASE_URL=postgresql://username:password@localhost:5432/weplace
# SUPABASE_URL=your_supabase_url
# SUPABASE_SERVICE_ROLE_KEY=your_supabase_key
# FLASK_APP_KEY=your_secret_key

# Ejecutar migraciones
pipenv run upgrade

# Iniciar servidor backend
pipenv run start
```

### 3. Configurar Frontend
```bash
# Navegar a la carpeta frontend
cd src/front

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run start
```

### 4. Configurar Supabase
1. Crear buckets: `userImages` y `postImages`
2. Configurar políticas de acceso público
3. Obtener URL y Service Role Key

## 📁 Estructura del Proyecto

```
proyecto-reservas/
├── src/
│   ├── api/                 # Backend Flask
│   │   ├── models.py        # Modelos de base de datos
│   │   ├── routes.py        # Endpoints de la API
│   │   └── utils.py         # Utilidades
│   ├── front/               # Frontend React
│   │   ├── components/      # Componentes reutilizables
│   │   ├── pages/           # Páginas principales
│   │   ├── hooks/           # Custom hooks
│   │   └── services/        # Servicios de API
│   └── app.py              # Aplicación Flask principal
├── migrations/              # Migraciones de base de datos
├── public/                  # Assets estáticos
└── dist/                   # Build de producción
```

## 🎯 Funcionalidades Destacadas

### Sistema de Reservas
- **Validación de fechas** automática
- **Prevención de conflictos** de reservas
- **Cálculo automático** de precios
- **Estados de reserva** (pendiente, confirmada, cancelada)

### Gestión de Imágenes
- **Upload múltiple** con preview
- **Compresión automática** para optimizar tamaño
- **Almacenamiento en Supabase** con URLs públicas
- **Eliminación segura** de imágenes no utilizadas

### Optimización de Performance
- **Lazy loading** de componentes
- **Virtual scrolling** para listas grandes
- **Memoización** de componentes pesados
- **Skeleton loading** durante cargas

## 🌐 Deploy

La aplicación está configurada para deployment automático en Render:

1. **Fork** este repositorio
2. **Conectar** con Render
3. **Configurar** variables de entorno
4. **Deploy** automático desde GitHub

## 📖 API Endpoints

### Autenticación
- `POST /api/signup` - Registro de usuario
- `POST /api/login` - Inicio de sesión
- `GET /api/verify-token` - Verificar token JWT

### Espacios
- `GET /api/spaces` - Listar todos los espacios
- `GET /api/spaces/:id` - Obtener espacio específico
- `POST /api/new-space` - Crear nuevo espacio
- `PUT /api/space/:id` - Actualizar espacio
- `DELETE /api/space/:id` - Eliminar espacio

### Reservas
- `POST /api/space/:id/new-booking` - Crear reserva
- `GET /api/owner/pending-bookings` - Reservas pendientes
- `POST /api/booking/:id/accept` - Aceptar reserva
- `POST /api/booking/:id/decline` - Rechazar reserva

### Favoritos
- `GET /api/user/get-favorites` - Obtener favoritos
- `POST /api/user/create-favorite` - Añadir favorito
- `DELETE /api/user/delete-favorite/:id` - Eliminar favorito

### Perfil
- `GET /api/profile` - Obtener perfil de usuario
- `PUT /api/profile` - Actualizar perfil

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE.md](LICENSE.md) para detalles.

## 👨‍💻 Desarrollador

**Sebastian Leal** - *Full Stack Developer*
- GitHub: [@SebastianStack](https://github.com/SebastianStack)
- LinkedIn: [Sebastian Leal](https://linkedin.com/in/sebastian-leal-stack)

---

⭐ ¡Si te gusta este proyecto, dale una estrella en GitHub!
