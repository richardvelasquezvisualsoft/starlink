from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, func, text
from typing import List, Optional
import datetime

from app.core.database import get_db
from app.api.deps import get_tenant_context
from app.api.endpoints.auth import get_current_user
from app.models import (
    Usuario,
    Dispositivo,
    Cuenta,
    LineaServicio,
    UnidadOrganizacional,
    CentroCosto,
    DispositivoAsignacionHistorial,
    UnidadCentroCostoHistorial,
    t_vw_dispositivo_estructura_actual
)
from app.schemas import (
    AsignacionListResponse,
    AsignacionItemResponse,
    AsignacionKPIs,
    AsignacionCreateRequest,
    DesasignarRequest,
    AsignacionHistorialItemResponse,
    OpcionesAsignacionResponse,
    OpcionUnidad,
    OpcionCentroCosto,
    UnidadJerarquia
)

router = APIRouter()


@router.get("", response_model=AsignacionListResponse)
def get_asignaciones(
    q: Optional[str] = None,
    estado: Optional[str] = Query("all", regex="^(all|asignados|sin_asignar)$"),
    unidad_id: Optional[int] = None,
    centro_costo_id: Optional[int] = None,
    db: Session = Depends(get_db),
    tenant_ctx: dict = Depends(get_tenant_context)
):
    tenant_id = tenant_ctx.get("tenant_id") or 1

    # Base query for all devices of the tenant
    devices_query = (
        db.query(
            Dispositivo,
            Cuenta,
            LineaServicio,
            t_vw_dispositivo_estructura_actual
        )
        .outerjoin(LineaServicio, LineaServicio.dispositivo_id == Dispositivo.id)
        .outerjoin(Cuenta, Cuenta.id == LineaServicio.cuenta_id)
        .outerjoin(
            t_vw_dispositivo_estructura_actual,
            t_vw_dispositivo_estructura_actual.c.dispositivo_id == Dispositivo.id
        )
    )

    if tenant_id:
        devices_query = devices_query.filter(
            or_(
                Cuenta.tenant_id == tenant_id,
                Dispositivo.cuenta_id.in_(
                    db.query(Cuenta.id).filter(Cuenta.tenant_id == tenant_id)
                )
            )
        )

    rows = devices_query.order_by(Dispositivo.device_id).all()

    # De-duplicate by device id if multiple lines attached
    devices_dict = {}
    for d, c, l, *vw_cols in rows:
        if d.id not in devices_dict:
            # Check active assignment directly from history table as fallback/verification
            active_asig = (
                db.query(DispositivoAsignacionHistorial)
                .filter(
                    DispositivoAsignacionHistorial.dispositivo_id == d.id,
                    DispositivoAsignacionHistorial.vigente_hasta.is_(None)
                )
                .order_by(DispositivoAsignacionHistorial.vigente_desde.desc())
                .first()
            )

            # Build unit hierarchy
            u_niv1 = None
            u_niv2 = None
            u_niv3 = None
            current_unit = None
            current_cc = None

            if active_asig:
                current_unit = active_asig.unidad_organizacional
                current_cc = active_asig.centro_costo

                # Resolve hierarchy chain
                chain = []
                curr = current_unit
                while curr:
                    chain.append(curr)
                    if curr.parent_id:
                        curr = db.query(UnidadOrganizacional).filter(UnidadOrganizacional.id == curr.parent_id).first()
                    else:
                        break
                
                # Chain has leaf first, then parents up to root
                for u in chain:
                    if u.numero_nivel == 1:
                        u_niv1 = UnidadJerarquia(id=u.id, codigo=u.codigo, nombre=u.nombre)
                    elif u.numero_nivel == 2:
                        u_niv2 = UnidadJerarquia(id=u.id, codigo=u.codigo, nombre=u.nombre)
                    elif u.numero_nivel == 3:
                        u_niv3 = UnidadJerarquia(id=u.id, codigo=u.codigo, nombre=u.nombre)

            asignado = active_asig is not None

            cuenta_obj = c or (db.query(Cuenta).filter(Cuenta.id == d.cuenta_id).first() if d.cuenta_id else None)

            item = AsignacionItemResponse(
                dispositivo_id=d.id,
                device_id=d.device_id,
                dispositivo_nombre=d.nombre,
                kit_starlink=d.kit_starlink,
                kit_serial_number=d.kit_serial_number,
                dish_serial_number=d.dish_serial_number,
                cuenta_id=cuenta_obj.id if cuenta_obj else None,
                numero_cuenta=cuenta_obj.numero_cuenta if cuenta_obj else None,
                cuenta_nombre=cuenta_obj.nombre if cuenta_obj else None,
                linea_servicio_id=l.id if l else None,
                numero_linea=l.numero_linea if l else None,
                linea_nombre=l.nombre if l else None,
                asignacion_id=active_asig.id if active_asig else None,
                unidad_organizacional_id=current_unit.id if current_unit else None,
                unidad_codigo=current_unit.codigo if current_unit else None,
                unidad_nombre=current_unit.nombre if current_unit else None,
                numero_nivel=current_unit.numero_nivel if current_unit else None,
                unidad_nivel1=u_niv1,
                unidad_nivel2=u_niv2,
                unidad_nivel3=u_niv3,
                centro_costo_id=current_cc.id if current_cc else None,
                centro_costo_codigo=current_cc.codigo if current_cc else None,
                centro_costo_nombre=current_cc.nombre if current_cc else None,
                vigente_desde=active_asig.vigente_desde if active_asig else None,
                asignacion_motivo=active_asig.motivo if active_asig else None,
                asignacion_origen=active_asig.origen if active_asig else None,
                asignado=asignado
            )
            devices_dict[d.id] = item

    all_items = list(devices_dict.values())

    # Calculate KPIs across all items before filtering
    total_equipos = len(all_items)
    equipos_asignados = sum(1 for it in all_items if it.asignado)
    equipos_sin_asignar = total_equipos - equipos_asignados
    cc_ids = set(it.centro_costo_id for it in all_items if it.centro_costo_id)
    unit_ids = set(it.unidad_organizacional_id for it in all_items if it.unidad_organizacional_id)

    kpis = AsignacionKPIs(
        total_equipos=total_equipos,
        equipos_asignados=equipos_asignados,
        equipos_sin_asignar=equipos_sin_asignar,
        total_centros_costo=len(cc_ids),
        total_unidades=len(unit_ids)
    )

    # Apply filters
    filtered_items = all_items

    if estado == "asignados":
        filtered_items = [it for it in filtered_items if it.asignado]
    elif estado == "sin_asignar":
        filtered_items = [it for it in filtered_items if not it.asignado]

    if unidad_id:
        filtered_items = [
            it for it in filtered_items
            if it.unidad_organizacional_id == unidad_id
            or (it.unidad_nivel1 and it.unidad_nivel1.id == unidad_id)
            or (it.unidad_nivel2 and it.unidad_nivel2.id == unidad_id)
            or (it.unidad_nivel3 and it.unidad_nivel3.id == unidad_id)
        ]

    if centro_costo_id:
        filtered_items = [it for it in filtered_items if it.centro_costo_id == centro_costo_id]

    if q:
        term = q.strip().lower()
        filtered_items = [
            it for it in filtered_items
            if (it.device_id and term in it.device_id.lower())
            or (it.dispositivo_nombre and term in it.dispositivo_nombre.lower())
            or (it.dish_serial_number and term in it.dish_serial_number.lower())
            or (it.kit_starlink and term in it.kit_starlink.lower())
            or (it.kit_serial_number and term in it.kit_serial_number.lower())
            or (it.numero_linea and term in it.numero_linea.lower())
            or (it.numero_cuenta and term in it.numero_cuenta.lower())
            or (it.unidad_nombre and term in it.unidad_nombre.lower())
            or (it.unidad_codigo and term in it.unidad_codigo.lower())
            or (it.centro_costo_nombre and term in it.centro_costo_nombre.lower())
            or (it.centro_costo_codigo and term in it.centro_costo_codigo.lower())
        ]

    return AsignacionListResponse(kpis=kpis, items=filtered_items)


