/**
 * Mis Viajes - datos.js v2
 * Estado local y sincronizacion.
 *   - D: copia completa de los datos (viajes, elementos, lugares,
 *     asignaciones, documentos), cifrada en el dispositivo (almacen.js).
 *   - Cada cambio se aplica al momento en pantalla y queda como "pendiente"
 *     hasta que el servicio lo confirma. Sin internet se acumulan y se
 *     envian al volver la conexion.
 *   - Si otro dispositivo cambio el mismo registro, el servicio responde
 *     "conflicto": el cambio NO se aplica y la titular decide.
 *
 * v2:
 *   - guardar() informa si el cambio quedo realmente guardado en el
 *     dispositivo (local) y nunca da por guardado lo que fallo.
 *   - En cada envio va como mucho UN cambio por registro; el siguiente sale
 *     con la version que devolvio el servicio. Asi un cambio hecho durante
 *     otra sincronizacion no choca con el anterior ni se pierde.
 *   - Recuperacion de cambios pendientes de una copia anterior (PIN cambiado).
 */
var Datos = (function () {
  'use strict';

  var D = vacio();
  var pendientes = [];     // operaciones aun no confirmadas por el servicio
  var problemas = [];      // conflictos y rechazos que la titular debe ver
  var enviando = false;
  var otraVez = false;     // hubo cambios mientras se enviaba
  var oyentes = [];
  var api = null;
  var enLinea = function () { return true; };
  var ultimoGuardadoLocal = true;

  function vacio() {
    return { viajes: [], elementos: [], lugares: [], asignaciones: [], documentos: [], carpeta: '', hoja: '', generado: '' };
  }
  var NOMBRE_TABLA = { Viajes: 'viajes', Elementos: 'elementos', Lugares: 'lugares', Asignaciones: 'asignaciones' };

  function configurar(o) { api = o.api; enLinea = o.enLinea || enLinea; }
  function alCambiar(fn) { oyentes.push(fn); }
  function avisar() { oyentes.forEach(function (f) { try { f(); } catch (e) { /* nada */ } }); }

  function nuevoId(prefijo) {
    var b = new Uint8Array(10); crypto.getRandomValues(b);
    return (prefijo || '') + Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }

  // Devuelve true solo si las tres escrituras se completaron.
  function persistir() {
    if (!Almacen.abierta()) { ultimoGuardadoLocal = false; return Promise.resolve(false); }
    return Promise.all([Almacen.guardar('datos', D), Almacen.guardar('pendientes', pendientes),
      Almacen.guardar('problemas', problemas)]).then(function (r) {
      ultimoGuardadoLocal = r.every(Boolean);
      return ultimoGuardadoLocal;
    }, function () { ultimoGuardadoLocal = false; return false; });
  }

  function cargarLocal() {
    return Promise.all([Almacen.leer('datos'), Almacen.leer('pendientes'), Almacen.leer('problemas')]).then(function (r) {
      if (r[0]) D = r[0];
      pendientes = Array.isArray(r[1]) ? r[1] : [];
      pendientes.forEach(function (o) { delete o.enviada; }); // envio interrumpido: se repite (es seguro)
      problemas = Array.isArray(r[2]) ? r[2] : [];
      aplicarPendientes();
      avisar();
      return !!r[0];
    });
  }

  function lista(tabla) { return D[NOMBRE_TABLA[tabla]]; }

  function aplicarPendientes() { pendientes.forEach(function (o) { aplicarLocal(o); }); }
  function aplicarLocal(o) {
    var l = lista(o.tabla);
    var i = l.findIndex(function (x) { return x.id === o.id; });
    if (o.op === 'eliminar') {
      if (i !== -1) l.splice(i, 1);
      if (o.tabla === 'Viajes') {
        D.elementos = D.elementos.filter(function (x) { return x.viaje_id !== o.id; });
        D.asignaciones = D.asignaciones.filter(function (x) { return x.viaje_id !== o.id; });
      }
      if (o.tabla === 'Lugares') D.asignaciones = D.asignaciones.filter(function (x) { return x.lugar_id !== o.id; });
      return;
    }
    var reg = Object.assign({}, i !== -1 ? l[i] : { id: o.id, version: '0' }, aTexto(o.datos), { _pendiente: true });
    if (i !== -1) l[i] = reg; else l.push(reg);
  }
  function aTexto(d) {
    var r = {};
    Object.keys(d || {}).forEach(function (k) {
      var v = d[k];
      if ((k === 'datos' || k === 'destinos') && v && typeof v === 'object') {
        r[k] = (Array.isArray(v) ? v.length : Object.keys(v).length) ? JSON.stringify(v) : '';
      } else r[k] = v === undefined || v === null ? '' : String(v);
    });
    return r;
  }

  // Guarda (crea o modifica) un registro. registro.id vacio = nuevo.
  // Resuelve { id, local }: local = true si quedo guardado en el dispositivo.
  function guardar(tabla, registro) {
    var id = registro.id || nuevoId();
    var actual = lista(tabla).find(function (x) { return x.id === id; });
    var datos = Object.assign({}, registro);
    ['id', 'version', '_pendiente', 'creado', 'actualizado', 'ultima_op', 'eliminado', 'foto_id'].forEach(function (k) { delete datos[k]; });
    // Un cambio aun no enviado del mismo registro se reemplaza (misma base).
    var previo = pendientes.find(function (o) { return o.tabla === tabla && o.id === id && !o.enviada && o.op === 'guardar'; });
    if (previo) {
      previo.datos = datos;
      previo.opId = nuevoId('op');
    } else {
      pendientes.push({ op: 'guardar', tabla: tabla, id: id, base: actual ? Number(actual.version || 0) : 0,
        datos: datos, opId: nuevoId('op'), creada: new Date().toISOString() });
    }
    aplicarLocal({ op: 'guardar', tabla: tabla, id: id, datos: datos });
    return persistir().then(function (local) { avisar(); sincronizar(); return { id: id, local: local }; });
  }

  function eliminar(tabla, id) {
    var actual = lista(tabla).find(function (x) { return x.id === id; });
    if (!actual) return Promise.resolve({ local: true });
    // Creado aqui y aun no enviado: basta con olvidarlo.
    var enviadas = pendientes.some(function (o) { return o.tabla === tabla && o.id === id && o.enviada; });
    var nuevo = Number(actual.version || 0) === 0 && !enviadas;
    pendientes = pendientes.filter(function (o) { return !(o.tabla === tabla && o.id === id && !o.enviada); });
    if (!nuevo) {
      pendientes.push({ op: 'eliminar', tabla: tabla, id: id, base: Number(actual.version || 0),
        opId: nuevoId('op'), creada: new Date().toISOString() });
    }
    aplicarLocal({ op: 'eliminar', tabla: tabla, id: id });
    return persistir().then(function (local) { avisar(); sincronizar(); return { local: local }; });
  }

  // Lote: el primer cambio pendiente de cada registro, hasta 50.
  function prepararLote() {
    var vistos = {}, lote = [];
    pendientes.forEach(function (o) {
      var k = o.tabla + '|' + o.id;
      if (vistos[k] || lote.length >= 50) { vistos[k] = true; return; }
      vistos[k] = true;
      lote.push(o);
    });
    return lote;
  }

  // Envia los pendientes y recibe la copia completa del servicio.
  // Resuelve true si el servicio respondio.
  function sincronizar(ronda) {
    ronda = ronda || 0;
    if (!api || !enLinea()) return Promise.resolve(false);
    if (enviando) { otraVez = true; return enviando; }
    otraVez = false;
    var lote = prepararLote();
    lote.forEach(function (o) { o.enviada = true; });
    var accion = lote.length ? api('sincronizar', { ops: lote.map(function (o) {
      return { op: o.op, tabla: o.tabla, id: o.id, base: o.base, datos: o.datos, opId: o.opId };
    }) }) : api('datos');
    enviando = accion.then(function (r) {
      if (!r || !r.ok) {
        lote.forEach(function (o) { delete o.enviada; });
        return false;
      }
      var datos = lote.length ? r.datos.datos : r.datos;
      if (lote.length) procesarResultados(lote, r.datos.resultados || []);
      D = datos;
      aplicarPendientes();
      return persistir().then(function () { avisar(); return true; });
    }, function () {
      lote.forEach(function (o) { delete o.enviada; });
      return false;
    }).then(function (ok) {
      enviando = false;
      // Quedan cambios (de otros registros, siguientes del mismo registro o
      // hechos durante el envio): otra vuelta.
      if (ok && ronda < 10 && (otraVez || pendientes.length) && (lote.length || otraVez)) return sincronizar(ronda + 1);
      return ok;
    });
    return enviando;
  }

  function procesarResultados(lote, resultados) {
    var porOp = {};
    resultados.forEach(function (x) { if (x && x.opId) porOp[x.opId] = x; });
    lote.forEach(function (o) {
      var res = porOp[o.opId];
      if (!res || res.error === 'reintentar' || res.error === 'ocupado' || res.error === 'interno') { delete o.enviada; return; }
      pendientes = pendientes.filter(function (x) { return x !== o; });
      if (res.ok) {
        // Los cambios siguientes del mismo registro parten de la nueva version.
        if (res.version) pendientes.forEach(function (x) { if (x.tabla === o.tabla && x.id === o.id) x.base = Number(res.version); });
        return;
      }
      problemas.push({ id: nuevoId('p'), tipo: res.error === 'conflicto' ? 'conflicto' : 'rechazo', error: res.error,
        op: { op: o.op, tabla: o.tabla, id: o.id, datos: o.datos }, actual: res.actual || null,
        fecha: new Date().toISOString() });
      // Los cambios siguientes del mismo registro dependen de la decision.
      pendientes.filter(function (x) { return x.tabla === o.tabla && x.id === o.id; }).forEach(function (x) {
        pendientes = pendientes.filter(function (y) { return y !== x; });
        problemas.push({ id: nuevoId('p'), tipo: res.error === 'conflicto' ? 'conflicto' : 'rechazo', error: res.error,
          op: { op: x.op, tabla: x.tabla, id: x.id, datos: x.datos }, actual: res.actual || null, fecha: new Date().toISOString() });
      });
    });
  }

  // 'mio' reenvia el cambio sobre la version actual; 'otro' lo descarta.
  function resolver(idProblema, eleccion) {
    var p = problemas.find(function (x) { return x.id === idProblema; });
    if (!p) return Promise.resolve(true);
    problemas = problemas.filter(function (x) { return x !== p; });
    if (eleccion === 'mio' && p.tipo === 'conflicto' && p.actual) {
      pendientes.push({ op: p.op.op, tabla: p.op.tabla, id: p.op.id, base: Number(p.actual.version), datos: p.op.datos,
        opId: nuevoId('op'), creada: new Date().toISOString() });
      aplicarLocal(pendientes[pendientes.length - 1]);
    }
    return persistir().then(function (ok) { avisar(); sincronizar(); return ok; });
  }

  // Cambios pendientes recuperados de una copia anterior: pasan a decision
  // de la titular como conflictos (se comparan con lo que hay en el servicio).
  function incorporarRecuperados(r) {
    (r.pendientes || []).forEach(function (o) {
      var actual = (lista(o.tabla) || []).find(function (x) { return x.id === o.id; });
      problemas.push({ id: nuevoId('p'), tipo: 'conflicto', error: 'recuperado', op: { op: o.op, tabla: o.tabla, id: o.id, datos: o.datos },
        actual: actual ? Object.assign({}, actual) : { version: '0' }, fecha: new Date().toISOString() });
    });
    (r.problemas || []).forEach(function (p) { problemas.push(p); });
    return persistir().then(function (ok) { avisar(); return ok; });
  }

  function olvidar() { D = vacio(); pendientes = []; problemas = []; enviando = false; otraVez = false; }

  return {
    configurar: configurar, alCambiar: alCambiar, cargarLocal: cargarLocal, guardar: guardar, eliminar: eliminar,
    sincronizar: sincronizar, resolver: resolver, olvidar: olvidar, nuevoId: nuevoId, persistir: persistir,
    incorporarRecuperados: incorporarRecuperados,
    get D() { return D; }, get pendientes() { return pendientes; }, get problemas() { return problemas; },
    get guardadoLocal() { return ultimoGuardadoLocal; }
  };
})();
