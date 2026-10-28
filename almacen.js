/**
 * Mis Viajes - almacen.js v2
 * Copia local CIFRADA para consultar sin internet.
 *   - Clave AES-256-GCM derivada del PIN con PBKDF2-SHA-256 (310 000
 *     repeticiones, sal aleatoria del dispositivo). Mismos parametros que
 *     cifrado.js de Mi Vida Organizada.
 *   - La clave solo existe en memoria mientras la aplicacion esta abierta;
 *     al bloquear se olvida. El PIN nunca se guarda.
 *   - Se guardan: los datos de viajes, los cambios pendientes de enviar y
 *     los documentos marcados "disponible sin conexión".
 * Si el navegador no ofrece IndexedDB o criptografia, la aplicacion funciona
 * solo con internet.
 *
 * v2: nunca se borra nada automaticamente. Si la copia no se puede abrir con
 * el PIN vigente (porque el PIN se cambio), se APARTA intacta como «copia
 * anterior»; sus cambios pendientes se recuperan con el PIN anterior.
 * Cada escritura informa si se completo.
 */
var Almacen = (function () {
  'use strict';

  var BASE = 'mis-viajes';
  var TABLA = 'cosas';
  var ITERACIONES = 310000;
  var clave = null;      // CryptoKey en memoria
  var bd = null;

  function disponible() {
    return typeof indexedDB !== 'undefined' && typeof crypto !== 'undefined' && !!crypto.subtle;
  }

  function abrirBd() {
    if (bd) return Promise.resolve(bd);
    return new Promise(function (ok, mal) {
      var r = indexedDB.open(BASE, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(TABLA); };
      r.onsuccess = function () { bd = r.result; ok(bd); };
      r.onerror = function () { mal(r.error); };
    });
  }
  function op(modo, fn) {
    return abrirBd().then(function (b) {
      return new Promise(function (ok, mal) {
        var t = b.transaction(TABLA, modo);
        var res = fn(t.objectStore(TABLA));
        t.oncomplete = function () { ok(res && res.result); };
        t.onerror = function () { mal(t.error); };
        t.onabort = function () { mal(t.error); };
      });
    });
  }
  function leerCrudo(k) { return op('readonly', function (s) { return s.get(k); }); }
  function escribirCrudo(k, v) { return op('readwrite', function (s) { s.put(v, k); }); }

  function texto(s) { return new TextEncoder().encode(s); }
  function aleatorio(n) { var b = new Uint8Array(n); crypto.getRandomValues(b); return b; }

  function derivar(pin, sal) {
    return crypto.subtle.importKey('raw', texto(pin), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: ITERACIONES, hash: 'SHA-256' },
          base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  function cifrarCon(k, bytes, nombre) {
    var iv = aleatorio(12);
    return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: texto(nombre) }, k, bytes)
      .then(function (c) { return { iv: iv, c: new Uint8Array(c) }; });
  }
  function descifrarCon(k, caja, nombre) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: caja.iv, additionalData: texto(nombre) }, k, caja.c)
      .then(function (b) { return new Uint8Array(b); });
  }

  // ¿Hay una copia local en este dispositivo?
  function hayCopia() {
    if (!disponible()) return Promise.resolve(false);
    return leerCrudo('cabecera').then(function (c) { return !!c; }, function () { return false; });
  }

  // Abre la copia con el PIN. Resultado: 'abierta', 'nueva' (no habia
  // copia, o habia una con otro PIN y se aparto sin borrarla), 'pin' (PIN
  // incorrecto; solo con crearSiFalla = false, es decir, sin conexion),
  // 'sinCopia' o 'sinSoporte'.
  function abrir(pin, crearSiFalla) {
    if (!disponible()) return Promise.resolve('sinSoporte');
    return leerCrudo('cabecera').then(function (cab) {
      if (cab) {
        return derivar(pin, cab.sal).then(function (k) {
          return descifrarCon(k, cab.verificador, 'verificador').then(function () {
            clave = k; return 'abierta';
          }, function () {
            if (!crearSiFalla) return 'pin';
            // El servicio acepto este PIN pero la copia es de otro PIN: se aparta.
            return apartarCopia().then(function () { return crearCabecera(pin); });
          });
        });
      }
      if (!crearSiFalla) return 'sinCopia';
      return crearCabecera(pin);
    }).catch(function () { return 'sinSoporte'; });
  }

  // Mueve la copia actual (cabecera, datos, pendientes y archivos) a
  // "ant<fecha>:..." sin descifrarla ni borrarla.
  function apartarCopia() {
    var prefijo = 'ant' + Date.now() + ':';
    return op('readwrite', function (s) {
      var c = s.openCursor();
      c.onsuccess = function () {
        var cur = c.result;
        if (!cur) return;
        var k = String(cur.key);
        if (k.indexOf('ant') !== 0) { s.put(cur.value, prefijo + k); s.delete(cur.key); }
        cur.continue();
      };
    });
  }

  function copiasAnteriores() {
    return op('readonly', function (s) { return s.getAllKeys(); }).then(function (k) {
      return (k || []).map(String).filter(function (x) { return /^ant\d+:cabecera$/.test(x); })
        .map(function (x) { return x.split(':')[0]; });
    }).catch(function () { return []; });
  }

  // Lee los cambios pendientes de una copia anterior con el PIN anterior.
  function leerCopiaAnterior(prefijo, pinAnterior) {
    return leerCrudo(prefijo + ':cabecera').then(function (cab) {
      if (!cab) return null;
      return derivar(pinAnterior, cab.sal).then(function (k) {
        return descifrarCon(k, cab.verificador, 'verificador').then(function () {
          var leer1 = function (n) {
            return leerCrudo(prefijo + ':d:' + n).then(function (caja) {
              if (!caja) return null;
              return descifrarCon(k, caja, n).then(function (b) { return JSON.parse(new TextDecoder().decode(b)); });
            });
          };
          return Promise.all([leer1('pendientes'), leer1('problemas')]).then(function (r) {
            return { pendientes: r[0] || [], problemas: r[1] || [] };
          });
        }, function () { return 'pin'; });
      });
    });
  }

  // Solo por decision expresa de la titular.
  function descartarCopiaAnterior(prefijo) {
    return op('readwrite', function (s) {
      var c = s.openCursor();
      c.onsuccess = function () {
        var cur = c.result;
        if (!cur) return;
        if (String(cur.key).indexOf(prefijo + ':') === 0) s.delete(cur.key);
        cur.continue();
      };
    }).then(function () { return true; }, function () { return false; });
  }

  function crearCabecera(pin) {
    var sal = aleatorio(16);
    return derivar(pin, sal).then(function (k) {
      return cifrarCon(k, texto('mis-viajes'), 'verificador').then(function (v) {
        return escribirCrudo('cabecera', { sal: sal, verificador: v, iteraciones: ITERACIONES }).then(function () {
          clave = k; return 'nueva';
        });
      });
    });
  }

  function abierta() { return !!clave; }
  function cerrar() { clave = null; }

  function guardar(nombre, obj) {
    if (!clave) return Promise.resolve(false);
    return cifrarCon(clave, texto(JSON.stringify(obj)), nombre).then(function (caja) {
      return escribirCrudo('d:' + nombre, caja);
    }).then(function () { return true; }, function () { return false; });
  }
  function leer(nombre) {
    if (!clave) return Promise.resolve(null);
    return leerCrudo('d:' + nombre).then(function (caja) {
      if (!caja) return null;
      return descifrarCon(clave, caja, nombre).then(function (b) { return JSON.parse(new TextDecoder().decode(b)); });
    }).catch(function () { return null; });
  }

  // Documentos originales (bytes) para consultarlos sin conexion. El nombre
  // y el tipo tambien van cifrados (el nombre puede revelar el contenido).
  function guardarArchivo(id, bytes, meta) {
    if (!clave) return Promise.resolve(false);
    var m = { nombre: meta.nombre, tipo: meta.tipo, guardado: new Date().toISOString(), tam: bytes.length };
    return Promise.all([cifrarCon(clave, bytes, 'archivo:' + id), cifrarCon(clave, texto(JSON.stringify(m)), 'meta:' + id)]).then(function (r) {
      r[0].m = r[1];
      return escribirCrudo('a:' + id, r[0]);
    }).then(function () { return true; }, function () { return false; });
  }
  function leerArchivo(id) {
    if (!clave) return Promise.resolve(null);
    return leerCrudo('a:' + id).then(function (caja) {
      if (!caja || !caja.m) return null;
      return Promise.all([descifrarCon(clave, caja, 'archivo:' + id), descifrarCon(clave, caja.m, 'meta:' + id)]).then(function (r) {
        var m = JSON.parse(new TextDecoder().decode(r[1]));
        return { bytes: r[0], nombre: m.nombre, tipo: m.tipo };
      });
    }).catch(function () { return null; });
  }

  // Fotos de lugares (copia cifrada para verlas sin conexion).
  function guardarFoto(id, bytes, tipo) {
    if (!clave) return Promise.resolve(false);
    return Promise.all([cifrarCon(clave, bytes, 'foto:' + id), cifrarCon(clave, texto(tipo), 'fotometa:' + id)]).then(function (r) {
      r[0].m = r[1];
      return escribirCrudo('f:' + id, r[0]);
    }).then(function () { return true; }, function () { return false; });
  }
  function leerFoto(id) {
    if (!clave) return Promise.resolve(null);
    return leerCrudo('f:' + id).then(function (caja) {
      if (!caja || !caja.m) return null;
      return Promise.all([descifrarCon(clave, caja, 'foto:' + id), descifrarCon(clave, caja.m, 'fotometa:' + id)]).then(function (r) {
        return { bytes: r[0], tipo: new TextDecoder().decode(r[1]) };
      });
    }).catch(function () { return null; });
  }

  function archivosGuardados() {
    return op('readonly', function (s) { return s.getAllKeys(); }).then(function (k) {
      return (k || []).filter(function (x) { return String(x).indexOf('a:') === 0; }).map(function (x) { return String(x).slice(2); });
    }).catch(function () { return []; });
  }
  function quitarArchivo(id) {
    return op('readwrite', function (s) { s.delete('a:' + id); }).then(function () { return true; }, function () { return false; });
  }

  // Solo por decision expresa de la titular (Ajustes). Informa si se completo.
  function borrarTodo() {
    clave = null;
    return op('readwrite', function (s) { s.clear(); }).then(function () { return true; }, function () { return false; });
  }

  return { disponible: disponible, hayCopia: hayCopia, abrir: abrir, abierta: abierta, cerrar: cerrar,
    guardar: guardar, leer: leer, guardarArchivo: guardarArchivo, leerArchivo: leerArchivo,
    archivosGuardados: archivosGuardados, quitarArchivo: quitarArchivo, borrarTodo: borrarTodo,
    guardarFoto: guardarFoto, leerFoto: leerFoto, copiasAnteriores: copiasAnteriores,
    leerCopiaAnterior: leerCopiaAnterior, descartarCopiaAnterior: descartarCopiaAnterior };
})();