@router.post("", status_code=status.HTTP_201_CREATED)
def crear_o_reasignar(
    data: AsignacionCreateRequest,
    db: Session = Depends(get_db),
    tenant_ctx: dict = Depends(get_tenant_context),
    current_user: Usuario = Depends(get_current_user)
):
    tenant_id = tenant_ctx.get("tenant_id") or 1

    # Validate device
    dispositivo = db.query(Dispositivo).filter(Dispositivo.id == data.dispositivo_id).first()
    if not dispositivo:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")

    # Validate unit
    unidad = db.query(UnidadOrganizacional).filter(
        UnidadOrganizacional.id == data.unidad_organizacional_id,
        UnidadOrganizacional.tenant_id == tenant_id
    ).first()
    if not unidad:
        raise HTTPException(status_code=400, detail="Unidad Organizacional no válida o no pertenece al cliente")

    # Validate cost center
    centro_costo = db.query(CentroCosto).filter(
        CentroCosto.id == data.centro_costo_id,
        CentroCosto.tenant_id == tenant_id
    ).first()
    if not centro_costo:
        raise HTTPException(status_code=400, detail="Centro de Costo no válido o no pertenece al cliente")

    now = datetime.datetime.utcnow()
    vigente_desde = data.vigente_desde or now

    # Close any existing active assignment for this device
    active_assignments = (
        db.query(DispositivoAsignacionHistorial)
        .filter(
            DispositivoAsignacionHistorial.dispositivo_id == data.dispositivo_id,
            DispositivoAsignacionHistorial.vigente_hasta.is_(None)
        )
        .all()
    )

    for old_asig in active_assignments:
        old_asig.vigente_hasta = now

    # Create new assignment
    new_asig = DispositivoAsignacionHistorial(
        tenant_id=tenant_id,
        dispositivo_id=data.dispositivo_id,
        unidad_organizacional_id=data.unidad_organizacional_id,
        centro_costo_id=data.centro_costo_id,
        vigente_desde=vigente_desde,
        vigente_hasta=None,
        motivo=data.motivo or "Asignación realizada desde el portal",
        origen="PORTAL_CLIENTE",
        registrado_por=current_user.id
    )

    db.add(new_asig)
    db.commit()
    db.refresh(new_asig)

    return {
        "status": "success",
        "message": f"Equipo {dispositivo.device_id} asignado exitosamente a {unidad.nombre} ({centro_costo.nombre})",
        "asignacion_id": new_asig.id
    }


