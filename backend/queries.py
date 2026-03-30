OVERVIEW_SQL = """
with painel as (
    select *
    from mart.vw_painel_current
    where (%s::text is null or company_code = %s::text)
),
assembly as (
    select coalesce(sum(m.net_required), 0) as total
    from mart.vw_mrp_assembly m
    join core.product p on p.product_id = m.product_id
    where (%s::text is null or p.company_code = %s::text)
),
production as (
    select coalesce(sum(m.net_required), 0) as total
    from mart.vw_mrp_production m
    join core.product p on p.product_id = m.product_id
    where (%s::text is null or p.company_code = %s::text)
),
purchase as (
    select coalesce(sum(m.net_required), 0) as total
    from mart.vw_mrp_purchase m
    join core.product p on p.product_id = m.product_id
    where (%s::text is null or p.company_code = %s::text)
),
costs as (
    select coalesce(sum(m.estimated_total_cost), 0) as total
    from mart.vw_mrp_cost_last_run m
    join core.product p on p.product_id = m.product_id
    where (%s::text is null or p.company_code = %s::text)
),
romaneios_eta as (
    select count(*) as sem_previsao
    from mart.vw_romaneio_eta_current r
    where (%s::text is null or r.empresa = %s::text)
      and r.previsao_saida_status = 'sem_previsao'
),
snapshots as (
    select max(snapshot_at) as snapshot_at
    from (
        select max(snapshot_at) as snapshot_at from core.inventory_snapshot
        union all
        select max(snapshot_at) as snapshot_at from core.romaneio_demand_snapshot
        union all
        select max(snapshot_at) as snapshot_at from mart.mrp_run where status = 'completed'
    ) snapshot_candidates
)
select
    snapshots.snapshot_at,
    coalesce((select sum(estoque_atual) from painel), 0) as estoque_atual,
    coalesce((select sum(necessidade_romaneios) from painel), 0) as necessidade_romaneios,
    assembly.total as necessidade_montagem,
    production.total as necessidade_producao,
    purchase.total as necessidade_compra,
    romaneios_eta.sem_previsao as romaneios_sem_previsao,
    costs.total as custo_estimado_total
from snapshots, assembly, production, purchase, romaneios_eta, costs
"""

PANEL_ENRICHED_SQL = """
select
    sku,
    produto,
    product_type as tipo,
    company_code,
    estoque_atual,
    necessidade_romaneios,
    saldo,
    necessidade_producao,
    case
        when saldo < 0 then 'Alta'
        when necessidade_producao > 0 then 'Media'
        else 'Baixa'
    end as criticidade,
    case
        when necessidade_producao <= 0 then 'Monitorar'
        when product_type = 'acabado' then 'Montar'
        when product_type = 'intermediario' then 'Produzir'
        when product_type in ('materia_prima', 'componente') then 'Comprar'
        else 'Analisar'
    end as acao
from mart.vw_painel_current
"""

ROMANEIOS_LIST_SQL = """
with last_event as (
    select distinct on ((meta_json->>'romaneio_code'))
        meta_json->>'romaneio_code' as romaneio_code,
        coalesce(meta_json->>'company_code', '') as company_code,
        status as status_evento,
        coalesce(reference_at, finished_at, received_at) as data_evento
    from ops.webhook_event
    where meta_json ? 'romaneio_code'
    order by
        (meta_json->>'romaneio_code'),
        coalesce(reference_at, finished_at, received_at) desc,
        received_at desc
),
eta as (
    select *
    from mart.vw_romaneio_eta_current
)
select
    eta.romaneio,
    coalesce(nullif(eta.empresa, ''), nullif(e.company_code, ''), 'N/A') as empresa,
    coalesce(e.status_evento, 'processed') as status_evento,
    coalesce(e.data_evento, eta.data_evento) as data_evento,
    eta.itens,
    eta.quantidade_total,
    eta.previsao_saida_at,
    eta.previsao_saida_status,
    eta.criterio_previsao
from eta
left join last_event e on e.romaneio_code = eta.romaneio
order by coalesce(e.data_evento, eta.data_evento) desc, eta.romaneio desc
"""

ROMANEIO_HEADER_SQL = """
with base as (
    {romaneios_list_sql}
)
select *
from base
where romaneio = %s
"""

ROMANEIO_ITEMS_SQL = """
select
    sku,
    produto,
    quantidade,
    impacto,
    modo_atendimento,
    quantidade_atendida_estoque,
    quantidade_pendente,
    previsao_disponibilidade_at,
    previsao_disponibilidade_status
from mart.vw_romaneio_eta_line_current
where romaneio_code = %s
order by produto
"""

ROMANEIO_EVENTS_SQL = """
select
    event_key as event_id,
    coalesce(meta_json->>'event_type', 'update') as event_type,
    coalesce(reference_at, received_at) as received_at,
    status
from ops.webhook_event
where meta_json->>'romaneio_code' = %s
order by coalesce(reference_at, received_at) desc, received_at desc
"""

