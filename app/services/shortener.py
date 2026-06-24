from datetime import datetime

from app.lib.base62 import decode_base62, encode_base62
from app.models.database import db
from app.models.URL_analytics import URLAnalytics
from app.models.URL_mapping import URLMapping


class URLShortenerService:
  def get_all_mappings(self) -> list[URLMapping]:
    return URLMapping.query.all()

  def create_mapping(self, original_url: str) -> URLMapping:
    new_url = URLMapping(original_url=original_url, short_url="")

    db.session.add(new_url)
    db.session.flush()

    new_url.short_url = encode_base62(new_url.id)
    db.session.commit()

    return new_url

  def get_mapping(self, short_url: str) -> URLMapping | None:
    url_id = decode_base62(short_url)
    return db.session.get(URLMapping, url_id)

  def track_access(self, short_url: str) -> None:
    analytics = URLAnalytics.query.filter_by(short_url=short_url).first()

    if analytics:
      analytics.click_count += 1
      analytics.last_accessed = datetime.utcnow()
    else:
      new_analytics = URLAnalytics(short_url=short_url, click_count=1)
      db.session.add(new_analytics)

    db.session.commit()

  def get_all_analytics(self) -> list[URLAnalytics]:
    return URLAnalytics.query.all()
