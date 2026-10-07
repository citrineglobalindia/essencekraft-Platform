-- Record product deletions in the activity log (inserts/updates were already audited).
create trigger audit_products_delete after delete on products for each row execute function audit_row();