@router.post("/desasignar")
def desasignar_equipo(
    data: DesasignarRequest,
    db: Session = Depends(get_db),
    tenant_ctx: dict = Depends(get_tenant_context),
    current_user: Usuario = Depends(get_current_user)
):
    active_assignment = (
        db.query(DispositivoAsignacionHistorial)
        .filter(
            DispositivoAsignacionHistorial.dispositivo_id == data.dispositivo_id,
            DispositivoAsignacionHistorial.vigente_hasta.is_(None)
        )
        .first()
    )

    if not active_assignment:
        raise HTTPException(status_code=400, detail="El equipo no cuenta con una asignación activa")

    now = datetime.datetime.utcnow()
    active_assignment.vigente_hasta = now
    if data.motivo:
        active_assignment.motivo = f"{active_assignment.motivo or ''} | Desasignado: {data.motivo}".strip(" | ")

    db.commit()

    return {
        "status": "success",
        "message": "Equipo desasignado exitosamente"
    }


@router.get("/historial/{dispositivo_id}", response_model=List[AsignacionHistorialItemResponse])
def get_historial_asignaciones(
    dispositivo_id: int,
    db: Session = Depends(get_db),
    tenant_ctx: dict = Depends(get_tenant_context)
):
    tenant_id = tenant_ctx.get("tenant_id") or 1

    historial = (
        db.query(
            DispositivoAsignacionHistorial,
            UnidadOrganizacional,
            CentroCosto,
            Usuario
        )
        .join(UnidadOrganizacional, UnidadOrganizacional.id == DispositivoAsignacionHistorial.unidad_organizacional_id)
        .join(CentroCosto, CentroCosto.id == DispositivoAsignacionHistorial.centro_costo_id)
        .outerjoin(Usuario, Usuario.id == DispositivoAsignacionHistorial.registrado_por)
        .filter(
            DispositivoAsignacionHistorial.dispositivo_id == dispositivo_id,
            DispositivoAsignacionHistorial.tenant_id == tenant_id
        )
        .order_by(DispositivoAsignacionHistorial.vigente_desde.desc())
        .all()
    )

    res = []
    for h, u, cc, usr in historial:
        res.append(
            AsignacionHistorialItemResponse(
                id=h.id,
                dispositivo_id=h.dispositivo_id,
                unidad_organizacional_id=u.id,
                unidad_codigo=u.codigo,
                unidad_nombre=u.nombre,
                numero_nivel=u.numero_nivel,
                centro_costo_id=cc.id,
                centro_costo_codigo=cc.codigo,
                centro_costo_nombre=cc.nombre,
                vigente_desde=h.vigente_desde,
                vigente_hasta=h.vigente_hasta,
                motivo=h.motivo,
                origen=h.origen,
                fecha_registro_bd=h.fecha_registro_bd,
                registrado_por_nombre=usr.nombre if usr else "Sistema"
            )
        )

    return res