MRP_QUEUE_BASE_SQL = """
select
    sku,
    description as produto,
    product_type,
    net_required,
    stock_available,
    estimated_unit_cost,
    estimated_total_cost,
    case
        when net_required > stock_available then 'Alta'
        when net_required > 0 then 'Media'
        else 'Baixa'
    end as criticidade
from {view_name}
order by net_required desc, estimated_total_cost desc, description
"""

PURCHASE_QUEUE_SQL = """
select
    sku,
    description as produto,
    product_type,
    net_required,
    stock_available,
    estimated_unit_cost,
    estimated_total_cost,
    case
        when net_required > stock_available then 'Alta'
        when net_required > 0 then 'Media'
        else 'Baixa'
    end as criticidade
from mart.vw_mrp_purchase
"""

RECYCLING_SQL = """
select
    produced_sku,
    produced_description,
    residue_sku,
    projected_residue_qty,
    recycled_sku,
    projected_recycled_raw_material_qty,
    projected_recycling_service_cost
from mart.vw_recycling_projection_last_run
order by projected_recycling_service_cost desc, projected_residue_qty desc
"""

COSTS_SQL = """
with grouped as (
    select
        case action
            when 'montar' then 'montagem'
            when 'produzir' then 'producao'
            when 'comprar' then 'compras'
            else 'outros'
        end as category,
        case action
            when 'montar' then 'Custo de montagem do acabado'
            when 'produzir' then 'Custo de producao do intermediario'
            when 'comprar' then 'Custo de compras da rodada'
            else 'Custos de outras acoes'
        end as label,
        sum(estimated_total_cost) as estimated_total_cost
    from mart.vw_mrp_cost_last_run
    group by 1, 2
),
recycling as (
    select
        'reciclagem' as category,
        'Custo logistica e servico Recicla' as label,
        coalesce(sum(projected_recycling_service_cost), 0) as estimated_total_cost
    from mart.vw_recycling_projection_last_run
)
select category, label, estimated_total_cost
from grouped
union all
select category, label, estimated_total_cost
from recycling
union all
select
    'total' as category,
    'Custo total estimado' as label,
    coalesce(sum(estimated_total_cost), 0) as estimated_total_cost
from (
    select estimated_total_cost from grouped
    union all
    select estimated_total_cost from recycling
) totals
"""

SOURCES_SQL = """
select
    source_code,
    initcap(replace(source_code, '_', ' ')) as source_name,
    source_area,
    last_success_at,
    case freshness_status
        when 'fresh' then 'ok'
        when 'stale' then 'warning'
        else freshness_status
    end as freshness_status
from (
    select
        source_code,
        source_area,
        last_success_at,
        is_active,
        is_required,
        contract_status,
        case
            when contract_status = 'pending' then 'pending'
            when not is_active then 'inactive'
            else freshness_status
        end as freshness_status
    from ops.vw_source_freshness
) sources
where is_active or contract_status = 'known' or is_required
order by
    case freshness_status
        when 'missing' then 1
        when 'stale' then 2
        when 'pending' then 4
        when 'inactive' then 5
        else 3
    end,
    source_code
"""

ALERTS_SQL = """
with source_alerts as (
    select
        'source' as type,
        case freshness_status
            when 'missing' then 'high'
            when 'stale' then 'warning'
            else 'info'
        end as severity,
        case freshness_status
            when 'missing' then 'Fonte obrigatoria sem carga validada: ' || source_code || '.'
            when 'stale' then 'Fonte com carga desatualizada: ' || source_code || '.'
            else null
        end as message,
        jsonb_build_object('source_code', source_code, 'source_area', source_area) as context
    from ops.vw_source_freshness
    where is_required
      and is_active
      and contract_status = 'known'
      and freshness_status in ('missing', 'stale')
),
bom_alert as (
    select
        'bom' as type,
        'high' as severity,
        'Existem itens sem BOM homologada para explosao completa.' as message,
        jsonb_build_object('count', count(*)) as context
    from mart.vw_items_without_bom
    having count(*) > 0
),
planning_alert as (
    select
        'planning' as type,
        'high' as severity,
        'Existem itens com saldo negativo no painel atual.' as message,
        jsonb_build_object('count', count(*)) as context
    from mart.vw_painel_current
    where saldo < 0
    having count(*) > 0
),
romaneio_eta_alert as (
    select
        'romaneio_forecast' as type,
        'high' as severity,
        'Existem romaneios sem previsao confiavel de saida.' as message,
        jsonb_build_object('count', count(*)) as context
    from mart.vw_romaneio_eta_current
    where previsao_saida_status = 'sem_previsao'
    having count(*) > 0
)
select *
from source_alerts
where message is not null
union all
select * from bom_alert
union all
select * from planning_alert
union all
select * from romaneio_eta_alert
"""

RUN_MRP_SQL = "select mart.run_mrp() as run_id"
