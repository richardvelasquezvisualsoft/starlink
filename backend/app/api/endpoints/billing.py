from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.api.deps import get_tenant_context
from app.models import CostoServicioMes, Dispositivo, StarlinkFacturaReseller, StarlinkFacturaLinea, StarlinkFacturaDetalle

router = APIRouter()

@router.get("/summary")
def get_billing_summary(
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    tenant_ctx: dict = Depends(get_tenant_context)
):
    period_str = f"{year}{month:02d}"
    query = db.query(CostoServicioMes)
    
    if tenant_ctx.get("tenant_id"):
        from app.models import LineaServicio, Cuenta
        query = query.join(Dispositivo, CostoServicioMes.dispositivo_id == Dispositivo.id)\
                     .join(LineaServicio, LineaServicio.dispositivo_id == Dispositivo.id)\
                     .join(Cuenta, Cuenta.id == LineaServicio.cuenta_id)\
                     .filter(Cuenta.tenant_id == tenant_ctx.get("tenant_id"))
        
    query = query.filter(CostoServicioMes.periodo == period_str)
    records = query.all()

    # If costo_servicio_mes has rows for this period
    if records:
        total_mrc = sum([float(getattr(r, 'costo_starlink', 0) or 0) for r in records])
        total_excedentes = 0.0
        total_gb = sum([float(getattr(r, 'consumo_total_gb', 0) or 0) for r in records])
        lineas_cnt = len(records)
    else:
        # Fallback to sum from consumo_diario for the month
        from sqlalchemy import text
        start_date = f"{year}-{month:02d}-01"
        if month == 12:
            end_date = f"{year+1}-01-01"
        else:
            end_date = f"{year}-{month+1:02d}-01"

        tenant_id = tenant_ctx.get("tenant_id")
        if tenant_id:
            raw_res = db.execute(text("""
                SELECT 
                    COALESCE(SUM(cd.priority_gb + cd.standard_gb), 0) AS total_gb,
                    COUNT(DISTINCT cd.linea_servicio_id) AS lineas_cnt
                FROM consumo_diario cd
                JOIN lineas_servicio ls ON ls.id = cd.linea_servicio_id
                JOIN cuentas c ON c.id = ls.cuenta_id
                WHERE cd.fecha_utc >= :start_date AND cd.fecha_utc < :end_date
                AND c.tenant_id = :t_id
            """), {"start_date": start_date, "end_date": end_date, "t_id": tenant_id}).fetchone()
        else:
            raw_res = db.execute(text("""
                SELECT 
                    COALESCE(SUM(priority_gb + standard_gb), 0) AS total_gb,
                    COUNT(DISTINCT linea_servicio_id) AS lineas_cnt
                FROM consumo_diario
                WHERE fecha_utc >= :start_date AND fecha_utc < :end_date
            """), {"start_date": start_date, "end_date": end_date}).fetchone()

        total_gb = float(raw_res[0]) if raw_res and raw_res[0] is not None else 0.0
        lineas_cnt = int(raw_res[1]) if raw_res and raw_res[1] is not None else 0
        total_mrc = lineas_cnt * 250.0  # Referencial
        total_excedentes = 0.0
    
    return {
        "periodo": period_str,
        "total_mrc_usd": round(total_mrc, 2),
        "total_excedente_usd": round(total_excedentes, 2),
        "total_facturado_usd": round(total_mrc + total_excedentes, 2),
        "total_consumido_gb": round(total_gb, 2),
        "lineas_cobradas": lineas_cnt
    }

