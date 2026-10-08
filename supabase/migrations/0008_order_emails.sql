-- Order confirmation email bookkeeping: claimed atomically so /verify and the webhook never double-send.
alter table orders add column if not exists confirmation_sent_at timestamptz;
