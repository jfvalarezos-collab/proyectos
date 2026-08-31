import ExcelJS from 'exceljs';

const ACTIVIDAD_LABELS = {
  induccion: 'Inducción',
  reinduccion: 'Reinducción',
  charla_seguridad: 'Charla de seguridad',
  reuniones_sst: 'Reuniones de SST / Operativas',
  seminario_taller: 'Seminario / Taller / Curso',
  capacitacion_cargo: 'Capacitación especifica al cargo',
  otra: 'Otra',
};

const MATERIAL_LABELS = {
  video: 'Video (enlace)',
  presentacion: 'Enlace de presentación',
  texto: 'Texto / documento',
  imagenes: 'Imágenes de diapositivas',
};

function mark(actividadTipo, key) {
  return actividadTipo === key ? '[X]' : '[ ]';
}

function splitFecha(fecha) {
  // Espera fecha en formato DD/MM/AAAA
  const partes = String(fecha || '').split('/');
  if (partes.length !== 3) return { dd: '', mm: '', aa: '' };
  return { dd: partes[0], mm: partes[1], aa: partes[2].slice(-2) };
}

function styleTitle(cell, { size = 10, bold = true } = {}) {
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.font = { size, bold };
}

function borderAll(ws, range) {
  ws.getCell(range).border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };
}

