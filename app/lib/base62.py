import string

CHARS = string.ascii_lowercase + string.ascii_uppercase + string.digits

def encode_base62(num: int) -> str:
  if num == 0:
    return CHARS[0]

  encoding = ""
  while num > 0:
    num, remainder = divmod(num, 62)
    encoding = CHARS[remainder] + encoding

  return encoding

def decode_base62(short_url: str) -> int:
  num = 0
  for char in short_url:
    num = num * 62 + CHARS.index(char)
  return num
