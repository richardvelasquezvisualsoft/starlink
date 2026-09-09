import requests

base = 'http://localhost:8050/api'

print("--- 1. Consumo Global Summary ---")
r1 = requests.get(base + '/billing/summary?year=2026&month=9').json()
print("  Summary Sept 2026:", r1)

print("--- 2. Cartera y Crecimiento ---")
r2 = requests.get(base + '/reseller/analytics/cartera').json()
print("  Series Sept 2026:", [s for s in r2['series']['clientes_por_mes'] if s['periodo'] == '202609'])

print("--- 3. Calidad Histórica ---")
r3 = requests.get(base + '/reseller/analytics/calidad').json()
print("  Resumen Calidad:", r3['resumen'])

print("--- 4. Evolución de Flota ---")
r4 = requests.get(base + '/reseller/analytics/flota').json()
print("  Matrix Count:", len(r4['matrix']))

print("--- 5. Costos por Cliente ---")
r5 = requests.get(base + '/reseller/analytics/costos').json()
print("  Resumen Costos:", r5['resumen'])

print("--- 6. Performance Aprov ---")
r6 = requests.get(base + '/reseller/analytics/performance').json()
print("  Resumen Performance:", r6['resumen'])

print("--- 7. Productos / Planes ---")
r7 = requests.get(base + '/reseller/analytics/productos').json()
print("  Productos Count:", r7['total_servicios'])

print("--- 8. Facturación Starlink ---")
r8 = requests.get(base + '/billing/validate-100-percent').json()
print("  Facturas Count:", len(r8))

print("--- 9. NOC Global Summary ---")
r9 = requests.get(base + '/reseller/noc/summary').json()
print("  NOC Summary:", r9)

print("--- 10. Alertas Globales Summary ---")
r10 = requests.get(base + '/reseller/alertas/resumen').json()
print("  Alertas Summary:", r10)
