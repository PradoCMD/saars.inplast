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
last_manual_schedule as (
    select distinct on ((meta_json->>'romaneio_code'))
        meta_json->>'romaneio_code' as romaneio_code,
        nullif(meta_json->>'manual_previsao_saida_at', '')::timestamptz as manual_previsao_saida_at,
        coalesce(nullif(meta_json->>'manual_previsao_reason', ''), 'pcp_manual') as manual_previsao_reason
    from ops.webhook_event
    where meta_json ? 'romaneio_code'
      and coalesce(meta_json->>'event_type', '') = 'manual_schedule'
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
    case
        when ms.romaneio_code is not null then ms.manual_previsao_saida_at
        else eta.previsao_saida_at
    end as previsao_saida_at,
    case
        when ms.romaneio_code is not null and ms.manual_previsao_saida_at is null then 'sem_previsao'
        when ms.manual_previsao_saida_at is not null then 'pcp_manual'
        else eta.previsao_saida_status
    end as previsao_saida_status,
    case
        when ms.romaneio_code is not null then ms.manual_previsao_reason
        else eta.criterio_previsao
    end as criterio_previsao
from eta
left join last_event e on e.romaneio_code = eta.romaneio
left join last_manual_schedule ms on ms.romaneio_code = eta.romaneio
order by coalesce(e.data_evento, eta.data_evento) desc, eta.romaneio desc
"""

ROMANEIOS_KANBAN_SQL = """
with base as (
    {romaneios_list_sql}
),
line_items as (
    select
        romaneio_code as romaneio,
        jsonb_agg(
            jsonb_build_object(
                'sku', sku,
                'produto', produto,
                'quantidade', quantidade,
                'impacto', impacto,
                'modo_atendimento', modo_atendimento,
                'previsao_disponibilidade_at', previsao_disponibilidade_at,
                'previsao_disponibilidade_status', previsao_disponibilidade_status
            )
            order by produto, sku
        ) as items
    from mart.vw_romaneio_eta_line_current
    group by romaneio_code
)
select
    base.*,
    coalesce(line_items.items, '[]'::jsonb) as items,
    0::numeric as valor_total
from base
left join line_items on line_items.romaneio = base.romaneio
order by base.data_evento desc, base.romaneio desc
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

STRUCTURES_SQL = """
select
    source_scope,
    structure_type,
    process_stage,
    parent_sku,
    parent_product,
    parent_product_type,
    component_sku,
    component_product,
    component_product_type,
    quantity_per,
    scrap_pct,
    sequence_no,
    component_role,
    assembly_line_code,
    workstation_code,
    usage_notes,
    is_blocked,
    has_manual_override,
    manual_only,
    override_reason,
    updated_at
from mart.vw_structure_component_current
"""

PROGRAMMING_SQL = """
select
    schedule_key,
    sku,
    produto,
    product_type,
    supply_strategy,
    action,
    planned_start_at,
    available_at,
    quantity_planned,
    assembly_line_code,
    workstation_code,
    sequence_rank,
    planning_status,
    planning_origin,
    notes,
    source_code,
    source_area
from mart.vw_programming_current
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
    parser_name,
    last_success_at,
    is_active,
    is_required,
    contract_status,
    case freshness_status
        when 'fresh' then 'ok'
        when 'stale' then 'warning'
        else freshness_status
    end as freshness_status
from (
    select
        source_code,
        source_area,
        parser_name,
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

ACTIVE_SYNC_STOCK_SOURCES_SQL = """
select
    source_code,
    source_area,
    parser_name,
    format_hint,
    is_active,
    contract_status,
    config_json
from ops.source_registry
where source_code in (
    'estoque_acabado_atual',
    'estoque_intermediario_atual',
    'estoque_materia_prima_almoxarifado',
    'estoque_componente_almoxarifado'
)
  and contract_status = 'known'
  and is_active
order by source_code
"""

SYNC_STOCK_SOURCES_BY_CODE_SQL = """
select
    source_code,
    source_area,
    parser_name,
    format_hint,
    is_active,
    contract_status,
    config_json
from ops.source_registry
where source_code = any(%s)
  and contract_status = 'known'
order by source_code
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

SAVE_STRUCTURE_OVERRIDE_SQL = """
select ops.save_bom_override(%s, %s, %s, %s::jsonb) as override_id
"""

SAVE_PROGRAMMING_ENTRY_SQL = """
select ops.save_supply_programming_entry(%s, %s::jsonb) as entry_id
"""

SAVE_ROMANEIO_SCHEDULE_SQL = """
with chosen_source as (
    select source_id, source_code
    from ops.source_registry
    where source_area = 'demanda_romaneio'
      and contract_status = 'known'
    order by
        case when source_code = 'romaneio_pcp_atual' then 0 else 1 end,
        case when is_active then 0 else 1 end,
        source_id
    limit 1
),
inserted as (
    insert into ops.webhook_event (
        event_key,
        source_id,
        reference_at,
        status,
        meta_json,
        received_at,
        finished_at
    )
    select
        %s,
        chosen_source.source_id,
        %s::timestamptz,
        'processed',
        jsonb_build_object(
            'romaneio_code', %s,
            'event_type', 'manual_schedule',
            'company_code', nullif(%s, ''),
            'manual_previsao_saida_at', %s::timestamptz,
            'manual_previsao_reason', coalesce(nullif(%s, ''), 'pcp_manual')
        ),
        now(),
        now()
    from chosen_source
    returning event_key
)
select
    event_key,
    (select source_code from chosen_source) as source_code
from inserted
"""

DELETE_ROMANEIO_EVENT_SQL = """
with chosen_source as (
    select source_code
    from ops.source_registry
    where source_area = 'demanda_romaneio'
      and contract_status = 'known'
    order by
        case when source_code = 'romaneio_pcp_atual' then 0 else 1 end,
        case when is_active then 0 else 1 end,
        source_id
    limit 1
)
select
    (select source_code from chosen_source) as source_code,
    ops.ingest_romaneio_event_payload(
        (select source_code from chosen_source),
        jsonb_build_object(
            'event_id', %s,
            'event_type', 'delete',
            'event_at', %s::timestamptz,
            'romaneio', jsonb_build_object(
                'codigo', %s,
                'empresa', nullif(%s, ''),
                'itens', jsonb_build_array()
            )
        ),
        jsonb_build_object(
            'deleted_by', nullif(%s, ''),
            'reason', coalesce(nullif(%s, ''), 'manual_delete'),
            'romaneio_code', %s
        )
    ) as ingest
from chosen_source
"""

INGEST_INVENTORY_PAYLOAD_SQL = """
select ops.ingest_inventory_payload(%s, %s::timestamptz, %s::jsonb, %s::jsonb) as run_id
"""

INGEST_ROMANEIO_EVENT_SQL = """
select ops.ingest_romaneio_event_payload(%s, %s::jsonb, %s::jsonb) as ingest
"""
