-- Internal / trigger / cron functions: not callable over the API
revoke execute on function public.audit_row() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.release_stale_orders() from public, anon, authenticated;
-- Staff-only RPCs: signed-in only (they also check the caller's role internally)
revoke execute on function public.adjust_stock(uuid, integer, text, text, text) from public, anon;
revoke execute on function public.set_order_status(uuid, text, text) from public, anon;
grant execute on function public.adjust_stock(uuid, integer, text, text, text) to authenticated;
grant execute on function public.set_order_status(uuid, text, text) to authenticated;
-- Intentionally public (checkout / order tracking / coupon check): place_order, get_order, track_order, validate_coupon
-- is_staff / has_role stay executable: RLS policies call them for every visitor and they only reveal the caller's own role.
