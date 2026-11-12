"""Make the study open directly from disk; model.mjs remains the tested source."""
from pathlib import Path
p=Path(__file__).parent
html=(p/'index.html').read_text()
model=(p/'model.mjs').read_text().replace('export ','')
app=(p/'lab.mjs').read_text().split('\n',1)[1]
html=html.replace('<script type="module" src="lab.mjs"></script>','<script>\n(()=>{\n'+model+'\n'+app+'\n})();\n</script>')
(p/'standalone.html').write_text(html)
print('Built standalone.html from model.mjs and lab.mjs')
