from flask import request, abort, jsonify, make_response
import os
from schemas.admin_header import AdminHeaderSchema
from schemas.error import ErrorSchema

def get_admin_password(header: AdminHeaderSchema):
    admin_password = header.x_admin_password or request.headers.get('x-admin-password')

    return admin_password

def validate_admin_password(admin_password: str):
    expected_password = os.environ.get("ADMIN_PASSWORD")

    if admin_password != expected_password:
        abort(make_response(jsonify(ErrorSchema(message="Senha de administrador inválida").dict()), 403))
    return True
