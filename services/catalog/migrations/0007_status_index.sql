-- Lets the random neighbour seek published rows by rowid (status, rowid).
CREATE INDEX websites_by_status ON websites (status);
