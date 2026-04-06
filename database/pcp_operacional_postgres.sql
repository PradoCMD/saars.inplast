create schema if not exists ops;
create schema if not exists raw;
create schema if not exists core;
create schema if not exists mart;

create table if not exists ops.source_registry (
    source_id bigserial primary key,
    source_code text not null unique,
    source_area text not null check (source_area in (
        'demanda_romaneio',
        'estoque_acabado',
        'estoque_intermediario',
        'estoque_materia_prima',
        'estoque_componente',
        'bom_final',
        'bom_intermediario',
        'previsao_montagem',
        'previsao_producao',
        'previsao_compra',
        'retorno_recicla',
        'custo_material',
        'custo_processo'
    )),
    source_kind text not null check (source_kind in (
        'smb_file',
        'sftp_file',
        'http_file',
        'api',
        'sql_pull',
        'manual_load',
        'google_published_sheet'
    )),
    parser_name text,
    format_hint text,
    company_code text,
    contract_status text not null default 'pending' check (contract_status in ('known', 'pending', 'retired')),
    is_required boolean not null default true,
    is_active boolean not null default false,
    config_json jsonb not null default '{}'::jsonb,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table ops.source_registry
    drop constraint if exists source_registry_source_kind_check;

alter table ops.source_registry
    add constraint source_registry_source_kind_check
    check (source_kind in (
        'smb_file',
        'sftp_file',
        'http_file',
        'api',
        'sql_pull',
        'manual_load',
        'google_published_sheet'
    ));

create table if not exists ops.ingestion_run (
    run_id bigserial primary key,
    source_id bigint not null references ops.source_registry(source_id),
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    reference_at timestamptz,
    status text not null default 'running' check (status in ('running', 'success', 'error', 'skipped')),
    file_name text,
    file_path text,
    file_hash text,
    record_count integer,
    error_message text,
    meta_json jsonb not null default '{}'::jsonb
);

create table if not exists ops.webhook_event (
    event_key text primary key,
    source_id bigint not null references ops.source_registry(source_id),
    reference_at timestamptz,
    payload_hash text,
    run_id bigint references ops.ingestion_run(run_id),
    status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'error')),
    error_message text,
    meta_json jsonb not null default '{}'::jsonb,
    received_at timestamptz not null default now(),
    finished_at timestamptz
);