@router.get("/details")
def get_billing_details(
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    tenant_ctx: dict = Depends(get_tenant_context)
):
    period_str = f"{year}{month:02d}"
    
    query = db.query(CostoServicioMes, Dispositivo.device_id, Dispositivo.nombre)\
        .join(Dispositivo, CostoServicioMes.dispositivo_id == Dispositivo.id)\
        .filter(CostoServicioMes.periodo == period_str)
        
    if tenant_ctx.get("tenant_id"):
        from app.models import LineaServicio, Cuenta
        query = query.join(LineaServicio, LineaServicio.dispositivo_id == Dispositivo.id)\
                     .join(Cuenta, Cuenta.id == LineaServicio.cuenta_id)\
                     .filter(Cuenta.tenant_id == tenant_ctx.get("tenant_id"))
        
    results = query.all()
    
    if not results:
        # Fallback to query from lineas_servicio & consumo_diario
        from sqlalchemy import text
        start_date = f"{year}-{month:02d}-01"
        if month == 12:
            end_date = f"{year+1}-01-01"
        else:
            end_date = f"{year}-{month+1:02d}-01"

        tenant_id = tenant_ctx.get("tenant_id")
        if tenant_id:
            raw_rows = db.execute(text("""
                SELECT 
                    d.id AS dispositivo_id,
                    d.device_id,
                    d.nombre,
                    COALESCE(ls.plan_contratado, 'Priority 1TB') AS plan,
                    COALESCE(SUM(cd.priority_gb + cd.standard_gb), 0) AS consumido_gb
                FROM lineas_servicio ls
                JOIN cuentas c ON c.id = ls.cuenta_id
                JOIN dispositivos d ON d.id = ls.dispositivo_id
                LEFT JOIN consumo_diario cd ON cd.linea_servicio_id = ls.id AND cd.fecha_utc >= :start_date AND cd.fecha_utc < :end_date
                WHERE c.tenant_id = :t_id
                GROUP BY d.id, d.device_id, d.nombre, ls.plan_contratado
            """), {"start_date": start_date, "end_date": end_date, "t_id": tenant_id}).fetchall()
        else:
            raw_rows = db.execute(text("""
                SELECT 
                    d.id AS dispositivo_id,
                    d.device_id,
                    d.nombre,
                    COALESCE(ls.plan_contratado, 'Priority 1TB') AS plan,
                    COALESCE(SUM(cd.priority_gb + cd.standard_gb), 0) AS consumido_gb
                FROM lineas_servicio ls
                JOIN dispositivos d ON d.id = ls.dispositivo_id
                LEFT JOIN consumo_diario cd ON cd.linea_servicio_id = ls.id AND cd.fecha_utc >= :start_date AND cd.fecha_utc < :end_date
                GROUP BY d.id, d.device_id, d.nombre, ls.plan_contratado
            """), {"start_date": start_date, "end_date": end_date}).fetchall()

        return [
            {
                "dispositivo_id": r._mapping["dispositivo_id"],
                "device_id": r._mapping["device_id"],
                "nombre": r._mapping["nombre"],
                "plan": r._mapping["plan"],
                "mrc_usd": 250.0,
                "excedente_usd": 0.0,
                "total_usd": 250.0,
                "consumido_gb": float(r._mapping["consumido_gb"] or 0)
            }
            for r in raw_rows
        ]

    return [
        {
            "dispositivo_id": r.CostoServicioMes.dispositivo_id,
            "device_id": r.device_id,
            "nombre": r.nombre,
            "plan": "Priority 1TB",
            "mrc_usd": float(getattr(r.CostoServicioMes, 'costo_starlink', 0) or 0),
            "excedente_usd": 0.0,
            "total_usd": float(getattr(r.CostoServicioMes, 'costo_starlink', 0) or 0),
            "consumido_gb": float(getattr(r.CostoServicioMes, 'consumo_total_gb', 0) or 0)
        }
        for r in results
    ]

@router.get("/validate-100-percent")
def validate_100_percent(
    db: Session = Depends(get_db),
    tenant_ctx: dict = Depends(get_tenant_context)
):
    if tenant_ctx.get("rol") != "RESELLER":
        # Only reseller can validate 100%
        return []
    
    # Obtener todas las facturas del reseller
    facturas = db.query(StarlinkFacturaReseller).order_by(StarlinkFacturaReseller.fecha_factura.desc()).all()
    
    resultado = []
    for f in facturas:
        # Sumar los montos asignados de todas las líneas de esta factura
        suma_asignada = db.query(func.sum(StarlinkFacturaLinea.monto_asignado))\
            .join(StarlinkFacturaDetalle, StarlinkFacturaLinea.factura_detalle_id == StarlinkFacturaDetalle.id)\
            .filter(StarlinkFacturaDetalle.factura_id == f.id).scalar()
            
        suma_asignada = float(suma_asignada) if suma_asignada else 0.0
        monto_total = float(f.monto_total)
        diferencia = round(monto_total - suma_asignada, 2)
        
        resultado.append({
            "factura_id": f.id,
            "invoice_id_externo": f.invoice_id_externo,
            "fecha": f.fecha_factura.strftime("%Y-%m-%d"),
            "monto_total_facturado": monto_total,
            "monto_total_asignado": round(suma_asignada, 2),
            "diferencia": diferencia,
            "valido_100_porciento": diferencia == 0,
            "estado": f.estado_factura
        })
        
    return resultado
