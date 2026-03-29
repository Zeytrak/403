import re
from pathlib import Path

ROOT = Path(__file__).parent
PROJECT_DATA = ROOT / 'project-data.js'
WORK_HTML = ROOT / 'work.html'
WORK_FOLDER = ROOT / 'work'

WORK_GRID_RE = re.compile(
    r'(<div\s+class="work-grid"[^>]*?>)(.*?)(</div>\s*<!--\s*/\.work-grid\s*-->)',
    re.S,
)

DETAIL_PAGE_TEMPLATE = '''<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} — 403</title>
  <meta name="description" content="{description}" />
  <link rel="stylesheet" href="../styles.css" />
</head>
<body>
  <header class="topbar" role="banner">
    <a href="../index.html" class="topbar__id">403</a>
    <span class="topbar__crumb">Work</span>
    <div class="topbar__meta">
      <span class="topbar__dot"></span>
      <span>proyecto</span>
      <button class="nav-toggle" aria-label="Abrir menú" aria-expanded="false">[menú]</button>
    </div>
  </header>

  <div class="nav-overlay" role="dialog" aria-label="Menú">
    <button class="nav-overlay__close">[cerrar]</button>
    <nav class="nav-overlay__links">
      <a href="../index.html">Inicio</a>
      <a href="../work.html">Work</a>
      <a href="../bitacora.html">Bitácora</a>
      <a href="../archivo.html">Archivo</a>
      <a href="../about.html">About</a>
      <a href="../contact.html">Contacto</a>
    </nav>
  </div>

  <div class="page-wrap" data-project-id="{id}">
    <header class="section-head js-reveal">
      <span class="section-head__num">{index:02d} /</span>
      <h1 class="section-head__title">{title}</h1>
      <div class="section-head__meta">
        <p>{type_text}</p>
        <p>{year}</p>
      </div>
    </header>

    <nav class="inner-nav" aria-label="Navegación secundaria">
      <a href="../index.html">Inicio</a>
      <a href="../work.html">Work</a>
      <a href="../bitacora.html">Bitácora</a>
      <a href="../archivo.html">Archivo</a>
      <a href="../about.html">About</a>
      <a href="../contact.html">Contacto</a>
    </nav>

    <div class="project-detail__media project__media">
      <div class="project__media-placeholder">
        <span>{type_text} — cargando...</span>
      </div>
    </div>

    <main class="about-body">
      <section class="about-text-block js-reveal">
        <span class="about-label">— descripción</span>
        <p>{description}</p>
      </section>
    </main>
  </div>

  <span class="corner-label" aria-hidden="true">403 / work</span>
  <script src="../project-data.js"></script>
  <script src="../script.js"></script>
</body>
</html>
'''


def _find_project_object(text: str) -> str:
    start = text.find('const PROJECTS')
    if start == -1:
        raise ValueError('Unable to find PROJECTS declaration in project-data.js')
    start = text.find('{', start)
    if start == -1:
        raise ValueError('Unable to find opening brace for PROJECTS')

    depth = 0
    in_string = None
    escape = False
    for index in range(start, len(text)):
        char = text[index]
        if in_string:
            if escape:
                escape = False
            elif char == '\\':
                escape = True
            elif char == in_string:
                in_string = None
            continue
        if char == '"' or char == "'":
            in_string = char
            continue
        if char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                return text[start:index + 1]
    raise ValueError('Unable to find matching closing brace for PROJECTS object')


def _strip_js_comments(js_text: str) -> str:
    out = []
    in_string = None
    escape = False
    in_comment = None
    i = 0
    while i < len(js_text):
        ch = js_text[i]
        if in_comment == 'line':
            if ch == '\n':
                in_comment = None
                out.append(ch)
        elif in_comment == 'block':
            if ch == '*' and i + 1 < len(js_text) and js_text[i + 1] == '/':
                in_comment = None
                i += 1
        elif in_string:
            out.append(ch)
            if escape:
                escape = False
            elif ch == '\\':
                escape = True
            elif ch == in_string:
                in_string = None
        else:
            if ch == '/' and i + 1 < len(js_text) and js_text[i + 1] == '/':
                in_comment = 'line'
                i += 1
            elif ch == '/' and i + 1 < len(js_text) and js_text[i + 1] == '*':
                in_comment = 'block'
                i += 1
            else:
                if ch == '"' or ch == "'":
                    in_string = ch
                out.append(ch)
        i += 1
    return ''.join(out)