create table if not exists ops.app_user (
    user_key text primary key,
    username text not null unique,
    full_name text not null,
    role text not null default 'operator',
    password text not null,
    is_active boolean not null default true,
    meta_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists ops.app_integration (
    integration_key text primary key,
    integration_name text not null,
    integration_type text not null,
    webhook_url text not null default '',
    method text not null default 'POST',
    auth_type text not null default 'none',
    auth_value text not null default '',
    extra_headers_json text not null default '{}',
    request_body_json text not null default '{}',
    is_active boolean not null default false,
    last_status text not null default 'idle',
    last_synced_at timestamptz,
    last_error text not null default '',
    meta_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_app_integration_type_active
    on ops.app_integration (integration_type, is_active, updated_at desc);

create table if not exists ops.stock_movement (
    movement_key text primary key,
    sku text not null,
    product_name text not null default '',
    movement_type text not null check (movement_type in ('entrada', 'saida')),
    quantity numeric(18,6) not null check (quantity > 0),
    product_type text,
    document_ref text,
    responsavel text,
    observacao text,
    meta_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_stock_movement_sku_created
    on ops.stock_movement (sku, created_at desc);

create table if not exists ops.app_state_document (
    doc_key text primary key,
    doc_type text not null default 'json',
    source_label text,
    source_hash text,
    payload_json jsonb not null default '{}'::jsonb,
    meta_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists raw.landing_payload (
    payload_id bigserial primary key,
    run_id bigint not null references ops.ingestion_run(run_id) on delete cascade,
    source_id bigint not null references ops.source_registry(source_id),
    row_number integer not null,
    record_json jsonb not null,
    loaded_at timestamptz not null default now(),
    unique (run_id, row_number)
);

create table if not exists core.product (
    product_id bigserial primary key,
    sku text not null unique,
    description text not null,
    product_type text not null check (product_type in ('acabado', 'intermediario', 'materia_prima', 'componente', 'residuo')),
    supply_strategy text not null check (supply_strategy in ('montar', 'produzir', 'comprar', 'estoque')),
    material_origin text not null default 'nao_aplicavel' check (material_origin in ('virgem', 'reciclada', 'mista', 'nao_aplicavel')),
    unit_code text not null default 'UN',
    company_code text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists core.product_code (
    product_id bigint not null references core.product(product_id) on delete cascade,
    code_type text not null check (code_type in ('codigo_barras', 'codigo_erp', 'codigo_legado')),
    code_value text not null,
    primary key (code_type, code_value)
);

create table if not exists core.bom_component (
    parent_product_id bigint not null references core.product(product_id),
    component_product_id bigint not null references core.product(product_id),
    quantity_per numeric(18,6) not null check (quantity_per > 0),
    scrap_pct numeric(8,4) not null default 0 check (scrap_pct >= 0),
    source_scope text not null check (source_scope in ('bom_final', 'bom_intermediario')),
    sequence_no integer,
    process_stage text not null default 'montagem',
    component_role text not null default 'componente',
    assembly_line_code text,
    workstation_code text,
    usage_notes text,
    metadata_json jsonb not null default '{}'::jsonb,
    valid_from date not null default current_date,
    valid_to date,
    source_id bigint references ops.source_registry(source_id),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (parent_product_id, component_product_id, source_scope, valid_from)
);

alter table core.bom_component
    add column if not exists process_stage text,
    add column if not exists component_role text,
    add column if not exists assembly_line_code text,
    add column if not exists workstation_code text,
    add column if not exists usage_notes text,
    add column if not exists metadata_json jsonb default '{}'::jsonb,
    add column if not exists created_at timestamptz default now(),
    add column if not exists updated_at timestamptz default now();

update core.bom_component
set
    process_stage = coalesce(process_stage, case when source_scope = 'bom_final' then 'montagem' else 'producao' end),
    component_role = coalesce(component_role, 'componente'),
    metadata_json = coalesce(metadata_json, '{}'::jsonb),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now())
where
    process_stage is null
    or component_role is null
    or metadata_json is null
    or created_at is null
    or updated_at is null;

alter table core.bom_component alter column process_stage set default 'montagem';
alter table core.bom_component alter column component_role set default 'componente';
alter table core.bom_component alter column metadata_json set default '{}'::jsonb;
alter table core.bom_component alter column created_at set default now();
alter table core.bom_component alter column updated_at set default now();
alter table core.bom_component alter column process_stage set not null;
alter table core.bom_component alter column component_role set not null;
alter table core.bom_component alter column metadata_json set not null;
alter table core.bom_component alter column created_at set not null;
alter table core.bom_component alter column updated_at set not null;

create table if not exists core.assembly_line (
    line_id bigserial primary key,
    line_code text not null unique,
    line_name text not null,
    stage_scope text not null default 'montagem',
    company_code text,
    workstation_count integer,
    notes text,
    is_active boolean not null default true,
    source_id bigint references ops.source_registry(source_id),
    meta_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists core.inventory_snapshot (
    snapshot_at timestamptz not null,
    product_id bigint not null references core.product(product_id),
    stock_scope text not null check (stock_scope in ('acabado', 'intermediario', 'materia_prima', 'componente', 'residuo', 'outro')),
    location_code text not null,
    quantity numeric(18,6) not null,
    source_id bigint references ops.source_registry(source_id),
    created_at timestamptz not null default now(),
    primary key (snapshot_at, product_id, stock_scope, location_code, source_id)
);

create table if not exists core.romaneio_demand_snapshot (
    snapshot_at timestamptz not null,
    romaneio_code text not null,
    product_id bigint not null references core.product(product_id),
    quantity numeric(18,6) not null check (quantity >= 0),
    company_code text,
    source_id bigint references ops.source_registry(source_id),
    created_at timestamptz not null default now(),
    primary key (snapshot_at, romaneio_code, product_id, source_id)
);

create table if not exists core.romaneio_priority_override (
    override_id bigserial primary key,
    romaneio_code text not null,
    source_id bigint references ops.source_registry(source_id),
    priority_rank integer not null check (priority_rank > 0),
    reason text,
    effective_at timestamptz not null default now(),
    is_active boolean not null default true,
    meta_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists core.bom_component_override (
    override_id bigserial primary key,
    parent_product_id bigint not null references core.product(product_id),
    component_product_id bigint not null references core.product(product_id),
    source_scope text not null check (source_scope in ('bom_final', 'bom_intermediario')),
    quantity_per_override numeric(18,6),
    scrap_pct_override numeric(8,4),
    sequence_no_override integer,
    process_stage_override text,
    component_role_override text,
    assembly_line_code_override text,
    workstation_code_override text,
    usage_notes_override text,
    is_blocked boolean not null default false,
    reason text,
    source_id bigint references ops.source_registry(source_id),
    meta_json jsonb not null default '{}'::jsonb,
    effective_at timestamptz not null default now(),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists core.production_process (
    process_id bigserial primary key,
    process_code text not null unique,
    product_id bigint not null references core.product(product_id),
    process_type text not null check (process_type in ('montagem', 'producao', 'reciclagem')),
    company_code text not null,
    default_scrap_pct numeric(8,4) not null default 0 check (default_scrap_pct >= 0),
    default_waste_pct numeric(8,4) not null default 0 check (default_waste_pct >= 0),
    setup_time_min numeric(18,2),
    run_time_min_per_unit numeric(18,6),
    labor_cost_per_hour numeric(18,6),
    machine_cost_per_hour numeric(18,6),
    overhead_cost_per_hour numeric(18,6),
    is_active boolean not null default true,
    source_id bigint references ops.source_registry(source_id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists core.process_byproduct_rule (
    process_id bigint not null references core.production_process(process_id) on delete cascade,
    byproduct_product_id bigint not null references core.product(product_id),
    quantity_per_unit numeric(18,6),
    generation_pct numeric(8,4) not null default 0 check (generation_pct >= 0),
    recovery_target_product_id bigint references core.product(product_id),
    recovery_pct numeric(8,4) not null default 0 check (recovery_pct >= 0),
    destination_company_code text not null default 'RECICLA',
    recycling_lead_time_days integer not null default 0,
    transport_cost_per_unit numeric(18,6) not null default 0,
    recycling_cost_per_unit numeric(18,6) not null default 0,
    primary key (process_id, byproduct_product_id)
);

create table if not exists core.recycling_return_snapshot (
    snapshot_at timestamptz not null,
    residue_product_id bigint not null references core.product(product_id),
    recycled_product_id bigint not null references core.product(product_id),
    quantity_sent numeric(18,6) not null default 0,
    quantity_received numeric(18,6) not null default 0,
    partner_company_code text not null default 'RECICLA',
    unit_transport_cost numeric(18,6) not null default 0,
    unit_recycling_cost numeric(18,6) not null default 0,
    source_id bigint references ops.source_registry(source_id),
    created_at timestamptz not null default now(),
    primary key (snapshot_at, residue_product_id, recycled_product_id, source_id)
);

create table if not exists core.supply_forecast_snapshot (
    snapshot_at timestamptz not null,
    forecast_key text not null,
    product_id bigint not null references core.product(product_id),
    action text not null check (action in ('montar', 'produzir', 'comprar', 'atender_estoque', 'analisar')),
    available_at timestamptz not null,
    quantity_planned numeric(18,6) not null check (quantity_planned >= 0),
    source_id bigint not null references ops.source_registry(source_id),
    notes text,
    meta_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    primary key (snapshot_at, source_id, forecast_key)
);

create table if not exists core.supply_programming_entry (
    entry_id bigserial primary key,
    schedule_key text not null,
    product_id bigint not null references core.product(product_id),
    action text not null check (action in ('montar', 'produzir', 'comprar')),
    available_at timestamptz not null,
    quantity_planned numeric(18,6) not null check (quantity_planned >= 0),
    source_id bigint references ops.source_registry(source_id),
    notes text,
    meta_json jsonb not null default '{}'::jsonb,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists core.cost_snapshot (
    snapshot_at timestamptz not null,
    product_id bigint not null references core.product(product_id),
    cost_category text not null check (cost_category in (
        'material',
        'transformacao_intermediario',
        'montagem_acabado',
        'reciclagem',
        'transporte_recicla',
        'refugo',
        'overhead',
        'total'
    )),
    unit_cost numeric(18,6) not null,
    currency_code text not null default 'BRL',
    source_id bigint references ops.source_registry(source_id),
    notes text,
    created_at timestamptz not null default now(),
    primary key (snapshot_at, product_id, cost_category, source_id)
);

create table if not exists mart.mrp_run (
    run_id bigserial primary key,
    snapshot_at timestamptz not null default now(),
    status text not null default 'running' check (status in ('running', 'completed', 'error')),
    created_at timestamptz not null default now()
);

create table if not exists mart.mrp_result (
    run_id bigint not null references mart.mrp_run(run_id) on delete cascade,
    level integer not null check (level >= 0),
    product_id bigint not null references core.product(product_id),
    gross_required numeric(18,6) not null default 0,
    stock_available numeric(18,6) not null default 0,
    allocated_from_stock numeric(18,6) not null default 0,
    net_required numeric(18,6) not null default 0,
    estimated_unit_cost numeric(18,6) not null default 0,
    estimated_total_cost numeric(18,6) not null default 0,
    action text not null check (action in ('atender_estoque', 'montar', 'produzir', 'comprar', 'analisar')),
    primary key (run_id, level, product_id)
);

create table if not exists mart.mrp_trace (
    run_id bigint not null references mart.mrp_run(run_id) on delete cascade,
    level integer not null check (level > 0),
    parent_product_id bigint not null references core.product(product_id),
    product_id bigint not null references core.product(product_id),
    gross_required numeric(18,6) not null,
    primary key (run_id, level, parent_product_id, product_id)
);

create or replace function ops.start_ingestion_run(
    p_source_code text,
    p_reference_at timestamptz default now(),
    p_file_name text default null,
    p_file_path text default null,
    p_file_hash text default null,
    p_meta_json jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
as $$
declare
    v_source_id bigint;
    v_run_id bigint;
begin
    select source_id
    into v_source_id
    from ops.source_registry
    where source_code = p_source_code;

    if v_source_id is null then
        raise exception 'Fonte nao cadastrada: %', p_source_code;
    end if;

    insert into ops.ingestion_run (
        source_id,
        reference_at,
        status,
        file_name,
        file_path,
        file_hash,
        meta_json
    )
    values (
        v_source_id,
        p_reference_at,
        'running',
        p_file_name,
        p_file_path,
        p_file_hash,
        coalesce(p_meta_json, '{}'::jsonb)
    )
    returning run_id into v_run_id;

    return v_run_id;
end;
$$;

create or replace function ops.register_webhook_event(
    p_source_code text,
    p_event_key text,
    p_reference_at timestamptz default now(),
    p_payload_hash text default null,
    p_meta_json jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
as $$
declare
    v_source_id bigint;
begin
    select source_id
    into v_source_id
    from ops.source_registry
    where source_code = p_source_code;

    if v_source_id is null then
        raise exception 'Fonte nao cadastrada: %', p_source_code;
    end if;

    insert into ops.webhook_event (
        event_key,
        source_id,
        reference_at,
        payload_hash,
        status,
        meta_json
    )
    values (
        p_event_key,
        v_source_id,
        p_reference_at,
        p_payload_hash,
        'received',
        coalesce(p_meta_json, '{}'::jsonb)
    )
    on conflict (event_key) do nothing;

    return found;
end;
$$;

create or replace function ops.finish_ingestion_run(
    p_run_id bigint,
    p_status text,
    p_record_count integer default null,
    p_error_message text default null
)
returns void
language plpgsql
as $$
begin
    update ops.ingestion_run
    set
        status = p_status,
        record_count = p_record_count,
        error_message = p_error_message,
        finished_at = now()
    where run_id = p_run_id;
end;
$$;

create or replace function ops.finish_webhook_event(
    p_event_key text,
    p_status text,
    p_run_id bigint default null,
    p_error_message text default null
)
returns void
language plpgsql
as $$
begin
    update ops.webhook_event
    set
        status = p_status,
        run_id = coalesce(p_run_id, run_id),
        error_message = p_error_message,
        finished_at = now()
    where event_key = p_event_key;
end;
$$;

create or replace function ops.ingest_inventory_payload(
    p_source_code text,
    p_snapshot_at timestamptz,
    p_records jsonb,
    p_meta_json jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
as $$
declare
    v_source_id bigint;
    v_run_id bigint;
    v_record_count integer := 0;
begin
    if jsonb_typeof(coalesce(p_records, '[]'::jsonb)) <> 'array' then
        raise exception 'Payload de estoque deve ser um array JSON';
    end if;

    select source_id
    into v_source_id
    from ops.source_registry
    where source_code = p_source_code;

    if v_source_id is null then
        raise exception 'Fonte nao cadastrada: %', p_source_code;
    end if;

    v_record_count := coalesce(jsonb_array_length(coalesce(p_records, '[]'::jsonb)), 0);

    v_run_id := ops.start_ingestion_run(
        p_source_code,
        p_snapshot_at,
        null,
        null,
        null,
        p_meta_json
    );

    insert into raw.landing_payload (
        run_id,
        source_id,
        row_number,
        record_json
    )
    select
        v_run_id,
        v_source_id,
        src.ordinality::integer,
        src.record_json
    from jsonb_array_elements(coalesce(p_records, '[]'::jsonb)) with ordinality as src(record_json, ordinality);

    with src as (
        select src.record_json
        from jsonb_array_elements(coalesce(p_records, '[]'::jsonb)) as src(record_json)
    )
    insert into core.product (
        sku,
        description,
        product_type,
        supply_strategy,
        unit_code,
        company_code
    )
    select distinct
        src.record_json->>'sku' as sku,
        src.record_json->>'description' as description,
        coalesce(src.record_json->>'product_type', 'componente') as product_type,
        coalesce(src.record_json->>'supply_strategy', 'comprar') as supply_strategy,
        coalesce(src.record_json->>'unit_code', 'UN') as unit_code,
        src.record_json->>'company_code' as company_code
    from src
    where coalesce(src.record_json->>'sku', '') <> ''
      and coalesce(src.record_json->>'description', '') <> ''
    on conflict (sku) do update
    set
        description = excluded.description,
        product_type = excluded.product_type,
        supply_strategy = excluded.supply_strategy,
        unit_code = excluded.unit_code,
        company_code = excluded.company_code,
        updated_at = now();

    with src as (
        select
            src.record_json->>'sku' as sku,
            src.record_json->'metadata'->>'legacy_code' as legacy_code,
            src.record_json->'metadata'->>'code_status' as code_status
        from jsonb_array_elements(coalesce(p_records, '[]'::jsonb)) as src(record_json)
    )
    insert into core.product_code (
        product_id,
        code_type,
        code_value
    )
    select distinct
        p.product_id,
        'codigo_legado',
        src.legacy_code
    from src
    join core.product p on p.sku = src.sku
    where coalesce(src.legacy_code, '') <> ''
      and coalesce(src.code_status, '') = 'trusted_code'
    on conflict (code_type, code_value) do update
    set product_id = excluded.product_id;

    insert into core.inventory_snapshot (
        snapshot_at,
        product_id,
        stock_scope,
        location_code,
        quantity,
        source_id
    )
    select
        p_snapshot_at,
        p.product_id,
        coalesce(
            src.record_json->'metadata'->>'stock_scope',
            s.config_json->>'stock_scope',
            'outro'
        ) as stock_scope,
        coalesce(
            src.record_json->>'location_code',
            s.config_json->>'location_code',
            'NAO_INFORMADO'
        ) as location_code,
        coalesce((src.record_json->>'quantity')::numeric, 0),
        v_source_id
    from jsonb_array_elements(coalesce(p_records, '[]'::jsonb)) as src(record_json)
    join core.product p on p.sku = src.record_json->>'sku'
    join ops.source_registry s on s.source_id = v_source_id
    on conflict (snapshot_at, product_id, stock_scope, location_code, source_id) do update
    set quantity = excluded.quantity;

    perform ops.finish_ingestion_run(v_run_id, 'success', v_record_count, null);
    return v_run_id;
exception
    when others then
        if v_run_id is not null then
            perform ops.finish_ingestion_run(v_run_id, 'error', null, sqlerrm);
        end if;
        raise;
end;
$$;

create or replace function ops.ingest_bom_payload(
    p_source_code text,
    p_snapshot_at timestamptz,
    p_source_scope text,
    p_records jsonb,
    p_meta_json jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
as $$
declare
    v_source_id bigint;
    v_run_id bigint;
    v_record_count integer := 0;
begin
    if p_source_scope not in ('bom_final', 'bom_intermediario') then
        raise exception 'Escopo BOM invalido: %', p_source_scope;
    end if;

    if jsonb_typeof(coalesce(p_records, '[]'::jsonb)) <> 'array' then
        raise exception 'Payload de BOM deve ser um array JSON';
    end if;

    select source_id
    into v_source_id
    from ops.source_registry
    where source_code = p_source_code;

    if v_source_id is null then
        raise exception 'Fonte nao cadastrada: %', p_source_code;
    end if;

    v_record_count := coalesce(jsonb_array_length(coalesce(p_records, '[]'::jsonb)), 0);

    v_run_id := ops.start_ingestion_run(
        p_source_code,
        p_snapshot_at,
        null,
        null,
        null,
        p_meta_json || jsonb_build_object('source_scope', p_source_scope)
    );

    insert into raw.landing_payload (
        run_id,
        source_id,
        row_number,
        record_json
    )
    select
        v_run_id,
        v_source_id,
        src.ordinality::integer,
        src.record_json
    from jsonb_array_elements(coalesce(p_records, '[]'::jsonb)) with ordinality as src(record_json, ordinality);

    with src as (
        select src.record_json
        from jsonb_array_elements(coalesce(p_records, '[]'::jsonb)) as src(record_json)
    ),
    parent_src as (
        select distinct on (sku)
            sku,
            description,
            product_type,
            supply_strategy,
            unit_code,
            company_code
        from (
            select
                src.record_json->>'parent_sku' as sku,
                src.record_json->>'parent_description' as description,
                nullif(src.record_json->>'parent_product_type', '') as product_type,
                nullif(src.record_json->>'parent_supply_strategy', '') as supply_strategy,
                coalesce(nullif(src.record_json->>'unit_code', ''), 'UN') as unit_code,
                nullif(src.record_json->>'company_code', '') as company_code
            from src
        ) parent_candidates
        where coalesce(sku, '') <> ''
          and coalesce(description, '') <> ''
        order by sku, description desc
    )
    insert into core.product (
        sku,
        description,
        product_type,
        supply_strategy,
        unit_code,
        company_code
    )
    select
        sku,
        description,
        product_type,
        supply_strategy,
        unit_code,
        company_code
    from parent_src
    on conflict (sku) do update
    set
        description = excluded.description,
        product_type = coalesce(excluded.product_type, core.product.product_type),
        supply_strategy = coalesce(excluded.supply_strategy, core.product.supply_strategy),
        company_code = coalesce(excluded.company_code, core.product.company_code),
        updated_at = now();

    with src as (
        select src.record_json
        from jsonb_array_elements(coalesce(p_records, '[]'::jsonb)) as src(record_json)
    ),
    component_src as (
        select distinct on (sku)
            sku,
            description,
            product_type,
            supply_strategy,
            unit_code,
            company_code
        from (
            select
                src.record_json->>'component_sku' as sku,
                src.record_json->>'component_description' as description,
                nullif(src.record_json->>'component_product_type', '') as product_type,
                nullif(src.record_json->>'component_supply_strategy', '') as supply_strategy,
                coalesce(nullif(src.record_json->>'unit_code', ''), 'UN') as unit_code,
                nullif(src.record_json->>'company_code', '') as company_code
            from src
        ) component_candidates
        where coalesce(sku, '') <> ''
          and coalesce(description, '') <> ''
        order by sku, description desc
    )
    insert into core.product (
        sku,
        description,
        product_type,
        supply_strategy,
        unit_code,
        company_code
    )
    select
        sku,
        description,
        product_type,
        supply_strategy,
        unit_code,
        company_code
    from component_src
    on conflict (sku) do update
    set
        description = excluded.description,
        company_code = coalesce(excluded.company_code, core.product.company_code),
        updated_at = now();

    with src as (
        select
            src.record_json->>'parent_sku' as sku,
            src.record_json->'metadata'->>'parent_legacy_code' as legacy_code
        from jsonb_array_elements(coalesce(p_records, '[]'::jsonb)) as src(record_json)
        union all
        select
            src.record_json->>'component_sku' as sku,
            src.record_json->'metadata'->>'component_legacy_code' as legacy_code
        from jsonb_array_elements(coalesce(p_records, '[]'::jsonb)) as src(record_json)
    )
    insert into core.product_code (
        product_id,
        code_type,
        code_value
    )
    select distinct
        p.product_id,
        'codigo_legado',
        src.legacy_code
    from src
    join core.product p on p.sku = src.sku
    where coalesce(src.legacy_code, '') <> ''
    on conflict (code_type, code_value) do update
    set product_id = excluded.product_id;

    update core.bom_component
    set
        is_active = false,
        valid_to = coalesce(valid_to, p_snapshot_at::date - 1),
        updated_at = now()
    where source_id = v_source_id
      and source_scope = p_source_scope
      and is_active
      and valid_from < p_snapshot_at::date;

    delete from core.bom_component
    where source_id = v_source_id
      and source_scope = p_source_scope
      and valid_from = p_snapshot_at::date;

    with bom_src as (
        select
            parent_product.product_id as parent_product_id,
            component_product.product_id as component_product_id,
            sum(coalesce(nullif(src.record_json->>'quantity_per', '')::numeric, 0)) as quantity_per,
            max(coalesce(nullif(src.record_json->>'scrap_pct', '')::numeric, 0)) as scrap_pct,
            min(nullif(src.record_json->>'sequence_no', '')::integer) as sequence_no,
            max(
                coalesce(
                    nullif(src.record_json->>'process_stage', ''),
                    case when p_source_scope = 'bom_final' then 'montagem' else 'producao' end
                )
            ) as process_stage,
            max(coalesce(nullif(src.record_json->>'component_role', ''), 'componente')) as component_role,
            max(nullif(src.record_json->>'assembly_line_code', '')) as assembly_line_code,
            max(nullif(src.record_json->>'workstation_code', '')) as workstation_code,
            max(nullif(src.record_json->>'usage_notes', '')) as usage_notes,
            jsonb_agg(coalesce(src.record_json->'metadata', '{}'::jsonb) order by nullif(src.record_json->>'sequence_no', '')::integer nulls last) as metadata_json
        from jsonb_array_elements(coalesce(p_records, '[]'::jsonb)) as src(record_json)
        join core.product parent_product on parent_product.sku = src.record_json->>'parent_sku'
        join core.product component_product on component_product.sku = src.record_json->>'component_sku'
        where coalesce(nullif(src.record_json->>'quantity_per', '')::numeric, 0) > 0
        group by parent_product.product_id, component_product.product_id
    )
    insert into core.bom_component (
        parent_product_id,
        component_product_id,
        quantity_per,
        scrap_pct,
        source_scope,
        sequence_no,
        process_stage,
        component_role,
        assembly_line_code,
        workstation_code,
        usage_notes,
        metadata_json,
        valid_from,
        source_id,
        is_active
    )
    select
        bom_src.parent_product_id,
        bom_src.component_product_id,
        bom_src.quantity_per,
        bom_src.scrap_pct,
        p_source_scope,
        bom_src.sequence_no,
        bom_src.process_stage,
        bom_src.component_role,
        bom_src.assembly_line_code,
        bom_src.workstation_code,
        bom_src.usage_notes,
        bom_src.metadata_json,
        p_snapshot_at::date,
        v_source_id,
        true
    from bom_src
    on conflict (parent_product_id, component_product_id, source_scope, valid_from) do update
    set
        quantity_per = excluded.quantity_per,
        scrap_pct = excluded.scrap_pct,
        sequence_no = excluded.sequence_no,
        process_stage = excluded.process_stage,
        component_role = excluded.component_role,
        assembly_line_code = excluded.assembly_line_code,
        workstation_code = excluded.workstation_code,
        usage_notes = excluded.usage_notes,
        metadata_json = excluded.metadata_json,
        source_id = excluded.source_id,
        is_active = true,
        updated_at = now();

    perform ops.finish_ingestion_run(v_run_id, 'success', v_record_count, null);
    return v_run_id;
exception
    when others then
        if v_run_id is not null then
            perform ops.finish_ingestion_run(v_run_id, 'error', null, sqlerrm);
        end if;
        raise;
end;
$$;

create or replace function ops.save_bom_override(
    p_parent_sku text,
    p_component_sku text,
    p_source_scope text,
    p_payload jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
as $$
declare
    v_parent_id bigint;
    v_component_id bigint;
    v_override_id bigint;
    v_has_base boolean;
begin
    if p_source_scope not in ('bom_final', 'bom_intermediario') then
        raise exception 'Escopo BOM invalido: %', p_source_scope;
    end if;

    select product_id into v_parent_id from core.product where sku = p_parent_sku;
    if v_parent_id is null then
        raise exception 'Produto pai nao encontrado: %', p_parent_sku;
    end if;

    select product_id into v_component_id from core.product where sku = p_component_sku;
    if v_component_id is null then
        raise exception 'Componente nao encontrado: %', p_component_sku;
    end if;

    select exists (
        select 1
        from core.bom_component b
        where b.parent_product_id = v_parent_id
          and b.component_product_id = v_component_id
          and b.source_scope = p_source_scope
    )
    into v_has_base;

    if not v_has_base and nullif(p_payload->>'quantity_per', '') is null then
        raise exception 'quantity_per e obrigatoria quando nao existe estrutura base importada';
    end if;

    update core.bom_component_override
    set
        is_active = false,
        updated_at = now()
    where parent_product_id = v_parent_id
      and component_product_id = v_component_id
      and source_scope = p_source_scope
      and is_active;

    insert into core.bom_component_override (
        parent_product_id,
        component_product_id,
        source_scope,
        quantity_per_override,
        scrap_pct_override,
        sequence_no_override,
        process_stage_override,
        component_role_override,
        assembly_line_code_override,
        workstation_code_override,
        usage_notes_override,
        is_blocked,
        reason,
        source_id,
        meta_json,
        effective_at,
        is_active,
        created_at,
        updated_at
    )
    values (
        v_parent_id,
        v_component_id,
        p_source_scope,
        nullif(p_payload->>'quantity_per', '')::numeric,
        nullif(p_payload->>'scrap_pct', '')::numeric,
        nullif(p_payload->>'sequence_no', '')::integer,
        nullif(p_payload->>'process_stage', ''),
        nullif(p_payload->>'component_role', ''),
        nullif(p_payload->>'assembly_line_code', ''),
        nullif(p_payload->>'workstation_code', ''),
        nullif(p_payload->>'usage_notes', ''),
        coalesce((p_payload->>'is_blocked')::boolean, false),
        nullif(p_payload->>'reason', ''),
        nullif(p_payload->>'source_id', '')::bigint,
        coalesce(p_payload->'meta', p_payload->'metadata', '{}'::jsonb),
        now(),
        true,
        now(),
        now()
    )
    returning override_id into v_override_id;

    return v_override_id;
end;
$$;

create or replace function ops.save_supply_programming_entry(
    p_sku text,
    p_payload jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
as $$
declare
    v_product_id bigint;
    v_entry_id bigint;
    v_schedule_key text;
    v_source_id bigint;
begin
    select product_id into v_product_id from core.product where sku = p_sku;
    if v_product_id is null then
        raise exception 'Produto nao encontrado para programacao: %', p_sku;
    end if;

    if nullif(p_payload->>'action', '') is null then
        raise exception 'Campo action e obrigatorio na programacao';
    end if;

    if nullif(p_payload->>'available_at', '') is null then
        raise exception 'Campo available_at e obrigatorio na programacao';
    end if;

    if nullif(p_payload->>'quantity_planned', '') is null then
        raise exception 'Campo quantity_planned e obrigatorio na programacao';
    end if;

    v_schedule_key := coalesce(
        nullif(p_payload->>'schedule_key', ''),
        lower(p_payload->>'action') || ':' || p_sku || ':' || replace(coalesce(p_payload->>'available_at', ''), ' ', 'T')
    );

    if nullif(p_payload->>'source_code', '') is not null then
        select source_id
        into v_source_id
        from ops.source_registry
        where source_code = p_payload->>'source_code';
    end if;

    update core.supply_programming_entry
    set
        is_active = false,
        updated_at = now()
    where schedule_key = v_schedule_key
      and is_active;

    insert into core.supply_programming_entry (
        schedule_key,
        product_id,
        action,
        available_at,
        quantity_planned,
        source_id,
        notes,
        meta_json,
        is_active,
        created_at,
        updated_at
    )
    values (
        v_schedule_key,
        v_product_id,
        p_payload->>'action',
        (p_payload->>'available_at')::timestamptz,
        (p_payload->>'quantity_planned')::numeric,
        v_source_id,
        nullif(p_payload->>'notes', ''),
        jsonb_strip_nulls(
            jsonb_build_object(
                'planned_start_at', nullif(p_payload->>'planned_start_at', ''),
                'assembly_line_code', nullif(p_payload->>'assembly_line_code', ''),
                'workstation_code', nullif(p_payload->>'workstation_code', ''),
                'sequence_rank', nullif(p_payload->>'sequence_rank', ''),
                'planning_status', coalesce(nullif(p_payload->>'planning_status', ''), 'planejado'),
                'planning_origin', 'pcp_manual'
            ) || coalesce(p_payload->'meta', p_payload->'metadata', '{}'::jsonb)
        ),
        true,
        now(),
        now()
    )
    returning entry_id into v_entry_id;

    return v_entry_id;
end;
$$;

create or replace function ops.ingest_romaneio_event_payload(
    p_source_code text,
    p_payload jsonb,
    p_meta_json jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
    v_source_id bigint;
    v_event_key text;
    v_event_type text;
    v_reference_at timestamptz;
    v_romaneio_code text;
    v_company_code text;
    v_run_id bigint;
    v_item_count integer := 0;
    v_event_accepted boolean;
begin
    if jsonb_typeof(coalesce(p_payload, '{}'::jsonb)) <> 'object' then
        raise exception 'Payload do romaneio deve ser um objeto JSON';
    end if;

    select source_id
    into v_source_id
    from ops.source_registry
    where source_code = p_source_code;

    if v_source_id is null then
        raise exception 'Fonte nao cadastrada: %', p_source_code;
    end if;

    v_reference_at := coalesce(
        nullif(p_payload->>'event_at', '')::timestamptz,
        now()
    );

    v_romaneio_code := coalesce(
        nullif(p_payload#>>'{romaneio,codigo}', ''),
        nullif(p_payload->>'romaneio', '')
    );

    if v_romaneio_code is null then
        raise exception 'Payload sem codigo de romaneio';
    end if;

    v_company_code := coalesce(
        nullif(p_payload#>>'{romaneio,empresa}', ''),
        nullif(p_payload->>'empresa', '')
    );

    v_event_type := lower(
        coalesce(
            nullif(p_payload->>'event_type', ''),
            'update'
        )
    );

    v_event_key := coalesce(
        nullif(p_payload->>'event_id', ''),
        nullif(p_payload->>'event_key', ''),
        p_source_code || ':' || v_romaneio_code || ':' || to_char(v_reference_at, 'YYYYMMDDHH24MISS')
    );

    v_item_count := coalesce(jsonb_array_length(coalesce(p_payload#>'{romaneio,itens}', '[]'::jsonb)), 0);

    v_event_accepted := ops.register_webhook_event(
        p_source_code,
        v_event_key,
        v_reference_at,
        md5(coalesce(p_payload::text, '')),
        coalesce(p_meta_json, '{}'::jsonb) || jsonb_build_object(
            'romaneio_code', v_romaneio_code,
            'event_type', v_event_type,
            'company_code', v_company_code,
            'item_count', v_item_count
        )
    );

    if not v_event_accepted then
        return jsonb_build_object(
            'status', 'duplicate_ignored',
            'processed', false,
            'event_key', v_event_key,
            'romaneio_code', v_romaneio_code,
            'event_type', v_event_type
        );
    end if;

    v_run_id := ops.start_ingestion_run(
        p_source_code,
        v_reference_at,
        null,
        null,
        md5(coalesce(p_payload::text, '')),
        coalesce(p_meta_json, '{}'::jsonb) || jsonb_build_object(
            'event_key', v_event_key,
            'romaneio_code', v_romaneio_code,
            'event_type', v_event_type,
            'company_code', v_company_code
        )
    );

    if v_item_count > 0 then
        insert into raw.landing_payload (
            run_id,
            source_id,
            row_number,
            record_json
        )
        select
            v_run_id,
            v_source_id,
            src.ordinality::integer,
            jsonb_build_object(
                'event_key', v_event_key,
                'event_type', v_event_type,
                'event_at', v_reference_at,
                'romaneio_code', v_romaneio_code,
                'company_code', v_company_code
            ) || src.item_json
        from jsonb_array_elements(coalesce(p_payload#>'{romaneio,itens}', '[]'::jsonb)) with ordinality as src(item_json, ordinality);
    else
        insert into raw.landing_payload (
            run_id,
            source_id,
            row_number,
            record_json
        )
        values (
            v_run_id,
            v_source_id,
            1,
            p_payload
        );
    end if;

    with src as (
        select
            nullif(trim(item_json->>'sku'), '') as sku,
            coalesce(
                nullif(trim(item_json->>'produto'), ''),
                nullif(trim(item_json->>'descricao'), ''),
                nullif(trim(item_json->>'sku'), '')
            ) as description,
            coalesce(
                nullif(trim(item_json->>'unidade'), ''),
                'UN'
            ) as unit_code,
            upper(
                coalesce(
                    nullif(trim(item_json->>'tipo_produto'), ''),
                    'PRODUTO ACABADO'
                )
            ) as tipo_hint
        from jsonb_array_elements(coalesce(p_payload#>'{romaneio,itens}', '[]'::jsonb)) as src(item_json)
    ),
    prepared as (
        select distinct
            src.sku,
            src.description,
            case
                when src.tipo_hint like '%INTER%' then 'intermediario'
                when src.tipo_hint like '%MATERIA%' then 'materia_prima'
                when src.tipo_hint like '%COMPON%' then 'componente'
                else 'acabado'
            end as product_type,
            case
                when src.tipo_hint like '%INTER%' then 'produzir'
                when src.tipo_hint like '%MATERIA%' then 'comprar'
                when src.tipo_hint like '%COMPON%' then 'comprar'
                else 'montar'
            end as supply_strategy,
            src.unit_code
        from src
        where src.sku is not null
    )
    insert into core.product (
        sku,
        description,
        product_type,
        supply_strategy,
        unit_code,
        company_code
    )
    select
        p.sku,
        p.description,
        p.product_type,
        p.supply_strategy,
        p.unit_code,
        v_company_code
    from prepared p
    on conflict (sku) do update
    set
        description = excluded.description,
        product_type = excluded.product_type,
        supply_strategy = excluded.supply_strategy,
        unit_code = excluded.unit_code,
        company_code = excluded.company_code,
        updated_at = now();

    with src as (
        select
            nullif(trim(item_json->>'sku'), '') as sku,
            greatest(
                coalesce(nullif(item_json->>'quantidade', '')::numeric, 0),
                coalesce(nullif(item_json->>'quantity_total', '')::numeric, 0),
                coalesce(nullif(item_json->>'quantidade_neg', '')::numeric, 0) +
                coalesce(nullif(item_json->>'quantidade_vol', '')::numeric, 0)
            ) as quantity_total
        from jsonb_array_elements(coalesce(p_payload#>'{romaneio,itens}', '[]'::jsonb)) as src(item_json)
    ),
    incoming as (
        select
            p.product_id,
            sum(src.quantity_total) as quantity_total
        from src
        join core.product p on p.sku = src.sku
        where src.sku is not null
        group by p.product_id
    ),
    current_lines as (
        select
            d.product_id
        from core.vw_romaneio_line_current d
        where d.source_id = v_source_id
          and d.romaneio_code = v_romaneio_code
          and d.quantity > 0
    ),
    removed_items as (
        select
            c.product_id
        from current_lines c
        left join incoming i on i.product_id = c.product_id
        where i.product_id is null
    )
    insert into core.romaneio_demand_snapshot (
        snapshot_at,
        romaneio_code,
        product_id,
        quantity,
        company_code,
        source_id
    )
    select
        v_reference_at,
        v_romaneio_code,
        r.product_id,
        0,
        v_company_code,
        v_source_id
    from removed_items r
    where v_event_type not in ('cancel', 'canceled', 'cancelado', 'delete', 'deleted');

    if v_event_type in ('cancel', 'canceled', 'cancelado', 'delete', 'deleted') then
        insert into core.romaneio_demand_snapshot (
            snapshot_at,
            romaneio_code,
            product_id,
            quantity,
            company_code,
            source_id
        )
        select
            v_reference_at,
            v_romaneio_code,
            d.product_id,
            0,
            v_company_code,
            v_source_id
        from core.vw_romaneio_line_current d
        where d.source_id = v_source_id
          and d.romaneio_code = v_romaneio_code
          and d.quantity > 0;
    else
        insert into core.romaneio_demand_snapshot (
            snapshot_at,
            romaneio_code,
            product_id,
            quantity,
            company_code,
            source_id
        )
        select
            v_reference_at,
            v_romaneio_code,
            i.product_id,
            i.quantity_total,
            v_company_code,
            v_source_id
        from (
            with src as (
                select
                    nullif(trim(item_json->>'sku'), '') as sku,
                    greatest(
                        coalesce(nullif(item_json->>'quantidade', '')::numeric, 0),
                        coalesce(nullif(item_json->>'quantity_total', '')::numeric, 0),
                        coalesce(nullif(item_json->>'quantidade_neg', '')::numeric, 0) +
                        coalesce(nullif(item_json->>'quantidade_vol', '')::numeric, 0)
                    ) as quantity_total
                from jsonb_array_elements(coalesce(p_payload#>'{romaneio,itens}', '[]'::jsonb)) as src(item_json)
            )
            select
                p.product_id,
                sum(src.quantity_total) as quantity_total
            from src
            join core.product p on p.sku = src.sku
            where src.sku is not null
            group by p.product_id
        ) i;
    end if;

    perform ops.finish_ingestion_run(v_run_id, 'success', v_item_count, null);
    perform ops.finish_webhook_event(v_event_key, 'processed', v_run_id, null);

    return jsonb_build_object(
        'status', 'processed',
        'processed', true,
        'event_key', v_event_key,
        'event_type', v_event_type,
        'romaneio_code', v_romaneio_code,
        'run_id', v_run_id,
        'item_count', v_item_count
    );
exception
    when others then
        if v_run_id is not null then
            perform ops.finish_ingestion_run(v_run_id, 'error', null, sqlerrm);
        end if;
        if v_event_key is not null then
            perform ops.finish_webhook_event(v_event_key, 'error', v_run_id, sqlerrm);
        end if;
        raise;
end;
$$;

create or replace view ops.vw_source_freshness as
select
    s.source_id,
    s.source_code,
    s.source_area,
    s.source_kind,
    s.contract_status,
    s.is_required,
    s.is_active,
    max(r.finished_at) filter (where r.status = 'success') as last_success_at,
    max(r.reference_at) filter (where r.status = 'success') as last_reference_at,
    case
        when s.contract_status = 'pending' then 'missing'
        when max(r.finished_at) filter (where r.status = 'success') is null then 'missing'
        when max(r.finished_at) filter (where r.status = 'success') < now() - interval '1 day' then 'stale'
        else 'fresh'
    end as freshness_status
from ops.source_registry s
left join ops.ingestion_run r on r.source_id = s.source_id
group by
    s.source_id,
    s.source_code,
    s.source_area,
    s.source_kind,
    s.contract_status,
    s.is_required,
    s.is_active;

create or replace view core.vw_inventory_current as
with last_snapshot as (
    select max(snapshot_at) as snapshot_at
    from core.inventory_snapshot
)
select
    i.product_id,
    sum(i.quantity) as stock_total,
    sum(i.quantity) filter (where i.stock_scope = 'acabado') as stock_finished,
    sum(i.quantity) filter (where i.stock_scope = 'intermediario') as stock_intermediate,
    sum(i.quantity) filter (where i.stock_scope = 'materia_prima') as stock_raw_material,
    sum(i.quantity) filter (where i.stock_scope = 'componente') as stock_component,
    sum(i.quantity) filter (where i.stock_scope = 'residuo') as stock_residue
from core.inventory_snapshot i
join last_snapshot s on i.snapshot_at = s.snapshot_at
group by i.product_id;

create or replace view core.vw_romaneio_demand_current as
with ranked as (
    select
        d.snapshot_at,
        d.romaneio_code,
        d.product_id,
        d.quantity,
        d.company_code,
        d.source_id,
        d.created_at,
        row_number() over (
            partition by d.source_id, d.romaneio_code, d.product_id
            order by d.snapshot_at desc, d.created_at desc
        ) as rn
    from core.romaneio_demand_snapshot d
)
select
    d.product_id,
    sum(d.quantity) as demand_total
from ranked d
where d.rn = 1
group by d.product_id;

create or replace view core.vw_romaneio_line_current as
with ranked as (
    select
        d.snapshot_at,
        d.romaneio_code,
        d.product_id,
        d.quantity,
        d.company_code,
        d.source_id,
        d.created_at,
        row_number() over (
            partition by d.source_id, d.romaneio_code, d.product_id
            order by d.snapshot_at desc, d.created_at desc
        ) as rn
    from core.romaneio_demand_snapshot d
)
select
    d.product_id,
    d.romaneio_code,
    d.quantity,
    d.company_code,
    d.source_id,
    d.snapshot_at
from ranked d
where d.rn = 1;

create or replace view core.vw_romaneio_priority_current as
with ranked as (
    select
        o.override_id,
        o.romaneio_code,
        o.source_id,
        o.priority_rank,
        o.reason,
        o.effective_at,
        o.is_active,
        o.meta_json,
        o.created_at,
        row_number() over (
            partition by o.romaneio_code
            order by o.effective_at desc, o.created_at desc, o.override_id desc
        ) as rn
    from core.romaneio_priority_override o
    where o.is_active
)
select
    override_id,
    romaneio_code,
    source_id,
    priority_rank,
    reason,
    effective_at,
    is_active,
    meta_json,
    created_at
from ranked
where rn = 1;

create or replace view core.vw_bom_component_current as
with base_ranked as (
    select
        b.parent_product_id,
        b.component_product_id,
        b.quantity_per,
        b.scrap_pct,
        b.source_scope,
        b.sequence_no,
        b.process_stage,
        b.component_role,
        b.assembly_line_code,
        b.workstation_code,
        b.usage_notes,
        b.metadata_json,
        b.valid_from,
        b.valid_to,
        b.source_id,
        b.created_at,
        b.updated_at,
        row_number() over (
            partition by b.parent_product_id, b.component_product_id, b.source_scope
            order by b.valid_from desc, b.updated_at desc, b.created_at desc
        ) as rn
    from core.bom_component b
    where b.is_active
      and b.valid_from <= current_date
      and (b.valid_to is null or b.valid_to >= current_date)
),
override_ranked as (
    select
        o.override_id,
        o.parent_product_id,
        o.component_product_id,
        o.source_scope,
        o.quantity_per_override,
        o.scrap_pct_override,
        o.sequence_no_override,
        o.process_stage_override,
        o.component_role_override,
        o.assembly_line_code_override,
        o.workstation_code_override,
        o.usage_notes_override,
        o.is_blocked,
        o.reason,
        o.source_id,
        o.meta_json,
        o.effective_at,
        o.created_at,
        o.updated_at,
        row_number() over (
            partition by o.parent_product_id, o.component_product_id, o.source_scope
            order by o.effective_at desc, o.updated_at desc, o.created_at desc, o.override_id desc
        ) as rn
    from core.bom_component_override o
    where o.is_active
),
keys as (
    select parent_product_id, component_product_id, source_scope
    from base_ranked
    where rn = 1
    union
    select parent_product_id, component_product_id, source_scope
    from override_ranked
    where rn = 1
)
select
    k.parent_product_id,
    k.component_product_id,
    coalesce(o.quantity_per_override, b.quantity_per) as quantity_per,
    coalesce(o.scrap_pct_override, b.scrap_pct, 0) as scrap_pct,
    k.source_scope,
    coalesce(o.sequence_no_override, b.sequence_no) as sequence_no,
    coalesce(
        o.process_stage_override,
        b.process_stage,
        case when k.source_scope = 'bom_final' then 'montagem' else 'producao' end
    ) as process_stage,
    coalesce(o.component_role_override, b.component_role, 'componente') as component_role,
    coalesce(o.assembly_line_code_override, b.assembly_line_code) as assembly_line_code,
    coalesce(o.workstation_code_override, b.workstation_code) as workstation_code,
    coalesce(o.usage_notes_override, b.usage_notes) as usage_notes,
    coalesce(o.is_blocked, false) as is_blocked,
    o.override_id,
    o.reason as override_reason,
    coalesce(o.source_id, b.source_id) as source_id,
    coalesce(b.valid_from, o.effective_at::date, current_date) as valid_from,
    b.valid_to,
    coalesce(b.metadata_json, '{}'::jsonb) || coalesce(o.meta_json, '{}'::jsonb) as metadata_json,
    o.override_id is not null as has_manual_override,
    b.parent_product_id is null as manual_only,
    coalesce(o.updated_at, b.updated_at, o.created_at, b.created_at) as updated_at
from keys k
left join base_ranked b
    on b.parent_product_id = k.parent_product_id
   and b.component_product_id = k.component_product_id
   and b.source_scope = k.source_scope
   and b.rn = 1
left join override_ranked o
    on o.parent_product_id = k.parent_product_id
   and o.component_product_id = k.component_product_id
   and o.source_scope = k.source_scope
   and o.rn = 1
where coalesce(o.quantity_per_override, b.quantity_per) is not null;

create or replace view core.vw_item_cost_current as
with last_snapshot as (
    select max(snapshot_at) as snapshot_at
    from core.cost_snapshot
)
select
    c.product_id,
    max(c.unit_cost) filter (where c.cost_category = 'total') as unit_cost_total_informed,
    sum(c.unit_cost) filter (where c.cost_category <> 'total') as unit_cost_total_calculated,
    coalesce(
        max(c.unit_cost) filter (where c.cost_category = 'total'),
        sum(c.unit_cost) filter (where c.cost_category <> 'total'),
        0
    ) as unit_cost_total,
    sum(c.unit_cost) filter (where c.cost_category = 'material') as unit_cost_material,
    sum(c.unit_cost) filter (where c.cost_category in (
        'transformacao_intermediario',
        'montagem_acabado',
        'reciclagem',
        'transporte_recicla',
        'refugo',
        'overhead'
    )) as unit_cost_process
from core.cost_snapshot c
join last_snapshot s on c.snapshot_at = s.snapshot_at
group by c.product_id;

create or replace view core.vw_supply_forecast_current as
with all_forecasts as (
    select
        f.snapshot_at,
        f.forecast_key,
        f.product_id,
        f.action,
        f.available_at,
        f.quantity_planned,
        f.source_id,
        f.notes,
        f.meta_json,
        f.created_at,
        'snapshot'::text as forecast_origin
    from core.supply_forecast_snapshot f
    union all
    select
        coalesce(e.updated_at, e.created_at) as snapshot_at,
        e.schedule_key as forecast_key,
        e.product_id,
        e.action,
        e.available_at,
        e.quantity_planned,
        e.source_id,
        e.notes,
        e.meta_json,
        e.created_at,
        'pcp_manual'::text as forecast_origin
    from core.supply_programming_entry e
    where e.is_active
),
ranked as (
    select
        f.snapshot_at,
        f.forecast_key,
        f.product_id,
        f.action,
        f.available_at,
        f.quantity_planned,
        f.source_id,
        f.notes,
        f.meta_json,
        f.created_at,
        f.forecast_origin,
        row_number() over (
            partition by coalesce(f.source_id, -1), f.forecast_key
            order by f.snapshot_at desc, f.created_at desc
        ) as rn
    from all_forecasts f
)
select
    snapshot_at,
    forecast_key,
    product_id,
    action,
    available_at,
    quantity_planned,
    source_id,
    notes,
    jsonb_set(coalesce(meta_json, '{}'::jsonb), '{forecast_origin}', to_jsonb(forecast_origin), true) as meta_json
from ranked
where rn = 1;

create or replace function mart.run_mrp(p_snapshot_at timestamptz default now())
returns bigint
language plpgsql
as $$
declare
    v_run_id bigint;
    v_level integer := 0;
    v_inserted integer := 0;
begin
    insert into mart.mrp_run (snapshot_at, status)
    values (p_snapshot_at, 'running')
    returning run_id into v_run_id;

    insert into mart.mrp_result (
        run_id,
        level,
        product_id,
        gross_required,
        stock_available,
        allocated_from_stock,
        net_required,
        estimated_unit_cost,
        estimated_total_cost,
        action
    )
    with stock_snapshot as (
        select max(snapshot_at) as snapshot_at
        from core.inventory_snapshot
        where snapshot_at <= p_snapshot_at
    ),
    demand as (
        select
            d.product_id,
            d.demand_total as gross_required
        from core.vw_romaneio_demand_current d
    ),
    stock as (
        select
            i.product_id,
            sum(i.quantity) as stock_available
        from core.inventory_snapshot i
        join stock_snapshot s on i.snapshot_at = s.snapshot_at
        group by i.product_id
    ),
    cost as (
        select
            c.product_id,
            c.unit_cost_total
        from core.vw_item_cost_current c
    )
    select
        v_run_id,
        0,
        d.product_id,
        d.gross_required,
        coalesce(s.stock_available, 0) as stock_available,
        least(d.gross_required, coalesce(s.stock_available, 0)) as allocated_from_stock,
        greatest(d.gross_required - coalesce(s.stock_available, 0), 0) as net_required,
        coalesce(c.unit_cost_total, 0) as estimated_unit_cost,
        greatest(d.gross_required - coalesce(s.stock_available, 0), 0) * coalesce(c.unit_cost_total, 0) as estimated_total_cost,
        case
            when greatest(d.gross_required - coalesce(s.stock_available, 0), 0) = 0 then 'atender_estoque'
            when p.supply_strategy = 'montar' then 'montar'
            when p.supply_strategy = 'produzir' then 'produzir'
            when p.supply_strategy = 'comprar' then 'comprar'
            else 'analisar'
        end as action
    from demand d
    join core.product p on p.product_id = d.product_id
    left join stock s on s.product_id = d.product_id
    left join cost c on c.product_id = d.product_id;

    loop
        insert into mart.mrp_trace (
            run_id,
            level,
            parent_product_id,
            product_id,
            gross_required
        )
        select
            v_run_id,
            v_level + 1,
            b.parent_product_id,
            b.component_product_id,
            sum(r.net_required * b.quantity_per * (1 + (b.scrap_pct / 100.0))) as gross_required
        from mart.mrp_result r
        join core.vw_bom_component_current b
            on b.parent_product_id = r.product_id
           and b.valid_from <= p_snapshot_at::date
           and (b.valid_to is null or b.valid_to >= p_snapshot_at::date)
        where r.run_id = v_run_id
          and r.level = v_level
          and r.net_required > 0
        group by b.parent_product_id, b.component_product_id
        on conflict (run_id, level, parent_product_id, product_id) do update
        set gross_required = excluded.gross_required;

        insert into mart.mrp_result (
            run_id,
            level,
            product_id,
            gross_required,
            stock_available,
            allocated_from_stock,
            net_required,
            estimated_unit_cost,
            estimated_total_cost,
            action
        )
        with child_gross as (
            select
                t.product_id,
                sum(t.gross_required) as gross_required
            from mart.mrp_trace t
            where t.run_id = v_run_id
              and t.level = v_level + 1
            group by t.product_id
        ),
        stock_snapshot as (
            select max(snapshot_at) as snapshot_at
            from core.inventory_snapshot
            where snapshot_at <= p_snapshot_at
        ),
        stock as (
            select
                i.product_id,
                sum(i.quantity) as stock_available
            from core.inventory_snapshot i
            join stock_snapshot s on i.snapshot_at = s.snapshot_at
            group by i.product_id
        ),
        cost as (
            select
                c.product_id,
                c.unit_cost_total
            from core.vw_item_cost_current c
        ),
        already_allocated as (
            select
                r.product_id,
                sum(r.allocated_from_stock) as allocated_from_stock
            from mart.mrp_result r
            where r.run_id = v_run_id
            group by r.product_id
        )
        select
            v_run_id,
            v_level + 1,
            c.product_id,
            c.gross_required,
            greatest(coalesce(s.stock_available, 0) - coalesce(a.allocated_from_stock, 0), 0) as stock_available,
            least(
                c.gross_required,
                greatest(coalesce(s.stock_available, 0) - coalesce(a.allocated_from_stock, 0), 0)
            ) as allocated_from_stock,
            greatest(
                c.gross_required - greatest(coalesce(s.stock_available, 0) - coalesce(a.allocated_from_stock, 0), 0),
                0
            ) as net_required,
            coalesce(ct.unit_cost_total, 0) as estimated_unit_cost,
            greatest(
                c.gross_required - greatest(coalesce(s.stock_available, 0) - coalesce(a.allocated_from_stock, 0), 0),
                0
            ) * coalesce(ct.unit_cost_total, 0) as estimated_total_cost,
            case
                when greatest(
                    c.gross_required - greatest(coalesce(s.stock_available, 0) - coalesce(a.allocated_from_stock, 0), 0),
                    0
                ) = 0 then 'atender_estoque'
                when p.supply_strategy = 'montar' then 'montar'
                when p.supply_strategy = 'produzir' then 'produzir'
                when p.supply_strategy = 'comprar' then 'comprar'
                else 'analisar'
            end as action
        from child_gross c
        join core.product p on p.product_id = c.product_id
        left join stock s on s.product_id = c.product_id
        left join already_allocated a on a.product_id = c.product_id
        left join cost ct on ct.product_id = c.product_id
        on conflict (run_id, level, product_id) do nothing;

        get diagnostics v_inserted = row_count;
        exit when v_inserted = 0;

        v_level := v_level + 1;
    end loop;

    update mart.mrp_run
    set status = 'completed'
    where run_id = v_run_id;

    return v_run_id;
exception
    when others then
        update mart.mrp_run
        set status = 'error'
        where run_id = v_run_id;
        raise;
end;
$$;

create or replace view mart.vw_painel_current as
select
    p.product_id,
    p.sku,
    p.description as produto,
    p.company_code,
    p.product_type,
    coalesce(i.stock_total, 0) as estoque_atual,
    coalesce(d.demand_total, 0) as necessidade_romaneios,
    coalesce(i.stock_total, 0) - coalesce(d.demand_total, 0) as saldo,
    greatest(coalesce(d.demand_total, 0) - coalesce(i.stock_total, 0), 0) as necessidade_producao
from core.product p
left join core.vw_inventory_current i on i.product_id = p.product_id
left join core.vw_romaneio_demand_current d on d.product_id = p.product_id
where p.is_active;

create or replace view mart.vw_mrp_last_run as
with last_run as (
    select max(run_id) as run_id
    from mart.mrp_run
    where status = 'completed'
)
select
    r.run_id,
    r.level,
    p.product_id,
    p.sku,
    p.description,
    p.product_type,
    p.supply_strategy,
    r.gross_required,
    r.stock_available,
    r.allocated_from_stock,
    r.net_required,
    r.estimated_unit_cost,
    r.estimated_total_cost,
    r.action
from mart.mrp_result r
join last_run l on r.run_id = l.run_id
join core.product p on p.product_id = r.product_id;

create or replace view mart.vw_mrp_production as
select *
from mart.vw_mrp_last_run
where action = 'produzir';

create or replace view mart.vw_mrp_assembly as
select *
from mart.vw_mrp_last_run
where action = 'montar';

create or replace view mart.vw_mrp_purchase as
select *
from mart.vw_mrp_last_run
where action = 'comprar';

create or replace view mart.vw_mrp_cost_last_run as
select
    run_id,
    level,
    product_id,
    sku,
    description,
    product_type,
    supply_strategy,
    action,
    net_required,
    estimated_unit_cost,
    estimated_total_cost
from mart.vw_mrp_last_run;

create or replace view mart.vw_supply_availability_current as
select
    coalesce(m.run_id, (select max(run_id) from mart.mrp_run where status = 'completed')) as run_id,
    f.product_id,
    p.sku,
    p.description,
    p.product_type,
    p.supply_strategy,
    f.action,
    f.forecast_key,
    f.available_at,
    f.quantity_planned,
    sum(f.quantity_planned) over (
        partition by f.product_id, f.action
        order by f.available_at, f.forecast_key
    ) as cumulative_quantity_planned,
    f.source_id as forecast_source_id,
    f.notes,
    f.meta_json,
    'previsao_informada' as availability_source
from core.vw_supply_forecast_current f
join core.product p on p.product_id = f.product_id
left join mart.vw_mrp_last_run m
    on m.product_id = f.product_id
   and m.action = f.action;

create or replace view mart.vw_structure_component_current as
select
    b.source_scope,
    case
        when b.source_scope = 'bom_final' then 'acabado'
        else 'intermediario'
    end as structure_type,
    b.process_stage,
    parent_product.sku as parent_sku,
    parent_product.description as parent_product,
    parent_product.product_type as parent_product_type,
    component_product.sku as component_sku,
    component_product.description as component_product,
    component_product.product_type as component_product_type,
    b.quantity_per,
    b.scrap_pct,
    b.sequence_no,
    b.component_role,
    b.assembly_line_code,
    b.workstation_code,
    b.usage_notes,
    b.is_blocked,
    b.has_manual_override,
    b.manual_only,
    b.override_id,
    b.override_reason,
    b.source_id,
    b.valid_from,
    b.valid_to,
    b.metadata_json,
    b.updated_at
from core.vw_bom_component_current b
join core.product parent_product on parent_product.product_id = b.parent_product_id
join core.product component_product on component_product.product_id = b.component_product_id;

create or replace view mart.vw_programming_current as
select
    f.forecast_key as schedule_key,
    p.sku,
    p.description as produto,
    p.product_type,
    p.supply_strategy,
    f.action,
    nullif(f.meta_json->>'planned_start_at', '')::timestamptz as planned_start_at,
    f.available_at,
    f.quantity_planned,
    nullif(f.meta_json->>'assembly_line_code', '') as assembly_line_code,
    nullif(f.meta_json->>'workstation_code', '') as workstation_code,
    nullif(f.meta_json->>'sequence_rank', '')::integer as sequence_rank,
    coalesce(nullif(f.meta_json->>'planning_status', ''), 'planejado') as planning_status,
    coalesce(nullif(f.meta_json->>'planning_origin', ''), 'fonte') as planning_origin,
    f.notes,
    s.source_code,
    s.source_area
from core.vw_supply_forecast_current f
join core.product p on p.product_id = f.product_id
left join ops.source_registry s on s.source_id = f.source_id;

create or replace view mart.vw_recycling_projection_last_run as
select
    m.run_id,
    m.level,
    m.product_id as produced_product_id,
    p.sku as produced_sku,
    p.description as produced_description,
    pr.process_code,
    r.product_id as residue_product_id,
    r.sku as residue_sku,
    r.description as residue_description,
    rr.product_id as recycled_product_id,
    rr.sku as recycled_sku,
    rr.description as recycled_description,
    case
        when br.quantity_per_unit is not null then m.net_required * br.quantity_per_unit
        else m.net_required * (br.generation_pct / 100.0)
    end as projected_residue_qty,
    case
        when br.quantity_per_unit is not null then m.net_required * br.quantity_per_unit * (br.recovery_pct / 100.0)
        else m.net_required * (br.generation_pct / 100.0) * (br.recovery_pct / 100.0)
    end as projected_recycled_raw_material_qty,
    br.destination_company_code,
    br.recycling_lead_time_days,
    br.transport_cost_per_unit,
    br.recycling_cost_per_unit,
    (
        case
            when br.quantity_per_unit is not null then m.net_required * br.quantity_per_unit
            else m.net_required * (br.generation_pct / 100.0)
        end
    ) * (br.transport_cost_per_unit + br.recycling_cost_per_unit) as projected_recycling_service_cost
from mart.vw_mrp_production m
join core.production_process pr
    on pr.product_id = m.product_id
   and pr.process_type = 'producao'
   and pr.is_active
join core.process_byproduct_rule br
    on br.process_id = pr.process_id
join core.product p on p.product_id = m.product_id
join core.product r on r.product_id = br.byproduct_product_id
left join core.product rr on rr.product_id = br.recovery_target_product_id;

drop view if exists mart.vw_romaneio_eta_current;
drop view if exists mart.vw_romaneio_eta_line_current;

create or replace view mart.vw_romaneio_eta_line_current as
with line_base as (
    select
        d.romaneio_code,
        d.company_code,
        d.snapshot_at as data_evento,
        d.product_id,
        p.sku,
        p.description as produto,
        p.product_type,
        p.supply_strategy,
        pr.priority_rank,
        pr.reason as priority_reason,
        d.quantity,
        coalesce(i.stock_total, 0) as stock_total
    from core.vw_romaneio_line_current d
    join core.product p on p.product_id = d.product_id
    left join core.vw_inventory_current i on i.product_id = d.product_id
    left join core.vw_romaneio_priority_current pr on pr.romaneio_code = d.romaneio_code
),
sequenced as (
    select
        l.*,
        row_number() over (
            partition by l.product_id
            order by l.data_evento, l.romaneio_code
        ) as chronological_rank
    from line_base l
),
ordered as (
    select
        l.*,
        coalesce(
            sum(l.quantity) over (
                partition by l.product_id
                order by coalesce(l.priority_rank::bigint, 1000000 + l.chronological_rank::bigint), l.data_evento, l.romaneio_code
                rows between unbounded preceding and 1 preceding
            ),
            0
        ) as prior_demand
    from sequenced l
),
allocated as (
    select
        o.*,
        greatest(o.stock_total - o.prior_demand, 0) as stock_remaining_before_line,
        least(o.quantity, greatest(o.stock_total - o.prior_demand, 0)) as quantidade_atendida_estoque
    from ordered o
),
enriched as (
    select
        a.*,
        greatest(a.quantity - a.quantidade_atendida_estoque, 0) as quantidade_pendente,
        case
            when greatest(a.quantity - a.quantidade_atendida_estoque, 0) = 0 then 'estoque'
            when a.supply_strategy = 'montar' then 'montagem'
            when a.supply_strategy = 'produzir' then 'producao'
            when a.supply_strategy = 'comprar' then 'compra'
            else 'analisar'
        end as modo_atendimento,
        case
            when greatest(a.quantity - a.quantidade_atendida_estoque, 0) = 0 then 'Atender estoque'
            when a.supply_strategy = 'montar' then 'Montagem'
            when a.supply_strategy = 'produzir' then 'Producao'
            when a.supply_strategy = 'comprar' then 'Compra'
            else 'Analise'
        end as impacto
    from allocated a
),
line_demand as (
    select
        e.*,
        case
            when e.quantidade_pendente = 0 then 'atender_estoque'
            when e.supply_strategy = 'montar' then 'montar'
            when e.supply_strategy = 'produzir' then 'produzir'
            when e.supply_strategy = 'comprar' then 'comprar'
            else 'analisar'
        end as forecast_action,
        coalesce(
            sum(e.quantidade_pendente) over (
                partition by e.product_id,
                case
                    when e.quantidade_pendente = 0 then 'atender_estoque'
                    when e.supply_strategy = 'montar' then 'montar'
                    when e.supply_strategy = 'produzir' then 'produzir'
                    when e.supply_strategy = 'comprar' then 'comprar'
                    else 'analisar'
                end
                order by e.data_evento, e.romaneio_code
                rows between unbounded preceding and 1 preceding
            ),
            0
        ) as prior_pending_same_action
    from enriched e
),
explicit_forecast as (
    select
        d.romaneio_code,
        d.product_id,
        d.forecast_action,
        min(sa.available_at) as previsao_disponibilidade_at
    from line_demand d
    join mart.vw_supply_availability_current sa
        on sa.product_id = d.product_id
       and sa.action = d.forecast_action
       and sa.cumulative_quantity_planned >= d.prior_pending_same_action + d.quantidade_pendente
    where d.quantidade_pendente > 0
      and d.forecast_action in ('montar', 'produzir', 'comprar')
    group by
        d.romaneio_code,
        d.product_id,
        d.forecast_action
),
heuristic_forecast as (
    select
        d.romaneio_code,
        d.product_id,
        d.forecast_action,
        now() + make_interval(
            secs => (
                coalesce(pp.setup_time_min, 0)::double precision +
                (
                    coalesce(pp.run_time_min_per_unit, 0)::double precision *
                    (d.prior_pending_same_action + d.quantidade_pendente)::double precision
                )
            ) * 60.0
        ) as previsao_disponibilidade_at
    from line_demand d
    join core.production_process pp
        on pp.product_id = d.product_id
       and pp.process_type = case
            when d.forecast_action = 'montar' then 'montagem'
            when d.forecast_action = 'produzir' then 'producao'
            else null
       end
       and pp.is_active
    where d.quantidade_pendente > 0
      and d.forecast_action in ('montar', 'produzir')
      and not exists (
          select 1
          from mart.vw_supply_availability_current sa
          where sa.product_id = d.product_id
            and sa.action = d.forecast_action
      )
      and (pp.setup_time_min is not null or pp.run_time_min_per_unit is not null)
)
select
    d.romaneio_code,
    d.company_code,
    d.data_evento,
    d.product_id,
    d.sku,
    d.produto,
    d.product_type,
    d.quantity as quantidade,
    d.quantidade_atendida_estoque,
    d.quantidade_pendente,
    d.priority_rank,
    d.priority_reason,
    d.impacto,
    d.modo_atendimento,
    case
        when d.quantidade_pendente = 0 then now()
        else coalesce(ef.previsao_disponibilidade_at, hf.previsao_disponibilidade_at)
    end as previsao_disponibilidade_at,
    case
        when d.quantidade_pendente = 0 then 'estoque'
        when ef.previsao_disponibilidade_at is not null then 'previsao_informada'
        when hf.previsao_disponibilidade_at is not null then 'heuristica_processo'
        else 'sem_previsao'
    end as previsao_disponibilidade_status
from line_demand d
left join explicit_forecast ef
    on ef.romaneio_code = d.romaneio_code
   and ef.product_id = d.product_id
   and ef.forecast_action = d.forecast_action
left join heuristic_forecast hf
    on hf.romaneio_code = d.romaneio_code
   and hf.product_id = d.product_id
   and hf.forecast_action = d.forecast_action;

create or replace view mart.vw_romaneio_eta_current as
select
    l.romaneio_code as romaneio,
    max(l.company_code) as empresa,
    min(l.data_evento) as data_evento,
    min(l.priority_rank) as priority_rank,
    max(l.priority_reason) as priority_reason,
    count(*) as itens,
    sum(l.quantidade) as quantidade_total,
    max(l.previsao_disponibilidade_at) as previsao_saida_at,
    case
        when bool_or(l.previsao_disponibilidade_status = 'sem_previsao') then 'sem_previsao'
        when bool_or(l.previsao_disponibilidade_status = 'heuristica_processo') then 'heuristica'
        when bool_or(l.previsao_disponibilidade_status = 'previsao_informada') then 'programado'
        else 'estoque'
    end as previsao_saida_status,
    string_agg(distinct l.modo_atendimento, ', ' order by l.modo_atendimento) as criterio_previsao
from mart.vw_romaneio_eta_line_current l
group by l.romaneio_code;

create or replace view mart.vw_items_without_bom as
select
    p.product_id,
    p.sku,
    p.description,
    p.product_type,
    p.supply_strategy
from core.product p
left join core.vw_bom_component_current b
    on b.parent_product_id = p.product_id
where p.supply_strategy in ('montar', 'produzir')
group by
    p.product_id,
    p.sku,
    p.description,
    p.product_type,
    p.supply_strategy
having count(b.component_product_id) = 0;

insert into ops.source_registry (
    source_code,
    source_area,
    source_kind,
    parser_name,
    format_hint,
    company_code,
    contract_status,
    is_required,
    is_active,
    notes,
    config_json
)
values
(
    'romaneio_sankhya_webhook',
    'demanda_romaneio',
    'api',
    'parse_sankhya_romaneio_event',
    'json_webhook',
    'INPLAST',
    'known',
    true,
    false,
    'Fonte alvo do go-live. Deve substituir a demanda vinda do legado Excel/PDF.',
    '{"endpoint_hint":"/webhook/pcp/sankhya-romaneio","parser_contract":"demanda_romaneio_event","go_live_mode":"shadow"}'::jsonb
),
(
    'romaneio_pcp_atual',
    'demanda_romaneio',
    'smb_file',
    'parse_romaneio_pcp',
    'xlsx_or_pdf',
    'INPLAST',
    'known',
    true,
    true,
    'Fonte atual derivada da planilha/rotina existente.',
    '{"folder_hint":"\\\\SRV\\ti\\Automacao AI\\Automacao Logistica x PCP","parser_contract":"demanda_romaneio"}'::jsonb
),
(
    'estoque_acabado_atual',
    'estoque_acabado',
    'google_published_sheet',
    'parse_estoque_acabado_google',
    'pubhtml',
    'INPLAST',
    'known',
    true,
    true,
    'Fonte atual de estoque acabado publicada via Google Sheets.',
    '{"published_url_hint":"https://docs.google.com/spreadsheets/d/e/2PACX-1vRIlcxI2E0BRlf4i2M49MIW5XiLx69xWwkrLmst0Fs5HW5gSlk-wf8wAVjur7FH1mQRz_-qmUvZGJND/pubhtml?widget=true&headers=false","parser_contract":"estoque","sheet_name":"Entrada/Saída","stock_scope":"acabado","location_code":"EXPEDICAO"}'::jsonb
),
(
    'estoque_intermediario_atual',
    'estoque_intermediario',
    'google_published_sheet',
    'parse_estoque_intermediario_google',
    'pubhtml',
    'INPLAST',
    'known',
    true,
    true,
    'Fonte atual de estoque intermediario publicada via Google Sheets.',
    '{"published_url_hint":"https://docs.google.com/spreadsheets/d/e/2PACX-1vSs-C_7_vu6L1lq9ScJEcQNT3F23en4MdgHBUI2FFkqBm9c_Zq8WHdtZuXkMhQvcegp05KewJQzPlCP/pubhtml?widget=true&headers=false","parser_contract":"estoque","sheet_name":"Movimentacoes","stock_scope":"intermediario","location_code":"ESTOQUE_INTERMEDIARIO"}'::jsonb
),
(
    'estoque_materia_prima_almoxarifado',
    'estoque_materia_prima',
    'smb_file',
    'parse_estoque_almoxarifado_mp',
    'xlsx',
    'INPLAST',
    'known',
    true,
    false,
    'Planilha de almoxarifado recebida para homologacao da frente de materia-prima.',
    '{"published_url_hint":"https://docs.google.com/spreadsheets/d/e/2PACX-1vTTPIHy6_gEBngeXzFQQGvPdCxNPeBP_le2etDdbTPTbF8XcGRPiuzVT5QSa1YRQsLQFb_7GiFNKCFa/pubhtml?widget=true&headers=false","parser_contract":"estoque","sheet_name":"MOVIMENTACOES DE MP","stock_scope":"materia_prima","location_code":"ALMOXARIFADO_MP"}'::jsonb
),
(
    'estoque_componente_almoxarifado',
    'estoque_componente',
    'smb_file',
    'parse_estoque_almoxarifado_componentes',
    'xlsx',
    'INPLAST',
    'known',
    true,
    false,
    'Planilha de almoxarifado recebida para homologacao da frente de componentes comprados.',
    '{"published_url_hint":"https://docs.google.com/spreadsheets/d/e/2PACX-1vTTPIHy6_gEBngeXzFQQGvPdCxNPeBP_le2etDdbTPTbF8XcGRPiuzVT5QSa1YRQsLQFb_7GiFNKCFa/pubhtml?widget=true&headers=false","parser_contract":"estoque","sheet_name":"MOVIMENTACOES DE PARAFUSOS","stock_scope":"componente","location_code":"ALMOXARIFADO_COMPONENTES"}'::jsonb
),
(
    'bom_final_pendente',
    'bom_final',
    'manual_load',
    'parse_bom_estrutura_padrao',
    'xlsx',
    'INPLAST',
    'pending',
    true,
    false,
    'Estrutura de produto acabado em homologacao no layout padrao de composicao.',
    '{"contract_status":"pending","parser_contract":"bom","source_scope":"bom_final","sheet_name":"Planilha1","layout":"Codigo, Descricao, CODIGO, DESCRICAO, QTDE"}'::jsonb
),
(
    'bom_intermediario_pendente',
    'bom_intermediario',
    'manual_load',
    'parse_bom_estrutura_padrao',
    'xlsx',
    'INPLAST',
    'pending',
    true,
    false,
    'Estrutura de produto intermediario preparada para o mesmo layout padrao do acabado.',
    '{"contract_status":"pending","parser_contract":"bom","source_scope":"bom_intermediario","sheet_name":"Planilha1","layout":"Codigo, Descricao, CODIGO, DESCRICAO, QTDE"}'::jsonb
),
(
    'previsao_montagem_pendente',
    'previsao_montagem',
    'manual_load',
    'parse_previsao_montagem',
    'unknown',
    'INPLAST',
    'pending',
    false,
    false,
    'Aguardando fonte oficial de previsao de montagem dos itens faltantes.',
    '{"contract_status":"pending","parser_contract":"previsao_operacional","action":"montar"}'::jsonb
),
(
    'previsao_producao_pendente',
    'previsao_producao',
    'manual_load',
    'parse_previsao_producao',
    'unknown',
    'INPLAST',
    'pending',
    false,
    false,
    'Aguardando fonte oficial de previsao de producao dos intermediarios faltantes.',
    '{"contract_status":"pending","parser_contract":"previsao_operacional","action":"produzir"}'::jsonb
),
(
    'previsao_compra_pendente',
    'previsao_compra',
    'manual_load',
    'parse_previsao_compra',
    'unknown',
    'INPLAST',
    'pending',
    false,
    false,
    'Aguardando fonte oficial de previsao de compra dos itens faltantes.',
    '{"contract_status":"pending","parser_contract":"previsao_operacional","action":"comprar"}'::jsonb
),
(
    'recicla_movimentacao_pendente',
    'retorno_recicla',
    'manual_load',
    'parse_retorno_recicla',
    'unknown',
    'RECICLA',
    'pending',
    false,
    false,
    'Aguardando layout de envio e retorno da Recicla.',
    '{"contract_status":"pending","parser_contract":"retorno_recicla"}'::jsonb
),
(
    'custo_material_pendente',
    'custo_material',
    'manual_load',
    'parse_custo_material',
    'unknown',
    'INPLAST',
    'pending',
    false,
    false,
    'Aguardando fonte de custo de materias-primas e itens.',
    '{"contract_status":"pending","parser_contract":"custo"}'::jsonb
),
(
    'custo_processo_pendente',
    'custo_processo',
    'manual_load',
    'parse_custo_processo',
    'unknown',
    'INPLAST',
    'pending',
    false,
    false,
    'Aguardando fonte de custo de montagem, producao, refugo e reciclagem.',
    '{"contract_status":"pending","parser_contract":"custo"}'::jsonb
)
on conflict (source_code) do update
set
    source_area = excluded.source_area,
    source_kind = excluded.source_kind,
    parser_name = excluded.parser_name,
    format_hint = excluded.format_hint,
    company_code = excluded.company_code,
    contract_status = excluded.contract_status,
    is_required = excluded.is_required,
    is_active = excluded.is_active,
    notes = excluded.notes,
    config_json = excluded.config_json,
    updated_at = now();
