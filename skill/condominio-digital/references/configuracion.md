# condominio.json — la ficha del condominio

Se llena en la fase de diagnóstico y guía todo lo demás. Guárdala en la raíz del repositorio.

```json
{
  "nombre": "Las Misiones Residencial",
  "clave": "misiones",
  "ciudad": "Querétaro",
  "unidades": 16,
  "nombresUnidades": "Depto 1 … Depto 16",
  "cuota": 1500,
  "administra": "mesa directiva",          // o "empresa externa (nombre)"
  "captura": "hoja de Google",             // excel | hoja de Google | libreta | plataforma
  "aguaAparte": "medidor individual",      // no | medidor individual | derrama | pipas
  "finanzasConClave": false,
  "colores": { "accent": "#1d3f63", "serie1": "#1d3f63", "serie2": "#c08a3e" },
  "modulos": ["finanzas", "reporte-mensual", "infografias", "agua", "pagos", "reglamento", "asamblea"],
  "publicacion": "github-pages",            // o cloudflare
  "desde": "2026-10",                       // primer mes que lee el script en vivo
  "correoCopia": "mesa@ejemplo.com"
}
```

Decisiones que la ficha obliga a tomar:
- **¿Finanzas con clave?** Si el sitio es abierto, extrema la regla de agregados. La clave es SHA-256 en el
  navegador: evita curiosos, no protege datos.
- **¿Desde qué mes en vivo?** Si hubo otra administración, lo anterior suele llegar en tablas sueltas: va a
  una copia fija (opcional, `js/data.js` en sitios hechos a mano) y su morosidad como "foto" fechada; la morosidad en vivo cuenta desde `desde`.
- **Sexto indicador:** con agua aparte, "cuánto del agua se cubrió"; sin agua aparte, "cuántos días aguanta la caja".
