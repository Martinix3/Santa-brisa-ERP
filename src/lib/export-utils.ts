/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * Utilidades para exportar proyectos a Excel/CSV y PDF
 */

import type { Project } from "@/domain/ssot";

/**
 * Exportar lista de proyectos a CSV
 */
export function exportProjectsToCSV(projects: Project[]): void {
  const headers = [
    'ID',
    'Título',
    'Departamento',
    'Estado',
    'Prioridad',
    'Inicio',
    'Deadline',
    'Presupuesto',
    'Costo Real',
    'Varianza %',
    'Horas Estimadas',
    'Progreso %',
    'Miembros del Equipo',
  ];

  const rows = projects.map(p => {
    const variance = p.budget && p.actualCost 
      ? (((p.actualCost - p.budget) / p.budget) * 100).toFixed(1)
      : '0';
    
    return [
      p.id,
      p.title,
      p.department || '',
      p.status,
      p.priority || '',
      p.startAt || '',
      p.deadline || '',
      p.budget?.toString() || '0',
      p.actualCost?.toString() || '0',
      variance,
      p.estimatedHours?.toString() || '0',
      '0', // Progress se calcula async, aquí pondría 0
      p.teamMemberIds?.length.toString() || '0',
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `proyectos_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exportar ficha de proyecto a HTML (para imprimir/guardar como PDF)
 */
export function exportProjectToPDF(
  project: Project,
  progress: number,
  teamMembers: Array<{ id: string; name?: string; email?: string }>
): void {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proyecto: ${project.title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #333;
    }
    h1 {
      color: #1a202c;
      border-bottom: 3px solid #4299e1;
      padding-bottom: 10px;
    }
    .section {
      margin: 30px 0;
    }
    .section h2 {
      color: #2d3748;
      font-size: 18px;
      margin-bottom: 15px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .field {
      margin-bottom: 15px;
    }
    .field-label {
      font-weight: bold;
      color: #4a5568;
      font-size: 14px;
    }
    .field-value {
      margin-top: 5px;
      color: #1a202c;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-primary { background: #ebf8ff; color: #2c5282; }
    .badge-success { background: #f0fff4; color: #22543d; }
    .badge-warning { background: #fffaf0; color: #744210; }
    .badge-danger { background: #fff5f5; color: #742a2a; }
    .progress-bar {
      width: 100%;
      height: 24px;
      background: #edf2f7;
      border-radius: 12px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4299e1, #3182ce);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: 600;
    }
    .team-list {
      list-style: none;
      padding: 0;
    }
    .team-member {
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .milestone {
      padding: 10px;
      border-left: 3px solid #4299e1;
      background: #f7fafc;
      margin-bottom: 10px;
    }
    .milestone.done {
      border-color: #48bb78;
      background: #f0fff4;
    }
    @media print {
      body { padding: 20px; }
    }
  </style>
</head>
<body>
  <h1>${project.title}</h1>
  
  <div class="section">
    <div class="grid">
      <div class="field">
        <div class="field-label">Estado</div>
        <div class="field-value">
          <span class="badge badge-${getStatusBadgeClass(project.status)}">
            ${project.status}
          </span>
        </div>
      </div>
      
      <div class="field">
        <div class="field-label">Departamento</div>
        <div class="field-value">${project.department || 'N/A'}</div>
      </div>
      
      <div class="field">
        <div class="field-label">Prioridad</div>
        <div class="field-value">
          <span class="badge badge-${getPriorityBadgeClass(project.priority)}">
            ${project.priority || 'NORMAL'}
          </span>
        </div>
      </div>
      
      <div class="field">
        <div class="field-label">Progreso</div>
        <div class="field-value">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%">
              ${progress}%
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Fechas</h2>
    <div class="grid">
      <div class="field">
        <div class="field-label">Inicio</div>
        <div class="field-value">${project.startAt ? new Date(project.startAt).toLocaleDateString('es-ES') : 'N/A'}</div>
      </div>
      <div class="field">
        <div class="field-label">Deadline</div>
        <div class="field-value">${project.deadline ? new Date(project.deadline).toLocaleDateString('es-ES') : 'N/A'}</div>
      </div>
    </div>
  </div>

  ${project.description ? `
  <div class="section">
    <h2>Descripción</h2>
    <p>${project.description}</p>
  </div>
  ` : ''}

  <div class="section">
    <h2>Presupuesto</h2>
    <div class="grid">
      <div class="field">
        <div class="field-label">Presupuestado</div>
        <div class="field-value">€${(project.budget || 0).toLocaleString('es-ES')}</div>
      </div>
      <div class="field">
        <div class="field-label">Costo Real</div>
        <div class="field-value">€${(project.actualCost || 0).toLocaleString('es-ES')}</div>
      </div>
      <div class="field">
        <div class="field-label">Varianza</div>
        <div class="field-value">
          ${project.budget && project.actualCost 
            ? (((project.actualCost - project.budget) / project.budget) * 100).toFixed(1) + '%'
            : '0%'}
        </div>
      </div>
      <div class="field">
        <div class="field-label">Horas Estimadas</div>
        <div class="field-value">${project.estimatedHours || 0}h</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Equipo (${teamMembers.length})</h2>
    <ul class="team-list">
      ${teamMembers.map(member => `
        <li class="team-member">
          <strong>${member.name || 'Sin nombre'}</strong><br>
          <small style="color: #718096;">${member.email || ''}</small>
        </li>
      `).join('')}
    </ul>
  </div>

  ${project.milestones && project.milestones.length > 0 ? `
  <div class="section">
    <h2>Milestones (${project.milestones.length})</h2>
    ${project.milestones.map(m => `
      <div class="milestone ${m.done ? 'done' : ''}">
        <strong>${m.title}</strong><br>
        <small style="color: #718096;">
          ${new Date(m.date).toLocaleDateString('es-ES')}
          ${m.done ? ' ✓ Completado' : ''}
        </small>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="section" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
    <small style="color: #a0aec0;">
      Generado el ${new Date().toLocaleString('es-ES')}
    </small>
  </div>
</body>
</html>
  `;

  // Abrir en nueva ventana para imprimir/guardar como PDF
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Esperar a que cargue y luego abrir diálogo de impresión
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'COMPLETED': return 'success';
    case 'ACTIVE': return 'primary';
    case 'ON_HOLD': return 'warning';
    case 'CANCELLED': return 'danger';
    default: return 'primary';
  }
}

function getPriorityBadgeClass(priority?: string): string {
  switch (priority) {
    case 'CRITICAL': return 'danger';
    case 'HIGH': return 'warning';
    case 'LOW': return 'success';
    default: return 'primary';
  }
}
