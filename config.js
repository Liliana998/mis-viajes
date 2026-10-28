// Mis Viajes - configuracion publica de la aplicacion.
// Estos datos NO son secretos: sin la identidad de Google de la propietaria,
// la llave del dispositivo y el PIN, el servicio no entrega ningun dato.
window.CONFIG_MV = {
  // Direccion del servicio de Apps Script (termina en /exec).
  // Completada en el despliegue supervisado (28 oct 2026).
  API_URL: 'https://script.google.com/macros/s/AKfycbzWOz-0SGKSuadBvy6PEj7bRCe1_tHibdLdyNR18rK6SjgO_CyVAQBS6M9wV21y2W3j4Q/exec',
  // Mismo ID de cliente que las demas aplicaciones (origen liliana998.github.io).
  ID_CLIENTE: '575889810613-87gle57sd5l8rp6je69cc66slnkp5ch6.apps.googleusercontent.com',
  // Minutos en segundo plano tras los cuales se vuelve a pedir el PIN.
  MINUTOS_BLOQUEO: 5,
  // Minutos sin tocar la aplicacion (abierta) tras los cuales se bloquea.
  MINUTOS_INACTIVIDAD: 10
};
