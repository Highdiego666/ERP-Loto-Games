update public.productos
set
  stock_local_14 = case when trim(coalesce(local,'')) = '14' then greatest(coalesce(stock,0),0) else 0 end,
  stock_local_20 = case when trim(coalesce(local,'')) = '20' then greatest(coalesce(stock,0),0) else 0 end
where coalesce(stock_local_14,0) = 0
  and coalesce(stock_local_20,0) = 0
  and trim(coalesce(local,'')) in ('14','20');