@router.get("/opciones", response_model=OpcionesAsignacionResponse)
def get_opciones_asignacion(
    db: Session = Depends(get_db),
    tenant_ctx: dict = Depends(get_tenant_context)
):
    tenant_id = tenant_ctx.get("tenant_id") or 1

    # Active organizational units
    units = (
        db.query(UnidadOrganizacional)
        .filter(
            UnidadOrganizacional.tenant_id == tenant_id,
            UnidadOrganizacional.activo == True
        )
        .order_by(UnidadOrganizacional.numero_nivel, UnidadOrganizacional.nombre)
        .all()
    )

    # Active cost centers
    ccs = (
        db.query(CentroCosto)
        .filter(
            CentroCosto.tenant_id == tenant_id,
            CentroCosto.activo == True
        )
        .order_by(CentroCosto.nombre)
        .all()
    )

    # Find suggested cost centers for each unit from unidad_centro_costo_historial
    active_unit_ccs = (
        db.query(UnidadCentroCostoHistorial)
        .filter(
            UnidadCentroCostoHistorial.tenant_id == tenant_id,
            UnidadCentroCostoHistorial.vigente_hasta.is_(None)
        )
        .all()
    )
    unit_cc_map = {ucc.unidad_id: ucc.centro_costo_id for ucc in active_unit_ccs}

    opciones_unidades = [
        OpcionUnidad(
            id=u.id,
            codigo=u.codigo,
            nombre=u.nombre,
            numero_nivel=u.numero_nivel,
            parent_id=u.parent_id,
            centro_costo_sugerido_id=unit_cc_map.get(u.id)
        )
        for u in units
    ]

    opciones_ccs = [
        OpcionCentroCosto(
            id=c.id,
            codigo=c.codigo,
            nombre=c.nombre,
            moneda_referencia=c.moneda_referencia
        )
        for c in ccs
    ]

    return OpcionesAsignacionResponse(
        unidades=opciones_unidades,
        centros_costos=opciones_ccs
    )