def _js_to_json(js_text: str) -> str:
    js_text = _strip_js_comments(js_text)

    # Quote unquoted object keys like `id: 'value'` -> "id":
    js_text = re.sub(r'([\{\[,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:', r'\1"\2":', js_text)

    # Convert single-quoted strings to JSON strings
    def _replace_single_quote(match):
        inner = match.group(1)
        inner = inner.replace('\\', '\\\\').replace('"', '\\"')
        return f'"{inner}"'
    js_text = re.sub(r"'([^'\\]*(?:\\.[^'\\]*)*)'", _replace_single_quote, js_text)

    # Remove trailing commas in objects and arrays
    js_text = re.sub(r',\s*([}\]])', r'\1', js_text)
    return js_text


def parse_project_data(path: Path) -> dict:
    content = path.read_text(encoding='utf-8')
    obj_text = _find_project_object(content)
    json_text = _js_to_json(obj_text)
    try:
        return __import__('json').loads(json_text)
    except Exception as exc:
        raise ValueError('Failed to parse project-data.js as JSON') from exc


def format_related(related):
    if not related:
        return ''
    return ','.join(str(item).strip() for item in related)


def link_text(project):
    if project.get('type') == 'audio':
        return 'escuchar →'
    return 'ver proyecto →'


def type_text(project):
    category = project.get('category', '').strip()
    type_ = project.get('type', '').strip()
    if category and type_ and category != type_:
        return f'{type_} — {category}'
    return category or type_


def make_article(project: dict) -> str:
    related = format_related(project.get('related', []))
    href = f"work/{project['id']}.html"
    return f"""        <article id=\"{project['id']}\" data-project-id=\"{project['id']}\" class=\"project js-reveal\" data-cat=\"{project.get('category','')}\" data-related=\"{related}\">
          <div class=\"project__media\">
            <div class=\"project__media-placeholder\">
              <span>{project.get('type','')} — embed aquí</span>
            </div>
          </div>
          <div class=\"project__info\">
            <div>
              <p class=\"project__cat\">{project.get('category','')}</p>
              <h2 class=\"project__title\">{project.get('title','')}</h2>
              <p class=\"project__desc\">{project.get('description','')}</p>
            </div>
            <div class=\"project__related\" aria-label=\"Páginas relacionadas del proyecto\"></div>
            <div class=\"project__foot\">
              <span class=\"project__year\">{project.get('year','')}</span>
              <a href=\"{href}\" class=\"project__link\">{link_text(project)}</a>
            </div>
          </div>
        </article>

""" 


def generate_work_html(projects: dict):
    work_text = WORK_HTML.read_text(encoding='utf-8')
    new_articles = ''.join(make_article(projects[key]) for key in projects)
    replacement = r"\1\n" + new_articles + r"    \3"
    if not WORK_GRID_RE.search(work_text):
        raise ValueError('Could not find work-grid section in work.html')
    new_text = WORK_GRID_RE.sub(replacement, work_text)
    WORK_HTML.write_text(new_text, encoding='utf-8')
    print(f'Updated {WORK_HTML.name}')


def generate_detail_pages(projects: dict):
    WORK_FOLDER.mkdir(exist_ok=True)
    for index, key in enumerate(projects, start=1):
        project = projects[key]
        page_path = WORK_FOLDER / f"{project['id']}.html"
        type_text_value = type_text(project)
        page_text = DETAIL_PAGE_TEMPLATE.format(
            id=project['id'],
            index=index,
            title=project.get('title', ''),
            year=project.get('year', ''),
            type_text=type_text_value,
            description=project.get('description', ''),
        )
        page_path.write_text(page_text, encoding='utf-8')
        print(f'Wrote {page_path.relative_to(ROOT)}')


def main():
    projects = parse_project_data(PROJECT_DATA)
    generate_work_html(projects)
    generate_detail_pages(projects)


if __name__ == '__main__':
    main()
