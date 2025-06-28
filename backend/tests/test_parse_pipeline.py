import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from fastapi.testclient import TestClient
from routes.parse_pipeline import (
    load_cnl_markdown,
    extract_sections,
    extract_graph_description,
    router
)
from fastapi import FastAPI

app = FastAPI()
app.include_router(router, prefix="")
client = TestClient(app)

def test_load_cnl_markdown():
    assert load_cnl_markdown("# Heading\nSome text") is True
    assert load_cnl_markdown("") is False
    assert load_cnl_markdown("   ") is False

def test_extract_graph_description():
    md = "Intro text before heading.\n# Section 1\nContent"
    assert extract_graph_description(md) == "Intro text before heading."
    md2 = "# Section 1\nContent"
    assert extract_graph_description(md2) == ""

def test_extract_sections():
    md = "# Section 1\nContent 1\n# Section 2\nContent 2"
    sections = extract_sections(md)
    assert len(sections) == 2
    assert sections[0]['heading'] == '# Section 1'
    assert sections[0]['content'] == 'Content 1'
    assert sections[1]['heading'] == '# Section 2'
    assert sections[1]['content'] == 'Content 2'

def test_parse_pipeline_route():
    md = "Intro text\n# Node 1\n:::cnl\nhas color: blue\n:::\n"
    response = client.post(
        "/users/testuser/graphs/testgraph/parse_pipeline",
        files={"file": ("test.md", md, "text/markdown")}
    )
    assert response.status_code == 200
    data = response.json()
    assert "graph_description" in data
    assert "sections" in data
    assert data["graph_description"].startswith("Intro text")
    assert len(data["sections"]) == 1
