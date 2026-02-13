# 3D Organizer E2E Tests

Este directorio contiene tests end-to-end (e2e) completos para la aplicación 3D Organizer usando Playwright.

## Estructura de Tests

### Tests Principales

1. **`project-creation.spec.ts`** - Tests de creación de proyectos
   - Crear proyectos sin archivos
   - Crear proyectos con archivos incluidos
   - Validación de formularios
   - Manejo de errores

2. **`file-upload-and-conflicts.spec.ts`** - Tests de subida de archivos y resolución de conflictos
   - Subir archivos nuevos
   - Detectar conflictos de archivos existentes
   - Resolver conflictos con skip, overwrite y rename
   - Subidas mixtas con múltiples resoluciones

3. **`comprehensive-workflow.spec.ts`** - Tests de flujos completos
   - Flujo completo desde creación hasta resolución de conflictos
   - Casos edge y manejo de errores
   - Tests de accesibilidad
   - Tests de rendimiento

### Utilidades y Helpers

- **`test-setup.ts`** - Configuración base y extensiones personalizadas
- **`helpers/test-helpers.ts`** - Clases utility para gestión de archivos y proyectos

## Escenarios de Test Cubiertos

### ✅ Creación de Proyectos

- [x] Crear proyecto sin archivos
- [x] Crear proyecto con archivos incluidos
- [x] Validación de campos requeridos
- [x] Cancelación de creación
- [x] Manejo de archivos grandes
- [x] Manejo de errores de red

### ✅ Subida de Archivos

- [x] Subir archivos nuevos (sin conflictos)
- [x] Detectar conflictos de archivos existentes
- [x] Resolución Skip - mantener archivo original
- [x] Resolución Overwrite - sobrescribir archivo existente
- [x] Resolución Rename - crear archivo con timestamp
- [x] Múltiples archivos con resoluciones mixtas

### ✅ Casos Edge y Errores

- [x] Archivos de gran tamaño
- [x] Tipos de archivo inválidos
- [x] Errores de red
- [x] Estados de carga
- [x] Timeouts de API

### ✅ Accesibilidad

- [x] Navegación por teclado
- [x] Compatibilidad con lectores de pantalla
- [x] Diseño responsivo (móvil)
- [x] Etiquetas ARIA apropiadas

## Ejecutar Tests

### Ejecutar todos los tests E2E

```bash
cd frontend
npm run test:e2e
```

### Ejecutar tests específicos

```bash
# Solo tests de creación de proyectos
npx playwright test project-creation

# Solo tests de subida de archivos
npx playwright test file-upload-and-conflicts

# Solo tests de flujo completo
npx playwright test comprehensive-workflow
```

### Ejecutar con UI de Playwright

```bash
npm run test:e2e:ui
```

### Ejecutar en modo debug

```bash
npx playwright test --debug
```

### Ejecutar en un navegador específico

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Configuración del Entorno

### Prerequisitos

1. **Backend ejecutándose**: Los tests asumen que el backend de Go está ejecutándose en `http://localhost:8080`
2. **Frontend en modo dev**: El frontend debe estar ejecutándose en `http://localhost:3000`
3. **Base de datos**: SQLite configurada y accesible

### Variables de Entorno

```bash
# Backend
SCAN_PATH=/path/to/test/projects
DATABASE_PATH=/path/to/test/database.sqlite
PORT=8080

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### Auto-configuración

Los tests están configurados para:
- Auto-iniciar el servidor de desarrollo (`npm run dev`)
- Esperar a que la aplicación esté disponible
- Limpiar archivos de test después de cada ejecución

## Archivos de Test

Los tests crean archivos temporales en `src/__tests__/fixtures/` que se limpian automáticamente después de cada test.

### Tipos de Archivos de Test

- **STL**: Modelos 3D simples con contenido válido
- **G-Code**: Archivos de impresión 3D
- **CAD**: Archivos STEP/IGES
- **README**: Documentación markdown
- **Archivos grandes**: Para tests de rendimiento

## Estructura de Helper Classes

### TestFileManager
Gestiona la creación y limpieza de archivos de test.

```typescript
const fileManager = new TestFileManager('test-suite-name')
const filePath = fileManager.createFile({
  filename: 'test.stl',
  content: 'solid test...',
  type: 'stl'
})
```

### ProjectTestHelpers
Utilidades para operaciones de proyecto.

```typescript
// Crear proyecto
const projectId = await ProjectTestHelpers.createProject(page, {
  name: 'Test Project',
  description: 'Description',
  initialFiles: [file1, file2]
})

