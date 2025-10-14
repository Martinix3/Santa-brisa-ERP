#!/bin/bash

# Script para eliminar secciones de proyectos de dashboards personales

dashboards=(
  "src/components/dashboards/DashboardOps.tsx"
  "src/components/dashboards/DashboardTechnical.tsx"
  "src/components/dashboards/DashboardDistributor.tsx"
  "src/components/dashboards/DashboardMarketing.tsx"
  "src/components/dashboards/DashboardAdmin.tsx"
)

for file in "${dashboards[@]}"; do
  echo "Limpiando $file..."
  
  # Crear backup
  cp "$file" "${file}.bak"
  
  # Eliminar imports relacionados con proyectos
  sed -i '' '/import.*listUserProjects/d' "$file"
  sed -i '' '/import.*Project.*from.*ssot/d' "$file"
  sed -i '' '/import.*ProjectCard/d' "$file"
  sed -i '' 's/, useEffect//g' "$file"
  
  # Nota: Los bloques de código JSX y estado deben eliminarse manualmente
  echo "✓ Imports limpiados en $file"
done

echo "✅ Limpieza de imports completada. Revisar archivos manualmente para eliminar:"
echo "  - Estado: projects, setProjects, loadingProjects"
echo "  - useEffect de carga de proyectos"
echo "  - JSX: sección 'Mis Proyectos'"
