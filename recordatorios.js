/**
 * Mis Viajes - recordatorios.js v1
 * Calcula los avisos de cada viaje y prepara el enlace «Añadir a Google
 * Calendar» (pantalla oficial de Google: la titular confirma cada evento).
 * No crea ni modifica eventos por su cuenta y no promete notificaciones en
 * segundo plano: el aviso llega por Google Calendar, que ya usa la titular.
 */
var Recordatorios = (function () {
  'use strict';

  // Zona horaria del aeropuerto de salida (las horas de los vuelos son locales).
  var ZONAS = {
    'America/Cancun': 'CUN CZM TQO CTM',
    'America/Mexico_City': 'MEX NLU GDL MTY MID OAX VER QRO BJX SLP PBC TRC ACA PVR ZIH HUX VSA TAM',
    'America/Tijuana': 'TIJ', 'America/Mazatlan': 'SJD CUL MZT LAP', 'America/Hermosillo': 'HMO',
    'America/Chihuahua': 'CUU', 'America/Ciudad_Juarez': 'CJS',
    'America/Caracas': 'CCS MAR VLN BLA PMV', 'America/Bogota': 'BOG MDE CTG CLO BAQ', 'America/Panama': 'PTY',
    'America/Costa_Rica': 'SJO LIR', 'America/El_Salvador': 'SAL', 'America/Guatemala': 'GUA',
    'America/Managua': 'MGA', 'America/Tegucigalpa': 'TGU', 'America/Santo_Domingo': 'SDQ PUJ',
    'America/Havana': 'HAV', 'America/Puerto_Rico': 'SJU', 'America/Lima': 'LIM CUZ', 'America/Guayaquil': 'UIO GYE',
    'America/Santiago': 'SCL', 'America/Argentina/Buenos_Aires': 'EZE AEP', 'America/Montevideo': 'MVD',
    'America/Asuncion': 'ASU', 'America/La_Paz': 'VVI LPB', 'America/Sao_Paulo': 'GRU GIG BSB',
    'America/Aruba': 'AUA', 'America/Curacao': 'CUR',
    'America/New_York': 'MIA FLL MCO TPA JFK LGA EWR BOS IAD DCA ATL CLT PHL DTW', 'America/Chicago': 'ORD DFW IAH MSP',
    'America/Denver': 'DEN', 'America/Phoenix': 'PHX', 'America/Los_Angeles': 'LAX SFO LAS SEA SAN',
    'America/Toronto': 'YYZ YUL', 'America/Vancouver': 'YVR',
    'Europe/Madrid': 'MAD BCN AGP PMI SVQ VLC', 'Europe/Lisbon': 'LIS OPO', 'Europe/Paris': 'CDG ORY',
    'Europe/London': 'LHR LGW', 'Europe/Amsterdam': 'AMS', 'Europe/Berlin': 'FRA MUC BER', 'Europe/Rome': 'FCO MXP VCE',
    'Europe/Zurich': 'ZRH', 'Europe/Vienna': 'VIE', 'Europe/Brussels': 'BRU', 'Europe/Dublin': 'DUB',
    'Europe/Istanbul': 'IST', 'Europe/Athens': 'ATH', 'Europe/Copenhagen': 'CPH', 'Europe/Prague': 'PRG',
    'Asia/Dubai': 'DXB', 'Asia/Qatar': 'DOH', 'Asia/Tokyo': 'NRT HND', 'Asia/Seoul': 'ICN', 'Asia/Hong_Kong': 'HKG',
    'Asia/Singapore': 'SIN'
  };
  var ZONA_AEROPUERTO = {};
  Object.keys(ZONAS).forEach(function (z) { ZONAS[z].split(' ').forEach(function (c) { ZONA_AEROPUERTO[c] = z; }); });

  function zonaDispositivo() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Cancun'; } catch (e) { return 'America/Cancun'; }
  }
  function datosDe(e) { try { return e.datos ? JSON.parse(e.datos) : {}; } catch (x) { return {}; } }

  // Zona del elemento: la elegida a mano, la del aeropuerto de salida o la del dispositivo.
  function zonaDe(e) {
    var d = datosDe(e);
    if (d.zona) return d.zona;
    if (e.tipo === 'vuelo' && d.origen && ZONA_AEROPUERTO[d.origen]) return ZONA_AEROPUERTO[d.origen];
    return '';
  }

  // Instante real (ms) de una fecha y hora locales en una zona horaria.
  function instante(fecha, hora, zona) {
    var p = fecha.split('-').map(Number), h = (hora || '09:00').split(':').map(Number);
    var supuesto = Date.UTC(p[0], p[1] - 1, p[2], h[0], h[1]);
    if (!zona) return new Date(p[0], p[1] - 1, p[2], h[0], h[1]).getTime();
    try {
      var f = new Intl.DateTimeFormat('en-US', { timeZone: zona, hourCycle: 'h23', year: 'numeric', month: '2-digit',
        day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(supuesto));
      var o = {}; f.forEach(function (x) { o[x.type] = Number(x.value); });
      var visto = Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute);
      return supuesto - (visto - supuesto);
    } catch (e) { return new Date(p[0], p[1] - 1, p[2], h[0], h[1]).getTime(); }
  }

  function sumarDias(fecha, n) {
    var p = fecha.split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n, 12)).toISOString().slice(0, 10);
  }

  // Lista de avisos de un viaje (o de todos): { clave, titulo, cuando (ms),
  // fecha, hora, zona, nota, elemento }.
  function avisos(elementos) {
    var r = [];
    elementos.forEach(function (e) {
      if (!e.fecha) return;
      var d = datosDe(e), z = zonaDe(e);
      var agregar = function (clave, titulo, fecha, hora, nota, todoElDia) {
        r.push({ clave: e.id + ':' + clave, titulo: titulo, fecha: fecha, hora: todoElDia ? '' : hora, zona: z,
          cuando: instante(fecha, todoElDia ? '09:00' : hora, z), nota: nota || '', elemento: e, todoElDia: !!todoElDia });
      };
      if (e.tipo === 'vuelo') {
        if (e.hora) {
          var salida = instante(e.fecha, e.hora, z), ci = new Date(salida - 24 * 3600000);
          var fz = z ? new Intl.DateTimeFormat('en-CA', { timeZone: z, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ci) : ci.toISOString().slice(0, 10);
          var hz = z ? new Intl.DateTimeFormat('en-GB', { timeZone: z, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(ci) : e.hora;
          agregar('checkin', 'Check-in en línea · ' + (d.vuelo || e.titulo), fz, hz,
            'Calculado 24 horas antes de la salida. Cada aerolínea fija su plazo: confírmelo.');
          agregar('salida', 'Salida · ' + e.titulo, e.fecha, e.hora, d.terminal ? 'Terminal ' + d.terminal : '');
        } else agregar('salida', 'Vuelo · ' + e.titulo, e.fecha, '', 'El documento no indica la hora.', true);
        if (e.fecha_fin && e.hora_fin) agregar('llegada', 'Llegada · ' + e.titulo, e.fecha_fin, e.hora_fin, 'Hora local de llegada.');
      } else if (e.tipo === 'hotel') {
        agregar('entrada', 'Entrada al hotel · ' + e.titulo, e.fecha, e.hora || '15:00', e.hora ? '' : 'Hora habitual; confírmela.', !e.hora);
        if (e.fecha_fin) agregar('salida', 'Salida del hotel · ' + e.titulo, e.fecha_fin, e.hora_fin || '12:00', '', !e.hora_fin);
      } else if (e.tipo === 'seguro') {
        if (e.fecha_fin) agregar('vence', 'Vence el seguro · ' + e.titulo, e.fecha_fin, '', 'Último día de vigencia.', true);
      } else if (e.tipo === 'auto') {
        agregar('recoger', 'Recoger auto · ' + e.titulo, e.fecha, e.hora, '', !e.hora);
        if (e.fecha_fin) agregar('devolver', 'Devolver auto · ' + e.titulo, e.fecha_fin, e.hora_fin, '', !e.hora_fin);
      } else {
        agregar('evento', e.titulo, e.fecha, e.hora, '', !e.hora);
      }
    });
    return r.sort(function (a, b) { return a.cuando - b.cuando; });
  }

  function fechaCal(fecha, hora) { return fecha.replace(/-/g, '') + (hora ? 'T' + hora.replace(':', '') + '00' : ''); }

  // Enlace a la pantalla oficial de Google Calendar para crear el evento.
  function enlaceCalendario(a) {
    var e = a.elemento;
    var inicio, fin;
    if (a.todoElDia) { inicio = fechaCal(a.fecha); fin = fechaCal(sumarDias(a.fecha, 1)); }
    else {
      inicio = fechaCal(a.fecha, a.hora);
      var p = a.hora.split(':').map(Number), m = p[0] * 60 + p[1] + 30;
      var f2 = m >= 1440 ? sumarDias(a.fecha, 1) : a.fecha; m = m % 1440;
      fin = fechaCal(f2, ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2));
    }
    var detalles = [a.nota, e.confirmacion ? 'Confirmación: ' + e.confirmacion : '', e.telefono ? 'Teléfono: ' + e.telefono : '',
      'Creado desde Mis Viajes'].filter(Boolean).join('\n');
    var q = 'action=TEMPLATE&text=' + encodeURIComponent(a.titulo) + '&dates=' + inicio + '/' + fin +
      '&details=' + encodeURIComponent(detalles) + (e.direccion || e.lugar ? '&location=' + encodeURIComponent(e.direccion || e.lugar) : '');
    if (a.zona && !a.todoElDia) q += '&ctz=' + encodeURIComponent(a.zona);
    return 'https://calendar.google.com/calendar/render?' + q;
  }

  return { avisos: avisos, enlaceCalendario: enlaceCalendario, zonaDe: zonaDe, zonaDispositivo: zonaDispositivo,
    instante: instante, ZONA_AEROPUERTO: ZONA_AEROPUERTO, datosDe: datosDe };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Recordatorios;
