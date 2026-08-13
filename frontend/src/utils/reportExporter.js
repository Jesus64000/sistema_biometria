import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Exporta un arreglo de datos a un archivo Excel (.xlsx)
 * @param {Array} data - Lista de objetos a exportar
 * @param {Array} columns - Configuración de columnas [{ header: 'Nombre', key: 'nombre' }]
 * @param {String} fileName - Nombre sugerido del archivo sin extensión
 * @param {String} sheetName - Nombre de la hoja en Excel
 */
export const exportToExcel = (data, columns, fileName = 'Reporte', sheetName = 'Datos') => {
  try {
    if (!data || data.length === 0) {
      alert('No hay datos disponibles en esta tabla para exportar.');
      return;
    }

    // Mapear los datos según las columnas configuradas
    const formattedData = data.map(item => {
      const row = {};
      columns.forEach(col => {
        let val = typeof col.key === 'function' ? col.key(item) : item[col.key];
        row[col.header] = val !== undefined && val !== null ? val : '';
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    // Ajustar ancho automático de columnas
    const colWidths = columns.map(col => {
      const maxLen = Math.max(
        col.header.length,
        ...formattedData.map(r => String(r[col.header] || '').length)
      );
      return { wch: Math.min(Math.max(maxLen + 3, 10), 40) };
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Descargar archivo
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (error) {
    console.error('Error al exportar a Excel:', error);
    alert('Ocurrió un error al generar la hoja de Excel. Por favor reintente.');
  }
};

/**
 * Exporta un arreglo de datos a un documento PDF (.pdf) elegante con membrete corporativo
 * @param {Array} data - Lista de objetos a exportar
 * @param {Array} columns - Configuración de columnas [{ header: 'Nombre', key: 'nombre' }]
 * @param {String} title - Título principal del reporte
 * @param {String} fileName - Nombre sugerido del archivo sin extensión
 * @param {String} gymName - Nombre del Gimnasio
 */
export const exportToPdf = (data, columns, title = 'Reporte del Sistema', fileName = 'Reporte', gymName = 'RamosGym') => {
  try {
    if (!data || data.length === 0) {
      alert('No hay datos disponibles en esta tabla para exportar a PDF.');
      return;
    }

    // Determinar orientación (Horizontal si hay muchas columnas)
    const isLandscape = columns.length > 5;
    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const nowStr = new Date().toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Encabezado Membrete Corporativo
    doc.setFillColor(15, 98, 254); // Primary Blue
    doc.rect(0, 0, doc.internal.pageSize.width, 16, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(gymName.toUpperCase(), 14, 11);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado: ${nowStr}`, doc.internal.pageSize.width - 14, 11, { align: 'right' });

    // Título del Documento
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(title, 14, 25);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Total de registros incluidos: ${data.length}`, 14, 30);

    // Preparar filas y columnas para autoTable
    const tableHeaders = [columns.map(c => c.header)];
    const tableRows = data.map(item => {
      return columns.map(col => {
        let val = typeof col.key === 'function' ? col.key(item) : item[col.key];
        return val !== undefined && val !== null ? String(val) : '';
      });
    });

    // Renderizar Tabla
    autoTable(doc, {
      startY: 34,
      head: tableHeaders,
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 98, 254],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [40, 40, 40]
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      margin: { top: 34, left: 14, right: 14, bottom: 14 },
      styles: {
        cellPadding: 2.5,
        overflow: 'linebreak'
      }
    });

    // Pie de página con numeración
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${i} de ${pageCount} - Sistema de Gestión Biométrica`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 8,
        { align: 'center' }
      );
    }

    doc.save(`${fileName}_${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (error) {
    console.error('Error al exportar a PDF:', error);
    alert('Ocurrió un error al generar el archivo PDF. Por favor reintente.');
  }
};