// Subir archivos con resoluciones
await ProjectTestHelpers.uploadFilesToProject(page, files, [
  { filename: 'existing.stl', resolution: 'overwrite' }
])
```

### APITestHelpers
Utilidades para interacciones con API.

```typescript
// Esperar respuesta específica
const response = await APITestHelpers.waitForAPIResponse(
  page, '/api/projects', 'POST', 200
)

// Obtener datos de respuesta
const data = await APITestHelpers.getResponseData(response)
```

### ValidationHelpers
Utilidades para validación y accesibilidad.

```typescript
// Validar campo requerido
await ValidationHelpers.validateRequiredField(
  page, 'project name', 'create project', 'name is required'
)

// Validar accesibilidad
await ValidationHelpers.validateAccessibility(page)
```

## Reportes

Los tests generan múltiples tipos de reportes:

- **HTML Report**: `playwright-report/index.html`
- **JSON Report**: `playwright-report.json`
- **JUnit XML**: `playwright-results.xml`
- **Console Output**: Detalle en tiempo real

### Ver Reportes

```bash
# Abrir reporte HTML
npx playwright show-report

# Traces para debugging
npx playwright show-trace test-results/path-to-trace.zip
```

## Debugging

### Screenshots y Videos

- Screenshots automáticos en fallos
- Videos retenidos en fallos
- Traces capturados en reintentos

### Debug Mode

```bash
# Pausar en breakpoints
npx playwright test --debug

# Ejecutar solo tests marcados
npx playwright test --grep "@debug"

# Modo headed (visible)
npx playwright test --headed
```

### Logs

Los tests incluyen logging detallado para:
- Operaciones de API
- Estados de UI
- Operaciones de archivos
- Resoluciones de conflictos

## CI/CD

Los tests están configurados para ejecutarse en CI con:
- Retry automático (2 reintentos)
- Worker único para estabilidad
- Reportes XML para integración
- Screenshots y traces en fallos

```yaml
# Ejemplo GitHub Actions
- name: Run E2E Tests
  run: |
    npm run test:e2e
- name: Upload Test Results
  uses: actions/upload-artifact@v3
  if: failure()
  with:
    name: playwright-report
    path: playwright-report/
```

## Contribuir

### Añadir Nuevos Tests

1. Crear archivo en `src/__tests__/e2e/`
2. Usar helpers existentes cuando sea posible
3. Seguir patrones de naming consistentes
4. Incluir cleanup en `afterEach`
5. Documentar nuevos escenarios

### Mejores Prácticas

- **Usar data-testid**: Para selectores estables
- **Esperar por API**: No usar timeouts fijos
- **Limpiar estado**: Cada test debe ser independiente
- **Descriptive names**: Tests auto-documentados
- **Page Object Model**: Para componentes reutilizables

### Testing Guidelines

- **Arrange, Act, Assert**: Estructura clara
- **Test un flujo por vez**: Tests enfocados
- **Mock external services**: Solo cuando sea necesario
- **Real data**: Usar datos realistas
- **Error scenarios**: Incluir casos de error

## Troubleshooting

### Problemas Comunes

1. **Tests fallan intermitentemente**
   - Verificar timeouts de API
   - Revisar esperas de elementos
   - Comprobar limpieza de estado

2. **Archivos de test no se limpian**
   - Verificar llamadas a `afterEach`
   - Revisar permisos de archivo
   - Comprobar rutas de `TestFileManager`

3. **Backend no responde**
   - Verificar que Go server esté ejecutándose
   - Revisar configuración de puertos
   - Comprobar variables de entorno

4. **Frontend no carga**
   - Verificar `npm run dev`
   - Revisar configuración de Playwright
   - Comprobar `baseURL` en config