"""Extract public reference identifiers and hierarchy, never workbook prose or formulas.
Usage: python scripts/extract-dynamics-catalog.py <official-workbook.xlsx>
Source: Microsoft Download Center, release OCT 2026 (published 2026-10-23).
"""
import sys,json,hashlib,collections,re
from pathlib import Path
import openpyxl
source=Path(sys.argv[1])
sheet=openpyxl.load_workbook(source,read_only=True,data_only=True).active
rows=sheet.iter_rows(values_only=True);headers=next(rows)
levels={'End to end':1,'Process area':2,'Process':3,'Scenario':4,'System process':5,'Test case':6}
entries=[];stack={};ids=set()
for values in rows:
 row=dict(zip(headers,values));level=levels.get(row['Work item type'])
 if not level:continue
 ident=str(row['Microsoft ID MS BPC']);title=row.get('Title '+str(level+1))
 if not re.fullmatch(r'd[0-9]+c[0-9]+v[0-9]+',ident) or ident in ids or not isinstance(title,str) or not title.strip():raise ValueError('Invalid catalog row '+ident)
 if level>1 and level-1 not in stack:raise ValueError('Missing catalog parent '+ident)
 parent=stack.get(level-1) if level>1 else None
 status=str(row['Catalog status MS BPC'] or '')
 url=str(row['Microsoft references MS BPC'] or '').strip()
 # Workbook references can contain several URLs; expose a single official Learn link only.
 matches=re.findall(r'https://learn\.microsoft\.com/[^\s<>\";]+',url)
 url=matches[0].rstrip('.,)') if matches else None
 entries.append({'id':ident,'sequence':str(row['Process sequence ID MS BPC']),'level':level,'parent':parent,'title':title.strip(),'products':str(row['Products MS BPC'] or ''),'retired':status.startswith(('60','70')),'url':url})
 ids.add(ident);stack[level]=ident
 for key in list(stack):
  if key>level:del stack[key]
by_id={e['id']:e for e in entries}
for entry in entries:
 parent=by_id.get(entry['parent'])
 if parent:
  entry['retired']=entry['retired'] or parent['retired']
  if entry['sequence'].split('.')[:entry['level']-1]!=parent['sequence'].split('.')[:entry['level']-1]:entry['hierarchyIssue']=True
meta={'version':'2026-10','published':'2026-10-23','checked':'2026-11-02','source':'https://www.microsoft.com/en-us/download/details.aspx?id=108187','download':'https://download.microsoft.com/download/1effd379-242f-42fe-898c-897d45a54092/Business%20Process%20Catalog%20OCT%202026.xlsx','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'counts':dict(collections.Counter(e['level'] for e in entries))}
out=Path('public/quality/catalog');out.mkdir(exist_ok=True)
(out/'dynamics365-2026-10.json').write_text(json.dumps({'meta':meta,'entries':entries},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
# Only membership and lifecycle validation enter the application bundle. The full
# catalog is lazy-loaded as a static asset when this view is selected.
active=[e['id'] for e in entries if not e['retired']]
Path('lib/dynamics-catalog-index.mjs').write_text('// Generated from the official Microsoft OCT 2026 workbook; see scripts/extract-dynamics-catalog.py.\nexport const CATALOG_META = '+json.dumps(meta,separators=(',',':'))+';\nexport const CATALOG_IDS = new Set('+json.dumps('\n'.join(e['id'] for e in entries))+'.split("\\n"));\nexport const RETIRED_CATALOG_IDS = new Set('+json.dumps([e['id'] for e in entries if e['retired']])+');\n',encoding='utf-8')
with Path('lib/dynamics-catalog-index.mjs').open('a',encoding='utf-8') as f:f.write('export const UNCONFIRMABLE_CATALOG_IDS = new Set('+json.dumps([e['id'] for e in entries if e['retired'] or e.get('hierarchyIssue')])+');\n')
roots={e['sequence'].split('.')[0]:e['id'] for e in entries if e['level']==1}
with Path('lib/dynamics-catalog-index.mjs').open('a',encoding='utf-8') as f:f.write('export const CATALOG_AREA_ROOTS = '+json.dumps({area:roots[seq] for area,seq in {'sales':'65','purchasing':'75','warehouse':'60','production':'70','finance':'90'}.items()})+';\n')
print(json.dumps({'entries':len(entries),'active':len(active),'counts':meta['counts'],'jsonBytes':(out/'dynamics365-2026-10.json').stat().st_size}))