export async function buildAsistenciaWorkbook({ session, questions, attendees }) {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Asistencia', { pageSetup: { orientation: 'portrait', fitToPage: true } });

  ws.columns = Array.from({ length: 27 }, () => ({ width: 4 }));

  ws.mergeCells('A1:I4');
  styleTitle(ws.getCell('A1'), { size: 9, bold: false });
  ws.getCell('A1').value = 'LOGO EMPRESA';

  ws.mergeCells('J1:AA1');
  ws.getCell('J1').value = 'Sistema de Gestión de la Seguridad Y Salud en el Trabajo';
  styleTitle(ws.getCell('J1'));

  ws.mergeCells('J2:AA3');
  ws.getCell('J2').value = `NIVEL 7:   FORMATOS:   ${session.formato_codigo || 'FT-SST-02'}`;
  styleTitle(ws.getCell('J2'));

  ws.mergeCells('J4:AA4');
  ws.getCell('J4').value = 'SG-SST';
  styleTitle(ws.getCell('J4'));

  ws.mergeCells('A5:S7');
  ws.getCell('A5').value = 'FORMATO DE REGISTRO DE ASISTENCIA A CAPACITACION Y ENTRENAMIENTO';
  styleTitle(ws.getCell('A5'), { size: 12 });

  ws.mergeCells('T5:V5');
  ws.getCell('T5').value = 'Fecha:';
  ws.mergeCells('W5:AA5');
  ws.getCell('W5').value = session.fecha || '';

  ws.mergeCells('T6:V6');
  ws.getCell('T6').value = 'Versión:';
  ws.mergeCells('W6:AA6');
  ws.getCell('W6').value = '001';

  ws.mergeCells('T7:AA7');
  ws.getCell('T7').value = 'Pagina 1 de 1';
  styleTitle(ws.getCell('T7'), { size: 9, bold: false });

  ws.mergeCells('A9:N9');
  ws.getCell('A9').value = 'Ciudad';
  ws.mergeCells('O9:X9');
  ws.getCell('O9').value = 'Lugar';
  ws.getCell('Y9').value = 'DD';
  ws.getCell('Z9').value = 'MM';
  ws.getCell('AA9').value = 'AA';
  ['A9', 'O9', 'Y9', 'Z9', 'AA9'].forEach((c) => styleTitle(ws.getCell(c), { size: 8 }));

  ws.mergeCells('A10:N10');
  ws.getCell('A10').value = session.ciudad || '';
  ws.mergeCells('O10:X10');
  ws.getCell('O10').value = session.lugar || '';
  const { dd, mm, aa } = splitFecha(session.fecha);
  ws.getCell('Y10').value = dd;
  ws.getCell('Z10').value = mm;
  ws.getCell('AA10').value = aa;

  ws.mergeCells('A11:I11');
  ws.getCell('A11').value = 'ACTIVIDAD REALIZADA';
  ws.mergeCells('J11:AA11');
  ws.getCell('J11').value = 'TEMAS TRATADOS';
  ['A11', 'J11'].forEach((c) => styleTitle(ws.getCell(c), { size: 9 }));

  const actividadRows = [
    ['A12:I12', 'induccion'],
    ['A13:I13', 'reinduccion'],
    ['A14:I14', 'charla_seguridad'],
    ['A15:I15', 'reuniones_sst'],
    ['A16:I16', 'seminario_taller'],
    ['A17:I17', 'capacitacion_cargo'],
    ['A18:I18', 'otra'],
  ];
  for (const [range, key] of actividadRows) {
    ws.mergeCells(range);
    const label = ACTIVIDAD_LABELS[key] + (key === 'otra' && session.actividad_otra_detalle ? ` (${session.actividad_otra_detalle})` : '');
    ws.getCell(range.split(':')[0]).value = `${mark(session.actividad_tipo, key)} ${label}`;
    ws.getCell(range.split(':')[0]).alignment = { vertical: 'middle', horizontal: 'left' };
  }

  ws.mergeCells('K12:AA18');
  ws.getCell('K12').value = session.temas_tratados || '';
  ws.getCell('K12').alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

  let row = 20;
  ws.mergeCells(`A${row}:A${row}`);
  ws.getCell(`A${row}`).value = 'No';
  ws.mergeCells(`B${row}:L${row}`);
  ws.getCell(`B${row}`).value = 'Nombre del Trabajador';
  ws.mergeCells(`M${row}:S${row}`);
  ws.getCell(`M${row}`).value = 'Cédula de Ciudadanía';
  ws.mergeCells(`T${row}:X${row}`);
  ws.getCell(`T${row}`).value = 'Cargo';
  ws.mergeCells(`Y${row}:AA${row}`);
  ws.getCell(`Y${row}`).value = 'Firma';
  ['A', 'B', 'M', 'T', 'Y'].forEach((c) => {
    styleTitle(ws.getCell(`${c}${row}`), { size: 9 });
    borderAll(ws, `${c}${row}`);
  });

  row += 1;
  const firstAttendeeRow = row;
  const list = attendees.length > 0 ? attendees : [];
  const rowCount = Math.max(list.length, 20);

  for (let i = 0; i < rowCount; i++) {
    const r = firstAttendeeRow + i;
    ws.getRow(r).height = 22;
    ws.mergeCells(`A${r}:A${r}`);
    ws.getCell(`A${r}`).value = i + 1;
    ws.mergeCells(`B${r}:L${r}`);
    ws.mergeCells(`M${r}:S${r}`);
    ws.mergeCells(`T${r}:X${r}`);
    ws.mergeCells(`Y${r}:AA${r}`);
    ['A', 'B', 'M', 'T', 'Y'].forEach((c) => borderAll(ws, `${c}${r}`));

    const attendee = list[i];
    if (attendee) {
      ws.getCell(`B${r}`).value = attendee.nombre;
      ws.getCell(`M${r}`).value = attendee.cedula;
      ws.getCell(`T${r}`).value = attendee.cargo;

      if (attendee.firma_png) {
        const base64 = attendee.firma_png.replace(/^data:image\/\w+;base64,/, '');
        const imageId = workbook.addImage({ base64, extension: 'png' });
        ws.addImage(imageId, {
          tl: { col: 24.1, row: r - 1 + 0.05 },
          ext: { width: 95, height: 26 },
        });
      }
    }
  }

  row = firstAttendeeRow + rowCount;

  row += 1;
  ws.mergeCells(`A${row}:AA${row}`);
  ws.getRow(row).height = 60;
  const evaluacionResumen = attendees.length
    ? `Evaluación: ${attendees.filter((a) => a.aciertos_aprobados >= 3).length}/${attendees.length} asistentes aprobaron (≥60%).`
    : 'Evaluación: sin registros aún.';
  ws.getCell(`A${row}`).value =
    `Material utilizado: ${MATERIAL_LABELS[session.material_tipo] || session.material_tipo}` +
    (session.material_payload?.url ? ` — ${session.material_payload.url}` : '') +
    `\n${evaluacionResumen}`;
  ws.getCell(`A${row}`).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

  row += 1;
  ws.mergeCells(`A${row}:AA${row}`);
  ws.getCell(`A${row}`).value = 'Técnico en SST, responsable de la capacitación';
  styleTitle(ws.getCell(`A${row}`), { size: 10 });

  row += 1;
  ws.getRow(row).height = 40;
  ws.mergeCells(`A${row}:N${row}`);
  ws.getCell(`A${row}`).value = `Nombre: ${session.facilitador_nombre || ''}`;
  ws.mergeCells(`O${row}:AA${row}`);
  ws.getCell(`O${row}`).value = 'Firma y Cédula de Identidad';
  ['A', 'O'].forEach((c) => borderAll(ws, `${c}${row}`));

  return workbook;
}
