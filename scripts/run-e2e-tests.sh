#!/bin/bash

# 3D Organizer E2E Test Runner Script
# Este script facilita la ejecución de los tests E2E de Playwright

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones helper
print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Verificar dependencias
check_dependencies() {
    print_header "Verificando dependencias"

    if ! command -v node &> /dev/null; then
        print_error "Node.js no está instalado"
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        print_error "npm no está instalado"
        exit 1
    fi

    print_success "Node.js y npm están disponibles"
}

# Verificar que el backend esté ejecutándose
check_backend() {
    print_header "Verificando backend"

    if curl -s -f http://localhost:8080/api/health > /dev/null; then
        print_success "Backend está ejecutándose en puerto 8080"
    else
        print_warning "Backend no detectado en puerto 8080"
        print_warning "Asegúrate de que el servidor Go esté ejecutándose"
        read -p "¿Continuar de todos modos? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Instalar dependencias si es necesario
install_dependencies() {
    print_header "Verificando dependencias de frontend"

    cd frontend

    if [ ! -d "node_modules" ]; then
        print_warning "node_modules no encontrado, instalando dependencias..."
        npm install
        print_success "Dependencias instaladas"
    else
        print_success "Dependencias ya instaladas"
    fi

    # Instalar Playwright browsers si es necesario
    if [ ! -d "node_modules/@playwright/test" ]; then
        print_warning "Playwright no encontrado, instalando..."
        npm install @playwright/test
        npx playwright install
        print_success "Playwright instalado"
    fi

    cd ..
}

# Función para ejecutar tests
run_tests() {
    local test_type=$1
    local test_file=$2

    cd frontend

    case $test_type in
        "all")
            print_header "Ejecutando todos los tests E2E"
            npm run test:e2e
            ;;
        "ui")
            print_header "Ejecutando tests E2E con UI"
            npm run test:e2e:ui
            ;;
        "creation")
            print_header "Ejecutando tests de creación de proyectos"
            npx playwright test project-creation
            ;;
        "upload")
            print_header "Ejecutando tests de subida de archivos"
            npx playwright test file-upload-and-conflicts
            ;;
        "workflow")
            print_header "Ejecutando tests de flujo completo"
            npx playwright test comprehensive-workflow
            ;;
        "debug")
            print_header "Ejecutando tests en modo debug"
            npx playwright test --debug $test_file
            ;;
        "headed")
            print_header "Ejecutando tests visibles"
            npx playwright test --headed $test_file
            ;;
        "chromium")
            print_header "Ejecutando tests en Chromium"
            npx playwright test --project=chromium $test_file
            ;;
        "firefox")
            print_header "Ejecutando tests en Firefox"
            npx playwright test --project=firefox $test_file
            ;;
        "webkit")
            print_header "Ejecutando tests en WebKit"
            npx playwright test --project=webkit $test_file
            ;;
        *)
            print_error "Tipo de test no reconocido: $test_type"
            show_help
            exit 1
            ;;
    esac

    cd ..
}

# Generar reporte
show_report() {
    print_header "Abriendo reporte de tests"
    cd frontend
    npx playwright show-report
    cd ..
}

# Limpiar artifacts
clean_artifacts() {
    print_header "Limpiando artifacts de test"
    cd frontend
    rm -rf test-results/
    rm -rf playwright-report/
    rm -f playwright-report.json
    rm -f playwright-results.xml
    print_success "Artifacts limpiados"
    cd ..
}

# Mostrar ayuda
show_help() {
    echo -e "${BLUE}3D Organizer E2E Test Runner${NC}"
    echo
    echo "Uso: $0 [comando] [opciones]"
    echo
    echo "Comandos disponibles:"
    echo "  all                    Ejecutar todos los tests E2E"
    echo "  ui                     Ejecutar tests con UI de Playwright"
    echo "  creation              Ejecutar solo tests de creación de proyectos"
    echo "  upload                Ejecutar solo tests de subida de archivos"
    echo "  workflow              Ejecutar solo tests de flujo completo"
    echo "  debug [archivo]       Ejecutar tests en modo debug"
    echo "  headed [archivo]      Ejecutar tests visibles"
    echo "  chromium [archivo]    Ejecutar tests solo en Chromium"
    echo "  firefox [archivo]     Ejecutar tests solo en Firefox"
    echo "  webkit [archivo]      Ejecutar tests solo en WebKit"
    echo "  report                Mostrar reporte de último test"
    echo "  clean                 Limpiar artifacts de test"
    echo "  setup                 Solo instalar dependencias"
    echo "  help                  Mostrar esta ayuda"
    echo
    echo "Ejemplos:"
    echo "  $0 all                           # Ejecutar todos los tests"
    echo "  $0 creation                      # Solo tests de creación"
    echo "  $0 debug project-creation        # Debug tests específicos"
    echo "  $0 headed comprehensive-workflow # Ver tests de workflow"
}

# Script principal
main() {
    # Si no hay argumentos, mostrar ayuda
    if [ $# -eq 0 ]; then
        show_help
        exit 0
    fi

    local command=$1
    local test_file=$2

    # Comandos que no requieren verificaciones completas
    case $command in
        "help"|"--help"|"-h")
            show_help
            exit 0
            ;;
        "clean")
            clean_artifacts
            exit 0
            ;;
        "report")
            show_report
            exit 0
            ;;
        "setup")
            check_dependencies
            install_dependencies
            print_success "Setup completado"
            exit 0
            ;;
    esac

    # Para otros comandos, hacer verificaciones completas
    check_dependencies
    check_backend
    install_dependencies

    # Ejecutar comando
    case $command in
        "all"|"ui"|"creation"|"upload"|"workflow"|"debug"|"headed"|"chromium"|"firefox"|"webkit")
            run_tests $command $test_file
            print_success "Tests completados"
            echo
            echo "Para ver el reporte detallado: $0 report"
            ;;
        *)
            print_error "Comando no reconocido: $command"
            show_help
            exit 1
            ;;
    esac
}

# Ejecutar función principal con todos los argumentos
main "$@"