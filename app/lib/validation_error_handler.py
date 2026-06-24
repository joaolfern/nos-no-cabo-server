from flask import jsonify, make_response


def validation_error_handler(e):
  error_message = e.errors()[0]['msg']

  response = jsonify({"error": error_message})

  return make_response(response, 422)
