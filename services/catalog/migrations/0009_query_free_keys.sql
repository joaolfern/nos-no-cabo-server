-- The query string no longer makes a different site; rows that would collide keep their old key.
UPDATE OR IGNORE websites
  SET url_normalized = substr(url_normalized, 1, instr(url_normalized, '?') - 1)
  WHERE instr(url_normalized, '?') > 0;
