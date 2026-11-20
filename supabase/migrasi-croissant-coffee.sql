-- Menu kelompok "Croissant" masuk departemen/gruppe Coffee.
-- Egg Croissant SENGAJA tidak diubah: tetap di Breakfast & Brunch → Kitchen.
-- Aman dijalankan ulang (idempotent).

update public.resto_produk
set kelompok = 'Coffee'
where jenis = 'menu'
  and kelompok = 'Croissant';

-- Verifikasi: tidak ada lagi menu dengan kelompok Croissant,
-- Egg Croissant tetap Breakfast & Brunch, delapan menu di atas jadi Coffee.
select id, nama, kelompok
from public.resto_produk
where nama ilike '%croissant%'
   or nama in ('Brownies Cake','Carrot Cake','Plain Bowl','Plain Chocolate','Crookie')
order by nama;
