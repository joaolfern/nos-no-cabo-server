migrate:
	docker compose exec web alembic revision --autogenerate -m "$(m)"

upgrade:
	docker compose exec web alembic upgrade head