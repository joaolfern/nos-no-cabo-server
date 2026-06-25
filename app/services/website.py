import json
import os
import re
from datetime import datetime
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from app.models.database import db
from app.models.keyword import Keyword
from app.models.pre_website import PreWebsite
from app.models.website import Website


class WebsiteService:
    def __init__(self, shortener_service):
        self.shortener_service = shortener_service

    def get_all_websites(self):
        websites = Website.query.all()

        return websites

    def get_website(self, website_id: str):
        website = Website.query.get_or_404(website_id)

        return website

    def pre_register_website(self, url: str) -> PreWebsite:
        html_content = self._fetch_html(url)
        soup = BeautifulSoup(html_content, "html.parser")

        if os.environ.get("IS_BETA") == "false":
            self._validate_webring_link(soup)

        if Website.query.filter_by(url=url).first():
            raise DuplicateWebsiteError(
                "Esse site já existe no sistema, realize a deleção antes de fazer um novo pré-cadastro."
            )

        metadata = {
            "name": self._extract_title(soup),
            "description": self._extract_description(soup),
            "faviconUrl": self._extract_favicon(soup, url),
            "color": self._extract_color(soup, url),
            "createdAt": datetime.utcnow().isoformat(),
        }

        pre_website = PreWebsite.query.filter_by(url=url).first()

        if pre_website:
            for key, value in metadata.items():
                setattr(pre_website, key, value)
        else:
            pre_website = PreWebsite(url=url, **metadata)
            db.session.add(pre_website)

        db.session.commit()
        return pre_website

    def _fetch_html(self, url: str) -> str:
        try:
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            return resp.text
        except Exception as e:
            raise WebringValidationError(f"Failed to fetch URL: {e}")

    def _validate_webring_link(self, soup: BeautifulSoup) -> None:
        webring_url = os.environ.get("WEBRING_URL", "")
        for a in soup.find_all("a", href=True):
            if webring_url in a["href"]:
                return
        raise WebringValidationError("O site não contém um link para o webring")

    def _extract_title(self, soup: BeautifulSoup) -> str | None:
        if soup.title and soup.title.string:
            return soup.title.string.strip()
        return None

    def _extract_description(self, soup: BeautifulSoup) -> str | None:
        selectors = [
            {"name": "description"},
            {"property": "og:description"},
            {"name": "twitter:description"},
        ]
        for attrs in selectors:
            tag = soup.find("meta", attrs=attrs)
            if tag and tag.get("content"):
                return tag["content"].strip()
        return None

    def _extract_favicon(self, soup: BeautifulSoup, base_url: str) -> str | None:
        meta_image = soup.find("meta", attrs={"property": "og:image"}) or soup.find(
            "meta", attrs={"name": "twitter:image"}
        )
        if meta_image and meta_image.get("content"):
            return urljoin(base_url, meta_image["content"])

        for icon_tag in soup.find_all("link", rel=True):
            rel = icon_tag.get("rel")
            if rel and any("icon" in r for r in rel) and icon_tag.get("href"):
                return urljoin(base_url, icon_tag["href"])
        return None

    def _extract_color(self, soup: BeautifulSoup, base_url: str) -> str | None:
        manifest_tag = soup.find("link", rel="manifest")
        if manifest_tag and manifest_tag.get("href"):
            try:
                manifest_url = urljoin(base_url, manifest_tag["href"])
                manifest_resp = requests.get(manifest_url, timeout=5)
                manifest_resp.raise_for_status()
                return json.loads(manifest_resp.text).get("theme_color")
            except Exception:
                pass

        meta_names = ["primary-color", "theme_color", "color", "og:theme-color"]
        for name in meta_names:
            tag = soup.find("meta", attrs={"name": name}) or soup.find(
                "meta", attrs={"property": name}
            )
            if tag and tag.get("content"):
                return tag["content"].strip()

        for style_tag in soup.find_all("style"):
            if style_tag.string:
                match = re.search(r"--primary-color\s*:\s*([^;]+);", style_tag.string)
                if match:
                    return match.group(1).strip()

        if soup.head:
            for tag in soup.head.find_all(True):
                style = tag.get("style")
                if style:
                    match = re.search(r"color\s*:\s*([^;]+);", style)
                    if match:
                        return match.group(1).strip()

        theme_color_tag = soup.find("meta", attrs={"name": "theme-color"})
        if theme_color_tag and theme_color_tag.get("content"):
            return theme_color_tag["content"].strip()

        return None

    def approve_pre_registered_website(self, data: dict) -> None:
        pre_website = PreWebsite.query.filter_by(url=data["url"]).first()
        if not pre_website:
            raise NotFoundError("Não existe pré-cadastro para essa URL")

        fields = ["name", "description", "color", "faviconUrl", "repo"]
        for field in fields:
            if data.get(field):
                setattr(pre_website, field, data[field])

        pre_website.createdAt = datetime.utcnow().isoformat()
        website = Website.from_prewebsite(pre_website)

        url_mapping = self.shortener_service.create_mapping(pre_website.url)
        website.url = url_mapping.short_url

        existing_keywords = {k.name: k for k in Keyword.query.all()}
        now = datetime.utcnow().isoformat()

        for kw_name in data.get("keywords", []):
            keyword_obj = existing_keywords.get(kw_name)
            if keyword_obj:
                if keyword_obj not in website.keywords:
                    website.keywords.append(keyword_obj)
            else:
                new_keyword = Keyword(name=kw_name, createdAt=now, updatedAt=now)
                db.session.add(new_keyword)
                website.keywords.append(new_keyword)

        db.session.add(website)
        db.session.delete(pre_website)
        db.session.commit()

        return website

    def delete_website_by_id(self, website_id: int) -> None:
        website = db.session.get(Website, website_id)
        if not website:
            raise NotFoundError("Site não encontrado")

        for keyword in list(website.keywords):
            if len(keyword.websites) == 1 and keyword.websites[0].id == website.id:
                db.session.delete(keyword)

        db.session.delete(website)
        db.session.commit()


class WebringValidationError(Exception):
    pass


class DuplicateWebsiteError(Exception):
    pass


class NotFoundError(Exception):
    pass
