/**
 * Mis Viajes - acceso.js v2
 * Acceso copiado de Mi Vida Organizada (app.js v1, a su vez de Mis Gastos y
 * Archivo de Comprobantes v3): identidad de Google (una vez por dispositivo),
 * llave del dispositivo (30 dias) y PIN de 7 digitos cada vez que se abre.
 *
 * Añadidos de Mis Viajes:
 *   - Sin internet: el mismo PIN abre la copia cifrada del dispositivo
 *     (almacen.js). Al volver la conexion se reabre la sesion y se
 *     sincroniza sin volver a pedir el PIN.
 *   - Bloqueo por inactividad con la aplicacion abierta (ademas del bloqueo
 *     tras unos minutos en segundo plano).
 *   - Recibe enlaces enviados con «Compartir» desde otras aplicaciones.
 * v2: cambiar de cuenta ya no borra la copia del dispositivo (sigue cifrada
 *     y solo se abre con el PIN). El PIN se conserva en memoria mientras la
 *     aplicacion esta desbloqueada, solo para reabrir la sesion al volver la
 *     conexion; se olvida al bloquear.
 */
(function () {
  'use strict';

  var CFG = window.CONFIG_MV || {};
  var VISTAS_ACCESO = ['vistaInicio', 'vistaGoogle', 'vistaPin'];
  var LARGO_PIN = 7;
  // Prefijo propio: el almacenamiento es comun a las aplicaciones del mismo origen.
  var CLAVE_LLAVE = 'mv_llave_dispositivo';
  var CLAVE_FALLOS = 'mv_fallos_sin_conexion';
  var MAX_FALLOS_LOCAL = 5, ESPERA_LOCAL_MIN = 15;

  var est = {
    idToken: null, vence: 0, sesion: null, pinCreado: true, pin: '', pinPrimero: null,
    enviandoPin: false, esperaToken: null, ocultoDesde: 0, googleIniciado: false, llave: null,
    dentro: false, sinConexion: false, pinMemoria: null, ultimaActividad: Date.now(), reconectando: null
  };

  /* ====================== UTILIDADES ====================== */

  function $(id) { return document.getElementById(id); }
  function el(tag, clase, texto) {
    var e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }
  function todasLasVistas() {
    return Array.prototype.map.call(document.querySelectorAll('main > section'), function (s) { return s.id; });
  }
  function mostrar(vista) {
    todasLasVistas().forEach(function (v) { $(v).classList.toggle('oculto', v !== vista); });
    $('navegacion').classList.toggle('oculto', VISTAS_ACCESO.indexOf(vista) !== -1);
    window.scrollTo(0, 0);
  }
  function vistaActual() {
    var v = todasLasVistas();
    for (var i = 0; i < v.length; i++) if (!$(v[i]).classList.contains('oculto')) return v[i];
    return null;
  }
  function esperando(si) { $('cargando').classList.toggle('oculto', !si); }
  function nombreDispositivo() {
    var ua = navigator.userAgent || '';
    if (/Tablet|SM-X|SM-T|iPad/i.test(ua)) return 'Tableta';
    if (/Android|iPhone|Mobile/i.test(ua)) return 'Teléfono';
    return 'Computadora';
  }

  /* ====================== LLAVE DEL DISPOSITIVO ====================== */

  function leerLlave() {
    try { var v = localStorage.getItem(CLAVE_LLAVE); return /^[a-f0-9]{64}$/.test(v || '') ? v : null; }
    catch (e) { return null; }
  }
  function guardarLlave(v) { est.llave = v; try { localStorage.setItem(CLAVE_LLAVE, v); } catch (e) { /* nada */ } }
  function olvidarLlave() { est.llave = null; try { localStorage.removeItem(CLAVE_LLAVE); } catch (e) { /* nada */ } }

  /* ====================== SERVICIO ====================== */

  function configurada() {
    return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(CFG.API_URL || '') &&
        /\.apps\.googleusercontent\.com$/.test(CFG.ID_CLIENTE || '');
  }

  function llamar(accion, datos) {
    var cuerpo = Object.assign({ accion: accion, idToken: est.idToken, sesion: est.sesion,
      disp: nombreDispositivo() }, datos || {});
    return fetch(CFG.API_URL, {
      method: 'POST', body: JSON.stringify(cuerpo),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita la consulta previa
      credentials: 'omit', cache: 'no-store', redirect: 'follow', referrerPolicy: 'no-referrer'
    }).then(function (r) {
      if (!r.ok) return { ok: false, error: 'red' };
      return r.json().catch(function () { return { ok: false, error: 'red' }; });
    }, function () { return { ok: false, error: 'red' }; });
  }

  // Llamada de las pantallas. Sin sesion (modo sin conexion) intenta antes
  // reabrirla con la llave y el PIN que estan en memoria.
  function api(accion, datos) {
    var previo = est.sesion ? Promise.resolve(true) : reconectar();
    return previo.then(function (hay) {
      if (!hay) return { ok: false, error: 'red' };
      return llamar(accion, datos);
    }).then(function (r) {
      if (!r.ok && r.error === 'sesion' && est.pinMemoria && est.llave) {
        est.sesion = null;
        return reconectar().then(function (hay) { return hay ? llamar(accion, datos) : r; });
      }
      return r;
    });
  }

  function reconectar() {
    if (est.sesion) return Promise.resolve(true);
    if (!est.dentro || !est.pinMemoria || !est.llave) return Promise.resolve(false);
    if (est.reconectando) return est.reconectando;
    est.reconectando = llamar('entrarDispositivo', { pin: est.pinMemoria, llave: est.llave }).then(function (r) {
      est.reconectando = null;
      if (r.ok && r.sesion) {
        est.sesion = r.sesion;
        if (est.sinConexion) { est.sinConexion = false; window.MV.alCambiarConexion(true); }
        return true;
      }
      if (r.error === 'llave' || r.error === 'pin' || r.error === 'bloqueado') {
        // La llave fue anulada o el PIN cambio: hay que entrar de nuevo.
        bloquear(false, 'Por seguridad, vuelva a ingresar su PIN.');
      }
      return false;
    });
    return est.reconectando;
  }

  var MENSAJES = {
    red: 'No hay conexión con el servicio. Revise su internet e intente de nuevo.',
    config: 'El servicio aún no está configurado.',
    datos: 'Revise los datos: falta información o no es válida.',
    fecha: 'Revise la fecha.', hora: 'Revise la hora.',
    fechasInvertidas: 'La fecha final es anterior a la inicial.',
    enlace: 'El enlace no es válido (debe empezar por https://).',
    ocupado: 'El servicio está ocupado. Intente de nuevo en unos segundos.',
    noExiste: 'Ese elemento ya no existe (quizá se eliminó en otro dispositivo).',
    conflicto: 'Se modificó en otro dispositivo. No se sobrescribió nada.',
    sinViaje: 'El viaje ya no existe.', sinLugar: 'El lugar ya no existe.',
    foto: 'La fotografía no es válida (JPG, PNG o WebP de hasta 3 MB).',
    recuperado: 'Cambio recuperado de una copia anterior de este dispositivo.',
    yaIncorporado: 'Este documento ya se incorporó a un viaje.',
    muyGrande: 'El archivo es demasiado grande para guardarlo sin conexión (máximo 6 MB). Ábralo en Drive.',
    importe: 'Revise el importe: escriba una cantidad mayor que cero (por ejemplo 1250.50).',
    enUso: 'Esa fotografía pertenece a un gasto guardado.',
    interno: 'Error del servicio.'
  };

  function mensaje(r) {
    return (MENSAJES[r.error] || 'No se pudo completar la operación.') + (r.error === 'interno' && r.mensaje ? ' ' + r.mensaje : '');
  }

  function manejarError(r, salida) {
    if (r.error === 'sesion') { bloquear(true, 'Su sesión terminó. Ingrese su PIN.'); return true; }
    if (r.error === 'identidad') {
      est.idToken = null; est.sesion = null;
      pantallaGoogle('Vuelva a iniciar sesión con su cuenta de Google.');
      return true;
    }
    if (salida) salida(mensaje(r));
    return false;
  }

  /* ====================== IDENTIDAD DE GOOGLE ====================== */

  function leerJwt(token) {
    try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); }
    catch (e) { return {}; }
  }
  function iniciarGoogle() {
    if (est.googleIniciado || !window.google || !google.accounts) return;
    est.googleIniciado = true;
    google.accounts.id.initialize({
      client_id: CFG.ID_CLIENTE, callback: recibirCredencial, auto_select: true,
      cancel_on_tap_outside: false, use_fedcm_for_prompt: true, itp_support: true, context: 'signin'
    });
    google.accounts.id.renderButton($('botonGoogle'), {
      theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', locale: 'es', width: 260
    });
    google.accounts.id.prompt();
    setTimeout(function () { if (!est.idToken && vistaActual() === 'vistaInicio') pantallaGoogle(); }, 2500);
  }
  function iniciarFlujoGoogle(msj) {
    est.sesion = null;
    if (est.googleIniciado) {
      pantallaGoogle(msj);
      try { google.accounts.id.prompt(); } catch (e) { /* nada */ }
      return;
    }
    $('inicioMensaje').textContent = 'Verificando su cuenta...';
    mostrar('vistaInicio');
    if (msj) setTimeout(function () { if (!est.idToken && vistaActual() !== 'vistaPin') pantallaGoogle(msj); }, 2600);
    if (window.google && google.accounts) iniciarGoogle(); else window.onGoogleLibraryLoad = iniciarGoogle;
    setTimeout(function () {
      if (!est.googleIniciado) {
        $('inicioMensaje').textContent = 'No se pudo conectar con Google. Revise su internet y vuelva a abrir la aplicación.';
      }
    }, 12000);
  }
  function pantallaGoogle(msj) {
    var aviso = $('googleMensaje');
    aviso.textContent = msj || '';
    aviso.classList.toggle('oculto', !msj);
    mostrar('vistaGoogle');
  }
  function recibirCredencial(resp) {
    var token = resp && resp.credential;
    if (!token) return;
    est.idToken = token;
    est.vence = Number(leerJwt(token).exp || 0) * 1000;
    if (est.esperaToken) { var listo = est.esperaToken; est.esperaToken = null; listo(true); return; }
    consultarEstado();
  }
  function consultarEstado() {
    $('inicioMensaje').textContent = 'Verificando su cuenta...';
    mostrar('vistaInicio');
    llamar('estado').then(function (r) {
      if (r.ok) { est.pinCreado = !!r.pinCreado; abrirPin(); return; }
      if (r.error === 'identidad') {
        est.idToken = null;
        try { google.accounts.id.disableAutoSelect(); } catch (e) { /* nada */ }
        pantallaGoogle('Esta cuenta de Google no tiene acceso. Elija la cuenta propietaria.');
        return;
      }
      manejarError(r, function (t) { pantallaGoogle(t); });
    });
  }

  /* ====================== PIN ====================== */

  function construirTeclado() {
    for (var i = 0; i < LARGO_PIN; i++) $('puntos').appendChild(el('span'));
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'Borrar'].forEach(function (t) {
      var b = el('button', t === '' ? 'vacio' : (t === 'Borrar' ? 'borrar' : ''), t);
      b.type = 'button';
      b.addEventListener('click', function () { if (t === 'Borrar') borrarDigito(); else if (t) agregarDigito(t); });
      $('teclado').appendChild(b);
    });
    document.addEventListener('keydown', function (ev) {
      if (vistaActual() !== 'vistaPin') return;
      if (/^\d$/.test(ev.key)) agregarDigito(ev.key);
      else if (ev.key === 'Backspace') borrarDigito();
    });
    $('btnOtraCuenta').addEventListener('click', function () {
      est.idToken = null; est.sesion = null; olvidarLlave();
      // La copia del dispositivo NO se borra: sigue cifrada con el PIN.
      try { google.accounts.id.disableAutoSelect(); } catch (e) { /* nada */ }
      iniciarFlujoGoogle();
    });
  }
  function pintarPuntos() {
    var s = $('puntos').children;
    for (var i = 0; i < s.length; i++) s[i].classList.toggle('lleno', i < est.pin.length);
  }
  function textosPin() {
    if (est.pinCreado) { $('pinTitulo').textContent = 'Ingrese su PIN'; $('pinTexto').textContent = 'Clave de acceso de 7 dígitos.'; }
    else if (est.pinPrimero === null) {
      $('pinTitulo').textContent = 'Cree su PIN';
      $('pinTexto').textContent = 'Elija una clave de 7 dígitos. Se pedirá cada vez que abra la aplicación.';
    } else { $('pinTitulo').textContent = 'Repita su PIN'; $('pinTexto').textContent = 'Escriba la misma clave para confirmarla.'; }
  }
  function abrirPin(msj) {
    est.pin = ''; est.pinPrimero = null; est.enviandoPin = false;
    textosPin(); pintarPuntos();
    $('pinMensaje').textContent = msj || '';
    mostrar('vistaPin');
  }
  function errorPin(texto) {
    var p = $('puntos');
    p.classList.remove('error'); void p.offsetWidth; p.classList.add('error');
    $('pinMensaje').textContent = texto;
    est.pin = ''; pintarPuntos();
  }
  function agregarDigito(d) {
    if (est.enviandoPin || est.pin.length >= LARGO_PIN) return;
    est.pin += d; $('pinMensaje').textContent = ''; pintarPuntos();
    if (est.pin.length === LARGO_PIN) setTimeout(completarPin, 120);
  }
  function borrarDigito() { if (est.enviandoPin) return; est.pin = est.pin.slice(0, -1); pintarPuntos(); }
  function pinDebil(pin) {
    return /^(\d)\1+$/.test(pin) || '01234567890'.indexOf(pin) !== -1 || '09876543210'.indexOf(pin) !== -1;
  }
  function completarPin() {
    var pin = est.pin;
    if (!est.pinCreado) {
      if (est.pinPrimero === null) {
        if (pinDebil(pin)) { errorPin('Ese PIN es demasiado fácil de adivinar. Elija otro.'); return; }
        est.pinPrimero = pin; est.pin = ''; textosPin(); pintarPuntos(); return;
      }
      if (pin !== est.pinPrimero) { est.pinPrimero = null; textosPin(); errorPin('Los PIN no coinciden. Empiece de nuevo.'); return; }
      enviarPin('crearPin', pin);
      return;
    }
    enviarPin('entrar', pin);
  }

  function enviarPin(accion, pin) {
    est.enviandoPin = true;
    $('pinMensaje').textContent = 'Verificando...';
    var conLlave = accion === 'entrar' && est.llave && !est.idToken;
    var peticion = conLlave ? llamar('entrarDispositivo', { pin: pin, llave: est.llave })
                            : llamar(accion, { pin: pin, recordar: true });
    peticion.then(function (r) {
      if (r.ok && r.sesion) {
        if (r.llave) guardarLlave(r.llave);
        est.sesion = r.sesion; est.pinCreado = true; est.pinPrimero = null;
        guardarFallosLocales(0);
        return Almacen.abrir(pin, true).then(function () { entrar(pin, false); });
      }
      est.enviandoPin = false; est.pin = '';
      if (r.error === 'red' && accion === 'entrar') return entrarSinConexion(pin);
      if (r.error === 'pin') errorPin('PIN incorrecto. ' + (r.restantes === 1 ? 'Le queda 1 intento.' : 'Le quedan ' + r.restantes + ' intentos.'));
      else if (r.error === 'bloqueado') errorPin('Demasiados intentos. Espere ' + r.minutos + (r.minutos === 1 ? ' minuto.' : ' minutos.'));
      else if (r.error === 'sinPin') { est.pinCreado = false; abrirPin('Todavía no hay un PIN. Cree uno.'); }
      else if (r.error === 'pinExiste') { est.pinCreado = true; abrirPin('Ya existe un PIN. Ingréselo.'); }
      else if (r.error === 'formatoPin') errorPin('El PIN debe tener 7 dígitos.');
      else if (r.error === 'llave') { olvidarLlave(); iniciarFlujoGoogle('Por seguridad, vuelva a iniciar sesión con Google.'); }
      else manejarError(r, errorPin);
    });
  }

  /* ====================== SIN CONEXION ====================== */

  function leerFallosLocales() {
    try { return JSON.parse(localStorage.getItem(CLAVE_FALLOS) || '{"n":0,"hasta":0}'); } catch (e) { return { n: 0, hasta: 0 }; }
  }
  function guardarFallosLocales(n, hasta) {
    try { localStorage.setItem(CLAVE_FALLOS, JSON.stringify({ n: n, hasta: hasta || 0 })); } catch (e) { /* nada */ }
  }

  function entrarSinConexion(pin) {
    var f = leerFallosLocales();
    if (f.hasta > Date.now()) {
      errorPin('Demasiados intentos. Espere ' + Math.ceil((f.hasta - Date.now()) / 60000) + ' minutos.');
      return;
    }
    est.enviandoPin = true;
    $('pinMensaje').textContent = 'Sin internet. Abriendo la copia del dispositivo...';
    Almacen.abrir(pin, false).then(function (r) {
      est.enviandoPin = false;
      if (r === 'abierta') { guardarFallosLocales(0); entrar(pin, true); return; }
      if (r === 'pin') {
        var n = f.n + 1;
        if (n >= MAX_FALLOS_LOCAL) { guardarFallosLocales(0, Date.now() + ESPERA_LOCAL_MIN * 60000); errorPin('Demasiados intentos. Espere ' + ESPERA_LOCAL_MIN + ' minutos.'); }
        else { guardarFallosLocales(n); errorPin('PIN incorrecto. ' + (MAX_FALLOS_LOCAL - n === 1 ? 'Le queda 1 intento.' : 'Le quedan ' + (MAX_FALLOS_LOCAL - n) + ' intentos.')); }
        return;
      }
      errorPin('No hay internet y este dispositivo aún no tiene una copia para consultar sin conexión.');
    });
  }

  /* ====================== ENTRAR Y BLOQUEAR ====================== */

  function entrar(pin, sinConexion) {
    est.enviandoPin = false; est.pin = ''; pintarPuntos();
    $('pinMensaje').textContent = '';
    est.dentro = true; est.sinConexion = sinConexion; est.pinMemoria = pin;
    est.ultimaActividad = Date.now();
    mostrar('vistaApp');
    window.MV.alEntrar(sinConexion);
  }

  // Cierra la sesion, olvida la clave y el PIN de la memoria y vuelve al PIN.
  function bloquear(volverDespues, msj) {
    if (est.sesion) llamar('salir');
    est.sesion = null; est.dentro = false; est.pinMemoria = null; est.sinConexion = false;
    Almacen.cerrar();
    window.MV.alBloquear(volverDespues);
    abrirPin(msj);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { est.ocultoDesde = Date.now(); return; }
    var limite = (Number(CFG.MINUTOS_BLOQUEO) || 5) * 60000;
    if (est.dentro && est.ocultoDesde && Date.now() - est.ocultoDesde > limite) bloquear(true);
    else if (est.dentro) { est.ultimaActividad = Date.now(); window.MV.sincronizar(); }
  });
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function (t) {
    document.addEventListener(t, function () { est.ultimaActividad = Date.now(); }, { passive: true, capture: true });
  });
  setInterval(function () {
    var limite = (Number(CFG.MINUTOS_INACTIVIDAD) || 10) * 60000;
    if (est.dentro && document.visibilityState === 'visible' && Date.now() - est.ultimaActividad > limite) bloquear(true);
  }, 20000);
  window.addEventListener('online', function () { if (est.dentro) window.MV.sincronizar(); });

  /* ====================== PUENTE CON LAS PANTALLAS ====================== */

  window.MV = Object.assign(window.MV || {}, {
    $: $, el: el, mostrar: mostrar, esperando: esperando, api: api, mensaje: mensaje,
    manejarError: manejarError, bloquear: bloquear,
    hayConexion: function () { return !!est.sesion; },
    reconectar: reconectar
  });

  /* ====================== ARRANQUE ====================== */

  // Enlace recibido con «Compartir»: se guarda hasta que la titular entre.
  (function () {
    var q = new URLSearchParams(location.search);
    var c = { titulo: q.get('titulo') || '', texto: q.get('texto') || '', enlace: q.get('enlace') || '' };
    if (c.titulo || c.texto || c.enlace) {
      try { sessionStorage.setItem('mv_compartido', JSON.stringify(c)); } catch (e) { /* nada */ }
      history.replaceState(null, '', location.pathname);
    }
  })();

  construirTeclado();
  if ('serviceWorker' in navigator && !window.MV_PRUEBA) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* opcional */ });
  }
  // Modo de prueba local (solo con el servicio simulado de las pruebas).
  if (window.MV_PRUEBA) { window.MV_PRUEBA(est, { abrirPin: abrirPin, guardarLlave: guardarLlave, llamar: llamar }); CFG = window.CONFIG_MV; return; }

  est.llave = leerLlave();
  if (!configurada()) {
    $('inicioMensaje').textContent = 'La aplicación aún no está configurada (falta la dirección del servicio).';
    return;
  }
  if (est.llave) { est.pinCreado = true; abrirPin(); } else iniciarFlujoGoogle();
})();
