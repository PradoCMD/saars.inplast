-- Permissoes sugeridas para a topologia:
-- VM apps: SaaS + n8n
-- VM data: Postgres
--
-- Execute este script conectado ao banco alvo do PCP.
-- Troque as senhas antes de usar em ambiente real.

do $$
begin
    if not exists (select 1 from pg_roles where rolname = 'pcp_app') then
        create role pcp_app login password 'CHANGE_ME_PCP_APP';
    else
        raise notice 'Role pcp_app ja existe; ajuste senha/permissoes manualmente se necessario.';
    end if;

    if not exists (select 1 from pg_roles where rolname = 'pcp_integration') then
        create role pcp_integration login password 'CHANGE_ME_PCP_INTEGRATION';
    else
        raise notice 'Role pcp_integration ja existe; ajuste senha/permissoes manualmente se necessario.';
    end if;
end
$$;

do $$
begin
    execute format('grant connect on database %I to pcp_app', current_database());
    execute format('grant connect on database %I to pcp_integration', current_database());
end
$$;

grant usage on schema ops, core, mart to pcp_app;
grant select on all tables in schema ops, core, mart to pcp_app;

grant usage on schema ops, raw, core, mart to pcp_integration;
grant select on all tables in schema ops, raw, core, mart to pcp_integration;

grant insert, update on ops.ingestion_run to pcp_integration;
grant insert, update on ops.webhook_event to pcp_integration;

grant insert on raw.landing_payload to pcp_integration;

grant insert, update on core.product to pcp_integration;
grant insert, update on core.product_code to pcp_integration;
grant insert, update on core.inventory_snapshot to pcp_integration;
grant insert, update on core.romaneio_demand_snapshot to pcp_integration;
grant insert, update on core.supply_forecast_snapshot to pcp_integration;
grant insert, update on core.cost_snapshot to pcp_integration;
grant insert, update on core.recycling_return_snapshot to pcp_integration;
grant insert, update on core.bom_component to pcp_integration;
grant insert, update on core.production_process to pcp_integration;
grant insert, update on core.process_byproduct_rule to pcp_integration;

grant insert, update, delete on mart.mrp_run to pcp_integration;
grant insert, update, delete on mart.mrp_result to pcp_integration;
grant insert, update, delete on mart.mrp_trace to pcp_integration;

grant usage, select on all sequences in schema ops to pcp_integration;
grant usage, select on all sequences in schema raw to pcp_integration;
grant usage, select on all sequences in schema core to pcp_integration;
grant usage, select on all sequences in schema mart to pcp_integration;

grant execute on function ops.start_ingestion_run(text, timestamptz, text, text, text, jsonb) to pcp_integration;
grant execute on function ops.register_webhook_event(text, text, timestamptz, text, jsonb) to pcp_integration;
grant execute on function ops.finish_ingestion_run(bigint, text, integer, text) to pcp_integration;
grant execute on function ops.finish_webhook_event(text, text, bigint, text) to pcp_integration;
grant execute on function ops.ingest_inventory_payload(text, timestamptz, jsonb, jsonb) to pcp_integration;
grant execute on function ops.ingest_romaneio_event_payload(text, jsonb, jsonb) to pcp_integration;
grant execute on function mart.run_mrp(timestamptz) to pcp_integration;

alter default privileges in schema ops grant select on tables to pcp_app;
alter default privileges in schema core grant select on tables to pcp_app;
alter default privileges in schema mart grant select on tables to pcp_app;

alter default privileges in schema ops grant select on tables to pcp_integration;
alter default privileges in schema raw grant select on tables to pcp_integration;
alter default privileges in schema core grant select on tables to pcp_integration;
alter default privileges in schema mart grant select on tables to pcp_integration;

alter default privileges in schema ops grant usage, select on sequences to pcp_integration;
alter default privileges in schema raw grant usage, select on sequences to pcp_integration;
alter default privileges in schema core grant usage, select on sequences to pcp_integration;
alter default privileges in schema mart grant usage, select on sequences to pcp_integration;

alter role pcp_app set search_path = mart, core, ops, public;
alter role pcp_integration set search_path = ops, raw, core, mart, public;

comment on role pcp_app is 'Usuario de leitura do modulo PCP no SaaS.';
comment on role pcp_integration is 'Usuario de integracao do PCP para n8n e acoes operacionais.';

-- Opcional:
-- Se o backend do SaaS precisar disparar acoes no banco com outra credencial,
-- configure:
-- PCP_DATABASE_URL=...pcp_app...
-- PCP_ACTIONS_DATABASE_URL=...pcp_integration...
