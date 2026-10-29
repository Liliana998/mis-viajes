/**
 * Mis Viajes - vistas.js v2.2 («Boutique de viajes moderna»)
 * Pantallas de la aplicacion. Todo el texto se inserta como texto (nunca
 * como HTML) para que ningun dato pueda ejecutar codigo.
 *
 * Navegacion inferior: Inicio («Mi día de hoy» durante el viaje), Viajes
 * («Mis viajes»), Lugares («Mis lugares favoritos» y «Mi galería de viajes»)
 * y Documentos (lo que llega a la carpeta de Drive, para revisar).
 * Cada viaje abre con accesos grandes, sin pestañas: Itinerario (un día a la
 * vez), Documentos y reservas (cada reserva una sola vez, con los documentos
 * de cada viajero), Lugares por conocer, Gastos de mi viaje, Emergencias y
 * Recordatorios.
 */
(function () {
  'use strict';

  var MV = window.MV = window.MV || {};
  var ruta = { p: 'inicio', a: {} };
  var filtrosLugares = { q: '', ciudad: '', categoria: '', estado: '' };

  var TIPOS = {
    vuelo: 'Vuelo', hotel: 'Alojamiento', seguro: 'Seguro de viaje', traslado: 'Traslado', auto: 'Renta de auto',
    restaurante: 'Restaurante', actividad: 'Actividad o entrada', otro: 'Otra reserva'
  };
  var CATEGORIAS = ['restaurante', 'cafetería', 'bar', 'museo', 'monumento', 'sitio turístico', 'tienda',
    'centro comercial', 'excursión', 'espectáculo', 'playa', 'parque', 'hotel', 'otro'];
  var ESTADOS_LUGAR = [['quiero ir', 'Quiero ir'], ['reservado', 'Reservado'], ['visitado', 'Visitado']];
  var FUENTES = { tiktok: 'TikTok', instagram: 'Instagram', whatsapp: 'WhatsApp', maps: 'Google Maps', web: 'Página web' };
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  var DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var FORMULARIOS = ['viajeForm', 'elementoForm', 'lugarForm', 'revision', 'asignacionForm', 'gastoForm'];

  /* ====================== UTILIDADES ====================== */

  // h('div.clase', {atributos}, hijos...)  -- hijos: texto, nodos o listas.
  function h(sel, attrs) {
    var p = sel.split('.');
    var e = document.createElement(p[0] || 'div');
    if (p.length > 1) e.className = p.slice(1).join(' ');
    var hijos = Array.prototype.slice.call(arguments, 2);
    if (attrs && (typeof attrs !== 'object' || attrs.nodeType || Array.isArray(attrs))) { hijos.unshift(attrs); attrs = null; }
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    (function agregar(lista) {
      lista.forEach(function (x) {
        if (x === null || x === undefined || x === false || x === '') return;
        if (Array.isArray(x)) agregar(x);
        else e.appendChild(x.nodeType ? x : document.createTextNode(String(x)));
      });
    })(hijos);
    return e;
  }
  function $(id) { return document.getElementById(id); }
  function D() { return Datos.D; }
  function hoy() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function partes(f) { var p = f.split('-').map(Number); return { a: p[0], m: p[1], d: p[2], dia: new Date(p[0], p[1] - 1, p[2]).getDay() }; }
  function fechaCorta(f) {
    if (!f) return '';
    var p = partes(f);
    return DIAS[p.dia] + ' ' + p.d + ' ' + MESES[p.m - 1] + (p.a !== new Date().getFullYear() ? ' ' + p.a : '');
  }
  function fechaLarga(f) {
    var p = partes(f);
    return DIAS_LARGOS[p.dia] + ' ' + p.d + ' de ' + MESES_LARGOS[p.m - 1];
  }
  function rangoFechas(a, b) {
    if (!a) return 'Sin fechas';
    if (!b || a === b) return fechaCorta(a);
    return fechaCorta(a) + ' al ' + fechaCorta(b);
  }
  function sumarDias(f, n) {
    var p = f.split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n, 12)).toISOString().slice(0, 10);
  }
  function difDias(a, b) { return Math.round((Date.parse(a) - Date.parse(b)) / 864e5); }
  function datosDe(e) { return Recordatorios.datosDe(e); }
  function json(t, defecto) { try { return t ? JSON.parse(t) : defecto; } catch (e) { return defecto; } }
  function mapa(q) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q); }
  function rutaMaps(q) { return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(q); }
  function enlaceExterno(href, texto, clase) {
    return h('a.boton.' + (clase || 'secundario.chico'), { href: href, target: '_blank', rel: 'noopener noreferrer',
      onclick: function (ev) { ev.stopPropagation(); } }, texto);
  }
  function tel(t) { return 'tel:' + String(t).replace(/[^\d+]/g, ''); }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function mayuscula(s) { return String(s || '').replace(/^./, function (x) { return x.toUpperCase(); }); }
  function viaje(id) { return D().viajes.find(function (v) { return v.id === id; }); }
  function lugar(id) { return D().lugares.find(function (v) { return v.id === id; }); }
  function elementosDe(id) { return D().elementos.filter(function (e) { return e.viaje_id === id; }); }
  function destinosDe(v) { return json(v && v.destinos, []); }
  function estadoViaje(v) {
    var t = hoy();
    if (v.archivado === 'sí') return 'archivado';
    if (!v.inicio || v.inicio > t) return 'proximo';
    if ((v.fin || v.inicio) < t) return 'anterior';
    return 'actual';
  }
  function viajeActual() {
    return D().viajes.filter(function (v) { return estadoViaje(v) === 'actual'; }).sort(function (a, b) { return a.inicio < b.inicio ? -1 : 1; })[0];
  }
  function porFechaHora(a, b) { return (a.fecha || '9999') + (a.hora || '99') < (b.fecha || '9999') + (b.hora || '99') ? -1 : 1; }
  // Ciudades del viaje para una fecha (destinos cuyo periodo la incluye; si no, todos).
  function ciudadesDe(v, fecha) {
    var ds = destinosDe(v);
    var delDia = fecha ? ds.filter(function (d) { return (d.desde || d.hasta) && (!d.desde || d.desde <= fecha) && (!d.hasta || fecha <= d.hasta); }) : [];
    var lista = (delDia.length ? delDia : ds).map(function (d) { return d.ciudad; });
    if (!lista.length && v && v.destino) lista = v.destino.split(/\s*[·,;]\s*/).filter(Boolean);
    return lista;
  }
  function coordsDeEnlace(u) {
    var m = String(u || '').match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/) || String(u || '').match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
    return m ? { lat: m[1], lng: m[2] } : null;
  }
  function distanciaKm(a, b) {
    var r = Math.PI / 180;
    var x = Math.sin((b.lat - a.lat) * r / 2), y = Math.sin((b.lng - a.lng) * r / 2);
    return 12742 * Math.asin(Math.sqrt(x * x + Math.cos(a.lat * r) * Math.cos(b.lat * r) * y * y));
  }

  // Mensaje breve en la franja superior (se mantiene 5 s aunque la pantalla se redibuje).
  var mensajeTemporal = null;
  function aviso(texto, error) {
    mensajeTemporal = { texto: texto, error: !!error, hasta: Date.now() + 5000 };
    pintarFranja();
    clearTimeout(aviso.t);
    aviso.t = setTimeout(function () { mensajeTemporal = null; pintarFranja(); }, 5000);
  }
  // Solo se dice "guardado" si el dispositivo lo guardo de verdad.
  function avisoGuardado(r, texto) {
    if (r && r.local) aviso(texto);
    else aviso('No se pudo guardar en este dispositivo. El cambio se enviará al servicio en cuanto haya conexión; no cierre la aplicación mientras aparezca «por enviar».', true);
  }

  function icono(n, tam) {
    var rutas = {
      volver: '<path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      candado: '<rect x="5.5" y="11" width="13" height="9.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8.5 11V8.2a3.5 3.5 0 0 1 7 0V11" fill="none" stroke="currentColor" stroke-width="1.5"/>',
      ajustes: '<circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5M6 6l1.8 1.8M16.2 16.2L18 18M6 18l1.8-1.8M16.2 7.8L18 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      lapiz: '<path d="M4.5 19.5h3.8L19 8.8l-3.8-3.8L4.5 15.7z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
      lupa: '<circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M15.5 15.5l4.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      avion: '<path d="M2.5 12h19M17 7.5l4.5 4.5-4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
      lugar: '<path d="M12 20.5s-6-5.6-6-10a6 6 0 0 1 12 0c0 4.4-6 10-6 10z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="10.3" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/>'
    };
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', tam || '20'); s.setAttribute('height', tam || '20');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = rutas[n]; // rutas fijas del codigo, sin datos
    return s;
  }
  function boton(icon, etiqueta, fn) { return h('button.redondo', { type: 'button', 'aria-label': etiqueta, onclick: fn }, icono(icon)); }
  function cab(titulo, o) {
    o = o || {};
    return h('header.cab',
      o.volver ? boton('volver', 'Volver', function () { history.back(); }) : null,
      h('div.txt', h('div.titulo', titulo), o.sub ? h('div.subtitulo', o.sub) : null),
      o.extra || null,
      o.buscar ? boton('lupa', 'Buscar', function () { ir('buscar'); }) : null,
      boton('candado', 'Bloquear', function () { MV.bloquear(false); }));
  }
  function campo(etiqueta, nombre, valor, tipo, extra) {
    extra = extra || {};
    var control;
    if (tipo === 'textarea') control = h('textarea', { name: nombre, rows: extra.filas || 3, placeholder: extra.ph || '' });
    else if (tipo === 'select') {
      control = h('select', { name: nombre }, (extra.opciones || []).map(function (o) {
        if (o && o.grupo) return h('optgroup', { label: o.grupo }, o.opciones.map(function (x) { return h('option', { value: x[0] }, x[1]); }));
        var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o;
        return h('option', { value: v }, t);
      }));
    } else control = h('input', { name: nombre, type: tipo || 'text', placeholder: extra.ph || '', inputmode: extra.im,
      autocomplete: 'off', maxlength: extra.max });
    control.value = valor || '';
    var falta = extra.falta ? h('i.falta', ' · no aparece en el documento') : null;
    return h('label' + (extra.falta ? '.dudoso' : ''), etiqueta, falta, control);
  }
  function leerFormulario(form) {
    var r = {};
    Array.prototype.forEach.call(form.querySelectorAll('[name]'), function (c) {
      if (c.type === 'file') return;
      r[c.name] = c.type === 'checkbox' ? (c.checked ? 'sí' : '') : c.value.trim();
    });
    return r;
  }
  function vacio(texto) { return h('div.vacio', texto); }
  function chip(t, clase) { return h('span.chip' + (clase ? '.' + clase : ''), t); }
  function etiquetaEstado(e) { var x = ESTADOS_LUGAR.find(function (y) { return y[0] === e; }); return x ? x[1] : 'Quiero ir'; }

  /* ====================== FOTOS DE LUGARES ====================== */

  var urlsFotos = {};
  // Coloca la foto en un <img>: memoria, copia cifrada del dispositivo o servicio.
  function ponerFoto(img, fotoId, accion) {
    if (!fotoId) return img;
    if (urlsFotos[fotoId]) { img.src = urlsFotos[fotoId]; return img; }
    Almacen.leerFoto(fotoId).then(function (f) {
      if (f) return f;
      if (!MV.hayConexion()) return null;
      return MV.api(accion || 'foto', { id: fotoId }).then(function (r) {
        if (!r.ok) return null;
        var bin = atob(r.datos.base64), b = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
        Almacen.guardarFoto(fotoId, b, r.datos.tipo);
        return { bytes: b, tipo: r.datos.tipo };
      });
    }).then(function (f) {
      if (!f) return;
      urlsFotos[fotoId] = urlsFotos[fotoId] || URL.createObjectURL(new Blob([f.bytes], { type: f.tipo }));
      img.src = urlsFotos[fotoId];
    });
    return img;
  }
  function miniatura(l) {
    if (l && l.foto_id) return ponerFoto(h('img.miniatura', { alt: '' }), l.foto_id);
    return h('div.miniatura', icono('lugar', '22'));
  }

  // La foto se envia tal como la eligio la titular; solo si pesa mas de
  // 2,5 MB se reduce su tamaño (sin recortar ni retocar) para respetar el limite.
  function prepararFoto(archivo) {
    var tipos = ['image/jpeg', 'image/png', 'image/webp'];
    if (tipos.indexOf(archivo.type) !== -1 && archivo.size <= 2.5 * 1024 * 1024) {
      return archivo.arrayBuffer().then(function (b) { return { bytes: new Uint8Array(b), tipo: archivo.type }; });
    }
    return createImageBitmap(archivo).then(function (bmp) {
      var escala = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
      var lienzo = document.createElement('canvas');
      lienzo.width = Math.round(bmp.width * escala); lienzo.height = Math.round(bmp.height * escala);
      lienzo.getContext('2d').drawImage(bmp, 0, 0, lienzo.width, lienzo.height);
      return new Promise(function (ok) { lienzo.toBlob(ok, 'image/jpeg', 0.86); });
    }).then(function (blob) { return blob.arrayBuffer(); }).then(function (b) { return { bytes: new Uint8Array(b), tipo: 'image/jpeg' }; });
  }
  function aBase64(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }

  /* ====================== NAVEGACION ====================== */

  var SECCION = { inicio: 'inicio', dia: 'viajes', viajes: 'viajes', viaje: 'viajes', viajeForm: 'viajes', elemento: 'viajes',
    elementoForm: 'viajes', asignacionForm: 'viajes', itinerario: 'viajes', reservas: 'viajes', emergencias: 'viajes',
    recordatorios: 'viajes', gastos: 'viajes', gastoForm: 'viajes', lugares: 'lugares', lugarForm: 'lugares', galeria: 'lugares',
    archivos: 'archivos', revision: 'archivos', buscar: '', ajustes: '' };

  function ir(p, a, reemplazar) {
    ruta = { p: p, a: a || {} };
    if (reemplazar) history.replaceState({ mv: ruta }, ''); else history.pushState({ mv: ruta }, '');
    pintar();
  }
  window.addEventListener('popstate', function (ev) {
    if (!$('vistaApp') || $('vistaApp').classList.contains('oculto')) return;
    ruta = (ev.state && ev.state.mv) || { p: 'inicio', a: {} };
    pintar();
  });
  Array.prototype.forEach.call(document.querySelectorAll('#navegacion [data-ir]'), function (b) {
    b.addEventListener('click', function () { ir(b.getAttribute('data-ir')); });
  });

  function pintar() {
    var c = $('contenido');
    c.innerHTML = '';
    var fn = PANTALLAS[ruta.p] || PANTALLAS.inicio;
    try { fn(c, ruta.a); } catch (e) { c.appendChild(h('div.alerta', 'No se pudo mostrar esta pantalla: ' + e.message)); }
    Array.prototype.forEach.call(document.querySelectorAll('#navegacion [data-ir]'), function (b) {
      b.classList.toggle('activo', b.getAttribute('data-ir') === SECCION[ruta.p]);
    });
    var porRevisar = D().documentos.filter(function (d) { return d.estado === 'por revisar'; }).length;
    $('cuentaDocs').textContent = porRevisar;
    $('cuentaDocs').classList.toggle('oculto', !porRevisar);
    pintarFranja();
    window.scrollTo(0, 0);
  }

  function pintarFranja() {
    var f = $('franja');
    var temporal = mensajeTemporal && mensajeTemporal.hasta > Date.now() ? mensajeTemporal : null;
    var partesF = temporal ? [temporal.texto] : [];
    if (!MV.hayConexion()) partesF.push('Sin conexión: consulta la copia de este dispositivo');
    var n = Datos.pendientes.length;
    if (n) partesF.push(n === 1 ? '1 cambio por enviar' : n + ' cambios por enviar');
    var pr = Datos.problemas.length;
    f.innerHTML = '';
    if (partesF.length) f.appendChild(document.createTextNode(partesF.join('. ').replace(/\.\./g, '.') + (pr ? '. ' : '')));
    if (pr) f.appendChild(h('button.enlace', { type: 'button', onclick: function () { ir('ajustes'); } },
      pr === 1 ? '1 cambio necesita su decisión' : pr + ' cambios necesitan su decisión'));
    f.className = 'franja' + (pr || (temporal && temporal.error) ? ' esError' : '') + (!partesF.length && !pr ? ' oculto' : '');
  }

  var PANTALLAS = {};

  /* ====================== VIAJEROS Y TITULARES DE DOCUMENTOS ====================== */

  var COMPARTIDO = 'Compartido';

  // Personas del viaje a partir de «Personas que viajan» (cualquier cantidad):
  // "Ana, Luis", "Luis y Ana", una por línea...
  function viajerosDe(v) {
    var vistos = {};
    return String((v && v.personas) || '').split(/\s*[,;\n]\s*|\s+(?:y|e)\s+|\s*&\s*/i)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { var k = norm(s); if (!k || vistos[k]) return false; vistos[k] = 1; return true; });
  }
  // "PRUEBA/ANA MARIA MRS [ADT]" -> "Ana Maria Prueba"
  function nombrePersona(s) {
    s = String(s || '').replace(/\[.*?\]|\(.*?\)/g, ' ').trim();
    if (s.indexOf('/') !== -1) { var p = s.split('/'); s = p.slice(1).join(' ') + ' ' + p[0]; }
    s = s.replace(/\b(MR|MRS|MS|MISS|MSTR|SR|SRA|SRTA|ADT|CHD|INF)\b\.?/gi, ' ').replace(/\s+/g, ' ').trim();
    return s.toLowerCase().replace(/(^|[\s-])(\S)/g, function (m, a, b) { return a + b.toUpperCase(); });
  }
  function tokens(s) { return norm(s).replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(function (t) { return t.length > 1; }); }
  // Viajero que corresponde al nombre del documento, solo si es uno y sin duda.
  function coincidir(nombreDoc, viajeros) {
    var td = tokens(nombreDoc);
    if (!td.length) return null;
    var c = viajeros.filter(function (n) { var tv = tokens(n); return tv.length && tv.every(function (t) { return td.indexOf(t) !== -1; }); });
    if (c.length === 1) return c[0];
    if (!c.length) {
      var c2 = viajeros.filter(function (n) { var tv = tokens(n); return tv.length && td.indexOf(tv[0]) !== -1; });
      if (c2.length === 1) return c2[0];
    }
    return null;
  }
  function esPersonal(tipo) { return tipo === 'vuelo' || tipo === 'seguro'; }
  function esCondiciones(e) { return e.tipo === 'seguro' && datosDe(e).documento === 'condiciones generales'; }

  // Titular de una reserva o documento.
  // estado: 'confirmado' (lo eligió la titular), 'detectado' (sin duda por el
  // nombre del documento), 'dudoso' (hay un nombre pero no coincide con
  // seguridad) o 'sin' (no hay nombre).
  // Itinerario o reserva de vuelo sin numero de boleto ni pasajero unico:
  // es el documento comun de la reserva (lista a todos los pasajeros).
  function esReservaComun(e) { var d = datosDe(e); return e.tipo === 'vuelo' && !d.boleto && !d.pasajero && !d.asiento && !d.puerta; }
  function nombreArchivo(e) {
    var doc = e.documento_id ? D().documentos.find(function (x) { return x.id_archivo === e.documento_id; }) : null;
    return doc ? String(doc.nombre || '').replace(/\.[a-z0-9]{2,4}$/i, '') : '';
  }
  function titularDe(e, v) {
    var d = datosDe(e);
    var enDoc = d.pasajero || d.asegurado || '';
    if (d.titular) return { nombre: d.titular, estado: 'confirmado', enDoc: enDoc };
    if (esCondiciones(e) || esReservaComun(e)) return { nombre: COMPARTIDO, estado: 'detectado', enDoc: '' };
    var viajeros = viajerosDe(v);
    // Sin nombre en el texto: se intenta con el nombre del archivo («... para CARLOS JOSE GUZMAN.pdf»).
    if (!enDoc && e.documento_id && coincidir(nombreArchivo(e), viajeros)) enDoc = nombreArchivo(e).replace(/^.*\bpara\b\s*/i, '');
    var m = enDoc ? coincidir(enDoc, viajeros) : null;
    if (m) return { nombre: m, estado: 'detectado', enDoc: enDoc };
    if (!enDoc && viajeros.length === 1) return { nombre: viajeros[0], estado: 'detectado', enDoc: '' };
    if (!enDoc && !esPersonal(e.tipo)) return { nombre: COMPARTIDO, estado: 'detectado', enDoc: '' };
    return { nombre: '', estado: enDoc ? 'dudoso' : 'sin', enDoc: enDoc };
  }

  function agregarViajero(v, nombre) {
    var l = viajerosDe(v);
    if (!nombre || nombre === COMPARTIDO || l.some(function (n) { return norm(n) === norm(nombre); })) return Promise.resolve({ local: true });
    l.push(nombre);
    return Datos.guardar('Viajes', Object.assign({}, v, { personas: l.join(', ') }));
  }

  // Corrección manual de la asociación (nunca se fusiona ni se elimina nada).
  function guardarTitular(e, nombre, v) {
    var d = Object.assign({}, datosDe(e));
    if (nombre) d.titular = nombre; else delete d.titular;
    var x = Object.assign({}, e, { datos: d });
    return agregarViajero(v, nombre).then(function () { return Datos.guardar('Elementos', x); })
      .then(function (r) { avisoGuardado(r, nombre ? 'Documento asociado a ' + (nombre === COMPARTIDO ? 'todos los viajeros' : nombre) + '.' : 'Asociación quitada.'); });
  }

  // Selector «¿De quién es?»: viajeros, nombre del documento y «Compartido».
  function selectorTitular(e, v, t, alElegir) {
    var viajeros = viajerosDe(v);
    var pdf = t.enDoc ? nombrePersona(t.enDoc) : '';
    var op = [['', t.nombre ? 'Quitar la asociación' : '¿De quién es?']].concat(viajeros.map(function (n) { return [n, n]; }));
    if (pdf && !viajeros.some(function (n) { return norm(n) === norm(pdf); }) && !coincidir(t.enDoc, viajeros)) op.push([pdf, pdf + ' (añadir al viaje)']);
    op.push([COMPARTIDO, 'Compartido (todos)']);
    var sel = h('select.selTitular', { 'aria-label': '¿De quién es este documento?', onclick: function (ev) { ev.stopPropagation(); } },
      op.map(function (o) { return h('option', { value: o[0] }, o[1]); }));
    sel.value = t.estado === 'confirmado' || t.estado === 'detectado' ? t.nombre : '';
    sel.addEventListener('change', function () { (alElegir || function (n) { guardarTitular(e, n, v); })(sel.value); });
    return sel;
  }

  /* ====================== RESERVAS AGRUPADAS (cada una una sola vez) ====================== */

  function numVuelo(e) { var d = datosDe(e); return norm(d.vuelo || e.titulo).replace(/[^a-z0-9]/g, ''); }
  function claveReserva(e) {
    if (e.tipo === 'vuelo') return 'vuelo|' + numVuelo(e) + '|' + (e.fecha || '');
    if (e.tipo === 'seguro') return 'seguro';
    return e.tipo + '|' + (norm(e.confirmacion).replace(/[^a-z0-9]/g, '') || norm(e.titulo)) + '|' + (e.fecha || '');
  }
  function completitud(e) {
    var d = datosDe(e);
    return ['fecha', 'hora', 'fecha_fin', 'hora_fin', 'lugar', 'direccion', 'confirmacion', 'telefono'].filter(function (k) { return e[k]; }).length +
      Object.keys(d).length * 0.1 - (esCondiciones(e) ? 20 : 0);
  }
  // Una entrada por vuelo, alojamiento o reserva, aunque llegue en varios
  // documentos (uno por pasajero). Los seguros forman un solo grupo.
  function gruposReservas(v) {
    var mapa = {}, orden = [];
    elementosDe(v.id).sort(porFechaHora).forEach(function (e) {
      var k = claveReserva(e);
      // Un vuelo sin fecha se une al mismo vuelo con fecha.
      if (e.tipo === 'vuelo' && !e.fecha) {
        var otro = orden.find(function (g) { return g.tipo === 'vuelo' && g.clave.split('|')[1] === numVuelo(e); });
        if (otro) k = otro.clave;
      }
      if (!mapa[k]) { mapa[k] = { clave: k, tipo: e.tipo, elementos: [] }; orden.push(mapa[k]); }
      mapa[k].elementos.push(e);
    });
    orden.forEach(function (g) {
      g.principal = g.elementos.slice().sort(function (a, b) { return completitud(b) - completitud(a); })[0];
    });
    return orden;
  }
  function principales(v) { return gruposReservas(v).map(function (g) { return g.principal; }); }

  // Documentos de una reserva, cada uno con su titular. Una copia real (mismo
  // contenido) se señala; nunca se oculta, fusiona ni elimina.
  function filasDocumentos(g, v) {
    var filas = g.elementos.filter(function (e) { return e.documento_id; }).map(function (e) {
      return { e: e, doc: D().documentos.find(function (x) { return x.id_archivo === e.documento_id; }) || null, t: titularDe(e, v) };
    });
    var vistos = {};
    filas.forEach(function (f) {
      var k = f.doc && f.doc.huella;
      if (!k) return;
      if (vistos[k] && vistos[k] !== f.e.documento_id) f.copiaDe = vistos[k];
      else vistos[k] = f.e.documento_id;
    });
    var orden = viajerosDe(v);
    var pos = function (f) { var i = orden.indexOf(f.t.nombre); return f.t.nombre === COMPARTIDO ? 900 : (i === -1 ? (f.t.nombre ? 800 : 1000) : i); };
    return filas.sort(function (a, b) { return pos(a) - pos(b); });
  }
  function etiquetaDocumento(e) {
    var d = datosDe(e);
    if (e.tipo === 'vuelo') return d.asiento || d.puerta ? 'Ver pase de abordar' : (d.boleto ? 'Ver boleto' : 'Ver itinerario');
    if (e.tipo === 'seguro') return esCondiciones(e) ? 'Ver condiciones' : (e.fecha || e.fecha_fin ? 'Ver seguro' : 'Ver recibo');
    if (e.tipo === 'hotel') return 'Ver reserva';
    return 'Ver documento';
  }

  // Abre el documento: copia del dispositivo (también sin conexión) o Drive.
  function abrirDocumento(id) {
    var doc = D().documentos.find(function (x) { return x.id_archivo === id; });
    var abrirUrl = function (u) { var a = h('a', { href: u, target: '_blank', rel: 'noopener noreferrer' }); document.body.appendChild(a); a.click(); a.remove(); };
    Almacen.leerArchivo(id).then(function (a) {
      if (a) { abrirUrl(URL.createObjectURL(new Blob([a.bytes], { type: a.tipo }))); return; }
      if (!MV.hayConexion()) { aviso('Este documento no está guardado en el dispositivo; se consulta con internet.', true); return; }
      abrirUrl(doc ? doc.enlace : 'https://drive.google.com/file/d/' + id + '/view');
    }, function () { if (doc && MV.hayConexion()) abrirUrl(doc.enlace); });
  }

  /* ====================== ICONOS DE ACCESOS ====================== */

  var ICONOS_ACCESO = {
    itinerario: '<rect x="4" y="5.5" width="16" height="14.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    reservas: '<path d="M4 7.5a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 20 7.5v2a2.5 2.5 0 0 0 0 5v2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-2a2.5 2.5 0 0 0 0-5z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M14.5 6.5v11" stroke="currentColor" stroke-width="1.5" stroke-dasharray="1.6 1.8"/>',
    lugares: '<path d="M12 20.5s-6-5.6-6-10a6 6 0 0 1 12 0c0 4.4-6 10-6 10z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="10.3" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/>',
    gastos: '<rect x="3.5" y="6.5" width="17" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 9.5v5M17.5 9.5v5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    emergencias: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    recordatorios: '<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 20.5h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    viaje: '<rect x="5" y="3.5" width="14" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="11" r="3.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9 16.5h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'
  };
  function iconoAcceso(n) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '26'); s.setAttribute('height', '26'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ICONOS_ACCESO[n]; // rutas fijas del codigo, sin datos
    return s;
  }

  // Accesos grandes de un viaje (sin pestañas ni desplazamiento horizontal).
  function accesosViaje(v, cuales) {
    var grupos = gruposReservas(v);
    var porConfirmar = grupos.reduce(function (n, g) { return n + filasDocumentos(g, v).filter(function (f) { return f.t.estado === 'dudoso' || f.t.estado === 'sin'; }).length; }, 0);
    var ciudad = ciudadesDe(v, estadoViaje(v) === 'actual' ? hoy() : v.inicio)[0] || '';
    var enCiudad = ciudad ? D().lugares.filter(function (l) { return norm(l.ciudad) === norm(ciudad); }).length : 0;
    var nGastos = gastosDe(v).length;
    var dias = v.inicio && v.fin ? difDias(v.fin, v.inicio) + 1 : 0;
    var todos = {
      itinerario: ['Itinerario', dias ? 'Un día a la vez · ' + dias + (dias === 1 ? ' día' : ' días') : 'Un día a la vez', function () { ir('itinerario', { viaje: v.id }); }],
      reservas: ['Documentos y reservas', porConfirmar ? porConfirmar + ' por confirmar' : (grupos.length ? grupos.length + (grupos.length === 1 ? ' reserva' : ' reservas') : 'Vuelos, hotel y seguros'), function () { ir('reservas', { viaje: v.id }); }],
      lugares: ['Lugares por conocer', ciudad ? enCiudad + ' en ' + ciudad : 'Mis lugares favoritos', function () { filtrosLugares.ciudad = ciudad; ir('lugares'); }],
      gastos: ['Gastos de mi viaje', nGastos ? dinero(totalGastos(v)) : 'Sin gastos registrados', function () { ir('gastos', { viaje: v.id }); }],
      emergencias: ['Emergencias', 'Seguro y teléfonos', function () { ir('emergencias', { viaje: v.id }); }],
      recordatorios: ['Recordatorios', 'Para Google Calendar', function () { ir('recordatorios', { viaje: v.id }); }],
      viaje: ['Mi viaje', 'Todo sobre ' + v.titulo, function () { ir('viaje', { id: v.id }); }]
    };
    return h('div.accesosViaje', cuales.map(function (k) {
      var t = todos[k];
      return h('button.accesoViaje' + (k === 'reservas' && porConfirmar ? '.atencion' : ''), { type: 'button', onclick: t[2] },
        iconoAcceso(k), h('b', t[0]), h('span', t[1]));
    }));
  }

  /* ====================== INICIO ====================== */

  PANTALLAS.inicio = function (c) {
    var v = viajeActual();
    if (v) { pantallaHoy(c, v); return; }
    c.appendChild(cab('Inicio', { sub: mayuscula(fechaLarga(hoy())), buscar: true,
      extra: boton('ajustes', 'Ajustes', function () { ir('ajustes'); }) }));
    var proximos = D().viajes.filter(function (x) { return estadoViaje(x) === 'proximo'; })
      .sort(function (a, b) { return (a.inicio || '9') < (b.inicio || '9') ? -1 : 1; });
    if (proximos.length) {
      var p = proximos[0];
      c.appendChild(h('h2.seccion', 'Mi próximo viaje'));
      c.appendChild(tarjetaViaje(p));
      // Lo primero que hay que hacer al empezar el viaje (una sola línea).
      var primero = p.inicio ? entradasDia(p, p.inicio).fijas[0] : null;
      if (primero) {
        c.appendChild(h('div.grupoDia.sinHilo', 'Para empezar, ' + fechaLarga(p.inicio)));
        var hilo = h('div.hilo'); hilo.appendChild(paso(primero, '', p, true)); c.appendChild(hilo);
      }
      c.appendChild(accesosViaje(p, ['itinerario', 'reservas', 'lugares', 'gastos']));
    } else {
      c.appendChild(vacio('No hay viajes programados. Organice uno o guarde los lugares que quiere conocer.'));
    }
    c.appendChild(h('div.fila.margen',
      h('button.primario', { type: 'button', onclick: function () { ir('viajeForm', {}); } }, 'Organizar un viaje'),
      h('button.secundario', { type: 'button', onclick: function () { ir('lugarForm', {}); } }, 'Quiero conocer')));
    avisoPorRevisar(c);
  };

  function avisoPorRevisar(c) {
    var n = D().documentos.filter(function (d) { return d.estado === 'por revisar'; }).length;
    if (n) c.appendChild(h('div', { class: 'alerta tocable', role: 'button', onclick: function () { ir('archivos'); } },
      n === 1 ? 'Hay 1 documento nuevo por revisar en Documentos.' : 'Hay ' + n + ' documentos nuevos por revisar en Documentos.'));
  }

  // «Mi día de hoy»: la protagonista durante el viaje.
  function pantallaHoy(c, v) {
    var f = hoy();
    var n = v.inicio ? difDias(f, v.inicio) + 1 : 0, total = v.inicio && v.fin ? difDias(v.fin, v.inicio) + 1 : 0;
    c.appendChild(cab('Mi día de hoy', { buscar: true, extra: boton('ajustes', 'Ajustes', function () { ir('ajustes'); }),
      sub: [mayuscula(fechaLarga(f)), ciudadesDe(v, f)[0] || '', n > 0 && total ? 'día ' + n + ' de ' + total : ''].filter(Boolean).join(' · ') }));
    // Hoy se consulta; se organiza (mover, ordenar) en el Itinerario.
    bloqueDia(c, v, f, { consulta: true });
    c.appendChild(h('h2.seccion', v.titulo));
    c.appendChild(accesosViaje(v, ['itinerario', 'reservas', 'lugares', 'gastos', 'emergencias', 'viaje']));
    avisoPorRevisar(c);
  }

  /* ====================== UN DIA DEL VIAJE ====================== */

  // Reparte lo del dia en: horario fijo, actividades del dia y «Si nos queda tiempo».
  // Cada vuelo, alojamiento o reserva aparece una sola vez (ver gruposReservas).
  function entradasDia(v, fecha) {
    var fijas = [], flexibles = [], opcionales = [];
    principales(v).forEach(function (e) {
      if (e.tipo === 'seguro') return;
      var d = datosDe(e);
      if (e.tipo === 'hotel') {
        if (e.fecha === fecha) fijas.push({ hora: e.hora, titulo: 'Entrada al alojamiento', sub: e.titulo, e: e, sitio: e.direccion || e.lugar });
        if (e.fecha_fin === fecha) fijas.push({ hora: e.hora_fin, titulo: 'Salida del alojamiento', sub: e.titulo, e: e });
        return;
      }
      if (e.tipo === 'auto' && e.fecha_fin === fecha && e.fecha !== fecha) fijas.push({ hora: e.hora_fin, titulo: 'Devolver el auto', sub: e.titulo, e: e, sitio: e.direccion });
      if (e.fecha !== fecha) return;
      if (e.tipo === 'vuelo') {
        fijas.push({ hora: e.hora, titulo: 'Vuelo ' + (d.vuelo || e.titulo), e: e, sitio: d.origen ? 'Aeropuerto ' + d.origen : e.lugar, etiquetaSitio: 'Cómo llegar al aeropuerto',
          sub: [d.origen && d.destino ? d.origen + ' → ' + d.destino : '', e.hora_fin ? 'llega ' + e.hora_fin : '', d.terminal ? 'terminal ' + d.terminal : ''].filter(Boolean).join(' · ') });
        return;
      }
      fijas.push({ hora: e.hora, titulo: e.titulo, sub: TIPOS[e.tipo], e: e, sitio: e.direccion || e.lugar });
    });
    D().asignaciones.filter(function (x) { return x.viaje_id === v.id && x.fecha === fecha; }).forEach(function (x) {
      var l = lugar(x.lugar_id);
      if (!l) return;
      var item = { hora: x.hora, titulo: l.nombre, sub: mayuscula(l.categoria), asig: x, l: l,
        sitio: l.lat && l.lng ? l.lat + ',' + l.lng : (l.direccion || [l.nombre, l.ciudad, l.pais].filter(Boolean).join(', ')) };
      if (x.hora) fijas.push(item);
      else if (x.prioridad === 'opcional') opcionales.push(item);
      else flexibles.push(item);
    });
    var porOrden = function (a, b) {
      var oa = a.asig.orden === '' ? 999 : Number(a.asig.orden), ob = b.asig.orden === '' ? 999 : Number(b.asig.orden);
      return oa !== ob ? oa - ob : (norm(a.titulo) < norm(b.titulo) ? -1 : 1);
    };
    fijas.sort(function (a, b) { return (a.hora || '99') < (b.hora || '99') ? -1 : 1; });
    flexibles.sort(porOrden); opcionales.sort(porOrden);
    return { fijas: fijas, flexibles: flexibles, opcionales: opcionales };
  }

  // Dias del viaje (de inicio a fin, mas los que tengan reservas o actividades).
  function diasDe(v) {
    var fechas = {};
    principales(v).forEach(function (e) {
      if (e.tipo === 'seguro') return;
      if (e.fecha) fechas[e.fecha] = 1;
      if (e.fecha_fin && (e.tipo === 'hotel' || e.tipo === 'auto')) fechas[e.fecha_fin] = 1;
    });
    D().asignaciones.forEach(function (x) { if (x.viaje_id === v.id && x.fecha) fechas[x.fecha] = 1; });
    if (v.inicio && v.fin && difDias(v.fin, v.inicio) < 62) for (var f = v.inicio; f <= v.fin; f = sumarDias(f, 1)) fechas[f] = 1;
    else if (v.inicio) fechas[v.inicio] = 1;
    return Object.keys(fechas).sort();
  }
  function opcionesDiasViaje(v) {
    return diasDe(v).map(function (f) { return [f, mayuscula(fechaLarga(f))]; });
  }

  // Solo los botones que sirven para cada actividad.
  function paso(x, clase, v, consulta) {
    var esReserva = !!x.e;
    var abrir = function () { if (x.asig) ir('asignacionForm', { id: x.asig.id }); else ir('elemento', { id: x.e.id }); };
    var acciones = h('div.acciones');
    if (x.sitio) acciones.appendChild(enlaceExterno(rutaMaps(x.sitio), x.etiquetaSitio || 'Cómo llegar'));
    if (x.asig && v && !consulta) acciones.appendChild(botonMover(x.asig, v));
    return h('div.paso' + (esReserva ? '.reserva' : '') + (clase ? '.' + clase : ''),
      h('div.hora' + (x.hora ? '' : '.libre'), x.hora || (esReserva ? '—' : '')),
      h('div.caja', { onclick: abrir },
        x.l && x.l.foto_id ? ponerFoto(h('img.foto', { alt: '' }), x.l.foto_id) : null,
        h('div.itemTexto', h('div.quien', x.titulo), x.sub ? h('div.proxima', x.sub) : null,
          acciones.childNodes.length ? acciones : null)));
  }

  // Mover una actividad a otro dia sin salir del itinerario.
  function botonMover(asig, v) {
    var b = h('button.secundario.chico', { type: 'button', onclick: function (ev) {
      ev.stopPropagation();
      var sel = h('select.moverDia', { 'aria-label': 'Mover a otro día', onclick: function (e2) { e2.stopPropagation(); } },
        h('option', { value: '__' }, 'Mover a…'),
        opcionesDiasViaje(v).filter(function (o) { return o[0] !== asig.fecha; }).map(function (o) { return h('option', { value: o[0] }, o[1]); }),
        h('option', { value: '' }, 'Sin día asignado'));
      sel.addEventListener('change', function () {
        if (sel.value === '__') return;
        var destino = sel.value;
        Datos.guardar('Asignaciones', Object.assign({}, asig, { fecha: destino, orden: '' })).then(function (r) {
          avisoGuardado(r, destino ? 'Movido al ' + fechaLarga(destino) + '.' : 'Quedó sin día asignado.');
          pintar();
        });
      });
      b.replaceWith(sel);
      sel.focus();
    } }, 'Cambiar de día');
    return b;
  }

  function bloqueDia(c, v, fecha, o) {
    o = o || {};
    var x = entradasDia(v, fecha);
    if (x.fijas.length) {
      c.appendChild(h('div.grupoDia', 'Con horario'));
      var hilo = h('div.hilo');
      x.fijas.forEach(function (e) { hilo.appendChild(paso(e, '', v, o.consulta)); });
      c.appendChild(hilo);
    }
    if (x.flexibles.length) {
      c.appendChild(h('div.grupoDia', 'Actividades del día'));
      var h2 = h('div.hilo');
      x.flexibles.forEach(function (e) { h2.appendChild(paso(e, '', v, o.consulta)); });
      c.appendChild(h2);
    }
    if (x.opcionales.length) {
      c.appendChild(h('div.grupoDia', 'Si nos queda tiempo'));
      var h3 = h('div.hilo');
      x.opcionales.forEach(function (e) { h3.appendChild(paso(e, 'opcional', v, o.consulta)); });
      c.appendChild(h3);
    }
    if (!x.fijas.length && !x.flexibles.length && !x.opcionales.length) c.appendChild(h('div.libreDia', 'Sin planes para este día.'));
    var acciones = h('div.fila.margen',
      h('button.secundario.chico', { type: 'button', onclick: function () { ir('asignacionForm', { viaje: v.id, fecha: fecha }); } }, 'Agregar a mi itinerario'));
    if (o.completo && x.flexibles.length + x.opcionales.length >= 2) {
      acciones.appendChild(h('button.secundario.chico', { type: 'button', onclick: function () { sugerirOrden(x, acciones); } }, 'Sugerir orden por cercanía'));
    }
    c.appendChild(acciones);
  }

  // Orden sugerido (vecino mas cercano). No cambia nada sin aprobacion.
  function sugerirOrden(x, despuesDe) {
    var previo = document.querySelector('.sugerencia');
    if (previo) previo.remove();
    var todas = x.flexibles.concat(x.opcionales);
    var con = todas.filter(function (e) { return e.l.lat && e.l.lng; });
    var sin = todas.filter(function (e) { return !(e.l.lat && e.l.lng); });
    var caja = h('div.sugerencia');
    if (con.length < 2) {
      caja.appendChild(h('p.sinMargen', 'Para sugerir un orden se necesita la ubicación de al menos dos lugares. Se obtiene al guardar el lugar con su enlace de Google Maps.'));
      despuesDe.after(caja);
      return;
    }
    // Partida: el ultimo lugar con hora fija del dia que tenga ubicacion, o el primero de la lista actual.
    var fijoConUbic = x.fijas.filter(function (e) { return e.l && e.l.lat && e.l.lng; }).pop();
    var actual = fijoConUbic ? { lat: Number(fijoConUbic.l.lat), lng: Number(fijoConUbic.l.lng) } : null;
    var resto = con.slice(), ordenados = [], km = 0;
    if (!actual) { var p0 = resto.shift(); ordenados.push(p0); actual = { lat: Number(p0.l.lat), lng: Number(p0.l.lng) }; }
    while (resto.length) {
      var mejor = 0, dm = Infinity;
      resto.forEach(function (e, i) { var d = distanciaKm(actual, { lat: Number(e.l.lat), lng: Number(e.l.lng) }); if (d < dm) { dm = d; mejor = i; } });
      var sig = resto.splice(mejor, 1)[0];
      km += dm; ordenados.push(sig); actual = { lat: Number(sig.l.lat), lng: Number(sig.l.lng) };
    }
    // Se respeta la separacion entre actividades del dia y «Si nos queda tiempo».
    var final = ordenados.filter(function (e) { return e.asig.prioridad !== 'opcional'; })
      .concat(ordenados.filter(function (e) { return e.asig.prioridad === 'opcional'; })).concat(sin);
    caja.appendChild(h('div.quien', 'Orden sugerido por cercanía'));
    caja.appendChild(h('ol', final.map(function (e) { return h('li', e.titulo + (e.l.lat ? '' : ' (sin ubicación)')); })));
    caja.appendChild(h('p.ayuda.sinMargen', 'Recorrido aproximado en línea recta: ' + km.toFixed(1).replace('.', ',') + ' km. Es solo una sugerencia; no tiene en cuenta horarios ni tráfico. Nada cambia hasta que usted lo aplique.'));
    caja.appendChild(h('div.fila',
      h('button.primario.chico', { type: 'button', onclick: function () {
        var cambios = [];
        final.forEach(function (e, i) { if (String(e.asig.orden) !== String(i)) cambios.push(Object.assign({}, e.asig, { orden: String(i) })); });
        cambios.reduce(function (p, a) { return p.then(function (ok) { return Datos.guardar('Asignaciones', a).then(function (r) { return ok && r.local; }); }); }, Promise.resolve(true))
          .then(function (ok) { avisoGuardado({ local: ok }, 'Orden aplicado.'); pintar(); });
      } }, 'Aplicar este orden'),
      h('button.secundario.chico', { type: 'button', onclick: function () { caja.remove(); } }, 'Mantener el actual')));
    despuesDe.after(caja);
  }

  /* ====================== ITINERARIO: UN DIA A LA VEZ ====================== */

  PANTALLAS.itinerario = function (c, a) {
    var v = viaje(a.viaje);
    if (!v) { c.appendChild(cab('Itinerario', { volver: true })); c.appendChild(vacio('Este viaje ya no existe.')); return; }
    var dias = diasDe(v);
    var sinDia = D().asignaciones.filter(function (x) { return x.viaje_id === v.id && !x.fecha; });
    var fecha = a.fecha === 'sin' && sinDia.length ? 'sin' : (dias.indexOf(a.fecha) !== -1 ? a.fecha : (dias.indexOf(hoy()) !== -1 ? hoy() : dias[0]));
    c.appendChild(cab('Itinerario', { volver: true, sub: v.titulo }));
    if (!dias.length && !sinDia.length) {
      c.appendChild(vacio('Añada las fechas del viaje para organizar el itinerario día por día.'));
      c.appendChild(h('div.margen', h('button.primario.ancho', { type: 'button', onclick: function () { ir('viajeForm', { id: v.id }); } }, 'Añadir las fechas del viaje')));
      return;
    }
    var cambiar = function (f) { ir('itinerario', { viaje: v.id, fecha: f }, true); };
    if (fecha !== 'sin' && fecha) {
      var i = dias.indexOf(fecha);
      var n = v.inicio ? difDias(fecha, v.inicio) + 1 : 0, total = v.inicio && v.fin ? difDias(v.fin, v.inicio) + 1 : 0;
      c.appendChild(h('div.selectorDia',
        h('button.redondo', { type: 'button', 'aria-label': 'Día anterior', disabled: i <= 0, onclick: function () { cambiar(dias[i - 1]); } }, icono('volver')),
        h('div.diaActual' + (fecha === hoy() ? '.hoy' : ''), h('div.diaNombre', mayuscula(fechaLarga(fecha))),
          h('div.diaInfo', [n > 0 && total ? 'Día ' + n + ' de ' + total : '', ciudadesDe(v, fecha)[0] || '', fecha === hoy() ? 'hoy' : ''].filter(Boolean).join(' · '))),
        h('button.redondo.siguiente', { type: 'button', 'aria-label': 'Día siguiente', disabled: i >= dias.length - 1, onclick: function () { cambiar(dias[i + 1]); } }, icono('volver'))));
    } else {
      c.appendChild(h('div.selectorDia', h('div.diaActual', h('div.diaNombre', 'Sin día asignado'), h('div.diaInfo', 'Actividades que aún no tienen fecha'))));
    }
    // Todos los dias a la vista (se acomodan en varias filas, sin desplazamiento lateral).
    if (dias.length <= 31) {
      c.appendChild(h('div.dias', { role: 'group', 'aria-label': 'Días del viaje' }, dias.map(function (f) {
        var p = partes(f);
        return h('button' + (f === fecha ? '.activo' : '') + (f === hoy() ? '.hoy' : ''), { type: 'button', 'aria-label': mayuscula(fechaLarga(f)), 'aria-pressed': f === fecha ? 'true' : 'false',
          onclick: function () { cambiar(f); } }, h('small', DIAS[p.dia]), h('b', p.d));
      }), sinDia.length ? h('button.sinDia' + (fecha === 'sin' ? '.activo' : ''), { type: 'button', onclick: function () { cambiar('sin'); } }, h('small', 'sin'), h('b', 'día')) : null));
    } else {
      var sel = campo('', 'irDia', fecha, 'select', { opciones: opcionesDiasViaje(v).concat(sinDia.length ? [['sin', 'Sin día asignado']] : []) });
      sel.querySelector('select').addEventListener('change', function (ev) { cambiar(ev.target.value); });
      c.appendChild(h('div.margen.formulario', sel));
    }
    if (fecha === 'sin') {
      var hilo = h('div.hilo');
      sinDia.forEach(function (x) {
        var l = lugar(x.lugar_id);
        if (l) hilo.appendChild(paso({ titulo: l.nombre, sub: mayuscula(l.categoria), asig: x, l: l,
          sitio: l.lat && l.lng ? l.lat + ',' + l.lng : (l.direccion || [l.nombre, l.ciudad, l.pais].filter(Boolean).join(', ')) }, '', v));
      });
      c.appendChild(hilo);
      return;
    }
    bloqueDia(c, v, fecha, { completo: true });
  };

  // Compatibilidad: la ruta anterior «dia» abre el itinerario en esa fecha.
  PANTALLAS.dia = function (c, a) { PANTALLAS.itinerario(c, { viaje: a.viaje, fecha: a.fecha }); };

  /* ====================== MIS VIAJES ====================== */

  function tarjetaViaje(v, fija) {
    var grupos = gruposReservas(v);
    var cuenta = function (t) { return grupos.filter(function (g) { return g.tipo === t; }).length; };
    var dias = v.inicio && v.fin ? difDias(v.fin, v.inicio) + 1 : 0;
    var faltan = v.inicio && v.inicio > hoy() ? difDias(v.inicio, hoy()) : -1;
    var p = v.inicio ? partes(v.inicio) : null;
    var est = estadoViaje(v);
    var viajeros = viajerosDe(v);
    return h('div.pasaporte' + (est === 'actual' ? '.actual' : '') + (fija ? '.fija' : ''),
      fija ? {} : { onclick: function () { ir('viaje', { id: v.id }); }, role: 'button', tabindex: '0' },
      h('div.estampa', p ? [h('b', p.d), h('span', MESES[p.m - 1] + ' ' + String(p.a).slice(2))] : h('span', 'Sin fecha')),
      h('div.itemTexto',
        h('div.quien', v.titulo, v._pendiente ? h('i.pend', ' por enviar') : null),
        h('div.proxima', [v.destino && v.destino !== v.titulo ? v.destino : '', rangoFechas(v.inicio, v.fin), dias ? dias + (dias === 1 ? ' día' : ' días') : ''].filter(Boolean).join(' · ')),
        viajeros.length ? h('div.proxima', 'Viajan: ' + viajeros.join(', ')) : null,
        h('div.chips',
          est === 'actual' ? chip('En curso', 'miel') : null,
          faltan > 0 ? chip(faltan === 1 ? 'Mañana' : 'Faltan ' + faltan + ' días', 'miel') : null,
          cuenta('vuelo') ? chip(cuenta('vuelo') + (cuenta('vuelo') > 1 ? ' vuelos' : ' vuelo'), 'tipo') : null,
          cuenta('hotel') ? chip(cuenta('hotel') + (cuenta('hotel') > 1 ? ' alojamientos' : ' alojamiento'), 'tipo') : null,
          cuenta('seguro') ? chip('Seguro', 'tipo') : null)));
  }

  PANTALLAS.viajes = function (c) {
    c.appendChild(cab('Mis viajes', { buscar: true }));
    c.appendChild(h('div.margen', h('button.primario.ancho', { type: 'button', onclick: function () { ir('viajeForm', {}); } }, 'Organizar un viaje')));
    var grupos = { actual: [], proximo: [], anterior: [], archivado: [] };
    D().viajes.forEach(function (v) { grupos[estadoViaje(v)].push(v); });
    grupos.proximo.sort(function (a, b) { return (a.inicio || '9') < (b.inicio || '9') ? -1 : 1; });
    grupos.anterior.sort(function (a, b) { return a.inicio > b.inicio ? -1 : 1; });
    if (!D().viajes.length) c.appendChild(vacio('Todavía no hay viajes. Organice el primero o guarde sus reservas en la carpeta «Documentos de viaje» de su Google Drive.'));
    [['actual', 'Mi viaje actual'], ['proximo', 'Próximos viajes'], ['anterior', 'Viajes anteriores']].forEach(function (g) {
      if (!grupos[g[0]].length) return;
      c.appendChild(h('h2.seccion', g[1], g[0] !== 'actual' ? h('span.cuenta', grupos[g[0]].length) : null));
      grupos[g[0]].forEach(function (v) { c.appendChild(tarjetaViaje(v)); });
    });
    if (grupos.archivado.length) {
      c.appendChild(h('details.plegable', h('summary', 'Archivados (' + grupos.archivado.length + ')'), grupos.archivado.map(function (v) { return tarjetaViaje(v); })));
    }
  };

  // Ficha del viaje: tarjeta de pasaporte y accesos grandes a cada apartado.
  PANTALLAS.viaje = function (c, a) {
    var v = viaje(a.id);
    if (!v) { c.appendChild(cab('Viaje', { volver: true })); c.appendChild(vacio('Este viaje ya no existe.')); return; }
    c.appendChild(cab(v.titulo, { volver: true, sub: rangoFechas(v.inicio, v.fin),
      extra: boton('lapiz', 'Editar viaje', function () { ir('viajeForm', { id: v.id }); }) }));
    c.appendChild(tarjetaViaje(v, true));
    if (v.archivado === 'sí') c.appendChild(h('div.alerta', 'Viaje archivado. Su información se conserva completa.'));
    c.appendChild(accesosViaje(v, ['itinerario', 'reservas', 'lugares', 'gastos', 'emergencias', 'recordatorios']));
  };

  function cabViaje(c, titulo, v) {
    c.appendChild(cab(titulo, { volver: true, sub: v.titulo }));
  }
  function conViaje(fn, titulo) {
    return function (c, a) {
      var v = viaje(a.viaje);
      if (!v) { c.appendChild(cab(titulo, { volver: true })); c.appendChild(vacio('Este viaje ya no existe.')); return; }
      cabViaje(c, titulo, v);
      fn(c, v, a);
    };
  }

  // Tarjeta de embarque (detalle de un vuelo).
  function tarjetaEmbarque(e, compacta) {
    var d = datosDe(e);
    return h('div.embarque' + (compacta ? '.compacto' : ''), { onclick: function () { ir('elemento', { id: e.id }); }, role: 'button', tabindex: '0' },
      h('div.cuerpo',
        h('div.cia', h('b', d.aerolinea || 'Vuelo'), h('span', d.vuelo || e.titulo)),
        h('div.ruta',
          h('div.extremo', d.origen || '—', h('small', e.hora ? 'Sale ' + e.hora : 'Salida')),
          icono('avion', '28'),
          h('div.extremo.der', d.destino || '—', h('small', e.hora_fin ? 'Llega ' + e.hora_fin : 'Llegada')))),
      h('div.talon',
        h('div', 'Fecha', h('b', e.fecha ? fechaCorta(e.fecha) : '—')),
        h('div', d.asiento ? 'Asiento' : 'Terminal', h('b', d.asiento || d.terminal || '—')),
        h('div', 'Reserva', h('b', e.confirmacion || '—'))));
  }

  function filaReserva(e) {
    return h('div.item.tocable', { onclick: function () { ir('elemento', { id: e.id }); } },
      h('div.itemTexto', h('div.quien', e.titulo, e._pendiente ? h('i.pend', ' por enviar') : null),
        h('div.proxima', [TIPOS[e.tipo], e.fecha ? rangoFechas(e.fecha, e.fecha_fin) : '', e.hora].filter(Boolean).join('. ')),
        h('div.chips', e.confirmacion ? chip(e.confirmacion, 'codigo') : null, e.documento_id ? chip('Con documento', 'miel') : null)));
  }

  /* ====================== DOCUMENTOS Y RESERVAS DEL VIAJE ====================== */

  var filtroPersona = {};

  PANTALLAS.reservas = conViaje(function (c, v) {
    var grupos = gruposReservas(v);
    var viajeros = viajerosDe(v);
    var quien = filtroPersona[v.id] || '';
    if (viajeros.length > 1) {
      c.appendChild(h('div.personas', { role: 'group', 'aria-label': 'Documentos de' },
        h('span', 'Documentos de:'),
        [''].concat(viajeros).map(function (n) {
          return h('button' + (n === quien ? '.activo' : ''), { type: 'button', 'aria-pressed': n === quien ? 'true' : 'false',
            onclick: function () { filtroPersona[v.id] = n; pintar(); } }, n || 'Todos');
        })));
    } else if (!viajeros.length) {
      c.appendChild(h('div.alerta.tocable', { role: 'button', onclick: function () { ir('viajeForm', { id: v.id }); } },
        'Indique quiénes viajan (Editar viaje) para identificar los boletos y seguros de cada persona.'));
    }
    if (!grupos.length) c.appendChild(vacio('Sin reservas. Guarde los documentos en la carpeta de Drive para que se lean solos, o añádalas a mano.'));
    var secciones = [['Vuelos', function (g) { return g.tipo === 'vuelo'; }], ['Hotel', function (g) { return g.tipo === 'hotel'; }],
      ['Seguros', function (g) { return g.tipo === 'seguro'; }], ['Otros documentos y reservas', function (g) { return ['vuelo', 'hotel', 'seguro'].indexOf(g.tipo) === -1; }]];
    var mostradas = 0;
    secciones.forEach(function (s) {
      var tarjetas = grupos.filter(s[1]).map(function (g) { return tarjetaGrupo(g, v, quien); }).filter(Boolean);
      if (!tarjetas.length) return;
      mostradas += tarjetas.length;
      c.appendChild(h('h2.seccion', s[0], h('span.cuenta', tarjetas.length)));
      tarjetas.forEach(function (t) { c.appendChild(t); });
    });
    if (quien && !mostradas && grupos.length) c.appendChild(vacio('No hay documentos asociados a ' + quien + '.'));
    var sel = h('select', { 'aria-label': 'Añadir una reserva a mano', class: 'secundario ancho', onchange: function (ev) {
      if (ev.target.value) ir('elementoForm', { viaje: v.id, tipo: ev.target.value });
    } }, h('option', { value: '' }, 'Añadir una reserva a mano…'), Object.keys(TIPOS).map(function (t) { return h('option', { value: t }, TIPOS[t]); }));
    c.appendChild(h('div.margen.espacioGrande', sel));
  }, 'Documentos y reservas');

  // Una reserva compacta; al abrirla, los documentos de cada persona.
  function tarjetaGrupo(g, v, quien) {
    var e = g.principal, d = datosDe(e);
    var filas = filasDocumentos(g, v);
    if (quien) {
      filas = filas.filter(function (f) { return f.t.nombre === quien || f.t.nombre === COMPARTIDO; });
      if (!filas.length) return null;
    }
    var dudas = filas.filter(function (f) { return f.t.estado === 'dudoso' || f.t.estado === 'sin'; }).length;
    var personas = {};
    filas.forEach(function (f) { if (f.t.nombre && f.t.nombre !== COMPARTIDO) personas[f.t.nombre] = 1; });
    var nPers = Object.keys(personas).length;
    var resumen;
    if (g.tipo === 'vuelo') {
      resumen = h('div.resumen',
        h('div.linea1', h('b', [d.aerolinea, d.vuelo || e.titulo].filter(Boolean).join(' ')), h('span', e.fecha ? fechaCorta(e.fecha) : '')),
        h('div.ruta', h('span.cod', d.origen || '—'), icono('avion', '22'), h('span.cod', d.destino || '—'),
          h('span.horas', [e.hora ? 'sale ' + e.hora : '', e.hora_fin ? 'llega ' + e.hora_fin : ''].filter(Boolean).join(' · '))));
    } else if (g.tipo === 'seguro') {
      var aseg = {};
      g.elementos.forEach(function (x) { var dx = datosDe(x); if (dx.aseguradora) aseg[dx.aseguradora] = 1; });
      var vig = g.elementos.filter(function (x) { return !esCondiciones(x) && (x.fecha || x.fecha_fin); })[0];
      resumen = h('div.resumen', h('div.linea1', h('b', 'Seguros de viaje'), h('span', Object.keys(aseg).join(', '))),
        vig ? h('div.proxima', 'Vigencia: ' + rangoFechas(vig.fecha, vig.fecha_fin)) : null);
    } else {
      resumen = h('div.resumen', h('div.linea1', h('b', e.titulo), h('span', TIPOS[e.tipo])),
        h('div.proxima', g.tipo === 'hotel' ? [e.fecha ? 'Entrada ' + fechaCorta(e.fecha) : '', e.fecha_fin ? 'salida ' + fechaCorta(e.fecha_fin) : ''].filter(Boolean).join(' · ') :
          [e.fecha ? rangoFechas(e.fecha, e.fecha_fin) : '', e.hora].filter(Boolean).join(' · ')));
    }
    var chips = h('div.chips',
      e.confirmacion && g.tipo !== 'seguro' ? chip(e.confirmacion, 'codigo') : null,
      filas.length ? chip(nPers > 1 ? nPers + ' personas' : (filas.length === 1 ? '1 documento' : filas.length + ' documentos')) : chip('Sin documento'),
      dudas ? chip(dudas === 1 ? '1 por confirmar' : dudas + ' por confirmar', 'atencion') : null);
    var cuerpo = h('div.documentos');
    filas.forEach(function (f) { cuerpo.appendChild(filaDocumento(f, v)); });
    if (!filas.length) cuerpo.appendChild(h('p.ayuda.sinMargen', 'Reserva añadida a mano, sin documento.'));
    cuerpo.appendChild(h('div.fila.espacio', h('button.enlace', { type: 'button', onclick: function () { ir('elemento', { id: e.id }); } },
      g.tipo === 'vuelo' ? 'Detalles del vuelo' : (g.tipo === 'seguro' ? 'Detalles del seguro' : 'Detalles de la reserva'))));
    var abierto = g.tipo === 'seguro' || dudas > 0 || !!quien;
    return h('details.grupoReserva.' + g.tipo, abierto ? { open: true } : {}, h('summary', resumen, chips), cuerpo);
  }

  function filaDocumento(f, v) {
    var t = f.t, e = f.e;
    var nombre = t.nombre === COMPARTIDO ? (esReservaComun(e) ? 'Reserva de todos' : (esCondiciones(e) ? 'Condiciones para todos' : 'Compartido')) : (t.nombre || 'Sin asignar');
    var info = [f.doc ? f.doc.nombre : '', e.tipo === 'seguro' && !esCondiciones(e) ? [datosDe(e).aseguradora, e.confirmacion ? 'póliza ' + e.confirmacion : ''].filter(Boolean).join(', ') : ''].filter(Boolean).join(' · ');
    var correccion = h('div.correccion');
    var fila = h('div.docFila' + (t.estado === 'dudoso' || t.estado === 'sin' ? '.porConfirmar' : ''),
      h('div.persona', h('b', nombre),
        t.estado === 'detectado' && t.enDoc ? h('small', 'según el documento') : null,
        t.estado === 'dudoso' ? h('small', 'En el documento: ' + nombrePersona(t.enDoc) + '. ¿De quién es?') : null,
        t.estado === 'sin' ? h('small', 'El documento no dice de quién es.') : null,
        info ? h('small.archivo', info) : null,
        f.copiaDe ? h('small.copia', 'Mismo contenido que otro documento: posible copia. No se borró nada; puede descartarla en Documentos.') : null),
      h('div.botones',
        h('button.secundario.chico', { type: 'button', onclick: function () { abrirDocumento(e.documento_id); } }, etiquetaDocumento(e)),
        t.estado === 'dudoso' || t.estado === 'sin' ? null :
          h('button.enlace.chico', { type: 'button', onclick: function (ev) { ev.target.replaceWith(selectorTitular(e, v, t)); } }, 'Corregir')),
      correccion);
    if (t.estado === 'dudoso' || t.estado === 'sin') correccion.appendChild(selectorTitular(e, v, t));
    return fila;
  }

  /* ====================== RECORDATORIOS Y EMERGENCIAS ====================== */

  PANTALLAS.recordatorios = conViaje(function (c, v) {
    var av = Recordatorios.avisos(principales(v));
    c.appendChild(h('p.ayuda.margen', 'Los recordatorios están preparados, pero no se añaden solos. «Revisar y añadir» abre Google Calendar con el evento listo; solo se guarda si usted lo confirma allí. No se modifica ningún otro evento.'));
    if (!av.length) { c.appendChild(vacio('No hay recordatorios: añada reservas con fecha.')); return; }
    c.appendChild(h('div.lista', av.map(function (a) {
      var pasado = a.cuando < Date.now();
      return h('div.item' + (pasado ? '.pasado' : ''),
        h('div.itemTexto', h('div.quien', a.titulo),
          h('div.proxima', mayuscula(fechaCorta(a.fecha)) + (a.hora ? ', ' + a.hora : '') + (a.zona && a.zona !== Recordatorios.zonaDispositivo() ? ' (hora de ' + a.zona.split('/').pop().replace(/_/g, ' ') + ')' : '')),
          a.nota ? h('div.nota', a.nota) : null),
        pasado ? null : h('div.accionesItem', enlaceExterno(Recordatorios.enlaceCalendario(a), 'Revisar y añadir a Google Calendar')));
    })));
  }, 'Recordatorios');

  PANTALLAS.emergencias = conViaje(function (c, v) {
    var els = elementosDe(v.id);
    // Un seguro por persona (el más completo); las condiciones generales no se repiten aquí.
    var porPersona = {}, orden = [];
    els.filter(function (e) { return e.tipo === 'seguro' && !esCondiciones(e); }).forEach(function (s) {
      var t = titularDe(s, v), k = t.nombre || ('?' + s.id);
      if (!porPersona[k]) { porPersona[k] = s; orden.push(k); } else if (completitud(s) > completitud(porPersona[k])) porPersona[k] = s;
    });
    var hoteles = gruposReservas(v).filter(function (g) { return g.tipo === 'hotel'; }).map(function (g) { return g.principal; });
    c.appendChild(h('p.ayuda.margen', 'Esta información se consulta también sin internet.'));
    if (!orden.length) c.appendChild(h('div.alerta', 'No hay seguro de viaje registrado para este viaje.'));
    orden.forEach(function (k) {
      var s = porPersona[k], d = datosDe(s), t = titularDe(s, v);
      c.appendChild(h('div.tarjeta',
        h('div.etiqueta', t.nombre && t.nombre !== COMPARTIDO ? 'Seguro de ' + t.nombre : 'Seguro de viaje'),
        h('div.nombreTarjeta', d.aseguradora || s.titulo),
        s.confirmacion ? h('div.dato', h('span', 'Póliza'), h('b', s.confirmacion)) : null,
        s.fecha || s.fecha_fin ? h('div.dato', h('span', 'Vigencia'), h('b', rangoFechas(s.fecha, s.fecha_fin))) : null,
        (d.telefonos && d.telefonos.length ? d.telefonos : (s.telefono ? [{ telefono: s.telefono, contexto: 'Asistencia' }] : [])).map(function (x) {
          return h('a.llamar', { href: tel(x.telefono) }, h('span', x.contexto || 'Llamar'), h('b', x.telefono));
        }),
        d.emergencias ? h('div.textoLibre', d.emergencias) : null,
        d.coberturas && d.coberturas.length ? h('details', h('summary', 'Coberturas'), h('ul', d.coberturas.map(function (x) { return h('li', x); }))) : null,
        h('div.fila.espacio', s.documento_id ? h('button.secundario.chico', { type: 'button', onclick: function () { abrirDocumento(s.documento_id); } }, 'Ver seguro') : null,
          h('button.enlace', { type: 'button', onclick: function () { ir('elemento', { id: s.id }); } }, 'Detalles'))));
    });
    hoteles.forEach(function (e) {
      c.appendChild(h('div.tarjeta', h('div.etiqueta', 'Alojamiento'), h('div.nombreTarjeta', e.titulo),
        e.direccion ? h('div.textoLibre', e.direccion) : null,
        e.telefono ? h('a.llamar', { href: tel(e.telefono) }, h('span', 'Teléfono del alojamiento'), h('b', e.telefono)) : null,
        e.confirmacion ? h('div.dato', h('span', 'Confirmación'), h('b', e.confirmacion)) : null,
        e.direccion || e.lugar ? h('div.fila.espacio', enlaceExterno(rutaMaps(e.direccion || e.lugar), 'Cómo llegar')) : null));
    });
    var vj = viajerosDe(v);
    if (vj.length) c.appendChild(h('div.tarjeta', h('div.etiqueta', 'Viajan'), vj.join(', ')));
  }, 'Emergencias');

  /* ====================== GASTOS DE MI VIAJE ====================== */

  var FORMATO_DINERO = (function () { try { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }); } catch (e) { return null; } })();
  function dinero(n) { return FORMATO_DINERO ? FORMATO_DINERO.format(n) : '$' + Number(n).toFixed(2); }
  function gastosDe(v) { return (D().gastos || []).filter(function (g) { return g.viaje_id === v.id; }); }
  function totalGastos(v) { return Math.round(gastosDe(v).reduce(function (s, g) { return s + (Number(g.importe) || 0); }, 0) * 100) / 100; }
  var CONCEPTOS = ['Boletos de avión', 'Seguro de viaje', 'Hotel', 'Restaurante', 'Transporte', 'Taxi', 'Entradas', 'Compras', 'Otro gasto'];

  PANTALLAS.gastos = conViaje(function (c, v) {
    var gs = gastosDe(v).sort(function (a, b) { return ((a.fecha || '0') + a.creado) < ((b.fecha || '0') + b.creado) ? -1 : 1; });
    c.appendChild(h('div.totalGastos', h('span', 'Total del viaje'), h('b', dinero(totalGastos(v))),
      h('small', gs.length === 1 ? '1 gasto' : gs.length + ' gastos')));
    var entrada = h('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'oculto', 'aria-label': 'Fotografía del ticket' });
    entrada.addEventListener('change', function () { var f = entrada.files && entrada.files[0]; if (f) leerTicketFoto(f, v); entrada.value = ''; });
    c.appendChild(entrada);
    c.appendChild(h('div.dosBotones',
      h('button.primario', { type: 'button', onclick: function () { ir('gastoForm', { viaje: v.id }); } }, 'Escribir un gasto'),
      h('button.secundario', { type: 'button', onclick: function () { entrada.click(); } }, 'Fotografiar un ticket')));
    if (!gs.length) { c.appendChild(vacio('Registre aquí lo que gasta en este viaje: boletos, seguro, hotel, restaurantes, transporte… La suma aparece arriba.')); return; }
    c.appendChild(h('div.lista.espacio', gs.map(function (g) {
      return h('div.item.tocable.gasto', { onclick: function () { ir('gastoForm', { viaje: v.id, id: g.id }); } },
        h('div.itemTexto', h('div.quien', g.concepto, g._pendiente ? h('i.pend', ' por enviar') : null),
          h('div.proxima', [g.fecha ? mayuscula(fechaCorta(g.fecha)) : '', g.ticket_id ? 'con ticket' : ''].filter(Boolean).join(' · '))),
        h('b.importe', dinero(Number(g.importe) || 0)));
    })));
  }, 'Gastos de mi viaje');

  // Foto del ticket -> OCR de Drive -> reglas de Mis Gastos -> confirmación.
  function leerTicketFoto(f, v) {
    if (!MV.hayConexion()) { aviso('Para leer un ticket se necesita internet. Puede escribir el gasto a mano.', true); return; }
    MV.esperando(true);
    var foto;
    prepararFoto(f).then(function (x) {
      foto = x;
      if (foto.bytes.length > 3 * 1024 * 1024) throw new Error('grande');
      return MV.api('leerTicket', { tipo: foto.tipo, base64: aBase64(foto.bytes) });
    }).then(function (r) {
      MV.esperando(false);
      if (!r.ok) { MV.manejarError(r, function (t) { aviso(t, true); }); return; }
      Almacen.guardarFoto(r.datos.ticket_id, foto.bytes, foto.tipo);
      var p = r.datos.texto ? Interprete.interpretarTicket(r.datos.texto, {}) : null;
      var dudas = [];
      if (!p) dudas.push('No se pudo leer el ticket. Escriba el concepto y el importe; la fotografía queda guardada.');
      else {
        if (p.faltan.indexOf('importe') !== -1) dudas.push('No se encontró el total: escríbalo.');
        else if (p.dudas.indexOf('importe') !== -1) dudas.push('Compruebe el total.');
        if (p.faltan.indexOf('establecimiento') !== -1) dudas.push('No se reconoció el establecimiento: escriba el concepto.');
        else if (p.dudas.indexOf('establecimiento') !== -1) dudas.push('Compruebe el nombre del establecimiento.');
      }
      ir('gastoForm', { viaje: v.id, nuevoTicket: true, aviso: dudas.join(' '), prefill: {
        concepto: p ? p.establecimiento : '', importe: p && p.importe ? String(p.importe) : '',
        fecha: p && p.faltan.indexOf('fecha') === -1 ? p.fecha : (estadoViaje(v) === 'actual' ? hoy() : ''),
        ticket_id: r.datos.ticket_id, origen: 'foto' } });
    }, function () {
      MV.esperando(false);
      aviso('No se pudo usar esa fotografía. Intente de nuevo o escriba el gasto a mano.', true);
    });
  }

  PANTALLAS.gastoForm = function (c, a) {
    var v = viaje(a.viaje);
    var g = a.id ? (D().gastos || []).find(function (x) { return x.id === a.id; }) : null;
    if (!v || (a.id && !g)) { c.appendChild(cab('Gasto', { volver: true })); c.appendChild(vacio('Este gasto ya no existe.')); return; }
    g = g || Object.assign({ viaje_id: v.id, origen: 'manual', fecha: estadoViaje(v) === 'actual' ? hoy() : '' }, a.prefill || {});
    c.appendChild(cab(g.id ? 'Editar gasto' : (g.origen === 'foto' ? 'Confirmar el ticket' : 'Nuevo gasto'), { volver: true, sub: v.titulo }));
    if (a.aviso) c.appendChild(h('div.alerta', a.aviso));
    else if (a.nuevoTicket) c.appendChild(h('p.ayuda.margen', 'Datos leídos del ticket. Revíselos antes de guardar.'));
    if (g.ticket_id) c.appendChild(ponerFoto(h('img.fotoTicket', { alt: 'Fotografía del ticket' }), g.ticket_id, 'ticket'));
    var error = h('div.error', { role: 'alert' });
    var lista = h('datalist', { id: 'conceptosGasto' }, CONCEPTOS.map(function (x) { return h('option', { value: x }); }));
    var form = h('form.tarjeta.formulario', { onsubmit: function (ev) {
      ev.preventDefault();
      var x = leerFormulario(form);
      var n = Interprete.aNumero(String(x.importe || '').replace(/^\$/, ''));
      if (!x.concepto) { error.textContent = 'Escriba el concepto (por ejemplo: Restaurante, Hotel, Taxi).'; return; }
      if (!(n > 0)) { error.textContent = 'Escriba el importe, por ejemplo 1250.50'; return; }
      var registro = { id: g.id, viaje_id: v.id, concepto: x.concepto, importe: String(Math.round(n * 100) / 100), fecha: x.fecha,
        ticket_id: g.ticket_id || '', origen: g.origen === 'foto' ? 'foto' : 'manual', notas: x.notas };
      Datos.guardar('Gastos', registro).then(function (r) {
        avisoGuardado(r, 'Gasto guardado: ' + registro.concepto + ', ' + dinero(n) + '.');
        if (g.id) history.back(); else ir('gastos', { viaje: v.id }, true);
      });
    } },
      lista,
      campo('Concepto', 'concepto', g.concepto, 'text', { max: 160, ph: 'Restaurante, hotel, taxi…' }),
      h('div.dosCol', campo('Importe', 'importe', g.importe, 'text', { im: 'decimal', max: 20, ph: '0.00' }), campo('Fecha', 'fecha', g.fecha, 'date')),
      campo('Nota (opcional)', 'notas', g.notas, 'textarea', { filas: 2 }),
      error,
      h('button.primario.ancho', { type: 'submit' }, 'Guardar'));
    form.querySelector('[name=concepto]').setAttribute('list', 'conceptosGasto');
    c.appendChild(form);
    if (!g.id && a.nuevoTicket) c.appendChild(h('div.margen', h('button.secundario.ancho', { type: 'button', onclick: function () {
      if (MV.hayConexion()) MV.api('descartarTicket', { id: g.ticket_id });
      history.back();
    } }, 'Descartar este ticket')));
    if (g.id) c.appendChild(h('div.margen', h('button.secundario.peligro.ancho', { type: 'button', onclick: function () {
      if (!confirm('¿Quitar el gasto «' + g.concepto + '»? La fotografía del ticket, si la hay, sigue en su Drive.')) return;
      Datos.eliminar('Gastos', g.id).then(function (r) { avisoGuardado(r, 'Gasto quitado.'); history.back(); });
    } }, 'Quitar este gasto')));
  };

  /* ====================== ORGANIZAR UN VIAJE ====================== */

  PANTALLAS.viajeForm = function (c, a) {
    var v = a.id ? viaje(a.id) : null;
    if (a.id && !v) { c.appendChild(cab('Viaje', { volver: true })); c.appendChild(vacio('Este viaje ya no existe.')); return; }
    v = v || {};
    var destinos = v.id ? destinosDe(v) : (a.destinos || []);
    if (!destinos.length) destinos = [{ ciudad: '', pais: '', desde: '', hasta: '' }];
    c.appendChild(cab(v.id ? 'Editar viaje' : 'Organizar un viaje', { volver: true }));
    var error = h('div.error', { role: 'alert' });
    var cajaDestinos = h('div');
    function filaDestino(d) {
      return h('div.destinoFila',
        campo('Ciudad', 'd_ciudad', d.ciudad, 'text', { max: 100 }), campo('País', 'd_pais', d.pais, 'text', { max: 80 }),
        campo('Desde', 'd_desde', d.desde, 'date'), campo('Hasta', 'd_hasta', d.hasta, 'date'));
    }
    destinos.forEach(function (d) { cajaDestinos.appendChild(filaDestino(d)); });
    var cajaPersonas = h('div.personasForm');
    var filaPersona = function (n) { return campo('', 'persona', n, 'text', { max: 80, ph: 'Nombre' }); };
    var actuales = viajerosDe(v);
    (actuales.length ? actuales : ['']).forEach(function (n) { cajaPersonas.appendChild(filaPersona(n)); });
    var form = h('form.tarjeta.formulario', { onsubmit: function (ev) {
      ev.preventDefault();
      var q = function (n) { return form.querySelector('[name=' + n + ']'); };
      var nombres = Array.prototype.map.call(cajaPersonas.querySelectorAll('[name=persona]'), function (i) { return i.value.trim(); }).filter(Boolean);
      var x = { titulo: q('titulo').value.trim(), inicio: q('inicio').value, fin: q('fin').value, personas: nombres.join(', '),
        archivado: q('archivado') && q('archivado').checked ? 'sí' : '' };
      x.destinos = Array.prototype.map.call(cajaDestinos.querySelectorAll('.destinoFila'), function (f) {
        return { ciudad: f.querySelector('[name=d_ciudad]').value.trim(), pais: f.querySelector('[name=d_pais]').value.trim(),
          desde: f.querySelector('[name=d_desde]').value, hasta: f.querySelector('[name=d_hasta]').value };
      }).filter(function (d) { return d.ciudad; });
      x.destino = x.destinos.map(function (d) { return d.ciudad; }).join(', ');
      // Sin Salida/Regreso: se toman de las fechas de los destinos.
      var fechasD = [];
      x.destinos.forEach(function (d) { if (d.desde) fechasD.push(d.desde); if (d.hasta) fechasD.push(d.hasta); });
      fechasD.sort();
      if (!x.inicio && fechasD.length) x.inicio = fechasD[0];
      if (!x.fin && fechasD.length && fechasD[fechasD.length - 1] > x.inicio) x.fin = fechasD[fechasD.length - 1];
      if (!x.titulo) { error.textContent = 'Escriba un nombre para el viaje.'; return; }
      if (x.inicio && x.fin && x.fin < x.inicio) { error.textContent = 'La fecha de regreso es anterior a la de salida.'; return; }
      if (x.destinos.some(function (d) { return d.desde && d.hasta && d.hasta < d.desde; })) { error.textContent = 'Revise las fechas de los destinos.'; return; }
      x.id = v.id;
      Datos.guardar('Viajes', x).then(function (r) {
        avisoGuardado(r, 'Viaje guardado.');
        if (a.volverA) { ir(a.volverA.p, Object.assign({}, a.volverA.a, { viajeNuevo: r.id }), true); return; }
        if (v.id) history.back(); else ir('viaje', { id: r.id }, true);
      });
    } },
      campo('Nombre del viaje', 'titulo', v.titulo || a.titulo, 'text', { ph: 'Por ejemplo: Navidad en Madrid', max: 120 }),
      h('div.dosCol', campo('Salida', 'inicio', v.inicio || a.inicio, 'date'), campo('Regreso', 'fin', v.fin || a.fin, 'date')),
      h('div.etiqueta', 'Destinos'),
      cajaDestinos,
      h('button.secundario.chico', { type: 'button', onclick: function () { cajaDestinos.appendChild(filaDestino({})); } }, 'Agregar otro destino'),
      h('div.espacio'),
      h('div.etiqueta', 'Personas que viajan'),
      h('p.ayuda.sinMargen', 'Una por campo. Sirve para identificar los boletos y seguros de cada persona.'),
      cajaPersonas,
      h('button.secundario.chico', { type: 'button', onclick: function () { var f = filaPersona(''); cajaPersonas.appendChild(f); f.querySelector('input').focus(); } }, 'Agregar otra persona'),
      h('div.espacio'),
      v.id ? h('label.casilla', h('input', { type: 'checkbox', name: 'archivado', checked: v.archivado === 'sí' }), 'Archivar este viaje (se conserva todo)') : null,
      error,
      h('button.primario.ancho', { type: 'submit' }, 'Guardar'));
    c.appendChild(form);
    if (v.id) c.appendChild(h('div.margen', h('button.secundario.peligro.ancho', { type: 'button', onclick: function () {
      if (!confirm('¿Eliminar el viaje «' + v.titulo + '»? Se quitarán sus reservas e itinerario. Sus lugares favoritos y los documentos de Drive no se tocan.')) return;
      Datos.eliminar('Viajes', v.id).then(function (r) { avisoGuardado(r, 'Viaje eliminado.'); ir('viajes', {}, true); });
    } }, 'Eliminar viaje')));
  };

  /* ====================== RESERVAS ====================== */

  var CAMPOS_DATOS = {
    vuelo: [['aerolinea', 'Aerolínea'], ['vuelo', 'Número de vuelo'], ['origen', 'Origen (código)'], ['destino', 'Destino (código)'],
      ['terminal', 'Terminal'], ['asiento', 'Asiento'], ['puerta', 'Puerta'], ['embarque', 'Hora de abordaje'], ['equipaje', 'Equipaje'], ['boleto', 'Número de boleto'], ['pasajero', 'Pasajero']],
    hotel: [['total', 'Total'], ['pago', 'Pago'], ['cancelacion', 'Cancelación']],
    seguro: [['aseguradora', 'Aseguradora'], ['plan', 'Plan'], ['asegurado', 'Asegurado']],
    traslado: [['proveedor', 'Empresa'], ['personas', 'Personas'], ['total', 'Total']],
    auto: [['proveedor', 'Rentadora'], ['total', 'Total']],
    restaurante: [['personas', 'Personas'], ['total', 'Total']],
    actividad: [['proveedor', 'Proveedor'], ['personas', 'Personas'], ['total', 'Total']],
    otro: [['proveedor', 'Proveedor'], ['total', 'Total']]
  };
  var NOMBRES_FECHA = {
    vuelo: ['Fecha de salida', 'Hora de salida', 'Fecha de llegada', 'Hora de llegada'],
    hotel: ['Entrada', 'Hora de entrada', 'Salida', 'Hora de salida'],
    seguro: ['Vigencia desde', '', 'Vigencia hasta', ''],
    auto: ['Recogida', 'Hora', 'Devolución', 'Hora'],
    otro: ['Fecha', 'Hora', 'Fecha final', 'Hora final']
  };

  PANTALLAS.elemento = function (c, a) {
    var e = D().elementos.find(function (x) { return x.id === a.id; });
    if (!e) { c.appendChild(cab('Reserva', { volver: true })); c.appendChild(vacio('Esta reserva ya no existe.')); return; }
    var v = viaje(e.viaje_id) || {};
    var d = datosDe(e);
    c.appendChild(cab(e.titulo, { volver: true, sub: TIPOS[e.tipo] + '. ' + (v.titulo || ''),
      extra: boton('lapiz', 'Editar', function () { ir('elementoForm', { id: e.id }); }) }));
    if (e.tipo === 'vuelo') c.appendChild(tarjetaEmbarque(e));
    if (e.documento_id) {
      var t = titularDe(e, v);
      var caja = h('div.tarjeta.titular',
        h('div.etiqueta', '¿De quién es este documento?'),
        h('div.fila', h('b', t.nombre ? (t.nombre === COMPARTIDO ? 'Compartido (todos)' : t.nombre) : 'Sin asignar'),
          t.estado === 'detectado' && t.enDoc ? chip('según el documento') : null,
          t.estado === 'dudoso' || t.estado === 'sin' ? chip('por confirmar', 'atencion') : null),
        t.enDoc ? h('p.ayuda.sinMargen', 'Nombre en el documento: ' + nombrePersona(t.enDoc)) : null,
        h('div.fila', h('button.secundario.chico', { type: 'button', onclick: function () { abrirDocumento(e.documento_id); } }, etiquetaDocumento(e))));
      caja.appendChild(h('label.campoTitular', 'Corregir la persona', selectorTitular(e, v, t)));
      c.appendChild(caja);
    }
    var nf = NOMBRES_FECHA[e.tipo] || NOMBRES_FECHA.otro;
    var filas = [
      [nf[0], e.fecha ? fechaCorta(e.fecha) : ''], [nf[1] || 'Hora', e.hora], [nf[2], e.fecha_fin ? fechaCorta(e.fecha_fin) : ''], [nf[3] || 'Hora final', e.hora_fin],
      ['Lugar', e.lugar], ['Dirección', e.direccion], [e.tipo === 'seguro' ? 'Póliza' : 'Confirmación', e.confirmacion], ['Teléfono', e.telefono]
    ];
    (CAMPOS_DATOS[e.tipo] || []).forEach(function (k) { filas.push([k[1], d[k[0]]]); });
    if (d.zona) filas.push(['Zona horaria', d.zona]);
    c.appendChild(h('div.datos', filas.filter(function (f) { return f[1]; }).map(function (f) {
      return h('div', h('span', f[0]), f[0] === 'Teléfono' ? h('a', { href: tel(f[1]) }, f[1]) : h('b', f[1]));
    })));
    if (e.tipo === 'seguro') {
      if (d.telefonos && d.telefonos.length) c.appendChild(h('div.tarjeta', h('div.etiqueta', 'Teléfonos de asistencia'),
        d.telefonos.map(function (t) { return h('a.llamar', { href: tel(t.telefono) }, h('span', t.contexto || 'Llamar'), h('b', t.telefono)); })));
      if (d.coberturas && d.coberturas.length) c.appendChild(h('div.tarjeta', h('div.etiqueta', 'Coberturas'), h('ul', d.coberturas.map(function (x) { return h('li', x); }))));
      if (d.emergencias) c.appendChild(h('div.tarjeta', h('div.etiqueta', 'En caso de emergencia'), h('div.textoLibre', d.emergencias)));
    }
    if (e.notas) c.appendChild(h('div.tarjeta', h('div.etiqueta', 'Información adicional'), h('div.textoLibre', e.notas)));
    var sitio = e.tipo === 'vuelo' && d.origen ? 'Aeropuerto ' + d.origen : (e.direccion || e.lugar);
    if (sitio) c.appendChild(h('div.fila.margen', enlaceExterno(mapa(sitio), 'Ver en Google Maps'), enlaceExterno(rutaMaps(sitio), 'Cómo llegar')));
    var av = Recordatorios.avisos([e]).filter(function (x) { return x.cuando > Date.now(); });
    if (av.length) {
      c.appendChild(h('h2.seccion', 'Recordatorios preparados'));
      c.appendChild(h('div.lista', av.map(function (x) {
        return h('div.item', h('div.itemTexto', h('div.quien', x.titulo), h('div.proxima', mayuscula(fechaCorta(x.fecha)) + (x.hora ? ', ' + x.hora : '')), x.nota ? h('div.nota', x.nota) : null),
          h('div.accionesItem', enlaceExterno(Recordatorios.enlaceCalendario(x), 'Revisar y añadir a Google Calendar')));
      })));
    }
    if (e.documento_id) {
      var doc = D().documentos.find(function (x) { return x.id_archivo === e.documento_id; });
      c.appendChild(h('h2.seccion', 'Documento original'));
      c.appendChild(bloqueDocumento(doc || { id_archivo: e.documento_id, nombre: 'Documento', enlace: 'https://drive.google.com/file/d/' + e.documento_id + '/view' }));
    }
  };

  function bloqueDocumento(doc) {
    var caja = h('div.tarjeta');
    var estado = h('p.ayuda.sinMargen');
    caja.appendChild(h('div.quien', doc.nombre));
    var acciones = h('div.fila.espacio');
    acciones.appendChild(enlaceExterno(doc.enlace, 'Abrir en Drive'));
    caja.appendChild(acciones);
    caja.appendChild(estado);
    Almacen.archivosGuardados().then(function (ids) {
      var guardado = ids.indexOf(doc.id_archivo) !== -1;
      if (guardado) acciones.appendChild(h('button.secundario.chico', { type: 'button', onclick: function () { verCopiaLocal(doc.id_archivo, caja); } }, 'Ver copia del dispositivo'));
      estado.textContent = guardado ? 'Disponible sin conexión, cifrado en este dispositivo.' :
        (doc.sin_conexion === 'sí' ? 'Preparado para consulta sin conexión: se guardará al sincronizar.' : 'Solo con internet.');
      if (doc.estado) {
        var marcado = doc.sin_conexion === 'sí';
        acciones.appendChild(h('button.secundario.chico', { type: 'button', onclick: function () {
          if (!MV.hayConexion()) { aviso('Necesita internet para cambiar esta opción.', true); return; }
          MV.esperando(true);
          MV.api('marcarSinConexion', { id: doc.id_archivo, valor: !marcado }).then(function (r) {
            MV.esperando(false);
            if (!r.ok) { MV.manejarError(r, function (t) { aviso(t, true); }); return; }
            (marcado ? Almacen.quitarArchivo(doc.id_archivo) : Promise.resolve(true))
              .then(function () { return sincronizarTodo(); }).then(pintar);
          });
        } }, marcado ? 'Quitar de «sin conexión»' : 'Guardar para consultar sin conexión'));
      }
    });
    return caja;
  }

  function verCopiaLocal(id, donde) {
    Almacen.leerArchivo(id).then(function (a) {
      if (!a) { aviso('No se encontró la copia en este dispositivo.', true); return; }
      var url = URL.createObjectURL(new Blob([a.bytes], { type: a.tipo }));
      var previo = donde.querySelector('.copiaLocal');
      if (previo) previo.remove();
      var bloque = h('div.copiaLocal');
      if (/^image\//.test(a.tipo)) bloque.appendChild(h('img', { src: url, alt: a.nombre }));
      bloque.appendChild(h('a.boton.secundario.chico', { href: url, download: a.nombre }, /pdf/.test(a.tipo) ? 'Abrir el PDF' : 'Abrir el archivo'));
      donde.appendChild(bloque);
    });
  }

  PANTALLAS.elementoForm = function (c, a) {
    var e = a.id ? D().elementos.find(function (x) { return x.id === a.id; }) : null;
    if (a.id && !e) { c.appendChild(cab('Reserva', { volver: true })); c.appendChild(vacio('Esta reserva ya no existe.')); return; }
    e = e || { tipo: a.tipo || 'otro', viaje_id: a.viaje };
    c.appendChild(cab(e.id ? 'Editar reserva' : TIPOS[e.tipo], { volver: true, sub: e.id ? '' : 'Nueva reserva' }));
    var form = formularioElemento(e, null);
    var error = h('div.error', { role: 'alert' });
    form.appendChild(error);
    form.appendChild(h('button.primario.ancho', { type: 'submit' }, 'Guardar'));
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var x = valoresElemento(form, e);
      var m = validarElemento(x);
      if (m) { error.textContent = m; return; }
      Datos.guardar('Elementos', x).then(function (r) { avisoGuardado(r, 'Reserva guardada.'); if (e.id) history.back(); else ir('elemento', { id: r.id }, true); });
    });
    c.appendChild(form);
    if (e.id) c.appendChild(h('div.margen', h('button.secundario.peligro.ancho', { type: 'button', onclick: function () {
      if (!confirm('¿Quitar «' + e.titulo + '» de este viaje? El documento original en Drive no se toca.')) return;
      Datos.eliminar('Elementos', e.id).then(function (r) { avisoGuardado(r, 'Reserva quitada.'); ir('viaje', { id: e.viaje_id }, true); });
    } }, 'Quitar esta reserva')));
  };

  function validarElemento(x) {
    if (!x.titulo) return 'Escriba un nombre o descripción.';
    if (x.fecha && x.fecha_fin && x.fecha_fin < x.fecha) return 'La fecha final es anterior a la inicial.';
    if (!x.viaje_id) return 'Elija el viaje.';
    return '';
  }

  function formularioElemento(e, faltantes, sinTipo) {
    var d = datosDe(e);
    var nf = NOMBRES_FECHA[e.tipo] || NOMBRES_FECHA.otro;
    var f = function (k) { return faltantes && faltantes.indexOf(k) !== -1; };
    var form = h('form.tarjeta.formulario');
    if (!sinTipo) form.appendChild(campo('Tipo', 'tipo', e.tipo, 'select', { opciones: Object.keys(TIPOS).map(function (t) { return [t, TIPOS[t]]; }) }));
    form.appendChild(campo('Nombre o descripción', 'titulo', e.titulo, 'text', { max: 160, falta: f('titulo') }));
    form.appendChild(h('div.dosCol', campo(nf[0], 'fecha', e.fecha, 'date', { falta: f('fecha') }),
      nf[1] ? campo(nf[1], 'hora', e.hora, 'time', { falta: f('hora') }) : h('input', { type: 'hidden', name: 'hora', value: '' })));
    form.appendChild(h('div.dosCol', campo(nf[2], 'fecha_fin', e.fecha_fin, 'date', { falta: f('fecha_fin') }),
      nf[3] ? campo(nf[3], 'hora_fin', e.hora_fin, 'time') : h('input', { type: 'hidden', name: 'hora_fin', value: '' })));
    if (e.tipo !== 'seguro') form.appendChild(campo(e.tipo === 'vuelo' ? 'Aeropuerto de salida' : 'Lugar', 'lugar', e.lugar, 'text', { max: 200 }));
    if (e.tipo !== 'vuelo' && e.tipo !== 'seguro') form.appendChild(campo('Dirección', 'direccion', e.direccion, 'text', { max: 300, falta: f('direccion') }));
    form.appendChild(h('div.dosCol', campo(e.tipo === 'seguro' ? 'Número de póliza' : 'Confirmación', 'confirmacion', e.confirmacion, 'text', { max: 60, falta: f('confirmacion') }),
      campo('Teléfono', 'telefono', e.telefono, 'tel', { max: 40, falta: f('telefono') })));
    (CAMPOS_DATOS[e.tipo] || []).forEach(function (k) { form.appendChild(campo(k[1], 'd_' + k[0], d[k[0]], 'text', { max: 200 })); });
    if (e.tipo === 'seguro') {
      form.appendChild(campo('Teléfonos de asistencia (uno por línea: número — descripción)', 'd_telefonos',
        (d.telefonos || []).map(function (t) { return t.telefono + (t.contexto ? ' — ' + t.contexto : ''); }).join('\n'), 'textarea'));
      form.appendChild(campo('Coberturas (una por línea)', 'd_coberturas', (d.coberturas || []).join('\n'), 'textarea'));
      form.appendChild(campo('Qué hacer en caso de emergencia', 'd_emergencias', d.emergencias, 'textarea'));
    } else {
      var zonas = [['', 'Automática (aeropuerto o dispositivo)']].concat(['America/Cancun', 'America/Mexico_City', 'America/Tijuana', 'America/Caracas',
        'America/Bogota', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'America/Argentina/Buenos_Aires', 'Europe/Madrid',
        'Europe/London', 'Europe/Paris', 'Europe/Rome'].map(function (z) { return [z, z.split('/').pop().replace(/_/g, ' ')]; }));
      if (d.zona && !zonas.some(function (z) { return z[0] === d.zona; })) zonas.push([d.zona, d.zona]);
      form.appendChild(campo('Zona horaria de las horas (para los recordatorios)', 'd_zona', d.zona, 'select', { opciones: zonas }));
    }
    form.appendChild(campo('Información adicional', 'notas', e.notas, 'textarea', { filas: 2 }));
    return form;
  }

  function valoresElemento(form, base) {
    var x = leerFormulario(form);
    var d = Object.assign({}, datosDe(base));
    Object.keys(x).forEach(function (k) {
      if (k.slice(0, 2) !== 'd_') return;
      var n = k.slice(2), val = x[k];
      delete x[k];
      if (n === 'telefonos') d[n] = val.split('\n').map(function (l) {
        var p = l.split(/\s+[—–-]\s+/); return p[0].trim() ? { telefono: p[0].trim(), contexto: (p.slice(1).join(' - ') || '').trim() } : null;
      }).filter(Boolean);
      else if (n === 'coberturas') d[n] = val.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      else d[n] = val;
      if (d[n] === '' || (Array.isArray(d[n]) && !d[n].length)) delete d[n];
    });
    x.tipo = x.tipo || base.tipo;
    x.datos = d;
    x.id = base.id;
    x.viaje_id = base.viaje_id;
    x.documento_id = base.documento_id || '';
    delete x.incluir;
    return x;
  }

  /* ====================== DOCUMENTOS Y RESERVAS ====================== */

  PANTALLAS.archivos = function (c) {
    c.appendChild(cab('Mis documentos', { buscar: true, sub: 'Lo que guarda en su carpeta de Drive' }));
    var docs = D().documentos.slice().sort(function (a, b) { return a.registrado < b.registrado ? 1 : -1; });
    c.appendChild(h('div.tarjeta',
      h('p.sinMargen', 'Guarde sus confirmaciones, pases de abordar y pólizas (foto o PDF) en la carpeta «Documentos de viaje» de su Google Drive. Se leen solos cada 10 minutos y aquí revisa los datos antes de incorporarlos.'),
      h('div.fila',
        D().carpeta ? enlaceExterno(D().carpeta, 'Abrir la carpeta en Drive') : null,
        h('button.primario.chico', { type: 'button', onclick: function () {
          if (!MV.hayConexion()) { aviso('Necesita internet para revisar la carpeta.', true); return; }
          MV.esperando(true);
          MV.api('procesarAhora').then(function (r) {
            MV.esperando(false);
            if (!r.ok) { MV.manejarError(r, function (t) { aviso(t, true); }); return; }
            aviso(r.datos.procesados ? 'Documentos leídos: ' + r.datos.procesados + (r.datos.pendientes ? '. Quedan ' + r.datos.pendientes + ' por leer.' : '.') : 'No hay documentos nuevos en la carpeta.');
            sincronizarTodo().then(pintar);
          });
        } }, 'Revisar la carpeta ahora'))));
    var grupos = [['por revisar', 'Por revisar'], ['sin procesar', 'Para completar a mano'], ['error', 'No se pudieron leer'],
      ['incorporado', 'Incorporados'], ['descartado', 'Descartados']];
    if (!docs.length) c.appendChild(vacio('Aún no hay documentos en la carpeta.'));
    grupos.forEach(function (g) {
      var de = docs.filter(function (d) { return d.estado === g[0]; });
      if (!de.length) return;
      var lista = h('div.lista', de.map(function (d) {
        var v = d.viaje_id ? viaje(d.viaje_id) : null;
        return h('div.item.tocable', { onclick: function () { ir('revision', { id: d.id_archivo }); } },
          h('div.itemTexto', h('div.quien', d.nombre),
            h('div.chips', d.tipo_detectado ? chip(TIPOS[d.tipo_detectado] || d.tipo_detectado, 'tipo') : null,
              v ? chip(v.titulo) : null, d.sin_conexion === 'sí' ? chip('Disponible sin conexión', 'miel') : null),
            d.revision && g[0] !== 'incorporado' ? h('div.nota', d.revision) : null));
      }));
      if (g[0] === 'incorporado' || g[0] === 'descartado') c.appendChild(h('details.plegable', h('summary', g[1] + ' (' + de.length + ')'), lista));
      else { c.appendChild(h('h2.seccion', g[1], h('span.cuenta', de.length))); c.appendChild(lista); }
    });
    var vigentes = D().viajes.filter(function (v) { var e = estadoViaje(v); return e === 'actual' || e === 'proximo'; })
      .sort(function (a, b) { return (a.inicio || '9') < (b.inicio || '9') ? -1 : 1; });
    // Las reservas ya incorporadas se consultan en su viaje (una sola vez cada una).
    var conReservas = vigentes.filter(function (v) { return elementosDe(v.id).length; });
    if (conReservas.length) {
      c.appendChild(h('h2.seccion', 'Documentos y reservas de mis viajes'));
      c.appendChild(h('div.lista', conReservas.map(function (v) {
        var n = gruposReservas(v).length;
        return h('div.item.tocable', { onclick: function () { ir('reservas', { viaje: v.id }); } },
          h('div.itemTexto', h('div.quien', v.titulo), h('div.proxima', n + (n === 1 ? ' reserva' : ' reservas') + ' · ' + rangoFechas(v.inicio, v.fin))));
      })));
    }
  };

  // Revision de un documento: datos propuestos, editables, y confirmacion.
  PANTALLAS.revision = function (c, a) {
    var doc = D().documentos.find(function (d) { return d.id_archivo === a.id; });
    if (!doc) { c.appendChild(cab('Documento', { volver: true })); c.appendChild(vacio('Este documento ya no está en el índice.')); return; }
    c.appendChild(cab('Revisar documento', { volver: true, sub: doc.nombre }));
    c.appendChild(bloqueDocumento(doc));
    if (doc.estado === 'incorporado') {
      var v0 = viaje(doc.viaje_id);
      c.appendChild(h('div.alerta', 'Incorporado a ' + (v0 ? v0.titulo : 'un viaje') + '.'));
      (doc.elementos || '').split(',').filter(Boolean).forEach(function (id) {
        var e = D().elementos.find(function (x) { return x.id === id; });
        if (e) c.appendChild(h('div.margen', h('button.secundario.ancho', { type: 'button', onclick: function () { ir('elemento', { id: id }); } }, 'Ver ' + e.titulo)));
      });
      return;
    }
    if (!MV.hayConexion()) { c.appendChild(h('div.alerta', 'La revisión de documentos necesita internet.')); return; }
    var ext = json(doc.extraido, {});
    var tipo = doc.tipo_detectado || ext.tipo || 'otro';
    var confianza = { alta: 'alta', media: 'media', baja: 'baja', manual: 'elegido por usted' }[ext.confianza] || '';
    c.appendChild(h('div.tarjeta.formulario',
      campo('¿Qué es este documento?' + (confianza ? ' (detección ' + confianza + ')' : ''), 'tipoDoc', tipo, 'select', { opciones: Object.keys(TIPOS).map(function (t) { return [t, TIPOS[t]]; }) }),
      h('p.ayuda.sinMargen', 'Decide el apartado donde se guarda: Vuelos, Hotel, Seguros u Otros. Si no es correcto, cámbielo y el documento se vuelve a leer con ese criterio.')));
    var sel = c.querySelector('[name=tipoDoc]');
    sel.addEventListener('change', function () {
      MV.esperando(true);
      MV.api('reinterpretar', { id: doc.id_archivo, tipo: sel.value }).then(function (r) {
        MV.esperando(false);
        if (!r.ok) { MV.manejarError(r, function (t) { aviso(t, true); }); return; }
        Datos.sincronizar().then(pintar);
      });
    });
    var avisos = (ext.avisos || []).concat(doc.estado === 'error' || doc.estado === 'sin procesar' ? [doc.revision] : []).filter(Boolean);
    if (avisos.length) c.appendChild(h('div.alerta', 'Revise: ' + avisos.join('. ')));
    c.appendChild(h('p.ayuda.margen', 'Los datos se propusieron automáticamente. Lo que no aparece en el documento queda vacío y marcado; nada se inventa. Corrija lo necesario antes de confirmar.'));
    var propuestos = (ext.elementos && ext.elementos.length ? ext.elementos : [{ tipo: tipo, titulo: '' }]).map(function (p) {
      return Object.assign({}, p, { tipo: tipo, datos: p.datos && typeof p.datos === 'object' ? JSON.stringify(p.datos) : (p.datos || '') });
    });
    var f0 = propuestos[0].fecha;
    var vivos = D().viajes.filter(function (v) { return v.archivado !== 'sí'; });
    var codigos = propuestos.map(function (p) { return norm(p.confirmacion).replace(/[^a-z0-9]/g, ''); }).filter(Boolean);
    var porCodigo = codigos.length ? vivos.find(function (v) { return elementosDe(v.id).some(function (e) { return codigos.indexOf(norm(e.confirmacion).replace(/[^a-z0-9]/g, '')) !== -1; }); }) : null;
    var futuros = vivos.filter(function (v) { var e = estadoViaje(v); return e === 'actual' || e === 'proximo'; });
    var sugerido = a.viajeNuevo || (f0 && (vivos.find(function (v) { return v.inicio && v.fin && v.inicio <= f0 && f0 <= v.fin; }) ||
      vivos.find(function (v) { return v.inicio && Math.abs(difDias(v.inicio, f0)) < 3; })) || porCodigo || (futuros.length === 1 ? futuros[0] : null) || {}).id || '';
    var selViaje = campo('Incorporar al viaje', 'viajeDestino', sugerido, 'select', { opciones: [['', 'Elija un viaje…']].concat(
      D().viajes.map(function (v) { return [v.id, v.titulo + (v.inicio ? ' (' + rangoFechas(v.inicio, v.fin) + ')' : '')]; }), [['__nuevo', 'Organizar un viaje nuevo con esta reserva']]) });
    c.appendChild(h('div.tarjeta.formulario', selViaje));
    selViaje.querySelector('select').addEventListener('change', function (ev) {
      if (ev.target.value !== '__nuevo') return;
      // Viaje propuesto a partir de la reserva; la titular lo revisa antes de guardarlo.
      var fechas = propuestos.map(function (p) { return p.fecha; }).concat(propuestos.map(function (p) { return p.fecha_fin; })).filter(Boolean).sort();
      var destinos = [];
      propuestos.forEach(function (p, i) {
        var d = json(p.datos, {});
        var ciudad = '';
        if (tipo === 'vuelo' && (i < propuestos.length - 1 || propuestos.length === 1)) ciudad = (d.destino_nombre || '').replace(/\s*\(.*\)$/, '');
        if (tipo === 'hotel' && p.direccion) { var pd = p.direccion.split(',').map(function (s) { return s.trim(); }); ciudad = pd.length >= 3 ? pd[pd.length - 3] : ''; }
        if (ciudad && !destinos.some(function (x) { return x.ciudad === ciudad; })) destinos.push({ ciudad: ciudad, pais: '', desde: '', hasta: '' });
      });
      ir('viajeForm', { inicio: fechas[0] || '', fin: fechas[fechas.length - 1] || '', destinos: destinos,
        titulo: destinos.length ? 'Viaje a ' + destinos.map(function (d) { return d.ciudad; }).join(' y ') : '',
        volverA: { p: 'revision', a: { id: doc.id_archivo } } });
    });
    // Titular del documento: se propone por el nombre que aparece en el PDF.
    var nombreDoc = '';
    propuestos.forEach(function (p) { var dp = json(p.datos, {}); nombreDoc = nombreDoc || dp.pasajero || dp.asegurado || ''; });
    var nombreDeArchivo = String(doc.nombre || '').replace(/\.[a-z0-9]{2,4}$/i, '').replace(/^.*\bpara\b\s*/i, '');
    var comun = tipo === 'vuelo' && propuestos.every(function (p) { var dp = json(p.datos, {}); return !dp.boleto && !dp.pasajero && !dp.asiento && !dp.puerta; });
    var condiciones = propuestos.some(function (p) { return json(p.datos, {}).documento === 'condiciones generales'; });
    var cajaTitular = h('div.tarjeta.formulario');
    c.appendChild(cajaTitular);
    function pintarTitular() {
      cajaTitular.innerHTML = '';
      var vj = viaje(selViaje.querySelector('select').value);
      var viajeros = vj ? viajerosDe(vj) : [];
      var sug = condiciones || comun ? COMPARTIDO : (nombreDoc ? coincidir(nombreDoc, viajeros) : (coincidir(nombreDeArchivo, viajeros) || (viajeros.length === 1 ? viajeros[0] : '')));
      if (!sug && !nombreDoc && !esPersonal(tipo)) sug = COMPARTIDO;
      var pdf = nombreDoc ? nombrePersona(nombreDoc) : '';
      var op = [['', 'Elija la persona…']].concat(viajeros.map(function (n) { return [n, n]; }));
      if (pdf && !sug) op.push([pdf, pdf + ' (añadir al viaje)']);
      op.push([COMPARTIDO, 'Compartido (todos los viajeros)']);
      var cmp = campo('¿De quién es este documento?', 'titularDoc', sug || '', 'select', { opciones: op, falta: !sug && !nombreDoc });
      cajaTitular.appendChild(cmp);
      cajaTitular.appendChild(h('p.ayuda.sinMargen', sug ? (nombreDoc && sug !== COMPARTIDO ? 'Asociado por el nombre del documento (' + pdf + '). Cámbielo si no es correcto.' : 'Puede cambiarlo si no es correcto.') :
        (pdf ? 'El nombre del documento (' + pdf + ') no coincide con seguridad con las personas del viaje: elija a quién pertenece.' : 'Elija a quién pertenece, o «Compartido» si es de todos. Puede hacerlo después.')));
    }
    pintarTitular();
    selViaje.querySelector('select').addEventListener('change', pintarTitular);
    // Los datos leidos quedan plegados: lo habitual es elegir el viaje y confirmar.
    var hayFaltas = !condiciones && propuestos.some(function (p) { return (p.faltantes || []).length; });
    var plegado = h('details.plegable.datosLeidos', hayFaltas ? { open: true } : {},
      h('summary', propuestos.length > 1 ? 'Ver o corregir los ' + propuestos.length + ' datos leídos' : 'Ver o corregir los datos leídos'));
    var formularios = propuestos.map(function (p, i) {
      var f = formularioElemento(p, p.faltantes || [], true);
      if (propuestos.length > 1) {
        f.insertBefore(h('label.casilla', h('input', { type: 'checkbox', name: 'incluir', checked: true }), 'Incorporar este elemento (' + (i + 1) + ' de ' + propuestos.length + ')'), f.firstChild);
      }
      plegado.appendChild(f);
      return { form: f, base: p };
    });
    var error = h('div.error.margen', { role: 'alert' });
    c.appendChild(error);
    var trasBotones = plegado;
    c.appendChild(h('div.margen',
      h('button.primario.ancho', { type: 'button', onclick: function () {
        var viajeId = selViaje.querySelector('select').value;
        if (!viajeId || viajeId === '__nuevo') { error.textContent = 'Elija el viaje al que pertenece el documento.'; return; }
        var elementos = [];
        for (var i = 0; i < formularios.length; i++) {
          var inc = formularios[i].form.querySelector('[name=incluir]');
          if (inc && !inc.checked) continue;
          var x = valoresElemento(formularios[i].form, Object.assign({}, formularios[i].base, { viaje_id: viajeId }));
          var m = validarElemento(x);
          if (m) { error.textContent = (formularios.length > 1 ? 'Elemento ' + (i + 1) + ': ' : '') + m; return; }
          delete x.id;
          elementos.push(x);
        }
        if (!elementos.length) { error.textContent = 'No eligió ningún elemento.'; return; }
        var titular = cajaTitular.querySelector('[name=titularDoc]').value;
        if (titular) elementos.forEach(function (x) { x.datos = Object.assign({}, x.datos, { titular: titular }); });
        MV.esperando(true);
        agregarViajero(viaje(viajeId), titular).then(function () { return MV.api('confirmarDocumento', { id: doc.id_archivo, version: doc.version, viajeId: viajeId, elementos: elementos }).then(function (r) {
          MV.esperando(false);
          if (!r.ok) {
            if (r.error === 'conflicto') { aviso('El documento cambió en otro dispositivo; se muestra la versión actual.', true); Datos.sincronizar().then(pintar); return; }
            MV.manejarError(r, function (t) { error.textContent = t; });
            return;
          }
          aviso('Documento incorporado al viaje.');
          sincronizarTodo().then(function () { ir('reservas', { viaje: viajeId }, true); });
        }); });
      } }, 'Confirmar e incorporar'),
      h('button.secundario.ancho.espacio', { type: 'button', onclick: function () {
        if (!confirm('¿Descartar este documento? El original se conserva en Drive.')) return;
        MV.api('descartarDocumento', { id: doc.id_archivo }).then(function (r) {
          if (!r.ok) { MV.manejarError(r, function (t) { aviso(t, true); }); return; }
          Datos.sincronizar().then(function () { history.back(); });
        });
      } }, 'Descartar (no es un documento de viaje)'),
      h('button.enlace.centrado', { type: 'button', onclick: function (ev) {
        var b = ev.target;
        MV.api('textoDocumento', { id: doc.id_archivo }).then(function (r) {
          if (!r.ok) return;
          b.replaceWith(h('details', { open: true }, h('summary', 'Texto reconocido'), h('pre.textoOcr', r.datos.texto || '(sin texto)')));
        });
      } }, 'Ver el texto reconocido')));
    c.appendChild(trasBotones);
  };

  /* ====================== MIS LUGARES FAVORITOS ====================== */

  PANTALLAS.lugares = function (c) {
    c.appendChild(cab('Mis lugares favoritos', { buscar: true }));
    c.appendChild(h('div.fila.margen',
      h('button.primario', { type: 'button', onclick: function () { ir('lugarForm', filtrosLugares.ciudad ? { prefill: { ciudad: filtrosLugares.ciudad } } : {}); } }, 'Quiero conocer'),
      h('button.secundario', { type: 'button', onclick: function () { ir('galeria'); } }, 'Mi galería de viajes')));
    var todos = D().lugares;
    var busq = h('input', { type: 'search', placeholder: 'Buscar por nombre, ciudad o país', 'aria-label': 'Buscar lugares' });
    busq.value = filtrosLugares.q;
    var selCat = h('select', { 'aria-label': 'Categoría' }, h('option', { value: '' }, 'Todas las categorías'),
      CATEGORIAS.filter(function (x) { return todos.some(function (l) { return l.categoria === x; }); }).map(function (o) { return h('option', { value: o }, mayuscula(o)); }));
    var selEst = h('select', { 'aria-label': 'Estado' }, h('option', { value: '' }, 'Todos los estados'), ESTADOS_LUGAR.map(function (o) { return h('option', { value: o[0] }, o[1]); }));
    // Ciudad: la que se visita hoy aparece primero y marcada.
    var va = viajeActual();
    var deHoy = va ? ciudadesDe(va, hoy()) : [];
    var nombresCiudad = {};
    todos.forEach(function (l) { if (l.ciudad) nombresCiudad[norm(l.ciudad)] = nombresCiudad[norm(l.ciudad)] || l.ciudad; });
    deHoy.forEach(function (x) { nombresCiudad[norm(x)] = nombresCiudad[norm(x)] || x; });
    var listaCiudades = Object.keys(nombresCiudad).sort(function (a, b) {
      var ha = deHoy.some(function (x) { return norm(x) === a; }), hb = deHoy.some(function (x) { return norm(x) === b; });
      return ha !== hb ? (ha ? -1 : 1) : (a < b ? -1 : 1);
    });
    var selCiudad = h('select.completo', { 'aria-label': 'Ciudad' }, h('option', { value: '' }, 'Todas las ciudades'),
      listaCiudades.map(function (k) { var esHoy = deHoy.some(function (x) { return norm(x) === k; });
        return h('option', { value: nombresCiudad[k] }, nombresCiudad[k] + (esHoy ? ' (la visito hoy)' : '')); }));
    selCiudad.value = listaCiudades.some(function (k) { return nombresCiudad[k] === filtrosLugares.ciudad; }) ? filtrosLugares.ciudad : '';
    selCat.value = filtrosLugares.categoria; selEst.value = filtrosLugares.estado;
    c.appendChild(h('div.buscador', busq));
    c.appendChild(h('div.filtros', listaCiudades.length > 1 ? selCiudad : null, selCat, selEst));
    var lista = h('div');
    c.appendChild(lista);
    busq.addEventListener('input', function () { filtrosLugares.q = busq.value; dibujar(); });
    selCat.addEventListener('change', function () { filtrosLugares.categoria = selCat.value; dibujar(); });
    selEst.addEventListener('change', function () { filtrosLugares.estado = selEst.value; dibujar(); });
    selCiudad.addEventListener('change', function () { filtrosLugares.ciudad = selCiudad.value; dibujar(); });
    function dibujar() {
      lista.innerHTML = '';
      var q = norm(filtrosLugares.q);
      var r = todos.filter(function (l) {
        return (!selCiudad.value || norm(l.ciudad) === norm(selCiudad.value)) &&
          (!filtrosLugares.categoria || l.categoria === filtrosLugares.categoria) && (!filtrosLugares.estado || l.estado === filtrosLugares.estado) &&
          (!q || norm([l.nombre, l.ciudad, l.pais, l.notas, l.direccion].join(' ')).indexOf(q) !== -1);
      });
      if (!todos.length) { lista.appendChild(vacio('Guarde aquí los lugares que quiere conocer. También puede enviarlos desde TikTok, Instagram, WhatsApp o Google Maps con «Compartir».')); return; }
      if (!r.length) {
        lista.appendChild(vacio(selCiudad.value ? 'Aún no hay lugares guardados en ' + selCiudad.value + '. Use «Quiero conocer» para añadir uno.' : 'Ningún lugar coincide con la búsqueda.'));
        return;
      }
      var ciudades = {};
      r.forEach(function (l) { var k = l.ciudad || ''; (ciudades[k] = ciudades[k] || []).push(l); });
      Object.keys(ciudades).sort(function (a, b) { return !a ? 1 : !b ? -1 : (norm(a) < norm(b) ? -1 : 1); }).forEach(function (ciudad) {
        var ls = ciudades[ciudad].sort(function (a, b) { return norm(a.nombre) < norm(b.nombre) ? -1 : 1; });
        var pais = ls[0].pais;
        lista.appendChild(h('div.ciudad', h('h2', ciudad || 'Sin ciudad'), h('span', [pais, ls.length + (ls.length === 1 ? ' lugar' : ' lugares')].filter(Boolean).join(', '))));
        lista.appendChild(h('div.lista', ls.map(filaLugar)));
      });
    }
    dibujar();
  };

  // Viaje al que normalmente se agrega un lugar: el actual o el próximo que
  // pasa por su ciudad; si no, el actual o el próximo.
  function viajeParaAgregar(l) {
    var vivos = D().viajes.filter(function (v) { var e = estadoViaje(v); return e === 'actual' || e === 'proximo'; })
      .sort(function (a, b) { return (a.inicio || '9') < (b.inicio || '9') ? -1 : 1; });
    var enCiudad = vivos.find(function (v) { return l.ciudad && ciudadesDe(v).some(function (x) { return norm(x) === norm(l.ciudad); }); });
    return (enCiudad || vivos[0] || {}).id || '';
  }

  function filaLugar(l) {
    var nViajes = D().asignaciones.filter(function (x) { return x.lugar_id === l.id; }).length;
    return h('div.item.tocable', { onclick: function () { ir('lugarForm', { id: l.id }); } },
      h('div.lugarFila', miniatura(l)),
      h('div.itemTexto', h('div.quien', l.nombre, l._pendiente ? h('i.pend', ' por enviar') : null),
        h('div.chips', chip(mayuscula(l.categoria || 'otro'), 'tipo'),
          chip(etiquetaEstado(l.estado), l.estado === 'visitado' ? 'miel' : ''),
          l.enlace && FUENTES[l.fuente] ? h('a.chip.codigo', { href: l.enlace, target: '_blank', rel: 'noopener noreferrer', onclick: function (ev) { ev.stopPropagation(); } }, FUENTES[l.fuente]) : null,
          nViajes ? chip(nViajes === 1 ? 'En 1 viaje' : 'En ' + nViajes + ' viajes') : null)));
  }

  PANTALLAS.lugarForm = function (c, a) {
    var l = a.id ? lugar(a.id) : null;
    if (a.id && !l) { c.appendChild(cab('Lugar', { volver: true })); c.appendChild(vacio('Este lugar ya no existe.')); return; }
    l = l || Object.assign({ estado: 'quiero ir', categoria: 'otro' }, a.prefill || {});
    c.appendChild(cab(l.id ? l.nombre : 'Quiero conocer', { volver: true, sub: l.id ? [l.ciudad, l.pais].filter(Boolean).join(', ') : 'Nuevo lugar para Mis lugares favoritos' }));
    if (l.id) c.appendChild(bloqueFoto(l));
    if (l.id) c.appendChild(h('div.margen', h('button.primario.ancho', { type: 'button', onclick: function () { ir('asignacionForm', { lugar: l.id, viaje: viajeParaAgregar(l) }); } }, 'Agregar a mi itinerario')));
    var error = h('div.error', { role: 'alert' });
    var avisoEnlace = h('p.ayuda');
    var form = h('form.tarjeta.formulario', { onsubmit: function (ev) {
      ev.preventDefault();
      var x = leerFormulario(form);
      if (!x.nombre) { error.textContent = 'Escriba el nombre del lugar.'; return; }
      if (x.enlace && !/^https?:\/\//i.test(x.enlace)) { error.textContent = 'El enlace debe empezar por https://'; return; }
      var cd = coordsDeEnlace(x.enlace);
      if (!x.lat && cd) { x.lat = cd.lat; x.lng = cd.lng; }
      x.id = l.id; x.fuente = form.dataset.fuente || l.fuente || '';
      Datos.guardar('Lugares', x).then(function (r) {
        avisoGuardado(r, 'Guardado en Mis lugares favoritos.');
        if (a.volverA) { ir(a.volverA.p, Object.assign({}, a.volverA.a, { lugarNuevo: r.id }), true); return; }
        if (l.id) history.back(); else ir('lugarForm', { id: r.id }, true);
      });
    } },
      campo('Enlace (TikTok, Instagram, WhatsApp, Google Maps o página web)', 'enlace', l.enlace, 'url', { ph: 'Pegue aquí el enlace', max: 2000 }),
      h('button.secundario.chico', { type: 'button', onclick: function () { leerEnlace(form, avisoEnlace); } }, 'Leer datos del enlace'),
      avisoEnlace,
      campo('Nombre', 'nombre', l.nombre, 'text', { max: 160 }),
      h('div.dosCol', campo('Ciudad', 'ciudad', l.ciudad, 'text', { max: 100 }), campo('País', 'pais', l.pais, 'text', { max: 80 })),
      h('div.dosCol', campo('Categoría', 'categoria', l.categoria, 'select', { opciones: CATEGORIAS.map(function (x) { return [x, mayuscula(x)]; }) }),
        campo('Estado', 'estado', l.estado, 'select', { opciones: ESTADOS_LUGAR })),
      campo('Dirección', 'direccion', l.direccion, 'text', { max: 300 }),
      campo('Detalles prácticos (horario, qué pedir, cómo llegar)', 'notas', l.notas, 'textarea', { filas: 2 }),
      h('input', { type: 'hidden', name: 'lat', value: l.lat || '' }), h('input', { type: 'hidden', name: 'lng', value: l.lng || '' }),
      error,
      h('button.primario.ancho', { type: 'submit' }, 'Guardar'));
    form.dataset.fuente = l.fuente || '';
    c.appendChild(form);
    if (l.id) {
      var sitio = l.lat && l.lng ? l.lat + ',' + l.lng : (l.direccion || [l.nombre, l.ciudad, l.pais].filter(Boolean).join(', '));
      c.appendChild(h('div.fila.margen', l.enlace ? enlaceExterno(l.enlace, 'Abrir el enlace original') : null,
        enlaceExterno(mapa(sitio), 'Ver en Google Maps'), enlaceExterno(rutaMaps(sitio), 'Cómo llegar')));
      var asig = D().asignaciones.filter(function (x) { return x.lugar_id === l.id; });
      c.appendChild(h('h2.seccion', 'En mis viajes'));
      if (asig.length) c.appendChild(h('div.lista', asig.map(function (x) {
        var v = viaje(x.viaje_id) || {};
        return h('div.item.tocable', { onclick: function () { ir('asignacionForm', { id: x.id }); } },
          h('div.itemTexto', h('div.quien', v.titulo || '(viaje eliminado)'), h('div.proxima', x.fecha ? mayuscula(fechaLarga(x.fecha)) + (x.hora ? ', ' + x.hora : '') : 'Sin día asignado')));
      })));
      c.appendChild(h('div.margen', h('button.secundario.peligro.ancho', { type: 'button', onclick: function () {
        if (!confirm('¿Quitar «' + l.nombre + '» de Mis lugares favoritos? También se quitará de los itinerarios. Su fotografía sigue en Drive.')) return;
        Datos.eliminar('Lugares', l.id).then(function (r) { avisoGuardado(r, 'Lugar quitado.'); ir('lugares', {}, true); });
      } }, 'Quitar de Mis lugares favoritos')));
    }
    if (a.leerAlAbrir && l.enlace) leerEnlace(form, avisoEnlace);
  };

  // Una sola fotografia por lugar, elegida por la titular.
  function bloqueFoto(l) {
    var caja = h('div');
    if (l.foto_id) caja.appendChild(ponerFoto(h('img.fotoGrande', { alt: 'Fotografía de ' + l.nombre }), l.foto_id));
    var entrada = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/*', class: 'oculto', 'aria-label': 'Elegir fotografía' });
    entrada.addEventListener('change', function () {
      var f = entrada.files && entrada.files[0];
      if (!f) return;
      if (!MV.hayConexion()) { aviso('Necesita internet para guardar la fotografía.', true); return; }
      if (Datos.pendientes.some(function (o) { return o.tabla === 'Lugares' && o.id === l.id; })) { aviso('Espere a que se envíen los cambios de este lugar y vuelva a intentarlo.', true); return; }
      MV.esperando(true);
      prepararFoto(f).then(function (foto) {
        if (foto.bytes.length > 3 * 1024 * 1024) throw new Error('grande');
        return MV.api('guardarFoto', { lugarId: l.id, base: l.version, tipo: foto.tipo, base64: aBase64(foto.bytes) }).then(function (r) {
          if (!r.ok) throw r;
          return Almacen.guardarFoto(r.datos.foto_id, foto.bytes, foto.tipo).then(function () { return sincronizarTodo(); });
        });
      }).then(function () { MV.esperando(false); aviso('Fotografía guardada.'); pintar(); }, function (r) {
        MV.esperando(false);
        if (r && r.error) MV.manejarError(r, function (t) { aviso(t, true); });
        else aviso('No se pudo usar esa fotografía. Elija una JPG, PNG o WebP.', true);
      });
    });
    caja.appendChild(entrada);
    caja.appendChild(h('div.fila.margen', h('button.secundario.chico', { type: 'button', onclick: function () { entrada.click(); } },
      l.foto_id ? 'Cambiar la fotografía' : 'Elegir una fotografía')));
    if (!l.foto_id) caja.appendChild(h('p.ayuda.margen', 'Puede añadir una fotografía suya; se verá en el itinerario y en Mi galería de viajes.'));
    return caja;
  }

  function leerEnlace(form, salida) {
    var campoEnlace = form.querySelector('[name=enlace]');
    var texto = campoEnlace.value.trim();
    if (!texto) { salida.textContent = 'Pegue primero un enlace.'; return; }
    if (!MV.hayConexion()) { salida.textContent = 'Sin internet: guarde el enlace y complete los datos después.'; return; }
    salida.textContent = 'Leyendo el enlace…';
    MV.api('leerEnlace', { texto: texto }).then(function (r) {
      if (!r.ok) { MV.manejarError(r, function (t) { salida.textContent = t + ' Puede escribir los datos a mano.'; }); return; }
      var d = r.datos;
      campoEnlace.value = d.enlace;
      form.dataset.fuente = d.fuente;
      var nombre = form.querySelector('[name=nombre]'), notas = form.querySelector('[name=notas]'), dir = form.querySelector('[name=direccion]');
      if (d.nombre && !nombre.value) nombre.value = d.nombre;
      if (d.descripcion && notas.value.indexOf(d.descripcion) === -1) notas.value = (notas.value ? notas.value + '\n' : '') + d.descripcion;
      if (d.direccion && !dir.value) dir.value = d.direccion;
      if (d.lat && d.lng) { form.querySelector('[name=lat]').value = d.lat; form.querySelector('[name=lng]').value = d.lng; }
      salida.textContent = (FUENTES[d.fuente] ? FUENTES[d.fuente] + ': ' : '') + (d.aviso || (d.nombre ? 'datos propuestos; revíselos.' : 'complete los datos.'));
    });
  }

  /* ====================== AGREGAR A MI ITINERARIO ====================== */

  PANTALLAS.asignacionForm = function (c, a) {
    var x = a.id ? D().asignaciones.find(function (y) { return y.id === a.id; }) : null;
    if (a.id && !x) { c.appendChild(cab('Itinerario', { volver: true })); c.appendChild(vacio('Esta actividad ya no existe.')); return; }
    x = x || { viaje_id: a.viaje || '', lugar_id: a.lugarNuevo || a.lugar || '', fecha: a.fecha || '', hora: '', prioridad: '', orden: '' };
    var v = viaje(x.viaje_id);
    c.appendChild(cab(x.id ? 'Actividad del itinerario' : 'Agregar a mi itinerario', { volver: true, sub: v ? v.titulo : '' }));
    var error = h('div.error', { role: 'alert' });
    // Primero los lugares de la ciudad del dia (o del viaje).
    function opcionesLugares(vj, fecha) {
      var nombresCiudades = vj ? ciudadesDe(vj, fecha) : [];
      var ciudades = nombresCiudades.map(norm);
      var todos = D().lugares.slice().sort(function (p, q) { return norm(p.nombre) < norm(q.nombre) ? -1 : 1; });
      var cerca = todos.filter(function (l) { return ciudades.indexOf(norm(l.ciudad)) !== -1; });
      var otros = todos.filter(function (l) { return cerca.indexOf(l) === -1; });
      var op = function (l) { return [l.id, l.nombre + (l.ciudad ? ', ' + l.ciudad : '')]; };
      var r = [['', 'Elija un lugar…']];
      if (cerca.length) r.push({ grupo: 'En ' + nombresCiudades.join(' y '), opciones: cerca.map(op) });
      if (otros.length) r.push({ grupo: cerca.length ? 'Otros lugares' : 'Mis lugares favoritos', opciones: otros.map(op) });
      return r;
    }
    function opcionesDias(vj) { return [['', 'Sin día asignado']].concat(opcionesDiasViaje(vj)); }
    var plan = x.hora ? 'fijo' : (x.prioridad === 'opcional' ? 'opcional' : 'flexible');
    var conDias = v && v.inicio && v.fin && difDias(v.fin, v.inicio) < 62;
    var form = h('form.tarjeta.formulario', { onsubmit: function (ev) {
      ev.preventDefault();
      var y = leerFormulario(form);
      if (!y.viaje_id) { error.textContent = 'Elija el viaje.'; return; }
      if (!y.lugar_id) { error.textContent = 'Elija un lugar.'; return; }
      if (y.plan === 'fijo' && !y.hora) { error.textContent = 'Indique la hora para el horario fijo.'; return; }
      var repetido = D().asignaciones.some(function (z) { return z.id !== x.id && z.viaje_id === y.viaje_id && z.lugar_id === y.lugar_id && z.fecha === y.fecha; });
      if (repetido) { error.textContent = 'Ese lugar ya está en ese día del viaje.'; return; }
      var registro = { id: x.id, viaje_id: y.viaje_id, lugar_id: y.lugar_id, fecha: y.fecha,
        hora: y.plan === 'fijo' ? y.hora : '', prioridad: y.plan === 'opcional' ? 'opcional' : '',
        orden: x.fecha === y.fecha ? x.orden : '' };
      Datos.guardar('Asignaciones', registro).then(function (r) { avisoGuardado(r, 'Itinerario actualizado.'); history.back(); });
    } },
      campo('Viaje', 'viaje_id', x.viaje_id, 'select', { opciones: [['', 'Elija un viaje…']].concat(D().viajes.filter(function (vj) { return vj.archivado !== 'sí' || vj.id === x.viaje_id; }).map(function (vj) { return [vj.id, vj.titulo]; })) }),
      D().lugares.length ? campo('Lugar', 'lugar_id', x.lugar_id, 'select', { opciones: opcionesLugares(v, x.fecha) }) :
        h('div.alerta', 'Aún no tiene lugares guardados. Use «Quiero conocer» para añadir el primero.'),
      h('button.secundario.chico', { type: 'button', onclick: function () {
        ir('lugarForm', { prefill: { ciudad: (v && ciudadesDe(v, x.fecha)[0]) || '' }, volverA: { p: 'asignacionForm', a: Object.assign({}, a, { viaje: x.viaje_id }) } });
      } }, 'Quiero conocer un lugar nuevo'),
      h('div.espacio'),
      conDias ? campo('Día', 'fecha', x.fecha, 'select', { opciones: opcionesDias(v) }) : campo('Día', 'fecha', x.fecha, 'date'),
      campo('Tipo de plan', 'plan', plan, 'select', { opciones: [['fijo', 'Horario fijo'], ['flexible', 'Actividad del día (sin hora)'], ['opcional', 'Si nos queda tiempo']] }),
      campo('Hora', 'hora', x.hora, 'time'),
      error, h('button.primario.ancho', { type: 'submit' }, x.id ? 'Guardar' : 'Agregar a mi itinerario'));
    c.appendChild(form);
    var selPlan = form.querySelector('[name=plan]'), campoHora = form.querySelector('[name=hora]').parentNode;
    var mostrarHora = function () { campoHora.classList.toggle('oculto', selPlan.value !== 'fijo'); };
    selPlan.addEventListener('change', mostrarHora); mostrarHora();
    var selViaje = form.querySelector('[name=viaje_id]');
    selViaje.addEventListener('change', function () { ir('asignacionForm', Object.assign({}, a, { viaje: selViaje.value, lugar: form.querySelector('[name=lugar_id]') ? form.querySelector('[name=lugar_id]').value : '' }), true); });
    var selDia = form.querySelector('[name=fecha]'), selLugar = form.querySelector('[name=lugar_id]');
    if (selLugar && selDia) selDia.addEventListener('change', function () {
      var actual = selLugar.value;
      var nuevo = campo('', 'x', '', 'select', { opciones: opcionesLugares(v, selDia.value) }).querySelector('select');
      selLugar.innerHTML = '';
      while (nuevo.firstChild) selLugar.appendChild(nuevo.firstChild);
      selLugar.value = actual;
    });
    if (x.id) {
      var l = lugar(x.lugar_id);
      if (l) c.appendChild(h('div.margen', h('button.secundario.ancho', { type: 'button', onclick: function () { ir('lugarForm', { id: l.id }); } }, 'Ver la ficha de ' + l.nombre)));
      c.appendChild(h('div.margen', h('button.secundario.peligro.ancho', { type: 'button', onclick: function () {
        Datos.eliminar('Asignaciones', x.id).then(function (r) { avisoGuardado(r, 'Quitado del itinerario; sigue en Mis lugares favoritos.'); history.back(); });
      } }, 'Quitar del itinerario')));
    }
  };

  /* ====================== MI GALERIA DE VIAJES ====================== */

  PANTALLAS.galeria = function (c) {
    c.appendChild(cab('Mi galería de viajes', { volver: true }));
    var conFoto = D().lugares.filter(function (l) { return l.foto_id; });
    if (!conFoto.length) { c.appendChild(vacio('Aún no hay fotografías. Abra un lugar de Mis lugares favoritos y elija una fotografía suya.')); return; }
    var usados = {};
    D().viajes.slice().sort(function (a, b) { return (a.inicio || '') > (b.inicio || '') ? -1 : 1; }).forEach(function (v) {
      var ids = D().asignaciones.filter(function (x) { return x.viaje_id === v.id; }).map(function (x) { return x.lugar_id; });
      var fotos = conFoto.filter(function (l) { return ids.indexOf(l.id) !== -1; });
      if (!fotos.length) return;
      fotos.forEach(function (l) { usados[l.id] = 1; });
      c.appendChild(h('h2.seccion', v.titulo, h('span.cuenta', rangoFechas(v.inicio, v.fin))));
      c.appendChild(rejilla(fotos));
    });
    var otros = conFoto.filter(function (l) { return !usados[l.id]; });
    if (otros.length) { c.appendChild(h('h2.seccion', 'Otros lugares')); c.appendChild(rejilla(otros)); }
  };
  function rejilla(lugares) {
    return h('div.galeria', lugares.map(function (l) {
      return h('figure', { onclick: function () { ir('lugarForm', { id: l.id }); } },
        ponerFoto(h('img', { alt: l.nombre }), l.foto_id), h('figcaption', l.nombre));
    }));
  }

  /* ====================== BUSCAR ====================== */

  PANTALLAS.buscar = function (c, a) {
    c.appendChild(cab('Buscar', { volver: true }));
    var entrada = h('input', { type: 'search', placeholder: 'Vuelo, alojamiento, confirmación, póliza, lugar…', 'aria-label': 'Buscar' });
    entrada.value = a.q || '';
    c.appendChild(h('div.buscador', entrada));
    var res = h('div');
    c.appendChild(res);
    function buscar() {
      res.innerHTML = '';
      var q = norm(entrada.value.trim());
      history.replaceState({ mv: { p: 'buscar', a: { q: entrada.value } } }, '');
      if (q.length < 2) { res.appendChild(vacio('Escriba al menos dos letras. Se busca en viajes, reservas, pólizas, lugares y documentos, también sin conexión.')); return; }
      var coincide = function (campos) { return norm(campos.join(' ')).indexOf(q) !== -1; };
      var grupos = [
        ['Viajes', D().viajes.filter(function (v) { return coincide([v.titulo, v.destino, v.personas]); }).map(function (v) {
          return h('div.item.tocable', { onclick: function () { ir('viaje', { id: v.id }); } }, h('div.itemTexto', h('div.quien', v.titulo), h('div.proxima', rangoFechas(v.inicio, v.fin))));
        })],
        ['Reservas', D().elementos.filter(function (e) { return coincide([e.titulo, e.lugar, e.direccion, e.confirmacion, e.telefono, e.datos, e.notas]); }).sort(porFechaHora).map(filaReserva)],
        ['Lugares', D().lugares.filter(function (l) { return coincide([l.nombre, l.ciudad, l.pais, l.categoria, l.notas, l.direccion]); }).map(filaLugar)],
        ['Documentos', D().documentos.filter(function (d) { return coincide([d.nombre, d.tipo_detectado]); }).map(function (d) {
          return h('div.item.tocable', { onclick: function () { ir('revision', { id: d.id_archivo }); } }, h('div.itemTexto', h('div.quien', d.nombre), h('div.proxima', mayuscula(d.estado))));
        })]
      ];
      var total = 0;
      grupos.forEach(function (g) {
        if (!g[1].length) return;
        total += g[1].length;
        res.appendChild(h('h2.seccion', g[0], h('span.cuenta', g[1].length)));
        res.appendChild(h('div.lista', g[1]));
      });
      if (!total) res.appendChild(vacio('Sin resultados.'));
    }
    entrada.addEventListener('input', buscar);
    buscar();
    setTimeout(function () { entrada.focus(); }, 50);
  };

  /* ====================== AJUSTES ====================== */

  PANTALLAS.ajustes = function (c) {
    c.appendChild(cab('Ajustes y sincronización', { volver: true }));
    var con = MV.hayConexion();
    c.appendChild(h('div.tarjeta',
      h('div.dato', h('span', 'Conexión'), h('b', con ? 'Conectada' : 'Sin conexión')),
      h('div.dato', h('span', 'Cambios por enviar'), h('b', String(Datos.pendientes.length))),
      h('div.dato', h('span', 'Copia en este dispositivo'), h('b', Datos.guardadoLocal ? 'Al día' : 'Con error al guardar')),
      h('div.dato', h('span', 'Última copia del servicio'), h('b', D().generado ? new Date(D().generado).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—')),
      h('button.primario.ancho.espacio', { type: 'button', onclick: function () {
        MV.esperando(true);
        sincronizarTodo().then(function (ok) { MV.esperando(false); aviso(ok ? 'Sincronizado.' : 'No hay conexión con el servicio.', !ok); pintar(); });
      } }, 'Sincronizar ahora')));
    var pr = Datos.problemas;
    if (pr.length) {
      c.appendChild(h('h2.seccion', 'Cambios que necesitan su decisión', h('span.cuenta', pr.length)));
      pr.forEach(function (p) {
        var nombre = (p.op.datos && (p.op.datos.titulo || p.op.datos.nombre)) || (p.actual && (p.actual.titulo || p.actual.nombre)) || p.op.tabla;
        var tabla = { Viajes: 'viaje', Elementos: 'reserva', Lugares: 'lugar', Asignaciones: 'itinerario' }[p.op.tabla];
        if (p.tipo === 'conflicto') {
          c.appendChild(h('div.tarjeta.conflicto',
            h('div.quien', (p.error === 'recuperado' ? 'Cambio recuperado en ' : 'Conflicto en ') + tabla + ': ' + nombre),
            h('p.ayuda', p.error === 'recuperado' ? 'Este cambio estaba en la copia anterior del dispositivo y no se había enviado.' :
              p.op.op === 'eliminar' ? 'Usted lo eliminó en este dispositivo, pero en otro se modificó.' :
              'Lo modificó aquí mientras otro dispositivo también lo cambiaba. No se sobrescribió nada.'),
            comparar(p),
            h('div.fila',
              h('button.primario.chico', { type: 'button', onclick: function () { Datos.resolver(p.id, 'mio').then(pintar); } }, p.op.op === 'eliminar' ? 'Eliminarlo de todos modos' : 'Conservar mi cambio'),
              h('button.secundario.chico', { type: 'button', onclick: function () { Datos.resolver(p.id, 'otro').then(pintar); } }, p.error === 'recuperado' ? 'Descartar este cambio' : 'Quedarme con la otra versión'))));
        } else {
          c.appendChild(h('div.tarjeta.conflicto', h('div.quien', 'No se pudo guardar: ' + nombre),
            h('p.ayuda', MV.mensaje({ error: p.error })),
            h('button.secundario.chico', { type: 'button', onclick: function () { Datos.resolver(p.id, 'otro').then(pintar); } }, 'Entendido')));
        }
      });
    }
    var anteriores = h('div');
    c.appendChild(anteriores);
    Almacen.copiasAnteriores().then(function (lista) {
      lista.forEach(function (pref) {
        var fecha = new Date(Number(pref.slice(3))).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
        var pin = h('input', { type: 'password', inputmode: 'numeric', maxlength: '7', autocomplete: 'off', 'aria-label': 'PIN anterior' });
        var salida = h('p.ayuda.sinMargen');
        anteriores.appendChild(h('div.tarjeta.formulario',
          h('div.quien', 'Copia anterior de este dispositivo'),
          h('p.ayuda', 'Se apartó el ' + fecha + ' porque el PIN cambió. No se borró nada. Si tenía cambios sin enviar, escriba su PIN anterior para recuperarlos.'),
          h('label', 'PIN anterior', pin), salida,
          h('div.fila',
            h('button.primario.chico', { type: 'button', onclick: function () {
              if (!/^\d{7}$/.test(pin.value)) { salida.textContent = 'El PIN tiene 7 dígitos.'; return; }
              MV.esperando(true);
              Almacen.leerCopiaAnterior(pref, pin.value).then(function (r) {
                MV.esperando(false); pin.value = '';
                if (r === 'pin') { salida.textContent = 'Ese no es el PIN de la copia anterior.'; return; }
                if (!r || (!r.pendientes.length && !r.problemas.length)) { salida.textContent = 'La copia anterior no tenía cambios sin enviar.'; return; }
                Datos.incorporarRecuperados(r).then(function () { aviso('Cambios recuperados: decida cuáles conservar.'); pintar(); });
              });
            } }, 'Recuperar cambios'),
            h('button.secundario.chico.peligro', { type: 'button', onclick: function () {
              if (!confirm('¿Descartar definitivamente la copia anterior de este dispositivo? Sus datos del servicio no se tocan.')) return;
              Almacen.descartarCopiaAnterior(pref).then(function (ok) { aviso(ok ? 'Copia anterior descartada.' : 'No se pudo descartar la copia anterior.', !ok); pintar(); });
            } }, 'Descartar la copia anterior'))));
      });
    });
    var docs = h('div.tarjeta', h('div.etiqueta', 'Documentos disponibles sin conexión'));
    c.appendChild(docs);
    Almacen.archivosGuardados().then(function (ids) {
      if (!ids.length) docs.appendChild(h('p.ayuda.sinMargen', 'Ninguno todavía. Los vuelos, alojamientos y seguros confirmados se preparan solos; los demás se añaden desde cada documento.'));
      ids.forEach(function (id) {
        var d = D().documentos.find(function (x) { return x.id_archivo === id; });
        docs.appendChild(h('div.dato', h('span', d ? d.nombre : 'Documento'), h('button.enlace', { type: 'button', onclick: function () { ir('revision', { id: id }); } }, 'Ver')));
      });
    });
    c.appendChild(h('div.tarjeta',
      h('div.etiqueta', 'Sus datos'),
      h('p.ayuda.sinMargen', 'Todo se guarda en su Google Drive: la carpeta «Mis Viajes» con sus documentos y fotografías, y la hoja «Mis Viajes — Índice», con el historial de versiones de Google. En este dispositivo solo hay una copia cifrada con su PIN para consultar sin internet.'),
      h('div.fila', D().carpeta ? enlaceExterno(D().carpeta, 'Carpeta de documentos') : null, D().hoja ? enlaceExterno(D().hoja, 'Hoja de datos') : null),
      h('button.secundario.peligro.ancho.espacio', { type: 'button', onclick: function () {
        if (Datos.pendientes.length) { aviso('Hay ' + Datos.pendientes.length + ' cambios sin enviar. Sincronice antes de borrar la copia.', true); return; }
        if (!confirm('¿Borrar la copia de este dispositivo? Sus datos siguen en Google Drive.')) return;
        Almacen.borrarTodo().then(function (ok) {
          if (!ok) { aviso('No se pudo borrar la copia del dispositivo.', true); return; }
          MV.bloquear(false, 'Copia del dispositivo borrada. Ingrese su PIN para volver a descargarla.');
        });
      } }, 'Borrar la copia de este dispositivo')));
  };

  function comparar(p) {
    var mio = p.op.datos || {}, otro = p.actual || {};
    var nombres = { titulo: 'Nombre', nombre: 'Nombre', estado: 'Estado', fecha: 'Fecha', hora: 'Hora', ciudad: 'Ciudad', notas: 'Detalles', categoria: 'Categoría' };
    var campos = Object.keys(mio).filter(function (k) { return String(mio[k] || '') !== String(otro[k] || '') && k !== 'datos' && k !== 'destinos'; });
    if (!campos.length || p.op.op === 'eliminar') return null;
    return h('div.datos.compara', campos.slice(0, 6).map(function (k) {
      return h('div', h('span', nombres[k] || k), h('b', 'Aquí: ' + (mio[k] || '—')), h('b', 'En el otro dispositivo: ' + (otro[k] || '—')));
    }));
  }

  /* ====================== DOCUMENTOS SIN CONEXION ====================== */

  var guardandoDocs = false;
  function guardarDocumentosSinConexion() {
    if (guardandoDocs || !MV.hayConexion() || !Almacen.abierta()) return Promise.resolve();
    guardandoDocs = true;
    return Almacen.archivosGuardados().then(function (ids) {
      var marcados = D().documentos.filter(function (d) { return d.sin_conexion === 'sí'; });
      var faltan = marcados.filter(function (d) { return ids.indexOf(d.id_archivo) === -1; });
      // Solo se quitan del dispositivo los que la titular desmarco (nunca por un error).
      var sobran = ids.filter(function (id) { var d = D().documentos.find(function (x) { return x.id_archivo === id; }); return d && d.sin_conexion !== 'sí'; });
      return Promise.all(sobran.map(Almacen.quitarArchivo)).then(function () {
        return faltan.reduce(function (p, d) {
          return p.then(function () {
            return MV.api('archivoDocumento', { id: d.id_archivo }).then(function (r) {
              if (!r.ok) return;
              var bin = atob(r.datos.base64), b = new Uint8Array(bin.length);
              for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
              return Almacen.guardarArchivo(d.id_archivo, b, { nombre: r.datos.nombre, tipo: r.datos.tipo });
            });
          });
        }, Promise.resolve());
      });
    }).then(function () { guardandoDocs = false; }, function () { guardandoDocs = false; });
  }

  function sincronizarTodo() {
    return Datos.sincronizar().then(function (ok) { return guardarDocumentosSinConexion().then(function () { return ok; }); });
  }

  /* ====================== PUENTE CON EL ACCESO ====================== */

  Datos.configurar({ api: function (a, d) { return MV.api(a, d); }, enLinea: function () { return MV.hayConexion(); } });
  Datos.alCambiar(function () {
    if ($('vistaApp').classList.contains('oculto')) return;
    if (FORMULARIOS.indexOf(ruta.p) !== -1) { pintarFranja(); return; } // no se borra lo que se esta escribiendo
    pintar();
  });

  MV.alEntrar = function (sinConexion) {
    Datos.cargarLocal().then(function (habiaCopia) {
      var compartido = null;
      try { compartido = JSON.parse(sessionStorage.getItem('mv_compartido') || 'null'); sessionStorage.removeItem('mv_compartido'); } catch (e) { /* nada */ }
      var destino = MV._volverA && !compartido ? MV._volverA : null;
      MV._volverA = null;
      if (compartido) {
        var url = (String(compartido.enlace || '') + ' ' + String(compartido.texto || '')).match(/https?:\/\/[^\s]+/);
        ir('lugarForm', { prefill: { enlace: url ? url[0] : '', nombre: '', notas: compartido.titulo && !url ? compartido.titulo : '' }, leerAlAbrir: !sinConexion }, true);
      } else if (destino) { ruta = destino; history.replaceState({ mv: ruta }, ''); pintar(); }
      else ir('inicio', {}, true);
      Almacen.copiasAnteriores().then(function (l) { if (l.length) aviso('Hay una copia anterior de este dispositivo. Revísela en Ajustes.'); });
      if (!sinConexion) {
        if (!habiaCopia) MV.esperando(true);
        sincronizarTodo().then(function (ok) {
          MV.esperando(false);
          if (!ok && !habiaCopia) aviso('No se pudieron descargar sus datos. Revise la conexión.', true);
        });
      }
    });
  };
  MV.alBloquear = function (volverDespues) {
    MV._volverA = volverDespues && FORMULARIOS.indexOf(ruta.p) === -1 ? { p: ruta.p, a: ruta.a } : null;
    Datos.olvidar();
    Object.keys(urlsFotos).forEach(function (k) { URL.revokeObjectURL(urlsFotos[k]); delete urlsFotos[k]; });
    $('contenido').innerHTML = '';
  };
  MV.alCambiarConexion = function () { pintarFranja(); sincronizarTodo(); };
  MV.sincronizar = function () { if (MV.hayConexion()) sincronizarTodo(); else MV.reconectar().then(function (ok) { if (ok) sincronizarTodo(); }); };
})();
