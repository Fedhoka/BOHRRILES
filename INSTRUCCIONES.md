# BOHRriles — Instrucciones de compilación

## Requisitos
- Android Studio Hedgehog (2023.1) o superior
- JDK 17 o superior
- Android SDK con API 34 instalado

## Pasos para abrir y compilar

### 1. Abrir el proyecto
1. Abrí Android Studio
2. **File → Open** → seleccioná la carpeta `BOHRriles`
3. Esperá que Gradle sincronice (primera vez descarga dependencias ~5 min)

### 2. Configurar el dispositivo
- **Emulador**: AVD Manager → Create Virtual Device → Pixel 6 → API 34
- **Dispositivo físico**: activá Depuración USB en Ajustes → Opciones de desarrollador

### 3. Compilar y ejecutar
```
Menú: Run → Run 'app'
```
O desde terminal:
```bash
cd BOHRriles
./gradlew assembleDebug
```
El APK quedará en: `app/build/outputs/apk/debug/app-debug.apk`

### 4. Generar APK release (para instalar sin Android Studio)
```
Build → Generate Signed Bundle/APK → APK → Create new keystore
```

## Dependencias principales (se descargan automáticamente)
| Librería | Versión | Uso |
|---|---|---|
| ZXing Android Embedded | 4.3.0 | Escáner de código de barras |
| OkHttp | 4.12.0 | Llamadas HTTP a la API |
| Gson | 2.10.1 | Parseo de JSON |
| Kotlin Coroutines | 1.7.3 | Async/await |
| Material Components | 1.11.0 | Temas y componentes UI |

## Estructura del proyecto
```
app/src/main/
├── java/com/bohr/bohrriles/
│   ├── LoginActivity.kt         — Pantalla de login
│   ├── MenuActivity.kt          — Menú principal con 7 botones
│   ├── BaseBarrilActivity.kt    — Base: integra ZXing scanner
│   ├── EnvasarActivity.kt       — Envasar barril + elegir estilo
│   ├── EntregarActivity.kt      — Entregar barril + elegir cliente
│   ├── RecibirActivity.kt       — Recibir/devolver barril
│   ├── VaciarActivity.kt        — Vaciar barril
│   ├── ConsultarActivity.kt     — Consultar historial
│   ├── ClientesActivity.kt      — CRUD clientes
│   ├── EstilosActivity.kt       — CRUD estilos de cerveza
│   ├── ApiService.kt            — Todas las llamadas HTTP (OkHttp + coroutines)
│   ├── SessionManager.kt        — SharedPreferences (login persistente)
│   ├── models/Models.kt         — Data classes (LoginResponse, BarrilResponse, etc.)
│   └── adapters/
│       ├── SelectableAdapter.kt — Lista con ítem seleccionable (envasar/entregar)
│       ├── HistorialAdapter.kt  — Lista de historial
│       └── ListRowAdapter.kt    — Lista con botón eliminar (clientes/estilos)
└── res/
    ├── layout/                  — 9 activity layouts + 4 item layouts
    ├── drawable/                — Fondos redondeados por color + cards
    └── values/colors|strings|themes.xml
```

## Configuración de la API
Si cambiás la IP del servidor, editá esta línea en `ApiService.kt`:
```kotlin
private const val BASE_URL = "http://192.168.0.5/bohrriles/app.php?"
```

## Notas importantes
- La app funciona solo en la misma red WiFi que el servidor XAMPP
- `usesCleartextTraffic="true"` ya está en el Manifest (permite HTTP)
- La cámara se activa automáticamente al tocar "Escanear" (ZXing maneja el permiso)
- El login se mantiene entre sesiones (SharedPreferences)
- Para cerrar sesión: botón rojo en el menú principal
