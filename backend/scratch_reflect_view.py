import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import MetaData, Table

async def run():
    engine = create_async_engine("postgresql+asyncpg://star_user:v1su@ls0ft@localhost:5432/starlink_db")
    meta = MetaData()
    async with engine.begin() as conn:
        await conn.run_sync(meta.reflect, only=['vw_dispositivo_estructura_actual'])
    
    table = meta.tables['vw_dispositivo_estructura_actual']
    print("t_vw_dispositivo_estructura_actual = Table(")
    print("    'vw_dispositivo_estructura_actual', Base.metadata,")
    for col in table.columns:
        print(f"    Column('{col.name}', {col.type}),")
    print(")")

asyncio.run(run())
