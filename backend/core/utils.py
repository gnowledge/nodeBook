import markdown
import bleach

def render_description_md(text: str) -> str:
    raw_html = markdown.markdown(text or "")
    safe_html = bleach.clean(
        raw_html,
        tags=["p", "b", "i", "strong", "em", "ul", "ol", "li", "a", "code", "pre", "blockquote"],
        attributes={"a": ["href"]},
    )
    return safe_html

